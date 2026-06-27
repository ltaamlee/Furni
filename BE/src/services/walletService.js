/**
 * Wallet Service
 * Chứa các hàm xử lý ví không đồng bộ (gọi từ các controller khác)
 */
const Wallet = require('../models/wallet');

/**
 * Hoàn tiền vào ví khi hủy PayOS hoặc cancellation
 */
const refundWallet = async (userId, amount, opts = {}) => {
    if (!amount || Number(amount) <= 0) return;
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
        wallet = new Wallet({ user: userId, accounts: [], transactions: [] });
    }
    await wallet.refundFromCancellation(amount, opts);
};

module.exports = { refundWallet };
