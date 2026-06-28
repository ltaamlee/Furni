const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const Shop = require('../models/Shop');
const Product = require('../models/product');
const Category = require('../models/category');
const Promotion = require('../models/promotion');
const Coupon = require('../models/Coupon');
const Order = require('../models/order');
const { ORDER_STATUS } = require('../models/order');
const Wallet = require('../models/wallet');
const Transaction = require('../models/transaction');
const Review = require('../models/review');
const Notification = require('../models/notification');
const { refundOrderToWallet } = require('../services/walletService');
const { notifyCustomerOrderStatus } = require('../services/notificationService');

// Lấy shop của vendor đang đăng nhập (helper dùng chung)
const getOwnerShop = async (userId) => Shop.findOne({ owner: userId });

// Chuyển trạng thái đơn hợp lệ (vendor) — đồng bộ với orderController
const ORDER_TRANSITIONS = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PREPARING]: [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.CANCEL_REQUESTED]: [ORDER_STATUS.CANCELLED, ORDER_STATUS.PREPARING],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: []
};

const VALID_SHIPPING_PROVIDERS = ['jt', 'ghtk', 'viettel'];

const normalizeProviderCode = (provider) => {
    if (!provider) return '';
    if (typeof provider === 'string') return provider.toLowerCase();
    return String(provider.code || provider._id || '').toLowerCase();
};

const pickShopShippingProvider = (provider, shopId) => {
    if (!provider || typeof provider === 'string') return provider || null;
    if (provider.code || provider.name || provider._id) return provider;

    const shopProvider = provider[shopId.toString()];
    if (shopProvider) return shopProvider;

    return Object.values(provider).find(Boolean) || null;
};

const BASE_SHOP_REVENUE_RATE = 10;

const orderProductValue = (order) => {
    if (typeof order.subtotal === 'number') return order.subtotal;
    return (order.products || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
};

const attachVendorOrderRevenue = (order, shop) => {
    const plain = typeof order.toObject === 'function' ? order.toObject() : order;
    const shopSubtotal = orderProductValue(plain);
    const commissionRate = Number(shop.commissionRate || 0);
    const shopRevenueRate = Math.max(0, BASE_SHOP_REVENUE_RATE - commissionRate);
    const shopRevenue = Math.round(shopSubtotal * shopRevenueRate / 100);

    return {
        ...plain,
        shopSubtotal,
        shopRevenue,
        commissionRate,
        shopRevenueRate,
    };
};

const ONLINE_PAYMENT_METHODS = ['PAYOS', 'VNPAY', 'MOMO', 'ZALOPAY', 'WALLET'];
const WALLET_HISTORY_TX_CATEGORIES = ['withdraw', 'refund', 'adjustment'];

const onlinePaidOrderQuery = (shopId) => ({
    shop: shopId,
    paymentStatus: 'paid',
    paymentMethod: { $in: ONLINE_PAYMENT_METHODS },
    status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.CANCEL_REQUESTED] },
});

const dateOfPaidOrder = (order) => order.updatedAt || order.orderedAt || order.createdAt;

const onlineOrderToWalletTx = (order, shop) => {
    const withRevenue = attachVendorOrderRevenue(order, shop);
    return {
        _id: `order:${withRevenue._id}`,
        type: 'credit',
        category: 'order_income',
        amount: withRevenue.shopRevenue,
        status: 'success',
        description: `Đơn thanh toán online #${withRevenue.orderNumber}`,
        order: withRevenue._id,
        orderNumber: withRevenue.orderNumber,
        paymentMethod: withRevenue.paymentMethod,
        createdAt: dateOfPaidOrder(withRevenue),
    };
};

const sumOnlineOrderRevenue = (orders, shop) =>
    orders.reduce((sum, order) => sum + attachVendorOrderRevenue(order, shop).shopRevenue, 0);

const sumOnlineOrderCommission = (orders, shop) =>
    orders.reduce((sum, order) => {
        const withRevenue = attachVendorOrderRevenue(order, shop);
        return sum + Math.round(withRevenue.shopSubtotal * withRevenue.commissionRate / 100);
    }, 0);

// Tính phần thuộc về shop trong 1 đơn (Hướng B: 1 đơn có sản phẩm của nhiều shop)
const shopSliceOfOrder = (order, shopId) => {
    const sid = shopId.toString();
    const shopItems = (order.products || []).filter((p) => p.shop && p.shop.toString() === sid);
    const shopSubtotal = shopItems.reduce((s, it) => s + it.price * it.quantity, 0);
    const shopQuantity = shopItems.reduce((s, it) => s + it.quantity, 0);
    return { shopItems, shopSubtotal, shopQuantity };
};

// ── Helpers tổng hợp doanh thu theo shop (chỉ tính dòng sản phẩm của shop) ──
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// Doanh thu shop theo từng ngày trong `days` ngày gần nhất (đơn chưa huỷ)
const revenueSeries = async (shopId, days) => {
    const start = startOfDay(new Date(Date.now() - (days - 1) * 86400000));
    const rows = await Order.aggregate([
        { $match: { 'products.shop': shopId, status: { $ne: ORDER_STATUS.CANCELLED }, createdAt: { $gte: start } } },
        { $unwind: '$products' },
        { $match: { 'products.shop': shopId } },
        { $group: { _id: { $dateToString: { format: '%d/%m', date: '$createdAt' } }, revenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } } } }
    ]);
    const map = {};
    rows.forEach((r) => { map[r._id] = r.revenue; });
    const labels = [];
    const data = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(start.getTime() + i * 86400000);
        const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        labels.push(key);
        data.push(map[key] || 0);
    }
    return { labels, data };
};

