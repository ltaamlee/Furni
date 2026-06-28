const mongoose = require('mongoose');
const Product = require('../models/product');
const Category = require('../models/category');
const Shop = require('../models/Shop');
const User = require('../models/User');
const PlatformConfig = require('../models/platformConfig');
const { attachPricing } = require('../utils/pricing');

const DEFAULT_PAGE_SIZE = 12;
const PUBLIC_PRODUCT_STATUSES = ['active', 'out_of_stock'];
const PRODUCT_SORT_FIELDS = ['createdAt', 'price', 'sold', 'averageRating', 'views', 'wishlistCount'];

const getPublicProductQuery = async (extra = {}) => {
  const visibleShops = await Shop.find({ status: Shop.STATUS.APPROVED }).select('_id').lean();
  const visibleShopIds = visibleShops.map((shop) => shop._id);

  return {
    $and: [
      { isActive: true },
      { status: { $in: PUBLIC_PRODUCT_STATUSES } },
      {
        $or: [
          { shop: { $in: visibleShopIds } },
          { shop: null }
        ]
      },
      extra
    ]
  };
};

const isPublicProductVisible = (product) => {
  return Boolean(
    product &&
    product.isActive !== false &&
    PUBLIC_PRODUCT_STATUSES.includes(product.status) &&
    (!product.shop || product.shop.status === Shop.STATUS.APPROVED)
  );
};

// Các field sản phẩm vendor có thể gửi lên (whitelist)
const PRODUCT_FIELDS = [
    'name', 'description', 'dimensions', 'weight', 'brand', 'color', 'material',
    'style', 'requiresAssembly', 'deliveryType', 'variant', 'variants',
    'price', 'originalPrice', 'quantity', 'category', 'images',
    'metaTitle', 'metaDescription', 'status', 'isActive'
];

