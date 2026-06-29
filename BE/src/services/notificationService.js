const Notification = require('../models/notification');
const notificationStreams = new Map();

const ORDER_STATUS_LABELS = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    preparing: 'Đang chuẩn bị',
    shipping: 'Đang giao',
    delivered: 'Đã giao thành công',
    cancelled: 'Đã hủy',
    cancel_requested: 'Yêu cầu hủy',
};

const formatMoney = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')}₫`;

const safeCreateNotification = async (payload) => {
    try {
        if (!payload?.user || !payload?.title) return null;
        const notification = await Notification.create(payload);
        await emitCustomerNotificationUpdate(payload.user);
        return notification;
    } catch (error) {
        console.error('[Notification] create failed:', error.message);
        return null;
    }
};

const getNotificationSnapshot = async (userId, limit = 8) => {
    const query = { user: userId };
    const [notifications, unreadCount] = await Promise.all([
        Notification.find(query).sort('-createdAt').limit(limit),
        Notification.countDocuments({ user: userId, isRead: false }),
    ]);

    return { notifications, unreadCount };
};

const emitCustomerNotificationUpdate = async (userId) => {
    const key = userId?.toString();
    if (!key || !notificationStreams.has(key)) return;

    const snapshot = await getNotificationSnapshot(key);
    const payload = `event: notifications\ndata: ${JSON.stringify(snapshot)}\n\n`;

    for (const res of notificationStreams.get(key)) {
        try {
            res.write(payload);
        } catch (_) {
            notificationStreams.get(key)?.delete(res);
        }
    }
};

const subscribeCustomerNotifications = async (userId, res) => {
    const key = userId?.toString();
    if (!key) return;

    if (!notificationStreams.has(key)) notificationStreams.set(key, new Set());
    notificationStreams.get(key).add(res);

    const snapshot = await getNotificationSnapshot(key);
    res.write(`event: notifications\ndata: ${JSON.stringify(snapshot)}\n\n`);

    const heartbeat = setInterval(() => {
        try {
            res.write(': ping\n\n');
        } catch (_) {
            clearInterval(heartbeat);
        }
    }, 25000);

    return () => {
        clearInterval(heartbeat);
        notificationStreams.get(key)?.delete(res);
        if (notificationStreams.get(key)?.size === 0) notificationStreams.delete(key);
    };
};

const notifyCustomerOrderCreated = async (order) => {
    if (!order?.user) return null;
    const paymentText = order.paymentMethod === 'VNPAY' && order.paymentStatus === 'pending'
        ? 'Đơn đã được tạo và đang chờ thanh toán PayOS.'
        : 'Đơn hàng của bạn đã được ghi nhận.';

    return safeCreateNotification({
        user: order.user,
        type: Notification.TYPE.ORDER,
        title: `Đặt hàng thành công #${order.orderNumber}`,
        body: `${paymentText} Tổng tiền ${formatMoney(order.totalPrice)}.`,
        relatedId: order._id,
        relatedModel: 'Order',
        link: `/orders/${order._id}`,
    });
};

const notifyCustomerOrderStatus = async (order, status, opts = {}) => {
    if (!order?.user) return null;
    const label = ORDER_STATUS_LABELS[status] || status;
    const refundedAmount = Number(opts.refundedAmount || 0);
    const refundText = refundedAmount > 0
        ? ` Đã hoàn ${formatMoney(refundedAmount)} vào ví SORA.`
        : '';

    return safeCreateNotification({
        user: order.user,
        type: status === 'cancelled' && refundedAmount > 0 ? Notification.TYPE.WALLET : Notification.TYPE.ORDER,
        title: `Đơn #${order.orderNumber}: ${label}`,
        body: `${opts.message || `Đơn hàng đã chuyển sang trạng thái "${label}".`}${refundText}`,
        relatedId: order._id,
        relatedModel: 'Order',
        link: `/orders/${order._id}`,
    });
};

const notifyCustomerRefund = async (order, amount, message = '') => {
    const refundedAmount = Number(amount || 0);
    if (!order?.user || refundedAmount <= 0) return null;

    return safeCreateNotification({
        user: order.user,
        type: Notification.TYPE.WALLET,
        title: `Đã hoàn tiền đơn #${order.orderNumber}`,
        body: message || `Đã hoàn ${formatMoney(refundedAmount)} vào ví SORA.`,
        relatedId: order._id,
        relatedModel: 'Order',
        link: `/orders/${order._id}`,
    });
};

module.exports = {
    emitCustomerNotificationUpdate,
    notifyCustomerOrderCreated,
    notifyCustomerOrderStatus,
    notifyCustomerRefund,
    subscribeCustomerNotifications,
};
