const Wallet = require('../models/wallet');

const normalizeMoney = (value) => Math.max(0, Math.round(Number(value) || 0));

const getOrCreateWallet = async (userId) => {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
        wallet = new Wallet({ user: userId, accounts: [], transactions: [] });
        await wallet.save();
    }
    return wallet;
};

const allocateWalletAmount = (keys, totalsByKey, amount) => {
    const allocations = {};
    let remaining = normalizeMoney(amount);

    for (const key of keys) {
        if (remaining <= 0) {
            allocations[key] = 0;
            continue;
        }

        const total = normalizeMoney(totalsByKey[key]);
        const allocated = Math.min(total, remaining);
        allocations[key] = allocated;
        remaining -= allocated;
    }

    return allocations;
};

const refundWallet = async (userId, amount, opts = {}) => {
    const refundAmount = normalizeMoney(amount);
    if (refundAmount <= 0) return null;

    const wallet = await getOrCreateWallet(userId);
    await wallet.refundFromCancellation(refundAmount, opts);
    return wallet;
};

const deductWallet = async (userId, amount, opts = {}) => {
    const paymentAmount = normalizeMoney(amount);
    if (paymentAmount <= 0) return null;

    const wallet = await getOrCreateWallet(userId);
    await wallet.deductForPayment(paymentAmount, opts);
    return wallet;
};

const getOrderWalletRefundTarget = (order) => {
    if (!order) return 0;

    const totalPrice = normalizeMoney(order.totalPrice);
    const walletUsedAmount = normalizeMoney(order.walletUsedAmount);

    if (order.paymentMethod === 'WALLET') return totalPrice;
    if (order.paymentMethod === 'PAYOS') {
        // Đơn đã paid → refund toàn bộ totalPrice
        if (order.paymentStatus === 'paid') return totalPrice;
        // Đơn chưa paid (failed/cancelled) nhưng có dùng ví → refund phần ví đã trừ
        if (walletUsedAmount > 0) return walletUsedAmount;
    }

    return 0;
};

const refundOrderToWallet = async (order, opts = {}) => {
    const targetAmount = getOrderWalletRefundTarget(order);
    const alreadyRefunded = normalizeMoney(order?.walletRefundedAmount);
    const refundableAmount = Math.max(0, targetAmount - alreadyRefunded);

    if (!order || refundableAmount <= 0) {
        return { wallet: null, amount: 0 };
    }

    const wallet = await refundWallet(order.user, refundableAmount, {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
        ...opts,
    });

    order.walletRefundedAmount = alreadyRefunded + refundableAmount;
    order.refundedToWalletAt = new Date();

    if (
        order.paymentMethod === 'WALLET' ||
        (order.paymentMethod === 'PAYOS' && order.paymentStatus === 'paid')
    ) {
        order.paymentStatus = 'refunded';
    }

    return { wallet, amount: refundableAmount };
};

module.exports = {
    refundWallet,
    deductWallet,
    getOrCreateWallet,
    normalizeMoney,
    allocateWalletAmount,
    getOrderWalletRefundTarget,
    refundOrderToWallet,
};
