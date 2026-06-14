const mongoose = require('mongoose');

// Loại thông báo (SRS 4.10)
const NOTIF_TYPE = {
    ORDER: 'order',         // Đơn hàng mới / cập nhật trạng thái
    REVIEW: 'review',       // Đánh giá mới
    STOCK: 'stock',         // Cảnh báo tồn kho thấp
    WALLET: 'wallet',       // Giải ngân / giao dịch ví
    PROMOTION: 'promotion', // Khuyến mãi
    SYSTEM: 'system'        // Thông báo hệ thống
};

const notificationSchema = new mongoose.Schema({
    // Người nhận thông báo
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Thông báo phải có người nhận!']
    },
    type: {
        type: String,
        enum: Object.values(NOTIF_TYPE),
        default: NOTIF_TYPE.SYSTEM
    },
    title: {
        type: String,
        required: [true, 'Vui lòng nhập tiêu đề thông báo!'],
        trim: true,
        maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự!']
    },
    body: {
        type: String,
        maxlength: [500, 'Nội dung không được vượt quá 500 ký tự!'],
        default: ''
    },
    isRead: {
        type: Boolean,
        default: false
    },
    // ID đối tượng liên quan (order / review / product...)
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    // Tên model của relatedId (để populate động nếu cần)
    relatedModel: {
        type: String,
        enum: ['Order', 'Review', 'Product', 'Transaction', 'Promotion', null],
        default: null
    },
    // Đường dẫn điều hướng khi click
    link: {
        type: String,
        default: ''
    }
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

notificationSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

const Notification = mongoose.model('Notification', notificationSchema);
Notification.TYPE = NOTIF_TYPE;

module.exports = Notification;
