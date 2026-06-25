const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const Product = require('../models/product');
const User = require('../models/user');
const Category = require('../models/category');
const Notification = require('../models/notification');
const Coupon = require('../models/Coupon');
const { attachPricing } = require('../utils/pricing');
const PUBLIC_PRODUCT_STATUSES = ['active', 'out_of_stock'];

// @desc    Lấy thông tin công khai của 1 shop (theo id hoặc slug)
// @route   GET /api/shops/:idOrSlug
// @access  Public
const getShop = async (req, res) => {
    try {
        const { idOrSlug } = req.params;

        let shop = null;
        if (mongoose.isValidObjectId(idOrSlug)) {
            shop = await Shop.findById(idOrSlug);
        }
        if (!shop) {
            shop = await Shop.findOne({ slug: idOrSlug });
        }
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cửa hàng' });
        }

        const [productCount, soldAgg] = await Promise.all([
            Product.countDocuments({
                shop: shop._id,
                isActive: true,
                status: { $in: PUBLIC_PRODUCT_STATUSES },
                ...(shop.status === Shop.STATUS.APPROVED ? {} : { _id: null })
            }),
            Product.aggregate([
                { $match: { shop: shop._id } },
                { $group: { _id: null, totalSold: { $sum: '$sold' } } }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                shop,
                stats: {
                    productCount,
                    totalSold: soldAgg[0]?.totalSold || 0
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin cửa hàng', error: error.message });
    }
};

// @desc    Lấy sản phẩm của 1 shop (công khai, phân trang)
// @route   GET /api/shops/:id/products
// @access  Public
const getShopProducts = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 12, sort = '-createdAt', search, category } = req.query;

        // Resolve shop từ id (ObjectId) hoặc slug
        let shop;
        if (mongoose.isValidObjectId(id)) {
            shop = await Shop.findById(id);
        }
        if (!shop) {
            shop = await Shop.findOne({ slug: id });
        }
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cửa hàng' });
        }

        const query = {
            shop: shop._id,
            isActive: true,
            status: { $in: PUBLIC_PRODUCT_STATUSES },
            ...(shop.status === Shop.STATUS.APPROVED ? {} : { _id: null })
        };
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            Product.find(query).populate('category', 'name').sort(sort).skip(skip).limit(Number(limit)).lean(),
            Product.countDocuments(query)
        ]);
        await attachPricing(products);

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
        res.status(500).json({ success: false, message: 'Lỗi khi lấy sản phẩm của cửa hàng', error: error.message });
    }
};