// Top sản phẩm bán chạy của shop theo số lượng; doanh thu dùng để phá hòa.
const topProductsOfShop = async (shopId, since = null, limit = 5) => {
    const match = { 'products.shop': shopId, status: { $ne: ORDER_STATUS.CANCELLED } };
    if (since) match.createdAt = { $gte: since };
    const rows = await Order.aggregate([
        { $match: match },
        { $unwind: '$products' },
        { $match: { 'products.shop': shopId } },
        { $group: { _id: '$products.product', name: { $first: '$products.name' }, sold: { $sum: '$products.quantity' }, revenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } } } },
        { $sort: { sold: -1, revenue: -1 } },
        { $limit: limit }
    ]);
    // Lấy tên danh mục
    const ids = rows.map((r) => r._id).filter(Boolean);
    const prods = await Product.find({ _id: { $in: ids } }).populate('category', 'name').select('category name');
    const catOf = {};
    prods.forEach((p) => { catOf[p._id.toString()] = p.category?.name || '—'; });
    return rows.map((r, i) => ({ rank: i + 1, productId: r._id, name: r.name, cat: catOf[r._id?.toString()] || '—', sold: r.sold, revenue: r.revenue }));
};

// Tổng doanh thu + số đơn của shop kể từ `since`
const shopRevenueTotals = async (shopId, since = null) => {
    const match = { 'products.shop': shopId, status: { $ne: ORDER_STATUS.CANCELLED } };
    if (since) match.createdAt = { $gte: since };
    const rows = await Order.aggregate([
        { $match: match },
        { $unwind: '$products' },
        { $match: { 'products.shop': shopId } },
        { $group: { _id: '$_id', orderRevenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } } } },
        { $group: { _id: null, revenue: { $sum: '$orderRevenue' }, orders: { $sum: 1 } } }
    ]);
    return { revenue: rows[0]?.revenue || 0, orders: rows[0]?.orders || 0 };
};

// Nhãn trạng thái sản phẩm (cho file Excel)
const STATUS_LABEL = {
    active: 'Đang bán',
    hidden: 'Ẩn',
    draft: 'Nháp',
    out_of_stock: 'Hết hàng'
};

// Nạp danh sách sản phẩm/danh mục đã chọn của khuyến mãi (để FE hiển thị chip khi sửa)
const populatePromotion = (q) =>
    q.populate('products', 'name images price slug')
        .populate('categories', 'name');

// Bộ lọc theo "tab" trạng thái — suy ra từ status (ý định của vendor) + tồn kho thực tế.
// Mỗi sản phẩm rơi vào đúng 1 nhóm => số đếm các tab cộng lại = tổng.
//   - draft        : status = draft
//   - hidden       : status = hidden
//   - out_of_stock : không phải draft/hidden  &  tồn kho <= 0
//   - active       : không phải draft/hidden  &  tồn kho > 0
const statusBucketQuery = (status) => {
    switch (status) {
        case 'draft': return { status: 'draft' };
        case 'hidden': return { status: 'hidden' };
        case 'out_of_stock': return { status: { $nin: ['draft', 'hidden'] }, quantity: { $lte: 0 } };
        case 'active': return { status: { $nin: ['draft', 'hidden'] }, quantity: { $gt: 0 } };
        default: return {};
    }
};

// Whitelist field khuyến mãi vendor được gửi lên
const PROMO_FIELDS = [
    'name', 'description', 'type', 'discountType', 'value', 'maxDiscount',
    'minOrderValue', 'appliesTo', 'products', 'categories',
    'startDate', 'endDate', 'maxUsage', 'status'
];
const pickPromoFields = (body) => {
    const data = {};
    PROMO_FIELDS.forEach((k) => {
        if (body[k] !== undefined) data[k] = body[k];
    });
    return data;
};

const normalizeCouponCode = (code) => (code || '').trim().toUpperCase();

const generateVendorCouponCode = async () => {
    for (let i = 0; i < 8; i += 1) {
        const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const couponCode = `SORA${randomCode}`;
        const exists = await Coupon.exists({ code: couponCode });
        if (!exists) return couponCode;
    }
    return `SORA${Date.now().toString(36).toUpperCase().slice(-6)}`;
};

const couponActiveFromPromotion = (promotion) => (
    [Promotion.STATUS.SCHEDULED, Promotion.STATUS.RUNNING].includes(promotion.status)
);

const VOUCHER_PROMOTION_TYPES = [
    Promotion.TYPE.COUPON,
    Promotion.TYPE.BUNDLE,
    Promotion.TYPE.FREESHIP,
];

const couponPayloadFromPromotion = (promotion, shopId) => ({
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
    isActive: couponActiveFromPromotion(promotion),
});

const syncCouponForPromotion = async (promotion, shopId, requestedCode) => {
    const coupon = await Coupon.findOne({ promotion: promotion._id });

    if (!VOUCHER_PROMOTION_TYPES.includes(promotion.type)) {
        if (coupon) {
            coupon.isActive = false;
            await coupon.save();
        }
        return null;
    }

    const payload = couponPayloadFromPromotion(promotion, shopId);
    const promoCode = requestedCode !== undefined ? normalizeCouponCode(requestedCode) : '';
    if (coupon) {
        if (promoCode) {
            const existing = await Coupon.findOne({ code: promoCode, _id: { $ne: coupon._id } });
            if (existing) throw new Error('Mã voucher này đã tồn tại!');
            coupon.code = promoCode;
        }
        Object.assign(coupon, payload);
        await coupon.save();
        return coupon;
    }

    const code = promoCode || await generateVendorCouponCode();
    const existing = await Coupon.findOne({ code });
    if (existing) throw new Error('Mã voucher này đã tồn tại!');

    return Coupon.create({
        code,
        ...payload,
    });
};

