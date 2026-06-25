const { VoucherWallet, VOUCHER_STATUS } = require('../models/voucherWallet');
const Coupon = require('../models/Coupon');
const Shop = require('../models/Shop');

// @desc    Claim a voucher (coupon) into user's wallet
// @route   POST /api/vouchers/claim
// @access  Private (Customer)
const claimVoucher = async (req, res) => {
    try {
        const { couponId } = req.body;
        const userId = req.user._id;

        if (!couponId) {
            return res.status(400).json({ success: false, message: 'Thiếu mã coupon' });
        }

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Voucher không tồn tại' });
        }

        // Validate coupon is usable
        if (!coupon.isUsable()) {
            return res.status(400).json({ success: false, message: 'Voucher đã hết lượt sử dụng hoặc hết hạn' });
        }

        // Check if already claimed
        const existing = await VoucherWallet.findOne({ user: userId, coupon: couponId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Bạn đã nhận voucher này rồi!' });
        }

        // Snapshot shop info if applicable
        let shopName = '';
        if (coupon.shop) {
            const shop = await Shop.findById(coupon.shop).select('name');
            shopName = shop?.name || '';
        }

        const wallet = await VoucherWallet.create({
            user: userId,
            coupon: couponId,
            code: coupon.code,
            description: coupon.description,
            discountType: coupon.discountType,
            value: coupon.value,
            maxDiscount: coupon.maxDiscount,
            minOrderValue: coupon.minOrderValue,
            endDate: coupon.endDate,
            shopId: coupon.shop || null,
            shopName,
        });

        res.status(201).json({
            success: true,
            message: 'Nhận voucher thành công!',
            data: wallet
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Bạn đã nhận voucher này rồi!' });
        }
        res.status(500).json({ success: false, message: 'Lỗi khi nhận voucher', error: error.message });
    }
};

// @desc    Get all vouchers in user's wallet
// @route   GET /api/vouchers/wallet
// @access  Private (Customer)
const getMyVouchers = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query; // active | used | expired

        const now = new Date();
        let query = { user: userId };

        if (status === 'used') {
            query.status = VOUCHER_STATUS.USED;
        } else if (status === 'expired') {
            query.status = VOUCHER_STATUS.EXPIRED;
        } else {
            // Default: show active vouchers (status=active AND not expired)
            query = {
                user: userId,
                status: VOUCHER_STATUS.ACTIVE,
                endDate: { $gte: now }
            };
        }

        const vouchers = await VoucherWallet.find(query)
            .populate('coupon', 'code description')
            .sort({ claimedAt: -1 });

        res.status(200).json({ success: true, data: vouchers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy voucher', error: error.message });
    }
};

// @desc    Get voucher count summary
// @route   GET /api/vouchers/count
// @access  Private (Customer)
const getVoucherCount = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();

        const [active, used, expired] = await Promise.all([
            VoucherWallet.countDocuments({ user: userId, status: VOUCHER_STATUS.ACTIVE, endDate: { $gte: now } }),
            VoucherWallet.countDocuments({ user: userId, status: VOUCHER_STATUS.USED }),
            VoucherWallet.countDocuments({ user: userId, status: VOUCHER_STATUS.ACTIVE, endDate: { $lt: now } }),
        ]);

        res.status(200).json({
            success: true,
            data: { active, used, expired, total: active + used + expired }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi đếm voucher', error: error.message });
    }
};

// @desc    Apply voucher from wallet to an order (mark as used)
// @route   POST /api/vouchers/apply
// @access  Private (Customer)
const applyVoucher = async (req, res) => {
    try {
        const { voucherWalletId, orderId } = req.body;
        const userId = req.user._id;

        const voucher = await VoucherWallet.findOne({ _id: voucherWalletId, user: userId });
        if (!voucher) {
            return res.status(404).json({ success: false, message: 'Voucher không hợp lệ' });
        }

        if (voucher.status !== VOUCHER_STATUS.ACTIVE) {
            return res.status(400).json({ success: false, message: 'Voucher đã được sử dụng hoặc hết hạn' });
        }

        if (voucher.endDate && new Date(voucher.endDate) < new Date()) {
            voucher.status = VOUCHER_STATUS.EXPIRED;
            await voucher.save();
            return res.status(400).json({ success: false, message: 'Voucher đã hết hạn' });
        }

        voucher.status = VOUCHER_STATUS.USED;
        voucher.usedAt = new Date();
        voucher.usedForOrder = orderId || null;
        await voucher.save();

        // Increment coupon usedCount
        await Coupon.findByIdAndUpdate(voucher.coupon, { $inc: { usedCount: 1 } });

        res.status(200).json({ success: true, message: 'Đã áp dụng voucher', data: voucher });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi áp dụng voucher', error: error.message });
    }
};

// @desc    Get available vouchers for checkout (active, not used, not expired)
// @route   GET /api/vouchers/available
// @access  Private (Customer)
const getAvailableVouchers = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();

        const vouchers = await VoucherWallet.find({
            user: userId,
            status: VOUCHER_STATUS.ACTIVE,
            endDate: { $gte: now }
        }).sort({ endDate: 1 });

        res.status(200).json({ success: true, data: vouchers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy voucher', error: error.message });
    }
};

module.exports = {
    claimVoucher,
    getMyVouchers,
    getVoucherCount,
    applyVoucher,
    getAvailableVouchers,
};
