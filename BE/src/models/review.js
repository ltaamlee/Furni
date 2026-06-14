const mongoose = require('mongoose');

// Loại đánh giá: sản phẩm / đơn hàng / shop (SRS 3.8, 6.6)
const REVIEW_TYPE = {
    PRODUCT: 'product',
    ORDER: 'order',
    SHOP: 'shop'
};

const reviewSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: Object.values(REVIEW_TYPE),
        required: [true, 'Vui lòng chọn loại đánh giá!']
    },
    // Người đánh giá
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Vui lòng đăng nhập để đánh giá!']
    },
    // ID của product / order / shop được đánh giá
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Thiếu đối tượng đánh giá!']
    },
    // Tham chiếu tiện lợi cho việc truy vấn / populate
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        default: null
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        default: null
    },
    // Đơn hàng liên quan (đánh giá chỉ sau khi mua)
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    rating: {
        type: Number,
        required: [true, 'Vui lòng chọn số sao!'],
        min: [1, 'Số sao phải từ 1 đến 5!'],
        max: [5, 'Số sao phải từ 1 đến 5!']
    },
    content: {
        type: String,
        trim: true,
        maxlength: [1000, 'Nội dung đánh giá không được vượt quá 1000 ký tự!'],
        default: ''
    },
    images: [{
        type: String
    }],
    // Phản hồi của vendor
    vendorReply: {
        content: {
            type: String,
            maxlength: [1000, 'Phản hồi không được vượt quá 1000 ký tự!'],
            default: ''
        },
        repliedAt: {
            type: Date,
            default: null
        }
    },
    // Báo cáo vi phạm
    isReported: {
        type: Boolean,
        default: false
    },
    reportReason: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Mỗi user chỉ đánh giá 1 lần cho cùng 1 đối tượng trong 1 đơn hàng
reviewSchema.index(
    { user: 1, type: 1, targetId: 1, order: 1 },
    { unique: true }
);
reviewSchema.index({ shop: 1, createdAt: -1 });
reviewSchema.index({ product: 1, createdAt: -1 });

reviewSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// true nếu vendor đã phản hồi
reviewSchema.virtual('isReplied').get(function () {
    return !!(this.vendorReply && this.vendorReply.repliedAt);
});

reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

const Review =
    mongoose.models.Review ||
    mongoose.model('Review', reviewSchema);

Review.TYPE = REVIEW_TYPE;

module.exports = Review;
module.exports.TYPE = REVIEW_TYPE;