// @desc    Lấy thông tin shop của vendor
// @route   GET /api/vendor/shop
// @access  Private/Vendor
const getMyShop = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        }
        res.status(200).json({ success: true, data: { shop } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin cửa hàng', error: error.message });
    }
};

// @desc    Tổng quan dashboard vendor
// @route   GET /api/vendor/dashboard
// @access  Private/Vendor
const getDashboardSummary = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        }

        const base = { shop: shop._id };
        const orderBase = { shop: shop._id };
        const todayStart = startOfDay(new Date());

        await Promotion.syncLifecycleStatuses(base);

        const [
            totalProducts, activeProducts, lowStock, runningPromotions, totalOrders, pendingOrders,
            ordersToday, today, revenue7d, revenue30d, topProducts, recentOrdersRaw,
            deliveredCount, cancelledCount, viewsAgg, wallet, ratingAgg
        ] = await Promise.all([
            Product.countDocuments(base),
            Product.countDocuments({ ...base, status: 'active' }),
            Product.countDocuments({ ...base, quantity: { $lte: 5 } }),
            Promotion.countDocuments({ ...base, status: 'running' }),
            Order.countDocuments(orderBase),
            Order.countDocuments({ ...orderBase, status: ORDER_STATUS.PENDING }),
            Order.countDocuments({ ...orderBase, createdAt: { $gte: todayStart } }),
            shopRevenueTotals(shop._id, todayStart),
            revenueSeries(shop._id, 7),
            revenueSeries(shop._id, 30),
            topProductsOfShop(shop._id, null, 5),
            Order.find(orderBase).populate('user', 'fullName').sort('-createdAt').limit(5),
            Order.countDocuments({ ...orderBase, status: ORDER_STATUS.DELIVERED }),
            Order.countDocuments({ ...orderBase, status: ORDER_STATUS.CANCELLED }),
            Product.aggregate([{ $match: base }, { $group: { _id: null, views: { $sum: '$views' } } }]),
            Wallet.findOne({ user: shop.owner }),
            Review.aggregate([{ $match: { shop: shop._id } }, { $group: { _id: null, avg: { $avg: '$rating' }, total: { $sum: 1 } } }])
        ]);

        const recentOrders = recentOrdersRaw.map((o) => {
            const total = o.subtotal || 0;
            return { orderNumber: o.orderNumber, customer: o.shippingAddress?.fullName || o.user?.fullName || '—', total, status: o.status };
        });

        const completedTotal = deliveredCount + cancelledCount;
        const completionRate = completedTotal ? Math.round((deliveredCount / completedTotal) * 1000) / 10 : 0;

        res.status(200).json({
            success: true,
            data: {
                shop: { id: shop._id, name: shop.name, status: shop.status, isActive: shop.isActive },
                stats: {
                    revenueToday: today.revenue,
                    ordersToday,
                    totalProducts, activeProducts, lowStock, runningPromotions,
                    totalOrders, pendingOrders,
                    visits: viewsAgg[0]?.views || 0
                },
                revenue7d,
                revenue30d,
                topProducts,
                recentOrders,
                quickStats: {
                    completionRate,
                    avgRating: Math.round((ratingAgg[0]?.avg || 0) * 10) / 10,
                    totalReviews: ratingAgg[0]?.total || 0,
                    lowStock,
                    walletBalance: wallet?.balance || 0
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy tổng quan', error: error.message });
    }
};

// @desc    Danh sách sản phẩm của shop (kèm số đếm theo tab)
// @route   GET /api/vendor/products
// @access  Private/Vendor
const getMyProducts = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        }

        const { status, category, search, page = 1, limit = 10, sort = '-createdAt' } = req.query;
        const query = { shop: shop._id };
        if (status && status !== 'all') Object.assign(query, statusBucketQuery(status));
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            Product.find(query).populate('category', 'name').sort(sort).skip(skip).limit(Number(limit)),
            Product.countDocuments(query)
        ]);

        // Số đếm cho các tab (suy ra từ status + tồn kho thực tế)
        const baseShop = { shop: shop._id };
        const [all, active, hidden, draft, outOfStock] = await Promise.all([
            Product.countDocuments(baseShop),
            Product.countDocuments({ ...baseShop, ...statusBucketQuery('active') }),
            Product.countDocuments({ ...baseShop, ...statusBucketQuery('hidden') }),
            Product.countDocuments({ ...baseShop, ...statusBucketQuery('draft') }),
            Product.countDocuments({ ...baseShop, ...statusBucketQuery('out_of_stock') })
        ]);

        res.status(200).json({
            success: true,
            data: {
                products,
                counts: { all, active, hidden, draft, out_of_stock: outOfStock },
                pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy sản phẩm', error: error.message });
    }
};

// @desc    Danh sách khuyến mãi của shop
// @route   GET /api/vendor/promotions
// @access  Private/Vendor
const getMyPromotions = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        }

        const { status, page = 1, limit = 20, sort = '-createdAt' } = req.query;
        const query = { shop: shop._id };
        await Promotion.syncLifecycleStatuses(query);
        if (status && status !== 'all') query.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [promotions, total] = await Promise.all([
            populatePromotion(Promotion.find(query).sort(sort).skip(skip).limit(Number(limit))),
            Promotion.countDocuments(query)
        ]);
        const coupons = await Coupon.find({
            promotion: { $in: promotions.map((promotion) => promotion._id) }
        }).select('promotion code usageLimit usedCount');
        const couponByPromotion = new Map(
            coupons.map((coupon) => [coupon.promotion.toString(), coupon])
        );
        const enrichedPromotions = promotions.map((promotion) => {
            const item = promotion.toObject();
            const coupon = couponByPromotion.get(promotion._id.toString());
            return {
                ...item,
                couponCode: coupon?.code || 'N/A',
                usageLimit: coupon?.usageLimit || item.maxUsage || 0,
                usedCount: coupon?.usedCount ?? item.usedCount ?? 0,
            };
        });

        res.status(200).json({
            success: true,
            data: {
                promotions: enrichedPromotions,
                pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy khuyến mãi', error: error.message });
    }
};

// @desc    Tạo khuyến mãi
// @route   POST /api/vendor/promotions
// @access  Private/Vendor
const createPromotion = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) {
            return res.status(400).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        }
        if (shop.status !== Shop.STATUS.APPROVED) {
            return res.status(403).json({ success: false, message: 'Cửa hàng của bạn chưa được duyệt nên chưa thể tạo khuyến mãi.' });
        }

        const data = pickPromoFields(req.body);
        const isCodeRequired = data.type === Promotion.TYPE.COUPON;
        const requestedCouponCode = VOUCHER_PROMOTION_TYPES.includes(data.type) ? normalizeCouponCode(req.body.code) : '';
        if (isCodeRequired) {
            if (!requestedCouponCode) {
                return res.status(400).json({ success: false, message: 'Vui lòng nhập mã voucher!' });
            }
        }
        if (requestedCouponCode) {
            const existingCoupon = await Coupon.findOne({ code: requestedCouponCode });
            if (existingCoupon) {
                return res.status(400).json({ success: false, message: 'Mã voucher này đã tồn tại!' });
            }
        }
        data.shop = shop._id;
        // Free ship: ép discountType = freeship, không cần giá trị giảm
        if (data.type === 'freeship') {
            data.discountType = 'freeship';
            data.value = 0;
        }
        // Dọn dữ liệu phạm vi áp dụng theo lựa chọn
        if (data.appliesTo !== 'category') data.categories = [];
        if (data.appliesTo !== 'product') data.products = [];

        let promotion = await Promotion.create(data);
        // Sync lifecycle status để chuyển DRAFT → RUNNING nếu thời gian phù hợp
        await Promotion.syncLifecycleStatuses({ _id: promotion._id });
        promotion = await Promotion.findById(promotion._id);
        await syncCouponForPromotion(promotion, shop._id, requestedCouponCode);
        promotion = await populatePromotion(Promotion.findById(promotion._id));

        res.status(201).json({ success: true, message: 'Tạo khuyến mãi thành công', data: { promotion } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Lỗi khi tạo khuyến mãi' });
    }
};

