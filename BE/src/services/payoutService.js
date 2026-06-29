/**
 * Payout Service
 *
 * Xử lý chi trả cho vendor khi đơn hàng giao thành công.
 * Ghi nhận đầy đủ vào AdminLedger (sổ cái kép).
 *
 * Nguyên tắc kế toán:
 *   Tiền không tự sinh ra hoặc mất đi.
 *   Mọi biến động số dư đều có giao dịch đối ứng (double-entry ledger).
 */

const mongoose = require('mongoose');
const Wallet = require('../models/wallet');
const Transaction = require('../models/transaction');
const Order = require('../models/order');
const PlatformConfig = require('../models/platformConfig');
const AdminLedger = require('../models/adminLedger');

const {
    LEDGER_TYPE,
    ACCOUNT_TYPE,
    STATUS: LEDGER_STATUS,
} = AdminLedger;

const { TYPE: TX_TYPE, CATEGORY: TX_CATEGORY, STATUS: TX_STATUS } = Transaction;
const { CONFIG_KEYS } = PlatformConfig;

/** ─────────────────────────────────────────────────────────────────────
 * Helper: lấy hoặc tạo ví vendor (Wallet gắn với shop.owner)
 * ─────────────────────────────────────────────────────────────────── */
const getOrCreateVendorWallet = async (shop) => {
    let wallet = await Wallet.findOne({ user: shop.owner });
    if (!wallet) {
        wallet = await Wallet.create({
            user: shop.owner,
            accounts: [],
            transactions: [],
            balance: 0,
        });
    }
    return wallet;
};

/** ─────────────────────────────────────────────────────────────────────
 * Helper: lấy shop owner từ order
 * ─────────────────────────────────────────────────────────────────── */
const getShopFromOrder = async (order) => {
    const { Shop } = require('../models/Shop');
    if (order.shop) {
        return Shop.findById(order.shop);
    }
    // Multi-item order: lấy shop từ product đầu tiên
    const firstItem = order.products?.[0];
    if (firstItem?.shop) {
        return Shop.findById(firstItem.shop);
    }
    return null;
};

/** ─────────────────────────────────────────────────────────────────────
 * Helper: kiểm tra đơn đã được chi trả chưa
 * ─────────────────────────────────────────────────────────────────── */
const isOrderPaidOut = async (orderId) => {
    const existingTx = await Transaction.findOne({
        order: orderId,
        category: TX_CATEGORY.ORDER_INCOME,
    });
    return !!existingTx;
};

/** ─────────────────────────────────────────────────────────────────────
 * Tính phí sàn trên doanh thu ĐÃ TRỪ voucher
 *
 * FIX: phí sàn tính trên (subtotal - couponDiscount), không phải subtotal gốc.
 * Ví dụ: subtotal=900k, coupon=135k → phí = (900k-135k)×5% = 38.250đ
 *         thay vì 900k×5% = 45.000đ (sàn lỗ 6.750đ mỗi đơn có voucher)
 *
 * @param {number} subtotal           - Tổng giá sản phẩm đã giảm cấp sản phẩm (chưa trừ coupon)
 * @param {number} couponDiscount     - Số tiền voucher đã giảm thêm
 * @returns {Promise<{platformFee, netRevenue, feePercent}>}
 * ─────────────────────────────────────────────────────────────────── */

/** ─────────────────────────────────────────────────────────────────────
 * Ghi ledger entry cho một giao dịch Admin
 * ─────────────────────────────────────────────────────────────────── */
const createLedgerEntry = async (data, session) => {
    const entry = await AdminLedger.create([data], { session });
    return entry[0];
};

