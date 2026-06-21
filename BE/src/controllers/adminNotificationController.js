const Notification = require('../models/notification');

// @desc    Lấy danh sách thông báo của Admin 
// @route   GET /api/admin/notifications
const getAdminNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const notifications = await Notification.find({ user: req.user._id })
            .sort('-createdAt')
            .skip(skip)
            .limit(Number(limit));

        const total = await Notification.countDocuments({ user: req.user._id });

        res.status(200).json({
            success: true,
            data: {
                notifications,
                pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Đánh dấu 1 hoặc tất cả thông báo là đã đọc
// @route   PUT /api/admin/notifications/read
const markReadAdmin = async (req, res) => {
    try {
        const { id } = req.body;
        if (id) {
            await Notification.updateOne({ _id: id, user: req.user._id }, { isRead: true });
        } else {
            await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
        }
        res.status(200).json({ success: true, message: 'Đã cập nhật trạng thái' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Xoá thông báo
// @route   DELETE /api/admin/notifications/:id
const deleteAdminNotification = async (req, res) => {
    try {
        await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
        res.status(200).json({ success: true, message: 'Đã xoá thông báo' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// @desc    Lấy số lượng thông báo chưa đọc của Admin
// @route   GET /api/admin/notifications/unread-count
// @access  Private/Admin
const getAdminUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
        
        res.status(200).json({ success: true, data: { count } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi lấy số thông báo', error: error.message });
    }
};

module.exports = { getAdminUnreadCount, getAdminNotifications, markReadAdmin, deleteAdminNotification };