// @desc    Cập nhật khuyến mãi
// @route   PUT /api/vendor/promotions/:id
// @access  Private/Vendor
const updatePromotion = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        const promotion = await Promotion.findById(req.params.id);

        if (!promotion) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mãi' });
        }
        if (!shop || promotion.shop.toString() !== shop._id.toString()) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa khuyến mãi này' });
        }

        const data = pickPromoFields(req.body);
        const isCodeRequired = data.type === Promotion.TYPE.COUPON;
        const requestedCouponCode = VOUCHER_PROMOTION_TYPES.includes(data.type) ? normalizeCouponCode(req.body.code) : undefined;
        if (isCodeRequired && !requestedCouponCode) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập mã voucher!' });
        }
        if (data.type === 'freeship') {
            data.discountType = 'freeship';
            data.value = 0;
        }
        if (data.appliesTo === 'category') data.products = [];
        else if (data.appliesTo === 'product') data.categories = [];
        else if (data.appliesTo === 'all') { data.products = []; data.categories = []; }

        Object.assign(promotion, data);
        await promotion.save();
        await syncCouponForPromotion(promotion, shop._id, requestedCouponCode);
        const populated = await populatePromotion(Promotion.findById(promotion._id));

        res.status(200).json({ success: true, message: 'Cập nhật khuyến mãi thành công', data: { promotion: populated } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Lỗi khi cập nhật khuyến mãi' });
    }
};

// @desc    Xóa khuyến mãi
// @route   DELETE /api/vendor/promotions/:id
// @access  Private/Vendor
const deletePromotion = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        const promotion = await Promotion.findById(req.params.id);

        if (!promotion) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mãi' });
        }
        if (!shop || promotion.shop.toString() !== shop._id.toString()) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa khuyến mãi này' });
        }

        await Coupon.findOneAndDelete({ promotion: promotion._id });
        await promotion.deleteOne();
        res.status(200).json({ success: true, message: 'Xóa khuyến mãi thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi xóa khuyến mãi', error: error.message });
    }
};

// @desc    Danh mục mà shop đang bán (để chọn phạm vi khuyến mãi)
// @route   GET /api/vendor/categories
// @access  Private/Vendor
const getVendorCategories = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        }

        const ids = await Product.distinct('category', { shop: shop._id });
        const categories = await Category.find({ _id: { $in: ids } }).select('name').sort('name');

        res.status(200).json({ success: true, data: { categories } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh mục', error: error.message });
    }
};

