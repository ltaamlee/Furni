const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Vui lòng đăng nhập để đánh giá!']
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Vui lòng chọn sản phẩm để đánh giá!']
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: [true, 'Bạn cần mua sản phẩm trước khi đánh giá!']
    },
    rating: {
        type: Number,
        required: [true, 'Vui lòng chọn số sao!'],
        min: [1, 'Số sao tối thiểu là 1'],
        max: [5, 'Số sao tối đa là 5']
    },
    comment: {
        type: String,
        maxlength: [500, 'Bình luận không được vượt quá 500 ký tự!'],
        trim: true
    },
    images: [{
        type: String
    }],
    isVerifiedPurchase: {
        type: Boolean,
        default: true
    },
    helpful: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
    },
    adminReply: {
        content: String,
        repliedAt: Date
    }
}, { timestamps: true });

// Index for efficient queries
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Virtual for id
reviewSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

// Enable virtuals in JSON
reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Review', reviewSchema);
