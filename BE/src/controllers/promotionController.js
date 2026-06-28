const Promotion = require('../models/promotion');

// Whitelist field (admin có thêm quyền set shop / để trống = toàn sàn)
const FIELDS = [
    'name', 'description', 'type', 'discountType', 'value', 'maxDiscount',
    'minOrderValue', 'appliesTo', 'products', 'categories',
    'startDate', 'endDate', 'maxUsage', 'status', 'shop'
];
const pick = (body) => {
    const data = {};
    FIELDS.forEach((k) => { if (body[k] !== undefined) data[k] = body[k]; });
    return data;
};

// Chuẩn hoá dữ liệu theo loại / phạm vi áp dụng
const normalize = (data) => {
    if (data.type === 'freeship') { data.discountType = 'freeship'; data.value = 0; }
    if (data.appliesTo === 'all') { data.products = []; data.categories = []; }
    else if (data.appliesTo === 'category') data.products = [];
    else if (data.appliesTo === 'product') data.categories = [];
    if (data.shop === '' || data.shop === undefined) data.shop = null; // toàn sàn
    return data;
};

const populate = (q) => q.populate('shop', 'name slug').populate('products', 'name price').populate('categories', 'name');

// @desc    [Admin] Danh sách khuyến mãi (toàn sàn + theo shop)
// @route   GET /api/admin/promotions?scope=platform|shop
// @access  Private/Admin
const getAdminPromotions = async (req, res) => {
    try {
        const { scope, shop, status, page = 1, limit = 20 } = req.query;
        const query = {};
        if (scope === 'platform') query.shop = null;
        else if (scope === 'shop') query.shop = { $ne: null };
        if (shop) query.shop = shop;

        await Promotion.syncLifecycleStatuses(query);
        if (status) query.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [promotions, total] = await Promise.all([
            populate(Promotion.find(query).sort('-createdAt').skip(skip).limit(Number(limit))),
            Promotion.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: { promotions, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) } }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy khuyến mãi', error: error.message });
    }
};

// @desc    [Admin] Tạo khuyến mãi (mặc định toàn sàn nếu không chọn shop)
// @route   POST /api/admin/promotions
// @access  Private/Admin
const createAdminPromotion = async (req, res) => {
    try {
        const data = normalize(pick(req.body));
        let promotion = await Promotion.create(data);
        // Sync lifecycle status để đảm bảo promotion chạy đúng (chuyển DRAFT → RUNNING nếu thời gian phù hợp)
        await Promotion.syncLifecycleStatuses({ _id: promotion._id });
        promotion = await populate(Promotion.findById(promotion._id));
        res.status(201).json({ success: true, message: 'Tạo khuyến mãi thành công', data: { promotion } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Lỗi khi tạo khuyến mãi' });
    }
};

// @desc    [Admin] Cập nhật khuyến mãi
// @route   PUT /api/admin/promotions/:id
// @access  Private/Admin
const updateAdminPromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mãi' });
        Object.assign(promotion, normalize(pick(req.body)));
        await promotion.save();
        const populated = await populate(Promotion.findById(promotion._id));
        res.status(200).json({ success: true, message: 'Cập nhật khuyến mãi thành công', data: { promotion: populated } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Lỗi khi cập nhật khuyến mãi' });
    }
};

// @desc    [Admin] Xoá khuyến mãi
// @route   DELETE /api/admin/promotions/:id
// @access  Private/Admin 
const deleteAdminPromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mãi' });
        await promotion.deleteOne();
        res.status(200).json({ success: true, message: 'Đã xoá khuyến mãi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi xoá khuyến mãi', error: error.message });
    }
};

module.exports = { getAdminPromotions, createAdminPromotion, updateAdminPromotion, deleteAdminPromotion };
