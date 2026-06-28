/**
 * Payment Payout Service
 * 
 * Xử lý phân bổ tiền cho vendor khi đơn hàng hoàn tất
 */

const mongoose = require('mongoose');
const Wallet = require('../models/wallet');
const Transaction = require('../models/transaction');
const Order = require('../models/order');
const PlatformConfig = require('../models/platformConfig');

const { TYPE: TX_TYPE, CATEGORY: TX_CATEGORY, STATUS: TX_STATUS } = Transaction;
const { CONFIG_KEYS } = PlatformConfig;

/**
 * Tính phần doanh thu của một shop trong đơn hàng
 * @param {Object} order - Order document
 * @param {ObjectId} shopId - Shop ID
 * @returns {Object} - { shopSubtotal, shopItems, shopQuantity }
 */
const getShopSliceOfOrder = (order, shopId) => {
    const sid = shopId.toString();
    const shopItems = (order.products || []).filter(
        (p) => p.shop && p.shop.toString() === sid
    );
    const shopSubtotal = shopItems.reduce(
        (s, it) => s + it.price * it.quantity, 0
    );
    const shopQuantity = shopItems.reduce((s, it) => s + it.quantity, 0);
    return { shopItems, shopSubtotal, shopQuantity };
};

/**
 * Lấy hoặc tạo ví cho shop
 * @param {Object} shop - Shop document
 * @returns {Promise<Wallet>}
 */
const getOrCreateWallet = async (shop) => {
    let wallet = await Wallet.findOne({ user: shop.owner });
    if (!wallet) {
        wallet = await Wallet.create({
            user: shop.owner,
            accounts: [],
            transactions: [],
            balance: 0,
        });
    }
    wallet._vendorShopId = shop._id;
    return wallet;
};

/**
 * Kiểm tra xem đơn hàng đã được chi trả cho vendors chưa
 * @param {ObjectId} orderId - Order ID
 * @returns {Promise<boolean>}
 */
const isOrderPaidOut = async (orderId) => {
    const existingTx = await Transaction.findOne({
        order: orderId,
        category: TX_CATEGORY.ORDER_INCOME
    });
    return !!existingTx;
};

/**
 * Tính phí sàn cho một đơn hàng
 * @param {number} amount - Số tiền đơn hàng
 * @returns {Promise<Object>} - { platformFee, netAmount, feePercent }
 */
const calculatePlatformFee = async (amount) => {
    const feePercent = await PlatformConfig.getValue(
        CONFIG_KEYS.PLATFORM_FEE_PERCENT,
        5 // default 5%
    );
    const platformFee = Math.round(amount * feePercent / 100);
    const netAmount = amount - platformFee;
    return { platformFee, netAmount, feePercent };
};

/**
 * Cộng tiền vào ví vendor
 * @param {Wallet} wallet - Wallet document
 * @param {number} amount - Số tiền
 * @param {string} description - Mô tả
 * @returns {Promise<Object>} - Transaction document
 */
const creditToWallet = async (wallet, amount, description, shopId) => {
    wallet.balance += amount;
    await wallet.save();

    const transaction = await Transaction.create({
        wallet: wallet._id,
        shop: shopId || wallet._vendorShopId || null,
        type: TX_TYPE.CREDIT,
        category: TX_CATEGORY.ORDER_INCOME,
        amount,
        status: TX_STATUS.SUCCESS,
        description,
        balanceAfter: wallet.balance
    });

    return transaction;
};

/**
 * Tạo transaction ghi nhận phí sàn
 * @param {number} amount - Số tiền phí
 * @param {ObjectId} orderId - Order ID
 * @param {string} description - Mô tả
 */
const recordPlatformFee = async (amount, orderId, description) => {
    // Platform fee có thể ghi vào ví hệ thống hoặc đơn giản là ghi log
    // Ở đây ta sẽ tạo 1 ví hệ thống (platform wallet)
    const platformWallet = await Wallet.findOne({ shop: null }); // Ví platform
    
    // Nếu cần ghi nhận phí cho platform, uncomment dòng dưới:
    // await Transaction.create({
    //     wallet: platformWallet?._id,
    //     type: TX_TYPE.CREDIT,
    //     category: TX_CATEGORY.PLATFORM_FEE,
    //     amount,
    //     status: TX_STATUS.SUCCESS,
    //     order: orderId,
    //     description: description || `Phí sàn từ đơn hàng`
    // });
    
    console.log(`[Platform Fee] ${description}: ${amount.toLocaleString('vi-VN')}đ`);
};

/**
 * Chi trả cho tất cả vendors trong một đơn hàng
 * Chỉ gọi khi đơn hàng giao thành công
 * 
 * @param {ObjectId} orderId - Order ID
 * @returns {Promise<Object>} - Kết quả chi trả
 */