/** ─────────────────────────────────────────────────────────────────────
 * Chi trả cho vendor khi đơn giao thành công (DELIVERED)
 *
 * Luồng ledger:
 *   1. DR PAYOS_HOLDING  platformFee  → CR PLATFORM_FEE  (thu phí sàn)
 *   2. DR VOUCHER_LIAB   voucherAmt   → CR PAYOS_HOLDING  (ghi nợ voucher sàn, đã trừ ở checkout)
 *   3. DR PAYOUT_POOL    netAmount   → CR Shop Wallet    (trả tiền cho vendor)
 *   4. (nếu voucher sàn) CR Shop Wallet voucherPlatformAmount (quyết toán voucher sàn)
 *
 * ─────────────────────────────────────────────────────────────────── */
const payoutOrderToVendors = async (orderId) => {
    console.log(`[Payout] Bat dau chi tra cho orderId=${orderId}`);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await Order.findById(orderId).session(session);
        if (!order) throw new Error('Không tìm thấy đơn hàng');

        // ── Guard: đã payout rồi → bỏ qua ───────────────────────────
        if (await isOrderPaidOut(orderId)) {
            console.log(`[Payout] Order ${order.orderNumber} đã được chi trả, bỏ qua`);
            await session.abortTransaction();
            return { success: true, alreadyPaid: true };
        }

        // ── Guard: chưa delivered ────────────────────────────────────
        if (order.status !== Order.ORDER_STATUS.DELIVERED) {
            throw new Error(`Đơn hàng chưa giao thành công (status: ${order.status})`);
        }

        // ── Guard: COD chưa xác nhận thanh toán ─────────────────────
        if (order.paymentMethod === 'COD' && order.paymentStatus !== 'paid') {
            throw new Error('Đơn COD chưa được xác nhận thanh toán');
        }

        const shop = await getShopFromOrder(order);
        const shopId = shop?._id || null;

        // ── Dùng pre-calculated values từ Order ───────────────────────
        const platformFee = order.commissionAmount || 0;
        const netRevenue = order.vendorTakeHome || 0;
        const feePercent = order.commissionRate || 2;
        const voucherPlatformAmt = order.voucherPlatformAmount || 0;
        const totalToVendor = netRevenue + voucherPlatformAmt;

        // ── Ghi ledger: Thu phí sàn ────────────────────────────────
        if (platformFee > 0) {
            await createLedgerEntry({
                order: order._id,
                orderNumber: order.orderNumber,
                checkoutGroupId: order.checkoutGroupId,
                type: LEDGER_TYPE.PLATFORM_FEE_IN,
                amount: platformFee,
                accountDebit: ACCOUNT_TYPE.PAYOS_HOLDING,
                accountCredit: ACCOUNT_TYPE.PLATFORM_FEE,
                shop: shopId,
                customer: order.user,
                status: LEDGER_STATUS.COMPLETED,
                description: `Thu phí sàn ${feePercent}% từ đơn #${order.orderNumber}`,
            }, session);
        }

        // ── Ghi ledger: Ghi nhận chi phí voucher sàn (tạo nợ VOUCHER_LIAB) ──
        // Phải tạo TRƯỚC VOUCHER_SPONSOR_SETTLE để VOUCHER_LIAB không bị âm
        if (voucherPlatformAmt > 0) {
            await createLedgerEntry({
                order: order._id,
                orderNumber: order.orderNumber,
                checkoutGroupId: order.checkoutGroupId,
                type: LEDGER_TYPE.VOUCHER_SPONSOR_IN,
                amount: voucherPlatformAmt,
                accountDebit: ACCOUNT_TYPE.PAYOS_HOLDING,
                accountCredit: ACCOUNT_TYPE.VOUCHER_LIAB,
                shop: shopId,
                customer: order.user,
                status: LEDGER_STATUS.COMPLETED,
                description: `Ghi nhận chi phí voucher sàn tài trợ đơn #${order.orderNumber}`,
            }, session);
        }

        // ── Ghi ledger: Ghi nhận chi phí freeship sàn (tạo nợ VOUCHER_LIAB) ──
        const shippingPlatformAmt = order.shippingPlatformAmount || 0;
        if (shippingPlatformAmt > 0) {
            await createLedgerEntry({
                order: order._id,
                orderNumber: order.orderNumber,
                checkoutGroupId: order.checkoutGroupId,
                type: LEDGER_TYPE.FREESHIP_SPONSOR_IN,
                amount: shippingPlatformAmt,
                accountDebit: ACCOUNT_TYPE.PAYOS_HOLDING,
                accountCredit: ACCOUNT_TYPE.VOUCHER_LIAB,
                shop: shopId,
                customer: order.user,
                status: LEDGER_STATUS.COMPLETED,
                description: `Ghi nhận chi phí freeship sàn tài trợ đơn #${order.orderNumber}`,
            }, session);
        }

        // ── Ghi ledger: Quyết toán voucher sàn (nếu có) ────────────
        if (voucherPlatformAmt > 0) {
            await createLedgerEntry({
                order: order._id,
                orderNumber: order.orderNumber,
                checkoutGroupId: order.checkoutGroupId,
                type: LEDGER_TYPE.VOUCHER_SPONSOR_SETTLE,
                amount: voucherPlatformAmt,
                accountDebit: ACCOUNT_TYPE.VOUCHER_LIAB,
                accountCredit: null,
                shop: shopId,
                customer: order.user,
                status: LEDGER_STATUS.COMPLETED,
                description: `Quyết toán voucher sàn tài trợ cho shop đơn #${order.orderNumber}`,
            }, session);

            // Đồng thời ghi credit vào ví vendor (không qua PAYOS_HOLDING vì
            // voucher sàn đã được trừ ở payableAmount lúc checkout)
            const vendorWallet = await getOrCreateVendorWallet(shop);
            await creditToVendor(vendorWallet, voucherPlatformAmt, `Quyết toán voucher sàn đơn #${order.orderNumber}`, shopId, order._id, session);
        }

        // ── Ghi ledger: Chi trả cho vendor ────────────────────────
        if (netRevenue > 0) {
            const vendorWallet = await getOrCreateVendorWallet(shop);

            await createLedgerEntry({
                order: order._id,
                orderNumber: order.orderNumber,
                checkoutGroupId: order.checkoutGroupId,
                type: LEDGER_TYPE.PAYOUT_TO_VENDOR,
                amount: netRevenue,
                accountDebit: ACCOUNT_TYPE.PAYOUT_POOL,
                accountCredit: null,
                shop: shopId,
                customer: order.user,
                status: LEDGER_STATUS.COMPLETED,
                description: `Chi trả doanh thu đơn #${order.orderNumber} (phí sàn ${feePercent}% = ${platformFee.toLocaleString('vi-VN')}đ)`,
            }, session);

            // Credit vào ví vendor
            await creditToVendor(
                vendorWallet,
                netRevenue,
                `Doanh thu đơn hàng #${order.orderNumber}`,
                shopId,
                order._id,
                session,
            );
        }

        // ── Cập nhật Order ────────────────────────────────────────
        order.platformFeeAmount = platformFee;
        order.platformFeePercent = feePercent;
        order.payoutStatus = 'paid';
        order.payoutAt = new Date();
        await order.save({ session });

        // ── Đánh dấu đã payout (tạo Transaction marker) ───────────
        await Transaction.create([{
            wallet: (await getOrCreateVendorWallet(shop))._id,
            shop: shopId,
            type: TX_TYPE.CREDIT,
            category: TX_CATEGORY.ORDER_INCOME,
            amount: totalToVendor,
            status: TX_STATUS.SUCCESS,
            order: order._id,
            description: `Payout đơn #${order.orderNumber}`,
        }], { session });

        await session.commitTransaction();

        console.log(`[Payout] ${order.orderNumber}: subtotal=${order.subtotal} | coupon=${order.couponDiscount || 0} | taxable=${order.taxableRevenue} | commission=${platformFee}(${feePercent}%) | net=${netRevenue} | voucherPlatform=${voucherPlatformAmt} | toVendor=${totalToVendor}`);

        return {
            success: true,
            orderId: order._id,
            orderNumber: order.orderNumber,
            shopId,
            subtotal: order.subtotal,
            couponDiscount: order.couponDiscount || 0,
            platformFee,
            netRevenue,
            voucherPlatformAmount: voucherPlatformAmt,
            totalToVendor,
            feePercent,
        };

    } catch (error) {
        await session.abortTransaction();
        console.error(`[Payout] Lỗi chi trả đơn ${orderId}:`, error.message);
        throw error;
    } finally {
        session.endSession();
    }
};

