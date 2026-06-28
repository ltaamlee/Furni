const Notification = require('../models/notification');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const {
    emitCustomerNotificationUpdate,
    subscribeCustomerNotifications,
} = require('../services/notificationService');

const getCustomerNotifications = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 8;
        const skip = (page - 1) * limit;
        const query = { user: req.user._id };

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(query).sort('-createdAt').skip(skip).limit(limit),
            Notification.countDocuments(query),
            Notification.countDocuments({ user: req.user._id, isRead: false }),
        ]);

        res.status(200).json({
            success: true,
            data: {
                notifications,
                unreadCount,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                    limit,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thông báo', error: error.message });
    }
};

const markCustomerNotificationRead = async (req, res) => {
    try {
        await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { isRead: true });
        await emitCustomerNotificationUpdate(req.user._id);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thông báo', error: error.message });
    }
};

const markAllCustomerNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
        await emitCustomerNotificationUpdate(req.user._id);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thông báo', error: error.message });
    }
};

const streamCustomerNotifications = async (req, res) => {
    try {
        const token = req.query.token;
        if (!token) return res.status(401).end();

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('role');
        if (!user || user.role !== 'customer') return res.status(403).end();

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        });
        res.flushHeaders?.();

        const cleanup = await subscribeCustomerNotifications(user._id, res);
        req.on('close', () => {
            cleanup?.();
            res.end();
        });
    } catch (_) {
        res.status(401).end();
    }
};

module.exports = {
    getCustomerNotifications,
    markCustomerNotificationRead,
    markAllCustomerNotificationsRead,
    streamCustomerNotifications,
};