// Lọc body chỉ giữ các field hợp lệ và bỏ field undefined
const pickProductFields = (body) => {
    const data = {};
    PRODUCT_FIELDS.forEach((key) => {
        if (body[key] !== undefined) data[key] = body[key];
    });
    return data;
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getAllProducts = async (req, res) => {
  try {
    // Lấy config số sản phẩm mỗi trang từ platform
    const configLimit = await PlatformConfig.getValue('products_per_page', DEFAULT_PAGE_SIZE);
    
    const { 
      category, 
      brand, 
      minPrice, 
      maxPrice, 
      search,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = configLimit
    } = req.query;

    // Build query
    let query = {};
    
    if (category) {
      // Check if it's a valid ObjectId, otherwise treat as slug
      if (mongoose.isValidObjectId(category)) {
        query.category = category;
      } else {
        // It's a slug, find the category first
        const cat = await Category.findOne({ slug: category });
        if (cat) {
          query.category = cat._id;
        }
      }
    }

    if (req.query.shop) {
      query.shop = req.query.shop;
    }

    if (brand) {
      query.brand = brand;
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    query = await getPublicProductQuery(query);
    const normalizedSort = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortField = PRODUCT_SORT_FIELDS.includes(normalizedSort) ? normalizedSort : 'createdAt';
    const sortDirection = sort.startsWith('-') || order === 'desc' ? -1 : 1;

    // Count total
    const total = await Product.countDocuments(query);

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    let products;

    if (sortField === 'wishlistCount') {
      products = await Product.aggregate([
        { $match: query },
        {
          $lookup: {
            from: User.collection.name,
            localField: '_id',
            foreignField: 'wishlist',
            as: 'wishlistedBy'
          }
        },
        { $addFields: { wishlistCount: { $size: '$wishlistedBy' } } },
        { $sort: { wishlistCount: sortDirection, views: -1, sold: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: Number(limit) },
        { $project: { wishlistedBy: 0 } }
      ]);

      await Product.populate(products, [
        { path: 'category', select: 'name slug' },
        { path: 'shop', select: 'name slug logo isActive status' }
      ]);
    } else {
      products = await Product.find(query)
        .populate('category', 'name slug')
        .populate('shop', 'name slug logo isActive status')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(Number(limit))
        .lean();
    }

    await attachPricing(products);

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: Number(page),
          totalPages,
          pages: totalPages,
          limit: Number(limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách sản phẩm',
      error: error.message
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProduct = async (req, res) => {
  try {
    // Cho phép tra cứu theo ObjectId hoặc theo slug (URL thân thiện: /product/:slug)
    const { id } = req.params;
    const lookup = mongoose.isValidObjectId(id) ? { _id: id } : { slug: id };

    const product = await Product.findOneAndUpdate(
      lookup,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('category', 'name slug')
      .populate('shop', 'name slug logo banner description phone email address isActive status')
      .lean();

    if (!isPublicProductVisible(product)) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Kiểm tra sản phẩm có đang active không
    if (!product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh'
      });
    }

    // Shop bị khóa (suspended) thì không hiển thị sản phẩm.
    // isActive = false (tạm nghỉ) thì vẫn cho xem nhưng FE sẽ ẩn nút mua.
    if (product.shop && product.shop.status === 'suspended') {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại hoặc cửa hàng đã ngừng hoạt động'
      });
    }

    await attachPricing(product);

    res.status(200).json({
      success: true,
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin sản phẩm',
      error: error.message
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Vendor+Admin
const createProduct = async (req, res) => {
  try {
    const data = pickProductFields(req.body);

    // Check if category exists
    const categoryExists = await Category.findById(data.category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Danh mục không tồn tại'
      });
    }

    // Gán shop: vendor -> shop của chính họ; admin có thể truyền shop trong body
    if (req.user && req.user.role === 'vendor') {
      const shop = await Shop.findOne({ owner: req.user._id });
      if (!shop) {
        return res.status(400).json({
          success: false,
          message: 'Bạn chưa có cửa hàng. Vui lòng đăng ký cửa hàng trước!'
        });
      }
      // Shop phải được admin duyệt mới được đăng bán
      if (shop.status !== Shop.STATUS.APPROVED) {
        return res.status(403).json({
          success: false,
          message: 'Cửa hàng của bạn chưa được duyệt nên chưa thể đăng bán sản phẩm.'
        });
      }
      data.shop = shop._id;
    } else if (req.body.shop) {
      data.shop = req.body.shop;
    }

    const product = await Product.create(data);

    res.status(201).json({
      success: true,
      message: 'Tạo sản phẩm thành công',
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo sản phẩm',
      error: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Vendor+Admin
const updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Vendor chỉ được sửa sản phẩm thuộc shop của mình
    if (req.user && req.user.role === 'vendor') {
      const shop = await Shop.findOne({ owner: req.user._id });
      if (!shop || !product.shop || product.shop.toString() !== shop._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền sửa sản phẩm này'
        });
      }
    }

    // Check if category exists if being updated
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Danh mục không tồn tại'
        });
      }
    }

    // Update fields (whitelist, bỏ undefined)
    const updateData = pickProductFields(req.body);

    product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name');

    res.status(200).json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật sản phẩm',
      error: error.message
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Vendor+Admin
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        // Vendor chỉ được xóa sản phẩm thuộc shop của mình
        if (req.user && req.user.role === 'vendor') {
            const shop = await Shop.findOne({ owner: req.user._id });
            if (!shop || !product.shop || product.shop.toString() !== shop._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xóa sản phẩm này'
                });
            }
        }

        await product.deleteOne();
        res.status(200).json({
            success: true,
            message: 'Xóa sản phẩm thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xóa sản phẩm'
        });
    }
};

// @desc    Filtering, sorting, pagination for products
// @route   GET /api/products?category=...&price[gte]=...&price[lte]=...&sort=...&page=...&limit=...
// @access  Public
const filterProducts = async (req, res) => {

  try {
    // Lấy config số sản phẩm mỗi trang từ platform
    const configLimit = await PlatformConfig.getValue('products_per_page', DEFAULT_PAGE_SIZE);

    const queryObj = { ...req.query }

    const excludeFields = ['sort', 'page', 'limit', 'fields']

    excludeFields.forEach(el => delete queryObj[el])

    let queryString = JSON.stringify(queryObj)

    queryString = queryString.replace(
      /\b(gte|gt|lte|lt)\b/g,
      match => `$${match}`
    )

    const formatQuery = JSON.parse(queryString)

    // Search by name
    if (queryObj?.name) {

      formatQuery.name = {
        $regex: queryObj.name,
        $options: 'i'
      }
    }

    // Sorting
    let sortBy = '-createdAt'

    if (req.query.sort) {
      sortBy = req.query.sort.split(',').join(' ')
    }

    // Pagination
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || configLimit
    const skip = (page - 1) * limit

    const publicQuery = await getPublicProductQuery(formatQuery);

    // Query
    const products = await Product.find(publicQuery)
      .populate('category', 'name')
      .populate('shop', 'name slug logo isActive status')
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .lean();

    await attachPricing(products);

    const count = await Product.countDocuments(publicQuery)
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,

      data: {
        products,

        pagination: {
          total: count,
          page,
          totalPages,
          pages: totalPages,
          limit
        }
      }
    })

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi lọc sản phẩm',
      error: error.message
    })
  }
}

