const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Shop = require('../models/Shop');
const Product = require('../models/product');
const User = require('../models/user');
const Category = require('../models/category');
const Notification = require('../models/notification');
const Coupon = require('../models/coupon');
const Promotion = require('../models/promotion');
const { VoucherWallet } = require('../models/voucherWallet');
const { attachPricing } = require('../utils/pricing');
const PUBLIC_PRODUCT_STATUSES = ['active', 'out_of_stock'];
const SHOP_VOUCHER_PROMOTION_TYPES = [
    Promotion.TYPE.COUPON,
    Promotion.TYPE.BUNDLE,
    Promotion.TYPE.FREESHIP,
];

const getOptionalUserId = (req) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.split(' ')[1];
    if (!token || token === 'null' || token === 'undefined') return null;

    try {
        return jwt.verify(token, process.env.JWT_SECRET)?.id || null;
    } catch {
        return null;
    }
};

const getClaimedCouponIds = async (req, couponIds) => {
    const userId = getOptionalUserId(req);
    if (!userId || !couponIds.length) return new Set();

    const wallets = await VoucherWallet.find({
        user: userId,
        coupon: { $in: couponIds },
    }).select('coupon').lean();

    return new Set(wallets.map((wallet) => wallet.coupon.toString()));
};

const generateShopVoucherCode = async () => {
    for (let i = 0; i < 8; i += 1) {
        const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `SHOP${randomCode}`;
        const exists = await Coupon.exists({ code });
        if (!exists) return code;
    }
    return `SHOP${Date.now().toString(36).toUpperCase().slice(-6)}`;
};

const syncShopVoucherCoupons = async (shopId) => {
    const promotions = await Promotion.find({
        shop: shopId,
        type: { $in: SHOP_VOUCHER_PROMOTION_TYPES },
    });

    await Promise.all(promotions.map(async (promotion) => {
        const coupon = await Coupon.findOne({ promotion: promotion._id });
        const payload = {
            promotion: promotion._id,
            shop: shopId,
            description: promotion.description || promotion.name,
            discountType: promotion.discountType || 'percent',
            value: promotion.value || 0,
            maxDiscount: promotion.discountType === 'percent' ? (promotion.maxDiscount || 0) : 0,
            minOrderValue: promotion.minOrderValue || 0,
            startDate: promotion.startDate,
            endDate: promotion.endDate,
            usageLimit: promotion.maxUsage || 0,
            isActive: [Promotion.STATUS.SCHEDULED, Promotion.STATUS.RUNNING].includes(promotion.status),
        };

        if (coupon) {
            Object.assign(coupon, payload);
            await coupon.save();
            return;
        }

        await Coupon.create({
            code: await generateShopVoucherCode(),
            ...payload,
        });
    }));
};

const generatePlatformVoucherCode = async () => {
    for (let i = 0; i < 8; i += 1) {
        const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `FURNI${randomCode}`;
        const exists = await Coupon.exists({ code });
        if (!exists) return code;
    }
    return `FURNI${Date.now().toString(36).toUpperCase().slice(-6)}`;
};

const syncPlatformVoucherCoupons = async () => {
    await Promotion.syncLifecycleStatuses({ shop: null });
    const promotions = await Promotion.find({
        shop: null,
        type: Promotion.TYPE.COUPON,
    });

    await Promise.all(promotions.map(async (promotion) => {
        const coupon = await Coupon.findOne({ promotion: promotion._id });
        const payload = {
            promotion: promotion._id,
            shop: null,
            description: promotion.description || promotion.name,
            discountType: promotion.discountType || 'percent',
            value: promotion.value || 0,
            maxDiscount: promotion.discountType === 'percent' ? (promotion.maxDiscount || 0) : 0,
            minOrderValue: promotion.minOrderValue || 0,
            startDate: promotion.startDate,
            endDate: promotion.endDate,
            usageLimit: promotion.maxUsage || 0,
            isActive: [Promotion.STATUS.SCHEDULED, Promotion.STATUS.RUNNING].includes(promotion.status),
        };

        if (coupon) {
            Object.assign(coupon, payload);
            await coupon.save();
            return;
        }

        await Coupon.create({
            code: await generatePlatformVoucherCode(),
            ...payload,
        });
    }));
};

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

// @desc    Lấy cấu hình vận chuyển công khai của 1 shop
// @route   GET /api/shops/:id/shipping-config
// @access  Public
const getShopShippingConfig = async (req, res) => {
    try {
        const { id } = req.params;

        let shop;
        if (mongoose.isValidObjectId(id)) {
            shop = await Shop.findById(id).select('shippingConfig name provinceCode');
        }
        if (!shop) {
            shop = await Shop.findOne({ slug: id }).select('shippingConfig name provinceCode');
        }
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cửa hàng' });
        }

        res.status(200).json({
            success: true,
            data: {
                shopId: shop._id,
                shopName: shop.name,
                shopProvinceCode: shop.provinceCode,
                shippingConfig: shop.shippingConfig || {}
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy cấu hình vận chuyển', error: error.message });
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

        await syncShopVoucherCoupons(shopId);

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
        })
        .populate('shop', 'name slug logo')
        .populate('promotion', 'type name')
        .sort({ value: -1 })
        .limit(10);

        const claimedCouponIds = await getClaimedCouponIds(req, coupons.map((c) => c._id));
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
            usageLimit: c.usageLimit,
            promotion: c.promotion ? {
                _id: c.promotion._id,
                type: c.promotion.type,
                name: c.promotion.name,
            } : null,
            shop: c.shop ? {
                _id: c.shop._id,
                name: c.shop.name,
                slug: c.shop.slug,
                logo: c.shop.logo,
            } : null,
            _claimed: claimedCouponIds.has(c._id.toString()),
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
            usageLimit: c.usageLimit,
            promotion: c.promotion,
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

// @desc    Get public platform coupons (admin-created, no shop)
// @route   GET /api/coupons/platform
// @access  Public
const getPlatformCoupons = async (req, res) => {
    try {
        await syncPlatformVoucherCoupons();

        const now = new Date();
        const coupons = await Coupon.find({
            shop: null,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            $or: [
                { usageLimit: 0 },
                { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
            ]
        })
        .sort({ value: -1 })
        .limit(20);

        const claimedCouponIds = await getClaimedCouponIds(req, coupons.map((c) => c._id));
        const data = coupons.map((c) => ({
            _id: c._id,
            code: c.code,
            description: c.description,
            discountType: c.discountType,
            value: c.value,
            maxDiscount: c.maxDiscount,
            minOrderValue: c.minOrderValue,
            endDate: c.endDate,
            remaining: c.usageLimit === 0 ? null : Math.max(0, c.usageLimit - c.usedCount),
            _claimed: claimedCouponIds.has(c._id.toString()),
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('getPlatformCoupons error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy coupon toàn sàn', error: error.message });
    }
};

module.exports = { getShop, getShopProducts, getShopShippingConfig, getAllShopsAdmin,
    updateShopStatus, registerShop, getMyRegistration, resubmitRegistration,
    getAdminShopDetail, getAdminShopProducts, toggleProductVisibilityAdmin,
    getShopVouchers, getAllVouchers, getPlatformCoupons };