/** ─────────────────────────────────────────────────────────────────────
 * Ghi credit vào ví vendor + tạo Transaction
 * ─────────────────────────────────────────────────────────────────── */
const creditToVendor = async (wallet, amount, description, shopId, orderId, session) => {
    wallet.balance += amount;
    await wallet.save({ session });

    await Transaction.create([{
        wallet: wallet._id,
        shop: shopId || null,
        type: TX_TYPE.CREDIT,
        category: TX_CATEGORY.ORDER_INCOME,
        amount,
        status: TX_STATUS.SUCCESS,
        order: orderId,
        description,
        balanceAfter: wallet.balance,
    }], { session });
};

/** ─────────────────────────────────────────────────────────────────────
 * Reverse payout khi đơn bị hủy SAU KHI đã payout (DELIVERED)
 *
 * Luồng ledger:
 *   1. DR Shop Wallet    netRevenue          → CR PAYOUT_POOL  (thu hồi tiền vendor)
 *   2. DR Shop Wallet    voucherPlatformAmt  → CR VOUCHER_LIAB (hoàn voucher sàn)
 *   3. DR PLATFORM_FEE   platformFee         → CR PAYOS_HOLDING  (hoàn phí sàn cho sàn)
 *
 * Số dư Admin sau khi reverse: phải bằng 0 (không mất tiền)
 *
 * ─────────────────────────────────────────────────────────────────── */