// @desc    [Admin] Danh sách cửa hàng 
// @route   GET /api/admin/shops?status=pending
// @access  Private/Admin
const getAllShopsAdmin = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) query.status = status;
        if (search) query.name = { $regex: search, $options: 'i' };

        const skip = (Number(page) - 1) * Number(limit);
        const [shops, total] = await Promise.all([
            Shop.find(query).populate('owner', 'fullName email phone').sort('-createdAt').skip(skip).limit(Number(limit)),
            Shop.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: {
                shops,
                pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách cửa hàng', error: error.message });
    }
};

// @desc    [Admin] Duyệt / từ chối / tạm khoá cửa hàng
// @route   PUT /api/admin/shops/:id/status
// @access  Private/Admin
const updateShopStatus = async (req, res) => {
    try {
        const { status, statusNote } = req.body;
        if (!Object.values(Shop.STATUS).includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }

        const shop = await Shop.findById(req.params.id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cửa hàng' });
        }

        const oldStatus = shop.status;
        if (status === Shop.STATUS.APPROVED && oldStatus !== Shop.STATUS.APPROVED) {
            await User.findByIdAndUpdate(shop.owner, { role: 'vendor' });
        } 
        else if (status === Shop.STATUS.REJECTED && oldStatus !== Shop.STATUS.REJECTED) {
            await User.findByIdAndUpdate(shop.owner, { role: 'customer' });
        }

        shop.status = status;
        if (statusNote !== undefined) shop.statusNote = statusNote;
        await shop.save();

        let notifTitle = '';
        let notifBody = '';

        if (status === Shop.STATUS.SUSPENDED && oldStatus !== Shop.STATUS.SUSPENDED) {
            notifTitle = 'Cửa hàng bị tạm khóa';
            notifBody = `Cửa hàng "${shop.name}" của bạn đã bị Admin tạm khóa. Lý do: ${statusNote || 'Vi phạm chính sách'}. Việc quản lý cửa hàng hiện đang bị vô hiệu hóa.`;
        } 

        else if (status === Shop.STATUS.APPROVED && oldStatus === Shop.STATUS.SUSPENDED) {
            notifTitle = 'Cửa hàng đã được mở khóa';
            notifBody = `Cửa hàng "${shop.name}" của bạn đã được Admin mở khóa. Bạn có thể tiếp tục hoạt động kinh doanh bình thường.`;
        }

        if (notifTitle) {
            await Notification.create({
                user: shop.owner, 
                type: 'system',
                title: notifTitle,
                body: notifBody,
                isRead: false
            });
        }

        res.status(200).json({ success: true, message: 'Cập nhật trạng thái cửa hàng thành công', data: { shop } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái cửa hàng', error: error.message });
    }
};
// @desc    Đăng ký mở gian hàng mới
// @route   POST /api/shops/register
// @access  Private 
const registerShop = async (req, res) => {
    try {
        const { name, slug, phone, email, address, description, logo, banner } = req.body;

        const existingShop = await Shop.findOne({ owner: req.user._id });
        if (existingShop) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã đăng ký một cửa hàng. Không thể đăng ký thêm!'
            });
        }

        if (!name || !slug || !phone || !email || !address || !description) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ các thông tin bắt buộc!'
            });
        }
        const shopExists = await Shop.findOne({ 
            $or: [{ name }, { slug }, { email }] 
        });
        
        if (shopExists) {
            return res.status(400).json({
                success: false,
                message: 'Tên cửa hàng, đường dẫn (slug) hoặc email này đã tồn tại!'
            });
        }

        const newShop = await Shop.create({
            name,
            slug,
            phone,
            email,
            address,
            description,
            logo,
            banner,
            owner: req.user._id,        
            status: Shop.STATUS.PENDING 
        });
        // gửi thông báo cho Admin
        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) {
            await Notification.create({
                user: adminUser._id,
                type: 'system',
                title: 'Yêu cầu đăng ký bán hàng mới',
                body: `Cửa hàng "${name}" vừa gửi yêu cầu đăng ký bán hàng. Vui lòng kiểm tra và xét duyệt.`,
                isRead: false
            });
        }
        res.status(201).json({
            success: true,
            message: 'Gửi yêu cầu đăng ký shop thành công! Vui lòng chờ Admin phê duyệt.',
            data: newShop
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
            const firstErrorMessage = Object.values(error.errors)[0].message;
        
            return res.status(400).json({ 
                success: false, 
                message: firstErrorMessage 
            });
        }

        res.status(500).json({ 
            success: false, 
            message: 'Đã xảy ra lỗi khi đăng ký cửa hàng', 
            error: error.message 
        });
    }
};
// @desc    Lấy thông tin đơn đăng ký hiện tại của User
// @route   GET /api/shops/my-registration
// @access  Private (Vendor/Customer)
const getMyRegistration = async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        if (!shop) {
            return res.status(200).json({ success: true, data: null }); 
        }
        res.status(200).json({ success: true, data: shop });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin đơn đăng ký', error: error.message });
    }
};