// @desc    Xuất danh sách sản phẩm của shop ra file Excel
// @route   GET /api/vendor/products/export
// @access  Private/Vendor
const exportProducts = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        }

        // Áp dụng cùng bộ lọc với màn danh sách (nếu có), nhưng xuất toàn bộ (không phân trang)
        const { status, category, search } = req.query;
        const query = { shop: shop._id };
        if (status && status !== 'all') query.status = status;
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } }
            ];
        }

        const products = await Product.find(query).populate('category', 'name').sort('-createdAt');

        const workbook = new ExcelJS.Workbook();
        workbook.creator = shop.name;
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Sản phẩm');

        sheet.columns = [
            { header: 'STT', key: 'idx', width: 6 },
            { header: 'Tên sản phẩm', key: 'name', width: 40 },
            { header: 'Slug', key: 'slug', width: 30 },
            { header: 'Danh mục', key: 'category', width: 18 },
            { header: 'Giá bán (₫)', key: 'price', width: 16 },
            { header: 'Tồn kho', key: 'quantity', width: 10 },
            { header: 'Đã bán', key: 'sold', width: 10 },
            { header: 'Trạng thái', key: 'status', width: 14 },
            { header: 'Đánh giá TB', key: 'rating', width: 12 },
            { header: 'Ngày tạo', key: 'createdAt', width: 14 }
        ];

        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).alignment = { vertical: 'middle' };

        products.forEach((p, i) => {
            sheet.addRow({
                idx: i + 1,
                name: p.name,
                slug: p.slug || '',
                category: p.category?.name || '',
                price: p.price || 0,
                quantity: p.quantity || 0,
                sold: p.sold || 0,
                status: STATUS_LABEL[p.status] || p.status,
                rating: p.averageRating || 0,
                createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : ''
            });
        });

        sheet.getColumn('price').numFmt = '#,##0';

        const fileName = `san-pham-${Date.now()}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi xuất Excel', error: error.message });
    }
};

// @desc    Danh sách đơn hàng có sản phẩm của shop (kèm số đếm theo trạng thái)
// @route   GET /api/vendor/orders
// @access  Private/Vendor
const getMyOrders = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        }

        const { status, search, dateFrom, dateTo, page = 1, limit = 10 } = req.query;
        // Đơn độc lập thuộc về shop này
        const baseQuery = { shop: shop._id };
        if (dateFrom || dateTo) {
            baseQuery.createdAt = {};
            if (dateFrom) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                baseQuery.createdAt.$gte = from;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                baseQuery.createdAt.$lte = to;
            }
        }
        if (search) {
            baseQuery.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
                { 'shippingAddress.phone': { $regex: search, $options: 'i' } }
            ];
        }
        const query = { ...baseQuery };
        if (status && status !== 'all') query.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [ordersRaw, total] = await Promise.all([
            Order.find(query).populate('user', 'fullName email phone').sort('-createdAt').skip(skip).limit(Number(limit)),
            Order.countDocuments(query)
        ]);
        const orders = ordersRaw.map((order) => attachVendorOrderRevenue(order, shop));

        // Số đếm theo trạng thái (đơn của shop)
        const statuses = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled'];
        const counts = { all: await Order.countDocuments(baseQuery) };
        await Promise.all(statuses.map(async (s) => { counts[s] = await Order.countDocuments({ ...baseQuery, status: s }); }));

        res.status(200).json({
            success: true,
            data: {
                orders,
                counts,
                pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy đơn hàng', error: error.message });
    }
};

// @desc    Chi tiết 1 đơn hàng (chỉ phần của shop)
// @route   GET /api/vendor/orders/:id
// @access  Private/Vendor
const getMyOrderDetail = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        }

        const order = await Order.findOne({ _id: req.params.id, shop: shop._id })
            .populate('user', 'fullName email phone')
            .populate('products.product', 'name images slug');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        res.status(200).json({ success: true, data: { order: attachVendorOrderRevenue(order, shop) } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết đơn hàng', error: error.message });
    }
};

// @desc    Cập nhật trạng thái đơn hàng của shop
// @route   PUT /api/vendor/orders/:id/status
// @access  Private/Vendor
const updateMyOrderStatus = async (req, res) => {
    try {
        const { status, note, shippingProvider, trackingNumber } = req.body;
        const shop = await getOwnerShop(req.user._id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        }

        // Đơn độc lập: chỉ cần đúng shop là được quyền
        const order = await Order.findOne({ _id: req.params.id, shop: shop._id });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        if (!ORDER_TRANSITIONS[order.status]?.includes(status)) {
            return res.status(400).json({ success: false, message: 'Không thể chuyển sang trạng thái này!' });
        }

        // Khi chuyển sang 'shipping', phải chọn đơn vị vận chuyển
        // Nếu khách đã chọn khi checkout thì dùng luôn, không bắt chọn lại
        if (status === 'shipping') {
            const effectiveProvider = pickShopShippingProvider(shippingProvider || order.shippingProvider, shop._id);
            if (effectiveProvider) {
                if (!VALID_SHIPPING_PROVIDERS.includes(normalizeProviderCode(effectiveProvider))) {
                    return res.status(400).json({ success: false, message: 'Đơn vị vận chuyển không hợp lệ!' });
                }
            }
        }

        // Nếu huỷ: hoàn tồn kho cho các sản phẩm trong đơn
        let refundResult = null;
        if (status === ORDER_STATUS.CANCELLED && order.products) {
            await Promise.all(order.products.map((it) =>
                Product.findByIdAndUpdate(it.product, { $inc: { quantity: it.quantity, sold: -it.quantity } })
            ));
            refundResult = await refundOrderToWallet(order, {
                description: `Hoan tien don huy #${order.orderNumber} vao vi SORA`,
            });
            order.cancelledAt = new Date();
        }

        // Cập nhật trạng thái
        order.status = status;
        order.statusHistory.push({ status, timestamp: new Date(), note: note || '' });
        if (status === 'shipping') {
            const effectiveProvider = pickShopShippingProvider(shippingProvider || order.shippingProvider, shop._id);
            if (effectiveProvider) order.shippingProvider = effectiveProvider;
            if (trackingNumber) order.trackingNumber = trackingNumber;
        }
        await order.save();
        await notifyCustomerOrderStatus(order, status, {
            message: status === ORDER_STATUS.CANCELLED ? 'Shop đã hủy đơn hàng.' : undefined,
            refundedAmount: refundResult?.amount || 0,
        });

        res.status(200).json({ success: true, message: 'Cập nhật trạng thái thành công', data: { status: order.status, shippingProvider: order.shippingProvider } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái', error: error.message });
    }
};