const reversePayoutForCancelledOrder = async (orderId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await Order.findById(orderId).session(session);
        if (!order) throw new Error('Không tìm thấy đơn hàng');

        // Tìm transaction ORDER_INCOME từ payout trước đó
        const incomeTransactions = await Transaction.find({
            order: orderId,
            category: TX_CATEGORY.ORDER_INCOME,
            type: TX_TYPE.CREDIT,
        }).session(session);

        if (incomeTransactions.length === 0) {
            console.log(`[ReversePayout] Đơn ${order.orderNumber} chưa được chi trả, không cần reverse`);
            await session.abortTransaction();
            return { success: true, reversed: false };
        }

        // ── Dùng pre-calculated values từ Order ───────────────────────
        const platformFee = order.commissionAmount || 0;
        const netRevenue = order.vendorTakeHome || 0;
        const voucherPlatformAmt = order.voucherPlatformAmount || 0;
        const shippingPlatformAmt = order.shippingPlatformAmount || 0;

        const reverseResults = [];

        // ── Thu hồi netRevenue từ ví vendor ───────────────────────
        for (const tx of incomeTransactions) {
            const vendorWallet = await Wallet.findById(tx.wallet).session(session);
            if (!vendorWallet) continue;

            const debitAmount = Math.min(vendorWallet.balance, tx.amount);
            vendorWallet.balance = Math.max(0, vendorWallet.balance - debitAmount);
            await vendorWallet.save({ session });

            await Transaction.create([{
                wallet: vendorWallet._id,
                shop: tx.shop,
                type: TX_TYPE.DEBIT,
                category: TX_CATEGORY.REFUND,
                amount: debitAmount,
                status: TX_STATUS.SUCCESS,
                order: orderId,
                description: `Hoàn tiền do hủy đơn #${order.orderNumber} (thu hồi payout)`,
                balanceAfter: vendorWallet.balance,
            }], { session });

            reverseResults.push({
                walletId: vendorWallet._id,
                debitedAmount: debitAmount,
                transactionId: tx._id,
            });
        }

        // ── Ghi ledger: Thu hồi payout → PAYOUT_POOL (khôi phục pool)
        if (netRevenue > 0) {
            await createLedgerEntry({
                order: order._id,
                orderNumber: order.orderNumber,
                checkoutGroupId: order.checkoutGroupId,
                type: LEDGER_TYPE.VENDOR_REFUND_IN,
                amount: netRevenue,
                accountDebit: ACCOUNT_TYPE.PAYOUT_POOL,
                accountCredit: ACCOUNT_TYPE.PAYOS_HOLDING,
                shop: order.shop || null,
                customer: order.user,
                status: LEDGER_STATUS.COMPLETED,
                description: `Thu hồi payout đơn #${order.orderNumber} (hoàn cho sàn)`,
            }, session);
        }

        // ── Ghi ledger: Hoàn phí sàn cho Admin ───────────────────
        if (platformFee > 0) {
            await createLedgerEntry({
                order: order._id,
                orderNumber: order.orderNumber,
                checkoutGroupId: order.checkoutGroupId,
                type: LEDGER_TYPE.PLATFORM_FEE_REFUND,
                amount: platformFee,
                accountDebit: ACCOUNT_TYPE.PLATFORM_FEE,
                accountCredit: ACCOUNT_TYPE.PAYOS_HOLDING,
                shop: order.shop || null,
                customer: order.user,
                status: LEDGER_STATUS.COMPLETED,
                description: `Hoàn phí sàn ${order.platformFeePercent}% từ hủy đơn #${order.orderNumber}`,
            }, session);
        }

        // ── Ghi ledger: Hoàn voucher sàn (nếu có) ─────────────────
        if (voucherPlatformAmt > 0) {
            await createLedgerEntry({
                order: order._id,
                orderNumber: order.orderNumber,
                checkoutGroupId: order.checkoutGroupId,
                type: LEDGER_TYPE.VOUCHER_SPONSOR_REFUND,
                amount: voucherPlatformAmt,
                accountDebit: ACCOUNT_TYPE.VOUCHER_LIAB,
                accountCredit: ACCOUNT_TYPE.PAYOS_HOLDING,
                shop: order.shop || null,
                customer: order.user,
                status: LEDGER_STATUS.COMPLETED,
                description: `Hoàn voucher sàn tài trợ từ hủy đơn #${order.orderNumber}`,
            }, session);
        }

        // ── Ghi ledger: Hoàn freeship sàn (nếu có) ─────────────────
        if (shippingPlatformAmt > 0) {
            await createLedgerEntry({
                order: order._id,
                orderNumber: order.orderNumber,
                checkoutGroupId: order.checkoutGroupId,
                type: LEDGER_TYPE.FREESHIP_SPONSOR_REFUND,
                amount: shippingPlatformAmt,
                accountDebit: ACCOUNT_TYPE.VOUCHER_LIAB,
                accountCredit: ACCOUNT_TYPE.PAYOS_HOLDING,
                shop: order.shop || null,
                customer: order.user,
                status: LEDGER_STATUS.COMPLETED,
                description: `Hoàn freeship sàn tài trợ từ hủy đơn #${order.orderNumber}`,
            }, session);
        }

        // ── Cập nhật Order ────────────────────────────────────────
        order.payoutStatus = 'reversed';
        await order.save({ session });

        await session.commitTransaction();

        console.log(`[ReversePayout] Đơn ${order.orderNumber}: thu hồi net=${netRevenue} | hoàn phí=${platformFee} | hoàn voucher=${voucherPlatformAmt}`);

        return {
            success: true,
            reversed: true,
            orderNumber: order.orderNumber,
            netRevenueReversed: netRevenue,
            platformFeeRefunded: platformFee,
            voucherRefunded: voucherPlatformAmt,
            walletDebits: reverseResults,
        };

    } catch (error) {
        await session.abortTransaction();
        console.error(`[ReversePayout] Lỗi đơn ${orderId}:`, error.message);
        throw error;
    } finally {
        session.endSession();
    }
};