// @desc    Gửi lại đơn đăng ký đã bị từ chối
// @route   PUT /api/shops/resubmit
// @access  Private
const resubmitRegistration = async (req, res) => {
    try {
        const { name, slug, phone, email, address, description, logo, banner } = req.body;
        
        const shop = await Shop.findOne({ owner: req.user._id });
        if (!shop) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đăng ký' });
        
        if (shop.status !== Shop.STATUS.REJECTED) {
            return res.status(400).json({ success: false, message: 'Chỉ có thể gửi lại đơn khi đã bị từ chối!' });
        }

        const shopExists = await Shop.findOne({ 
            _id: { $ne: shop._id },
            $or: [{ name }, { slug }, { email }] 
        });
        if (shopExists) return res.status(400).json({ success: false, message: 'Tên, đường dẫn (slug) hoặc email đã tồn tại!' });

        // Cập nhật thông tin mới
        shop.name = name;
        shop.slug = slug;
        shop.phone = phone;
        shop.email = email;
        shop.address = address;
        shop.description = description;
        if (logo) shop.logo = logo;
        if (banner) shop.banner = banner;
        shop.status = Shop.STATUS.PENDING; 
        await shop.save();

        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) {
            await Notification.create({
                user: adminUser._id, 
                type: 'system',
                title: 'Gửi lại yêu đăng ký bán hàng.',
                body: `Cửa hàng "${shop.name}" vừa cập nhật thông tin và gửi lại yêu cầu đăng ký bán hàng. Vui lòng kiểm tra và xét duyệt.`,
                isRead: false
            });
        }

        res.status(200).json({ success: true, message: 'Đã cập nhật và gửi lại đơn đăng ký!', data: shop });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
// @desc    [Admin] Xem chi tiết 1 shop
// @route   GET /api/admin/shops/:id
// @access  Private/Admin
const getAdminShopDetail = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id).populate('owner', 'fullName email phone');
        if (!shop) return res.status(404).json({ success: false, message: 'Không tìm thấy cửa hàng' });
        res.status(200).json({ success: true, data: shop });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    [Admin] Xem danh sách sản phẩm của 1 shop (Có phân trang & Lọc danh mục)
