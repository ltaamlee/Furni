const Coupon = require('../models/coupon');
const Promotion = require('../models/promotion');
const { VoucherWallet, VOUCHER_STATUS } = require('../models/voucherWallet');

const markVoucherUsed = async (voucherWalletId, orderId = null) => {
    if (!voucherWalletId) return null;

    const voucher = await VoucherWallet.findById(voucherWalletId);
    if (!voucher) return null;

    const alreadyUsedForOrder = voucher.status === VOUCHER_STATUS.USED
        && orderId
        && voucher.usedForOrder?.toString() === orderId.toString();
    if (alreadyUsedForOrder) return voucher;

    if (voucher.status !== VOUCHER_STATUS.ACTIVE) return null;

    voucher.status = VOUCHER_STATUS.USED;
    voucher.usedAt = new Date();
    voucher.usedForOrder = orderId || null;
    await voucher.save();

    if (voucher.coupon) {
        const coupon = await Coupon.findByIdAndUpdate(
            voucher.coupon,
            { $inc: { usedCount: 1 } },
            { new: true }
        );
        if (coupon?.promotion) {
            await Promotion.findByIdAndUpdate(coupon.promotion, { $inc: { usedCount: 1 } });
        }
    }

    return voucher;
};

const restoreWalletVoucher = async (voucherWalletId, orderId) => {
    if (!voucherWalletId) return false;

    const voucher = await VoucherWallet.findById(voucherWalletId);
    if (!voucher) return false;

    const belongsToOrder = !voucher.usedForOrder
        || voucher.usedForOrder.toString() === orderId.toString();
    if (!belongsToOrder) return false;

    voucher.status = VOUCHER_STATUS.ACTIVE;
    voucher.usedAt = null;
    voucher.usedForOrder = null;
    await voucher.save();

    if (voucher.coupon) {
        const coupon = await Coupon.findOneAndUpdate(
            { _id: voucher.coupon, usedCount: { $gt: 0 } },
            { $inc: { usedCount: -1 } },
            { new: true }
        );
        if (coupon?.promotion) {
            await Promotion.findOneAndUpdate(
                { _id: coupon.promotion, usedCount: { $gt: 0 } },
                { $inc: { usedCount: -1 } }
            );
        }
    }

    return true;
};

const restoreVoucherForOrder = async (order) => {
    if (!order || order.voucherRolledBack) return false;

    const restoredProductVoucher = await restoreWalletVoucher(order.usedCouponId, order._id);
    const restoredShippingVoucher = await restoreWalletVoucher(order.usedShippingCouponId, order._id);

    if (order.usedCouponId || order.usedShippingCouponId) {
        order.voucherRolledBack = true;
    }

    return restoredProductVoucher || restoredShippingVoucher;
};

module.exports = {
    markVoucherUsed,
    restoreVoucherForOrder,
};