// @desc    Báo cáo doanh thu của shop
// @route   GET /api/vendor/reports?period=month
// @access  Private/Vendor
const PERIOD_DAYS = { today: 1, '7d': 7, month: 30, quarter: 90 };
const CHART_COLORS = ['#B86B05', '#95520B', '#DE9601', '#FBC309', '#7B440C', '#C4A882'];

const getReports = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });

        const period = req.query.period || 'month';
        const days = PERIOD_DAYS[period] || 30;
        const since = startOfDay(new Date(Date.now() - (days - 1) * 86400000));

        const [totals, prevTotals, revenue, topRaw, catRows, cancelledCount] = await Promise.all([
            shopRevenueTotals(shop._id, since),
            shopRevenueTotals(shop._id, startOfDay(new Date(Date.now() - (2 * days - 1) * 86400000))),
            revenueSeries(shop._id, days),
            topProductsOfShop(shop._id, since, 5),
            Order.aggregate([
                { $match: { 'products.shop': shop._id, status: { $ne: ORDER_STATUS.CANCELLED }, createdAt: { $gte: since } } },
                { $unwind: '$products' },
                { $match: { 'products.shop': shop._id } },
                { $lookup: { from: 'products', localField: 'products.product', foreignField: '_id', as: 'p' } },
                { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'categories', localField: 'p.category', foreignField: '_id', as: 'c' } },
                { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
                { $group: { _id: { $ifNull: ['$c.name', 'Khác'] }, revenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } } } },
                { $sort: { revenue: -1 } }
            ]),
            Order.countDocuments({ 'products.shop': shop._id, status: ORDER_STATUS.CANCELLED, createdAt: { $gte: since } })
        ]);

        const avgOrder = totals.orders ? Math.round(totals.revenue / totals.orders) : 0;
        const returnRate = totals.orders + cancelledCount ? Math.round((cancelledCount / (totals.orders + cancelledCount)) * 1000) / 10 : 0;
        const totalCatRev = catRows.reduce((s, c) => s + c.revenue, 0) || 1;
        const categoryShares = catRows.map((c, i) => ({ label: c._id, value: Math.round((c.revenue / totalCatRev) * 100), color: CHART_COLORS[i % CHART_COLORS.length] }));
        const topProducts = topRaw.map((p) => ({ ...p, share: Math.round((p.revenue / (totals.revenue || 1)) * 100) }));

        res.status(200).json({
            success: true,
            data: {
                period,
                kpis: {
                    totalRevenue: totals.revenue,
                    orderCount: totals.orders,
                    avgOrderValue: avgOrder,
                    returnRate,
                    revenueChangePct: prevTotals.revenue ? Math.round(((totals.revenue - (prevTotals.revenue - totals.revenue)) / Math.max(1, prevTotals.revenue - totals.revenue)) * 100) : 0
                },
                revenue,
                categoryShares,
                topProducts
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy báo cáo', error: error.message });
    }
};

// ── Ví điện tử ───────────────────────────────────────────────
const ensureWallet = async (shop) => {
    let wallet = await Wallet.findOne({ user: shop.owner });
    if (!wallet) wallet = await Wallet.create({ user: shop.owner, accounts: [], transactions: [] });
    return wallet;
};

// @desc    Thông tin ví + thống kê tháng
// @route   GET /api/vendor/wallet
// @access  Private/Vendor
const getWallet = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        const wallet = await ensureWallet(shop);

        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const [onlinePaidOrders, walletDebits, monthWithdrawAgg] = await Promise.all([
            Order.find(onlinePaidOrderQuery(shop._id)).select('products subtotal orderNumber paymentMethod updatedAt orderedAt createdAt'),
            Transaction.find({
                wallet: wallet._id,
                type: 'debit',
                category: { $in: WALLET_HISTORY_TX_CATEGORIES },
                status: { $in: ['success', 'pending'] },
            }).select('amount'),
            Transaction.aggregate([
                {
                    $match: {
                        wallet: wallet._id,
                        category: 'withdraw',
                        status: 'success',
                        createdAt: { $gte: monthStart },
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
        ]);

        const monthOrders = onlinePaidOrders.filter((order) => new Date(dateOfPaidOrder(order)) >= monthStart);
        const onlineIncome = sumOnlineOrderRevenue(onlinePaidOrders, shop);
        const debitsTotal = walletDebits.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        const balance = Math.max(0, onlineIncome - debitsTotal);

        res.status(200).json({
            success: true,
            data: {
                balance,
                pendingBalance: wallet.pendingBalance || 0,
                bankAccounts: wallet.accounts || [],
                monthly: {
                    income: sumOnlineOrderRevenue(monthOrders, shop),
                    withdrawn: monthWithdrawAgg[0]?.total || 0,
                    platformFee: sumOnlineOrderCommission(monthOrders, shop)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy ví', error: error.message });
    }
};

// @desc    Lịch sử giao dịch ví
// @route   GET /api/vendor/wallet/transactions?type=credit|debit|withdraw
// @access  Private/Vendor
const getTransactions = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        const wallet = await ensureWallet(shop);

        const { type, page = 1, limit = 15 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const numericLimit = Number(limit);

        if (type === 'withdraw') {
            const query = { wallet: wallet._id, category: 'withdraw' };
            const [transactions, total] = await Promise.all([
                Transaction.find(query).sort('-createdAt').skip(skip).limit(numericLimit),
                Transaction.countDocuments(query)
            ]);

            return res.status(200).json({
                success: true,
                data: { transactions, pagination: { total, page: Number(page), pages: Math.ceil(total / numericLimit), limit: numericLimit } }
            });
        }

        const orderQuery = onlinePaidOrderQuery(shop._id);
        const realTxQuery = {
            wallet: wallet._id,
            category: { $in: WALLET_HISTORY_TX_CATEGORIES },
        };
        if (type === 'in') {
            realTxQuery._id = null;
        } else if (type === 'out') {
            Object.assign(realTxQuery, { type: 'debit' });
            orderQuery._id = null;
        }

        const fetchLimit = skip + numericLimit;
        const [onlineOrders, realTransactions, onlineTotal, realTotal] = await Promise.all([
            Order.find(orderQuery).sort('-updatedAt').limit(fetchLimit),
            Transaction.find(realTxQuery).sort('-createdAt').limit(fetchLimit),
            Order.countDocuments(orderQuery),
            Transaction.countDocuments(realTxQuery),
        ]);

        const transactions = [
            ...onlineOrders.map((order) => onlineOrderToWalletTx(order, shop)),
            ...realTransactions,
        ]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(skip, skip + numericLimit);
        const total = onlineTotal + realTotal;

        res.status(200).json({
            success: true,
            data: { transactions, pagination: { total, page: Number(page), pages: Math.ceil(total / numericLimit), limit: numericLimit } }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy giao dịch', error: error.message });
    }
};

// @desc    Yêu cầu rút tiền
// @route   POST /api/vendor/wallet/withdraw
// @access  Private/Vendor
const requestWithdraw = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        const wallet = await ensureWallet(shop);

        const amount = Number(req.body.amount) || 0;
        const { note, bankIndex } = req.body;
        if (amount < 100000) return res.status(400).json({ success: false, message: 'Số tiền rút tối thiểu 100.000₫' });

        const [onlinePaidOrders, walletDebits] = await Promise.all([
            Order.find(onlinePaidOrderQuery(shop._id)).select('products subtotal'),
            Transaction.find({
                wallet: wallet._id,
                type: 'debit',
                category: { $in: WALLET_HISTORY_TX_CATEGORIES },
                status: { $in: ['success', 'pending'] },
            }).select('amount'),
        ]);
        const availableBalance = Math.max(
            0,
            sumOnlineOrderRevenue(onlinePaidOrders, shop) - walletDebits.reduce((sum, tx) => sum + (tx.amount || 0), 0)
        );
        if (amount > availableBalance) return res.status(400).json({ success: false, message: 'Số dư khả dụng không đủ' });

        wallet.balance = Math.max(0, availableBalance - amount); // snapshot, số dư hiển thị vẫn tính từ đơn online
        await wallet.save();

        const accounts = wallet.accounts || [];
        const acc = accounts[bankIndex] || accounts[0];
        const tx = await Transaction.create({
            wallet: wallet._id, shop: shop._id, type: 'debit', category: 'withdraw',
            amount, status: 'pending',
            description: note || `Rút tiền về ${acc ? acc.bankName + ' ****' + String(acc.accountNumber).slice(-4) : 'ngân hàng'}`,
            balanceAfter: wallet.balance
        });

        res.status(201).json({ success: true, message: 'Đã gửi yêu cầu rút tiền', data: { transaction: tx, balance: wallet.balance } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi rút tiền', error: error.message });
    }
};

// @desc    Thêm tài khoản ngân hàng nhận tiền
// @route   POST /api/vendor/wallet/bank-accounts
// @access  Private/Vendor
const addBankAccount = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        const wallet = await ensureWallet(shop);

        const { bankName, accountNumber, accountHolder, branch } = req.body;
        if (!bankName || !accountNumber || !accountHolder) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin tài khoản' });
        }
        const accounts = wallet.accounts || [];
        wallet.accounts.push({ type: 'bank', bankName, accountNumber, accountHolder, branch: branch || '', isDefault: accounts.length === 0 });
        await wallet.save();

        res.status(201).json({ success: true, message: 'Đã thêm tài khoản ngân hàng', data: { bankAccounts: wallet.accounts } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi thêm tài khoản', error: error.message });
    }
};

// ── Đánh giá ─────────────────────────────────────────────────
// @desc    Đánh giá sản phẩm của shop + tổng quan
// @route   GET /api/vendor/reviews
// @access  Private/Vendor
const getReviews = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });

        const { rating, replied, search, page = 1, limit = 10 } = req.query;
        const query = { shop: shop._id };
        if (rating) query.rating = Number(rating);
        if (replied === 'true') query['vendorReply.repliedAt'] = { $ne: null };
        else if (replied === 'false') query['vendorReply.repliedAt'] = null;
        if (search) query.content = { $regex: search, $options: 'i' };

        const skip = (Number(page) - 1) * Number(limit);
        const [reviews, total] = await Promise.all([
            Review.find(query).populate('user', 'fullName profileImage').populate('product', 'name images').sort('-createdAt').skip(skip).limit(Number(limit)),
            Review.countDocuments(query)
        ]);

        // Tổng quan
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const [distAgg, repliedCount, monthCount, reportedCount, avgAgg] = await Promise.all([
            Review.aggregate([{ $match: { shop: shop._id } }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
            Review.countDocuments({ shop: shop._id, 'vendorReply.repliedAt': { $ne: null } }),
            Review.countDocuments({ shop: shop._id, createdAt: { $gte: monthStart } }),
            Review.countDocuments({ shop: shop._id, isReported: true }),
            Review.aggregate([{ $match: { shop: shop._id } }, { $group: { _id: null, avg: { $avg: '$rating' }, total: { $sum: 1 } } }])
        ]);

        const totalAll = avgAgg[0]?.total || 0;
        const distMap = {};
        distAgg.forEach((d) => { distMap[d._id] = d.count; });
        const distribution = [5, 4, 3, 2, 1].map((star) => ({ star, pct: totalAll ? Math.round((distMap[star] || 0) / totalAll * 100) : 0 }));

        res.status(200).json({
            success: true,
            data: {
                reviews,
                summary: { avg: Math.round((avgAgg[0]?.avg || 0) * 10) / 10, total: totalAll, distribution },
                stats: { unreplied: totalAll - repliedCount, replied: repliedCount, thisMonth: monthCount, reported: reportedCount },
                pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy đánh giá', error: error.message });
    }
};

// @desc    Vendor phản hồi đánh giá
// @route   PUT /api/vendor/reviews/:id/reply
// @access  Private/Vendor
const replyReview = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });

        const { content } = req.body;
        if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung phản hồi' });

        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
        if (!review.shop || review.shop.toString() !== shop._id.toString()) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền phản hồi đánh giá này' });
        }

        review.vendorReply = { content: content.trim(), repliedAt: new Date() };
        await review.save();

        res.status(200).json({ success: true, message: 'Đã gửi phản hồi', data: { review } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi phản hồi đánh giá', error: error.message });
    }
};

// ── Thông báo ────────────────────────────────────────────────
// @desc    Danh sách thông báo của vendor + tóm tắt 7 ngày
// @route   GET /api/vendor/notifications
// @access  Private/Vendor
const getNotifications = async (req, res) => {
    try {
        const { type, page = 1, limit = 20 } = req.query;
        const query = { user: req.user._id };
        if (type && type !== 'all') query.type = type;

        const skip = (Number(page) - 1) * Number(limit);
        const weekAgo = new Date(Date.now() - 7 * 86400000);
        const [notifications, total, unreadCount, weekAgg] = await Promise.all([
            Notification.find(query).sort('-createdAt').skip(skip).limit(Number(limit)),
            Notification.countDocuments(query),
            Notification.countDocuments({ user: req.user._id, isRead: false }),
            Notification.aggregate([
                { $match: { user: new mongoose.Types.ObjectId(req.user._id), createdAt: { $gte: weekAgo } } },
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ])
        ]);
        const summary7d = {};
        weekAgg.forEach((w) => { summary7d[w._id] = w.count; });

        res.status(200).json({
            success: true,
            data: {
                notifications, unreadCount, summary7d,
                pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thông báo', error: error.message });
    }
};

// @desc    Đánh dấu 1 thông báo đã đọc
// @route   PUT /api/vendor/notifications/:id/read
const markNotificationRead = async (req, res) => {
    try {
        await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { isRead: true });
        res.status(200).json({ success: true, message: 'Đã đánh dấu đã đọc' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi', error: error.message });
    }
};

// @desc    Đánh dấu tất cả đã đọc
// @route   PUT /api/vendor/notifications/read-all
const markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
        res.status(200).json({ success: true, message: 'Đã đánh dấu tất cả đã đọc' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi', error: error.message });
    }
};

// @desc    Xoá 1 thông báo
// @route   DELETE /api/vendor/notifications/:id
const deleteNotification = async (req, res) => {
    try {
        await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
        res.status(200).json({ success: true, message: 'Đã xoá thông báo' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi', error: error.message });
    }
};

// ── Cấu hình shop (Settings) ─────────────────────────────────
const SHOP_FIELDS = ['name', 'description', 'phone', 'email', 'address', 'logo', 'banner', 'isActive', 'provinceCode', 'provinceName', 'shippingConfig'];

// @desc    Cập nhật cấu hình vận chuyển riêng của shop
// @route   PUT /api/vendor/shop/shipping-config
// @access  Private/Vendor
const updateShippingConfig = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });

        const { selectedProvider, freeShippingThreshold, isUrbanZone } = req.body;
        const VALID_PROVIDERS = ['jt', 'ghtk', 'viettel'];

        // Validate selectedProvider
        if (selectedProvider !== undefined) {
            if (!VALID_PROVIDERS.includes(selectedProvider)) {
                return res.status(400).json({ success: false, message: 'Đơn vị vận chuyển không hợp lệ!' });
            }
        }

        // Validate freeShippingThreshold
        if (freeShippingThreshold !== undefined) {
            if (typeof freeShippingThreshold !== 'number' || freeShippingThreshold < 0) {
                return res.status(400).json({ success: false, message: 'Ngưỡng free ship phải là số không âm!' });
            }
        }

        // Merge partial update — defaultProvider = selectedProvider
        if (selectedProvider !== undefined) {
            shop.shippingConfig = { ...(shop.shippingConfig || {}), defaultProvider: selectedProvider };
        }
        if (freeShippingThreshold !== undefined) {
            shop.shippingConfig = { ...(shop.shippingConfig || {}), freeShippingThreshold };
        }
        if (isUrbanZone !== undefined) {
            shop.shippingConfig = { ...(shop.shippingConfig || {}), isUrbanZone: Boolean(isUrbanZone) };
        }

        await shop.save();

        res.status(200).json({
            success: true,
            message: 'Cập nhật cấu hình vận chuyển thành công!',
            data: { shippingConfig: shop.shippingConfig }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Lỗi khi cập nhật cấu hình vận chuyển' });
    }
};
// @desc    Cập nhật thông tin shop
// @route   PUT /api/vendor/shop
// @access  Private/Vendor
const updateMyShop = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });

        SHOP_FIELDS.forEach((f) => { if (req.body[f] !== undefined) shop[f] = req.body[f]; });
        if (req.body.slug) shop.slug = req.body.slug; // setter tự slugify

        await shop.save();

        res.status(200).json({ success: true, message: 'Cập nhật cửa hàng thành công', data: { shop } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Lỗi khi cập nhật cửa hàng' });
    }
};

module.exports = {
    getMyShop,
    getDashboardSummary,
    getMyProducts,
    getVendorCategories,
    exportProducts,
    getMyPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    getMyOrders,
    getMyOrderDetail,
    updateMyOrderStatus,
    getReports,
    getWallet,
    getTransactions,
    requestWithdraw,
    addBankAccount,
    getReviews,
    replyReview,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    updateShippingConfig,
    updateMyShop
};