// @route   GET /api/admin/shops/:id/products
// @access  Private/Admin
const getAdminShopProducts = async (req, res) => {
    try {
        const { id } = req.params;
        const { search, category, status, page = 1, limit = 10 } = req.query;

        const query = { shop: id };

        // Xử lý Lọc theo Danh mục
        if (category) {
            if (mongoose.isValidObjectId(category)) {
                query.category = category;
            } else {
                const foundCategory = await Category.findOne({
                    $or: [{ name: category }, { slug: category }]
                });
                if (foundCategory) query.category = foundCategory._id;
                else query.category = new mongoose.Types.ObjectId(); 
            }
        }

        // Xử lý Lọc trạng thái
        if (status) {
            if (status === 'selling') query.status = 'active';
            else if (status === 'hidden') query.status = 'hidden';
            else if (status === 'draft') query.status = 'draft';
            else if (status === 'outofstock') query.status = 'out_of_stock';
        }

        // Xử lý Tìm kiếm
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } } 
            ];
        }

        //  Phân trang
        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            Product.find(query).populate('category', 'name').sort('-createdAt').skip(skip).limit(Number(limit)),
            Product.countDocuments(query)
        ]);

        const productsWithMappedStatus = products.map(prod => {
            const item = prod.toObject();
            if (item.status === 'active') item.status = 'selling';
            else if (item.status === 'out_of_stock') item.status = 'outofstock';
            return item;
        });

        const distinctCategoryIds = await Product.distinct('category', { shop: id });
        const shopCategories = await Category.find({ _id: { $in: distinctCategoryIds } }).select('name');

        res.status(200).json({ 
            success: true, 
            data: productsWithMappedStatus,
            categories: shopCategories, 
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit)),
                limit: Number(limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// @desc    [Admin] Ẩn/Hiện sản phẩm
// @route   PUT /api/admin/products/:id/toggle-visibility
// @access  Private/Admin
const toggleProductVisibilityAdmin = async (req, res) => {
    try {
        const { hiddenReason } = req.body; 
    
        const product = await Product.findById(req.params.id).populate('shop');
        if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

        if (product.status === 'hidden') {
            product.status = 'active';
            product.isActive = true;

            if (product.shop && product.shop.owner) {
                await Notification.create({
                    user: product.shop.owner,
                    type: 'system',
                    title: 'Sản phẩm đã ẩn được hiển thị lại',
                    body: `Sản phẩm "${product.name}" của bạn đã được Admin phê duyệt và cho phép hiển thị lại trên hệ thống.`,
                    isRead: false
                });
            }
        } else {
            if (!hiddenReason || !hiddenReason.trim()) {
                return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do ẩn sản phẩm!' });
            }
            
            product.status = 'hidden';
            product.isActive = false;

            if (product.shop && product.shop.owner) {
                await Notification.create({
                    user: product.shop.owner,
                    type: 'system',
                    title: 'Sản phẩm vi phạm bị ẩn',
                    body: `Sản phẩm "${product.name}" của bạn đã bị Admin ẩn. Lý do: ${hiddenReason}. Vui lòng cập nhật lại thông tin để được duyệt.`,
                    isRead: false
                });
            }
        }
        
        await product.save();
        res.status(200).json({ success: true, message: 'Đã cập nhật trạng thái hiển thị của sản phẩm!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get public vouchers/coupons of a shop
// @route   GET /api/shops/:idOrSlug/vouchers
// @access  Public
const getShopVouchers = async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        let shopId;

        if (mongoose.isValidObjectId(idOrSlug)) {
            shopId = idOrSlug;
        } else {
            const shop = await Shop.findOne({ slug: idOrSlug });
            if (!shop) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy cửa hàng' });
            }
            shopId = shop._id;
        }

        const now = new Date();
        const coupons = await Coupon.find({
            shop: shopId,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            $or: [
                { usageLimit: 0 },
                { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
            ]
        }).sort({ value: -1 }).limit(10);

        const vouchers = coupons.map((c) => ({
            _id: c._id,
            code: c.code,
            description: c.description,
            discountType: c.discountType,
            value: c.value,
            maxDiscount: c.maxDiscount,
            minOrderValue: c.minOrderValue,
            endDate: c.endDate,
            remaining: c.usageLimit === 0 ? null : Math.max(0, c.usageLimit - c.usedCount),
        }));

        res.status(200).json({ success: true, data: vouchers });
    } catch (error) {
        console.error('getShopVouchers error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy voucher', error: error.message });
    }
};

// @desc    Get all public vouchers across all shops
// @route   GET /api/vouchers/all
// @access  Public
const getAllVouchers = async (req, res) => {
    try {
        const now = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            $or: [
                { usageLimit: 0 },
                { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
            ]
        })
        .populate('shop', 'name slug logo')
        .sort({ createdAt: -1 })
        .limit(50);

        const vouchers = coupons.map((c) => ({
            _id: c._id,
            code: c.code,
            description: c.description,
            discountType: c.discountType,
            value: c.value,
            maxDiscount: c.maxDiscount,
            minOrderValue: c.minOrderValue,
            endDate: c.endDate,
            remaining: c.usageLimit === 0 ? null : Math.max(0, c.usageLimit - c.usedCount),
            shop: c.shop ? {
                _id: c.shop._id,
                name: c.shop.name,
                slug: c.shop.slug,
                logo: c.shop.logo,
            } : null,
        }));

        res.status(200).json({ success: true, data: vouchers });
    } catch (error) {
        console.error('getAllVouchers error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách voucher', error: error.message });
    }
};

module.exports = { getShop, getShopProducts, getAllShopsAdmin,
    updateShopStatus, registerShop, getMyRegistration, resubmitRegistration,
    getAdminShopDetail, getAdminShopProducts, toggleProductVisibilityAdmin,
    getShopVouchers, getAllVouchers };