const payoutOrderToVendors = async (orderId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Load order với populate shop
        const order = await Order.findById(orderId)
            .populate('products.shop')
            .session(session);

        if (!order) {
            throw new Error('Không tìm thấy đơn hàng');
        }

        // Kiểm tra đơn hàng đã được chi trả chưa
        if (await isOrderPaidOut(orderId)) {
            console.log(`[Payout] Order ${order.orderNumber} đã được chi trả, bỏ qua`);
            return { success: true, alreadyPaid: true, message: 'Đơn hàng đã được chi trả' };
        }

        // Kiểm tra đơn hàng đã giao thành công chưa
        if (order.status !== Order.ORDER_STATUS.DELIVERED) {
            throw new Error('Đơn hàng chưa giao thành công');
        }

        // Kiểm tra nếu là đơn con (đơn từ hệ thống tách đơn multi-vendor)
        // Đơn con đã có thông tin shop và subtotal riêng
        if (order.isChildOrder && order.shop) {
            const shop = order.shop;
            const shopSubtotal = order.subtotal;
            const shopQuantity = order.totalQuantity;

            // Tính phí sàn
            const { platformFee, netAmount } = await calculatePlatformFee(shopSubtotal);

            // Lấy hoặc tạo ví
            const wallet = await getOrCreateWallet(shop);

            // Cộng tiền vào ví
            const transaction = await creditToWallet(
                wallet,
                netAmount,
                `Doanh thu từ đơn hàng ${order.orderNumber} (${shopQuantity} sản phẩm)`
            );

            // Ghi nhận phí sàn
            await recordPlatformFee(
                platformFee,
                orderId,
                `Phí sàn từ ${shop.name || shop._id} - Đơn ${order.orderNumber}`
            );

            // Cập nhật transaction với order
            transaction.order = orderId;
            transaction.save({ session });

            console.log(`[Payout] Đã chi trả ${netAmount.toLocaleString('vi-VN')}đ cho ${shop.name} (phí: ${platformFee.toLocaleString('vi-VN')}đ)`);

            // Ghi nhận đã chi trả
            await markOrderPaidOut(orderId, session);
            await session.commitTransaction();

            return {
                success: true,
                orderId,
                shopId: shop._id,
                shopSubtotal,
                platformFee,
                netAmount,
                transactionId: transaction._id
            };
        }

        // Lấy danh sách shop unique trong đơn (cho đơn cũ chưa tách)
        const shopIds = [...new Set(
            order.products
                .filter(p => p.shop && p.shop._id)
                .map(p => p.shop._id.toString())
        )];

        const payoutResults = [];
        let totalPlatformFee = 0;

        // Chi trả cho từng shop
        for (const shopId of shopIds) {
            const shop = order.products.find(
                p => p.shop && p.shop._id.toString() === shopId
            ).shop;

            const { shopSubtotal, shopItems, shopQuantity } = getShopSliceOfOrder(order, shopId);

            // Tính phí sàn
            const { platformFee, netAmount } = await calculatePlatformFee(shopSubtotal);

            // Lấy hoặc tạo ví
            const wallet = await getOrCreateWallet(shop);

            // Cộng tiền vào ví
            const transaction = await creditToWallet(
                wallet,
                netAmount,
                `Doanh thu từ đơn hàng ${order.orderNumber} (${shopQuantity} sản phẩm)`
            );

            // Ghi nhận phí sàn
            await recordPlatformFee(
                platformFee,
                orderId,
                `Phí sàn từ ${shop.name || shop._id} - Đơn ${order.orderNumber}`
            );

            // Cập nhật transaction với order
            transaction.order = orderId;
            transaction.save({ session });

            payoutResults.push({
                shopId: shop._id,
                shopName: shop.name || 'Shop',
                shopSubtotal,
                platformFee,
                netAmount,
                transactionId: transaction._id
            });

            totalPlatformFee += platformFee;

            console.log(`[Payout] Đã chi trả ${netAmount.toLocaleString('vi-VN')}đ cho ${shop.name} (phí: ${platformFee.toLocaleString('vi-VN')}đ)`);
        }

        // Ghi nhận transaction tổng cho order
        await Transaction.updateOne(
            { order: orderId, category: TX_CATEGORY.ORDER_INCOME },
            { $set: { order: orderId } },
            { session }
        );

        await session.commitTransaction();

        console.log(`[Payout] Hoàn tất chi trả cho đơn ${order.orderNumber}: ${payoutResults.length} shops, tổng phí: ${totalPlatformFee.toLocaleString('vi-VN')}đ`);

        return {
            success: true,
            orderNumber: order.orderNumber,
            vendorsPaid: payoutResults.length,
            results: payoutResults,
            totalPlatformFee
        };

    } catch (error) {
        await session.abortTransaction();
        console.error(`[Payout] Lỗi chi trả cho đơn ${orderId}:`, error.message);
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Chi trả hàng loạt cho nhiều đơn hàng
 * Dùng cho cron job hoặc settlement
 * 
 * @param {Array<ObjectId>} orderIds - Danh sách Order IDs
 * @returns {Promise<Object>} - Kết quả
 */
const batchPayout = async (orderIds) => {
    const results = {
        success: [],
        failed: [],
        skipped: []
    };

    for (const orderId of orderIds) {
        try {
            const result = await payoutOrderToVendors(orderId);
            if (result.alreadyPaid) {
                results.skipped.push(orderId);
            } else {
                results.success.push(orderId);
            }
        } catch (error) {
            results.failed.push({ orderId, error: error.message });
        }
    }

    return results;
};

/**
 * Chi trả cho tất cả đơn hàng đã giao thành công nhưng chưa chi trả
 * Chạy định kỳ để đảm bảo không bỏ sót
 * 
 * @returns {Promise<Object>} - Kết quả
 */
const payoutPendingOrders = async () => {
    const payoutEnabled = await PlatformConfig.getValue(
        CONFIG_KEYS.PAYOUT_AUTO_ENABLED,
        true
    );

    if (!payoutEnabled) {
        console.log('[Payout] Chi trả tự động đang bị tắt');
        return { message: 'Chi trả tự động bị tắt' };
    }

    // Tìm các đơn đã giao thành công nhưng chưa chi trả
    const paidOutOrderIds = await Transaction.distinct('order', {
        category: TX_CATEGORY.ORDER_INCOME,
        order: { $ne: null }
    });

    const pendingOrders = await Order.find({
        status: Order.ORDER_STATUS.DELIVERED,
        _id: { $nin: paidOutOrderIds }
    }).select('_id orderNumber');

    if (pendingOrders.length === 0) {
        console.log('[Payout] Không có đơn hàng nào cần chi trả');
        return { message: 'Không có đơn hàng nào cần chi trả' };
    }

    console.log(`[Payout] Tìm thấy ${pendingOrders.length} đơn hàng cần chi trả`);

    const results = await batchPayout(pendingOrders.map(o => o._id));

    return {
        message: `Đã xử lý ${pendingOrders.length} đơn hàng`,
        ...results
    };
};

/**
 * Hoàn tiền cho vendor khi đơn bị hủy sau khi đã chi trả
 * 
 * @param {ObjectId} orderId - Order ID
 * @returns {Promise<Object>} - Kết quả
 */
const reversePayoutForCancelledOrder = async (orderId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await Order.findById(orderId).session(session);
        if (!order) {
            throw new Error('Không tìm thấy đơn hàng');
        }

        // Tìm các transaction ORDER_INCOME từ đơn này
        const incomeTransactions = await Transaction.find({
            order: orderId,
            category: TX_CATEGORY.ORDER_INCOME,
            type: TX_TYPE.CREDIT
        }).session(session);

        if (incomeTransactions.length === 0) {
            return { success: true, message: 'Đơn hàng chưa được chi trả, không cần hoàn' };
        }

        const refundResults = [];

        for (const tx of incomeTransactions) {
            const wallet = await Wallet.findById(tx.wallet).session(session);
            if (!wallet) continue;

            // Trừ tiền từ ví vendor
            if (wallet.balance < tx.amount) {
                console.warn(`[Refund] Ví ${wallet._id} không đủ số dư để hoàn ${tx.amount}`);
                wallet.balance = 0;
            } else {
                wallet.balance -= tx.amount;
            }
            await wallet.save({ session });

            // Tạo transaction hoàn tiền
            const refundTx = await Transaction.create([{
                wallet: wallet._id,
                shop: wallet.shop,
                type: TX_TYPE.DEBIT,
                category: TX_CATEGORY.REFUND,
                amount: tx.amount,
                status: TX_STATUS.SUCCESS,
                order: orderId,
                description: `Hoàn tiền do hủy đơn ${order.orderNumber}`,
                balanceAfter: wallet.balance
            }], { session });

            refundResults.push({
                walletId: wallet._id,
                refundedAmount: tx.amount,
                transactionId: refundTx[0]._id
            });

            console.log(`[Refund] Đã hoàn ${tx.amount.toLocaleString('vi-VN')}đ cho ví ${wallet._id}`);
        }

        await session.commitTransaction();

        return {
            success: true,
            orderNumber: order.orderNumber,
            refunds: refundResults
        };

    } catch (error) {
        await session.abortTransaction();
        console.error(`[Refund] Lỗi hoàn tiền cho đơn ${orderId}:`, error.message);
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Lấy tổng quan số dư của tất cả vendors
 * 
 * @returns {Promise<Object>}
 */
const getTotalVendorBalances = async () => {
    const result = await Wallet.aggregate([
        { $match: { shop: { $ne: null } } },
        { $group: {
            _id: null,
            totalBalance: { $sum: '$balance' },
            totalPending: { $sum: '$pendingBalance' },
            walletCount: { $sum: 1 }
        }}
    ]);

    return result[0] || { totalBalance: 0, totalPending: 0, walletCount: 0 };
};

module.exports = {
    getShopSliceOfOrder,
    getOrCreateWallet,
    isOrderPaidOut,
    calculatePlatformFee,
    creditToWallet,
    payoutOrderToVendors,
    batchPayout,
    payoutPendingOrders,
    reversePayoutForCancelledOrder,
    getTotalVendorBalances
};