/** ─────────────────────────────────────────────────────────────────────
 * Chi trả hàng loạt
 * ─────────────────────────────────────────────────────────────────── */
const batchPayout = async (orderIds) => {
    const results = { success: [], failed: [], skipped: [] };

    for (const orderId of orderIds) {
        try {
            const result = await payoutOrderToVendors(orderId);
            if (result.alreadyPaid) results.skipped.push(orderId);
            else results.success.push(orderId);
        } catch (error) {
            results.failed.push({ orderId, error: error.message });
        }
    }
    return results;
};

/** ─────────────────────────────────────────────────────────────────────
 * Chi trả tất cả đơn đã giao thành công nhưng chưa payout (cron job)
 * ─────────────────────────────────────────────────────────────────── */
const payoutPendingOrders = async () => {
    const payoutEnabled = await PlatformConfig.getValue(
        CONFIG_KEYS.PAYOUT_AUTO_ENABLED,
        true,
    );
    if (!payoutEnabled) {
        console.log('[Payout] Chi trả tự động đang bị tắt');
        return { message: 'Chi trả tự động bị tắt' };
    }

    const paidOutOrderIds = await Transaction.distinct('order', {
        category: TX_CATEGORY.ORDER_INCOME,
        order: { $ne: null },
    });

    const pendingOrders = await Order.find({
        status: Order.ORDER_STATUS.DELIVERED,
        _id: { $nin: paidOutOrderIds },
    }).select('_id orderNumber');

    if (pendingOrders.length === 0) {
        return { message: 'Không có đơn hàng nào cần chi trả' };
    }

    console.log(`[Payout] Tìm thấy ${pendingOrders.length} đơn hàng cần chi trả`);
    const results = await batchPayout(pendingOrders.map(o => o._id));

    return {
        message: `Đã xử lý ${pendingOrders.length} đơn hàng`,
        ...results,
    };
};

