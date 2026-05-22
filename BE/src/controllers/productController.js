const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getAllProducts = async (req, res) => {
  try {
    const { 
      category, 
      brand, 
      minPrice, 
      maxPrice, 
      search,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    // Build query
    const query = { isActive: true };
    
    if (category) {
      query.category = category;
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

    // Count total
    const total = await Product.countDocuments(query);

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
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
    const product = await Product.findById(req.params.id).populate('category', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

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
    const { 
      name, 
      description, 
      dimensions, 
      brand, 
      color, 
      material, 
      variant,
      price, 
      quantity, 
      category, 
      images 
    } = req.body;

    // Check if category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Danh mục không tồn tại'
      });
    }

    const product = await Product.create({
      name,
      description,
      dimensions,
      brand,
      color,
      material,
      variant,
      price,
      quantity,
      category,
      images
    });

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
    const { 
      name, 
      description, 
      dimensions, 
      brand, 
      color, 
      material, 
      variant,
      price, 
      quantity, 
      category, 
      images,
      isActive
    } = req.body;

    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Check if category exists if being updated
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Danh mục không tồn tại'
        });
      }
    }

    // Update fields
    const updateData = {
      name, description, dimensions, brand, color, material, variant,
      price, quantity, category, images, isActive
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

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
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }
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
    const limit = Number(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Query
    const products = await Product.find(formatQuery)
      .populate('category', 'name')
      .sort(sortBy)
      .skip(skip)
      .limit(limit)

    const count = await Product.countDocuments(formatQuery)

    res.status(200).json({
      success: true,

      data: {
        products,

        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit),
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

module.exports = {
    getAllProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    filterProducts
};