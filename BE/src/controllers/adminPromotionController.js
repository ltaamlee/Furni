const Promotion = require('../models/promotion');
const Coupon = require('../models/Coupon');

const updateStatusByDate = (promo) => {
    const now = new Date();
    const start = new Date(promo.startDate);
    const end = new Date(promo.endDate);

    if (now < start) return Promotion.STATUS.SCHEDULED; 
    if (now >= start && now <= end) return Promotion.STATUS.RUNNING;
    return Promotion.STATUS.ENDED; 
};

// @desc    Lấy danh sách khuyến mãi toàn sàn (Admin)
// @route   GET /api/admin/promotions
const getAdminPromotions = async (req, res) => {
    try {
        const { search, type, status, page = 1, limit = 10 } = req.query;
        const query = { shop: null }; // Chỉ lấy khuyến mãi toàn sàn

        if (type) query.discountType = type;
        if (search) query.name = { $regex: search, $options: 'i' };

        let promotions = await Promotion.find(query).sort('-createdAt');

        let filteredPromotions = promotions.map(promo => {
            const dynamicStatus = updateStatusByDate(promo);
            if (promo.status !== dynamicStatus && promo.status !== 'paused') {
                promo.status = dynamicStatus;
                promo.save(); 
            }
            return promo;
        });

        if (status) {
            filteredPromotions = filteredPromotions.filter(p => p.status === status);
        }

        const startIndex = (Number(page) - 1) * Number(limit);
        const paginatedPromotions = filteredPromotions.slice(startIndex, startIndex + Number(limit));

        const results = await Promise.all(paginatedPromotions.map(async (promo) => {
            const coupon = await Coupon.findOne({ promotion: promo._id });
            return {
                ...promo.toObject(),
                couponCode: coupon ? coupon.code : 'N/A',
                usageLimit: coupon ? coupon.usageLimit : 0,
                usedCount: coupon ? coupon.usedCount : 0
            };
        }));

        res.status(200).json({
            success: true,
            data: {
                promotions: results,
                pagination: {
                    total: filteredPromotions.length,
                    page: Number(page),
                    pages: Math.ceil(filteredPromotions.length / Number(limit)),
                    limit: Number(limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Tạo khuyến mãi mới 
// @route   POST /api/admin/promotions
const createAdminPromotion = async (req, res) => {
    try {
        const { name, code, discountType, value, maxDiscount, minOrderValue, startDate, endDate } = req.body;

        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (existingCoupon) return res.status(400).json({ success: false, message: 'Mã giảm giá này đã tồn tại!' });

        const newPromo = await Promotion.create({
            shop: null,
            name,
            type: Promotion.TYPE.COUPON,
            discountType,
            value,
            maxDiscount: discountType === 'percent' ? maxDiscount : 0,
            minOrderValue,
            startDate,
            endDate,
            status: updateStatusByDate({ startDate, endDate })
        });

        const newCoupon = await Coupon.create({
            code: code.toUpperCase(),
            promotion: newPromo._id,
            shop: null,
            discountType,
            value,
            maxDiscount: discountType === 'percent' ? maxDiscount : 0,
            minOrderValue,
            startDate,
            endDate
        });

        res.status(201).json({ success: true, message: 'Tạo khuyến mãi thành công!', data: { promotion: newPromo, coupon: newCoupon } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Xóa khuyến mãi
// @route   DELETE /api/admin/promotions/:id
const deleteAdminPromotion = async (req, res) => {
    try {
        const promo = await Promotion.findById(req.params.id);
        if (!promo) return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mãi' });

        await Coupon.findOneAndDelete({ promotion: promo._id });
        await Promotion.findByIdAndDelete(promo._id);

        res.status(200).json({ success: true, message: 'Đã xóa khuyến mãi thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// @desc    Cập nhật khuyến mãi 
// @route   PUT /api/admin/promotions/:id
const updateAdminPromotion = async (req, res) => {
    try {
        const { discountType, value, maxDiscount, minOrderValue, startDate, endDate } = req.body;
        
        const promo = await Promotion.findById(req.params.id);
        if (!promo) return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mãi' });

        promo.discountType = discountType;
        promo.value = value;
        promo.maxDiscount = discountType === 'percent' ? maxDiscount : 0;
        promo.minOrderValue = minOrderValue;
        promo.startDate = startDate;
        promo.endDate = endDate;
        promo.status = updateStatusByDate(promo); 
        await promo.save();

        const coupon = await Coupon.findOne({ promotion: promo._id });
        if (coupon) {
            coupon.discountType = discountType;
            coupon.value = value;
            coupon.maxDiscount = discountType === 'percent' ? maxDiscount : 0;
            coupon.minOrderValue = minOrderValue;
            coupon.startDate = startDate;
            coupon.endDate = endDate;
            await coupon.save();
        }

        res.status(200).json({ success: true, message: 'Cập nhật khuyến mãi thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
module.exports = { getAdminPromotions, createAdminPromotion, deleteAdminPromotion, updateAdminPromotion };