/** ─────────────────────────────────────────────────────────────────────
 * Tổng quan số dư vendor
 * ─────────────────────────────────────────────────────────────────── */
const getTotalVendorBalances = async () => {
    const { Shop } = require('../models/Shop');
    const result = await Wallet.aggregate([
        { $match: { shop: { $ne: null } } },
        { $group: {
            _id: null,
            totalBalance: { $sum: '$balance' },
            walletCount: { $sum: 1 },
        }},
    ]);
    return result[0] || { totalBalance: 0, walletCount: 0 };
};

/** ─────────────────────────────────────────────────────────────────────
 * Thống kê số dư Admin (AdminLedger balances)
 * ─────────────────────────────────────────────────────────────────── */
const getAdminLedgerBalances = async () => {
    const balances = await AdminLedger.getCurrentBalances();
    return {
        payosHolding:  balances.get(ACCOUNT_TYPE.PAYOS_HOLDING) || 0,
        platformFee:   balances.get(ACCOUNT_TYPE.PLATFORM_FEE)   || 0,
        voucherLiab:   balances.get(ACCOUNT_TYPE.VOUCHER_LIAB)   || 0,
        payoutPool:    balances.get(ACCOUNT_TYPE.PAYOUT_POOL)    || 0,
    };
};

module.exports = {
    getOrCreateVendorWallet,
    isOrderPaidOut,
    payoutOrderToVendors,
    reversePayoutForCancelledOrder,
    batchPayout,
    payoutPendingOrders,
    getTotalVendorBalances,
    getAdminLedgerBalances,
};
