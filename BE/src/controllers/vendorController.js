const ExcelJS = require('exceljs');
const Shop = require('../models/shop');
const Product = require('../models/product');
const Category = require('../models/category');
const Promotion = require('../models/promotion');
const Order = require('../models/order');
const { ORDER_STATUS } = require('../models/order');

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

// Tính phần thuộc về shop trong 1 đơn (Hướng B: 1 đơn có sản phẩm của nhiều shop)
const shopSliceOfOrder = (order, shopId) => {
    const sid = shopId.toString();
    const shopItems = (order.products || []).filter((p) => p.shop && p.shop.toString() === sid);
    const shopSubtotal = shopItems.reduce((s, it) => s + it.price * it.quantity, 0);
    const shopQuantity = shopItems.reduce((s, it) => s + it.quantity, 0);
    return { shopItems, shopSubtotal, shopQuantity };
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
        const orderBase = { 'products.shop': shop._id };
        const [totalProducts, activeProducts, lowStock, runningPromotions, totalOrders, pendingOrders] = await Promise.all([
            Product.countDocuments(base),
            Product.countDocuments({ ...base, status: 'active' }),
            Product.countDocuments({ ...base, quantity: { $lte: 5 } }),
            Promotion.countDocuments({ ...base, status: 'running' }),
            Order.countDocuments(orderBase),
            Order.countDocuments({ ...orderBase, status: ORDER_STATUS.PENDING })
        ]);

        res.status(200).json({
            success: true,
            data: {
                shop: { id: shop._id, name: shop.name, status: shop.isActive ? 'active' : 'inactive' },
                stats: { totalProducts, activeProducts, lowStock, runningPromotions, totalOrders, pendingOrders }
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
        if (status && status !== 'all') query.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [promotions, total] = await Promise.all([
            populatePromotion(Promotion.find(query).sort(sort).skip(skip).limit(Number(limit))),
            Promotion.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: {
                promotions,
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

        const data = pickPromoFields(req.body);
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
        if (data.type === 'freeship') {
            data.discountType = 'freeship';
            data.value = 0;
        }
        if (data.appliesTo === 'category') data.products = [];
        else if (data.appliesTo === 'product') data.categories = [];
        else if (data.appliesTo === 'all') { data.products = []; data.categories = []; }

        Object.assign(promotion, data);
        await promotion.save();
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

        const { status, search, page = 1, limit = 10 } = req.query;
        const query = { 'products.shop': shop._id };
        if (status && status !== 'all') query.status = status;
        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
                { 'shippingAddress.phone': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [orders, total] = await Promise.all([
            Order.find(query).populate('user', 'fullName email phone').sort('-createdAt').skip(skip).limit(Number(limit)),
            Order.countDocuments(query)
        ]);

        // Chỉ trả phần thuộc shop của vendor (ẩn sản phẩm của shop khác)
        const data = orders.map((o) => {
            const slice = shopSliceOfOrder(o, shop._id);
            const obj = o.toObject();
            obj.products = slice.shopItems;
            obj.shopSubtotal = slice.shopSubtotal;
            obj.shopQuantity = slice.shopQuantity;
            return obj;
        });

        // Số đếm theo trạng thái (đơn của shop)
        const sb = { 'products.shop': shop._id };
        const statuses = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled'];
        const counts = { all: await Order.countDocuments(sb) };
        await Promise.all(statuses.map(async (s) => { counts[s] = await Order.countDocuments({ ...sb, status: s }); }));

        res.status(200).json({
            success: true,
            data: {
                orders: data,
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

        const order = await Order.findById(req.params.id).populate('user', 'fullName email phone');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        const slice = shopSliceOfOrder(order, shop._id);
        if (slice.shopItems.length === 0) {
            return res.status(403).json({ success: false, message: 'Đơn hàng này không có sản phẩm của cửa hàng bạn' });
        }

        const obj = order.toObject();
        obj.products = slice.shopItems;
        obj.shopSubtotal = slice.shopSubtotal;
        obj.shopQuantity = slice.shopQuantity;

        res.status(200).json({ success: true, data: { order: obj } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết đơn hàng', error: error.message });
    }
};

// @desc    Cập nhật trạng thái đơn hàng của shop
// @route   PUT /api/vendor/orders/:id/status
// @access  Private/Vendor
const updateMyOrderStatus = async (req, res) => {
    try {
        const { status, note } = req.body;
        const shop = await getOwnerShop(req.user._id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        // Quyền: đơn phải chứa sản phẩm của shop
        const { shopItems } = shopSliceOfOrder(order, shop._id);
        if (shopItems.length === 0) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền với đơn hàng này' });
        }

        if (!ORDER_TRANSITIONS[order.status]?.includes(status)) {
            return res.status(400).json({ success: false, message: 'Không thể chuyển sang trạng thái này!' });
        }

        // Nếu huỷ: hoàn tồn kho cho các sản phẩm của shop
        if (status === ORDER_STATUS.CANCELLED) {
            await Promise.all(shopItems.map((it) =>
                Product.findByIdAndUpdate(it.product, { $inc: { quantity: it.quantity, sold: -it.quantity } })
            ));
        }

        // pre-save hook của Order tự thêm statusHistory + set confirmedAt/deliveredAt/cancelledAt
        order.status = status;
        if (note) order.statusHistory.push({ status, timestamp: new Date(), note });
        await order.save();

        res.status(200).json({ success: true, message: 'Cập nhật trạng thái thành công', data: { status: order.status } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái', error: error.message });
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
    updateMyOrderStatus
};
