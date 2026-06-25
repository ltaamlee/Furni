const mongoose = require('mongoose');

const VOUCHER_STATUS = {
    ACTIVE: 'active',       // Đang sử dụng được
    USED: 'used',           // Đã dùng cho 1 đơn hàng
    EXPIRED: 'expired',     // Hết hạn
};

// Loại voucher
const VOUCHER_TYPE = {
    SHOP: 'shop',           // Shop tự tạo
    PLATFORM: 'platform',   // Admin sàn tạo (khuyến mãi toàn sàn)
    AUTO: 'auto',           // Tự động apply (auto-freeship,...)
};

const voucherWalletSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        required: true
    },
    // Thông tin snapshot để không phụ thuộc Coupon gốc (nếu shop xoá/chỉnh sửa)
    code: { type: String, required: true },
    description: { type: String, default: '' },
    discountType: { type: String, enum: ['percent', 'fixed', 'freeship'], default: 'percent' },
    value: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 },
    endDate: { type: Date },
    // Shop info snapshot
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
    shopName: { type: String, default: '' },
    // Trạng thái
    status: {
        type: String,
        enum: Object.values(VOUCHER_STATUS),
        default: VOUCHER_STATUS.ACTIVE
    },
    // Dùng cho đơn hàng nào
    usedForOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    claimedAt: { type: Date, default: Date.now },
    usedAt: { type: Date, default: null },
}, { timestamps: true });

// 1 user chỉ claim 1 coupon 1 lần
voucherWalletSchema.index({ user: 1, coupon: 1 }, { unique: true });

// Virtual id
voucherWalletSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

voucherWalletSchema.set('toJSON', { virtuals: true });
voucherWalletSchema.set('toObject', { virtuals: true });

const VoucherWallet = mongoose.models.VoucherWallet || mongoose.model('VoucherWallet', voucherWalletSchema);

module.exports = {
    VoucherWallet,
    VOUCHER_STATUS,
    VOUCHER_TYPE
};
