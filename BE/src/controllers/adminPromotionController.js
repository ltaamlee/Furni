const Promotion = require('../models/promotion');
const Coupon = require('../models/coupon');
const { VoucherWallet, VOUCHER_STATUS } = require('../models/voucherWallet');

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
        const query = {
            shop: null,
            type: { $ne: Promotion.TYPE.FLASH_SALE }
        }; // Chỉ lấy khuyến mãi toàn sàn, không hiển thị Flash Sale

        if (type) query.discountType = type;
        if (search) query.name = { $regex: search, $options: 'i' };

        let promotions = await Promotion.find(query).sort('-createdAt');

        let filteredPromotions = promotions.map(promo => {
            const dynamicStatus = updateStatusByDate(promo);
            if (promo.status !== dynamicStatus && promo.status !== 'paused' && promo.status !== 'draft') {
                promo.status = dynamicStatus;
            }
            return promo;
        });

        await Promise.all(filteredPromotions.map(promo => promo.save()));

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
        const { name, code, type, discountType, value, maxDiscount, minOrderValue, startDate, endDate, maxUsage, status } = req.body;

        const promoCode = (code || '').trim().toUpperCase();
        if (!promoCode) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá!' });

        const existingCoupon = await Coupon.findOne({ code: promoCode });
        if (existingCoupon) return res.status(400).json({ success: false, message: 'Mã giảm giá này đã tồn tại!' });

        const promoType = type === Promotion.TYPE.FREESHIP || discountType === Coupon.DISCOUNT_TYPE.FREESHIP
            ? Promotion.TYPE.FREESHIP
            : Promotion.TYPE.COUPON;
        const normalizedDiscountType = promoType === Promotion.TYPE.FREESHIP
            ? Coupon.DISCOUNT_TYPE.FREESHIP
            : discountType;
        const normalizedValue = normalizedDiscountType === Coupon.DISCOUNT_TYPE.FREESHIP ? 0 : value;
        const normalizedMaxDiscount = normalizedDiscountType === Coupon.DISCOUNT_TYPE.PERCENT ? maxDiscount : 0;

        const newPromo = await Promotion.create({
            shop: null,
            name,
            type: promoType,
            discountType: normalizedDiscountType,
            value: normalizedValue,
            maxDiscount: normalizedMaxDiscount,
            minOrderValue,
            startDate,
            endDate,
            maxUsage,
            status: status || updateStatusByDate({ startDate, endDate })
        });

        const shouldBeActive = status !== 'draft';

        // Chỉ sync lifecycle khi KHÔNG phải draft, vì sync sẽ ghi đè draft → running/scheduled
        if (status !== 'draft') {
            await Promotion.syncLifecycleStatuses({ _id: newPromo._id });
        }
        const newCoupon = await Coupon.create({
            code: promoCode,
            promotion: newPromo._id,
            shop: null,
            discountType: normalizedDiscountType,
            value: normalizedValue,
            maxDiscount: normalizedMaxDiscount,
            minOrderValue,
            startDate,
            endDate,
            usageLimit: maxUsage || 0,
            isActive: shouldBeActive,
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

        const coupon = await Coupon.findOne({ promotion: promo._id });
        if (coupon) {
            // Thu hồi voucher khỏi ví khách trước khi xóa coupon
            await VoucherWallet.updateMany(
                { coupon: coupon._id, status: VOUCHER_STATUS.ACTIVE },
                { status: VOUCHER_STATUS.REVOKED }
            );
            await Coupon.findByIdAndDelete(coupon._id);
        }
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
        const { name, code, type, discountType, value, maxDiscount, minOrderValue, startDate, endDate, maxUsage, status } = req.body;

        const promo = await Promotion.findById(req.params.id);
        if (!promo) return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mãi' });

        const requestedType = type || promo.type;
        const normalizedType = requestedType === Promotion.TYPE.FREESHIP || discountType === Coupon.DISCOUNT_TYPE.FREESHIP
            ? Promotion.TYPE.FREESHIP
            : Promotion.TYPE.COUPON;
        const normalizedDiscountType = normalizedType === Promotion.TYPE.FREESHIP
            ? Coupon.DISCOUNT_TYPE.FREESHIP
            : (discountType !== undefined ? discountType : promo.discountType);
        const normalizedValue = normalizedDiscountType === Coupon.DISCOUNT_TYPE.FREESHIP
            ? 0
            : (value !== undefined ? value : promo.value);
        const normalizedMaxDiscount = normalizedDiscountType === Coupon.DISCOUNT_TYPE.PERCENT
            ? (maxDiscount !== undefined ? maxDiscount : promo.maxDiscount)
            : 0;

        if (name !== undefined) promo.name = name;
        if (type !== undefined || discountType !== undefined) promo.type = normalizedType;
        if (type !== undefined || discountType !== undefined) promo.discountType = normalizedDiscountType;
        if (type !== undefined || discountType !== undefined || value !== undefined) promo.value = normalizedValue;
        if (type !== undefined || discountType !== undefined || maxDiscount !== undefined) promo.maxDiscount = normalizedMaxDiscount;
        if (minOrderValue !== undefined) promo.minOrderValue = minOrderValue;
        if (startDate !== undefined) promo.startDate = startDate;
        if (endDate !== undefined) promo.endDate = endDate;
        if (maxUsage !== undefined) promo.maxUsage = maxUsage;
        if (status !== undefined) promo.status = status;
        await promo.save();

        // Chỉ sync lifecycle khi KHÔNG phải draft, vì sync sẽ ghi đè draft → running/scheduled
        if (status !== 'draft') {
            await Promotion.syncLifecycleStatuses({ _id: promo._id });
        }
        const syncedPromo = await Promotion.findById(promo._id);

        const coupon = await Coupon.findOne({ promotion: promo._id });
        if (coupon) {
            const shouldBeActive = syncedPromo.status === 'running' || syncedPromo.status === 'scheduled';
            const wasActive = coupon.isActive;

            coupon.discountType = promo.discountType;
            coupon.value = promo.value;
            coupon.maxDiscount = promo.discountType === 'percent' ? promo.maxDiscount : 0;
            coupon.minOrderValue = promo.minOrderValue;
            coupon.startDate = promo.startDate;
            coupon.endDate = promo.endDate;
            coupon.usageLimit = promo.maxUsage || 0;
            coupon.isActive = shouldBeActive;
            await coupon.save();

            // Nếu coupon bị deactivate, thu hồi voucher khỏi ví khách
            if (wasActive && !shouldBeActive) {
                await VoucherWallet.updateMany(
                    { coupon: coupon._id, status: VOUCHER_STATUS.ACTIVE },
                    { status: VOUCHER_STATUS.REVOKED }
                );
            }
        }

        // Đồng bộ các field voucher đã thay đổi (không phải status) vào VoucherWallet
        const updatedFields = {};
        if (type !== undefined || discountType !== undefined || value !== undefined) updatedFields.value = promo.value;
        if (type !== undefined || discountType !== undefined) updatedFields.discountType = promo.discountType;
        if (type !== undefined || discountType !== undefined || maxDiscount !== undefined) updatedFields.maxDiscount = promo.maxDiscount;
        if (minOrderValue !== undefined) updatedFields.minOrderValue = minOrderValue;
        if (endDate !== undefined) updatedFields.endDate = endDate;
        if (coupon && Object.keys(updatedFields).length > 0) {
            await VoucherWallet.updateMany(
                { coupon: coupon?._id },
                { $set: updatedFields }
            );
        }

        res.status(200).json({ success: true, message: 'Cập nhật khuyến mãi thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
module.exports = { getAdminPromotions, createAdminPromotion, deleteAdminPromotion, updateAdminPromotion };