// @desc    Rating products
// @route   POST /api/products/ratings/:pid
// @access  Private (Customer)
const ratings = async(req, res) => {
    try {
        const { _id } = req.user;
        const { star, comment } = req.body;
        const { pid } = req.params;

        if (!star || star < 1 || star > 5) {
            return res.status(400).json({
                success: false,
                message: 'Số sao phải từ 1 đến 5'
            });
        }

        const product = await Product.findById(pid);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        const alreadyRated = product.ratings.find(
            (r) => r.postedBy.toString() === _id.toString()
        );

        if (alreadyRated) {
            await Product.updateOne(
                { _id: pid, "ratings.postedBy": _id },
                { $set: { "ratings.$.star": star, "ratings.$.comment": comment } }
            );
        } else {
            await Product.findByIdAndUpdate(pid, {
                $push: {
                    ratings: {
                        star: Number(star),
                        comment: comment || '',
                        postedBy: _id
                    }
                }
            });
        }

        // Avg Start = Sum of Star/ Number of Comments
        const updatedProduct = await Product.findById(pid);
        const totalRatings = updatedProduct.ratings.length;
        const sumRatings = updatedProduct.ratings.reduce((sum, r) => sum + r.star, 0);
        const averageRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

        await Product.findByIdAndUpdate(pid, {
            totalRatings: totalRatings,
            averageRating: Math.round(averageRating * 10) / 10
        });

        res.status(200).json({
            success: true,
            message: 'Đã đánh giá sản phẩm thành công',
            data: {
                totalRatings,
                averageRating: Math.round(averageRating * 10) / 10
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đánh giá sản phẩm',
            error: error.message
        });
    }
};

// @desc    Get ratings of a product
// @route   GET /api/products/ratings/:pid
// @access  Public
const getProductRatings = async (req, res) => {
    try {
        const { pid } = req.params;

        const product = await Product.findById(pid)
            .populate('ratings.postedBy', 'fullName profileImage');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                ratings: product.ratings,
                totalRatings: product.totalRatings,
                averageRating: product.averageRating
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy đánh giá sản phẩm',
            error: error.message
        });
    }
};

// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Public
const getProductsByCategory = async (req, res) => {
    try {
        const { slug } = req.params;
        const { page = 1, limit = 12, sort = '-createdAt' } = req.query;

        const category = await Category.findOne({ slug });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục'
            });
        }

        const publicQuery = await getPublicProductQuery({ category: category._id });

        const products = await Product.find(publicQuery)
            .populate('category', 'name slug')
            .populate('shop', 'name slug logo isActive status')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        await attachPricing(products);

        const total = await Product.countDocuments(publicQuery);

        res.status(200).json({
            success: true,
            data: {
                category,
                products,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy sản phẩm theo danh mục',
            error: error.message
        });
    }
};

// @desc    Get best selling products
// @route   GET /api/products/best-sellers
// @access  Public
const getBestSellers = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const products = await Product.find(await getPublicProductQuery())
            .populate('category', 'name')
            .populate('shop', 'name slug logo isActive status')
            .sort({ sold: -1 })
            .limit(parseInt(limit))
            .lean();

        await attachPricing(products);

        res.status(200).json({
            success: true,
            data: { products }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy sản phẩm bán chạy',
            error: error.message
        });
    }
};

// @desc    Get trending products
// @route   GET /api/products/trending
// @access  Public
const getTrendingProducts = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const publicQuery = await getPublicProductQuery();

        const products = await Product.aggregate([
            { $match: publicQuery },
            {
                $lookup: {
                    from: User.collection.name,
                    localField: '_id',
                    foreignField: 'wishlist',
                    as: 'wishlistedBy'
                }
            },
            {
                $addFields: {
                    wishlistCount: { $size: '$wishlistedBy' },
                    trendScore: {
                        $add: [
                            { $ifNull: ['$views', 0] },
                            { $multiply: [{ $size: '$wishlistedBy' }, 5] }
                        ]
                    }
                }
            },
            { $sort: { trendScore: -1, views: -1, wishlistCount: -1, createdAt: -1 } },
            { $limit: parseInt(limit) },
            { $project: { wishlistedBy: 0 } }
        ]);

        await Product.populate(products, [
            { path: 'category', select: 'name' },
            { path: 'shop', select: 'name slug logo isActive status' }
        ]);

        await attachPricing(products);

        res.status(200).json({
            success: true,
            data: { products }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy sản phẩm nổi bật',
            error: error.message
        });
    }
};

module.exports = {
    getAllProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    filterProducts,
    ratings,
    getProductRatings,
    getProductsByCategory,
    getBestSellers,
    getTrendingProducts
};
