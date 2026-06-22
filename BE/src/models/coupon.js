const mongoose = require('mongoose');

const DISCOUNT_TYPE = {
    PERCENT: 'percent',
    FIXED: 'fixed',
    FREESHIP: 'freeship'
};

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Vui lòng nhập mã giảm giá!'],
        unique: true,
        uppercase: true,
        trim: true,
        maxlength: [30, 'Mã giảm giá không được vượt quá 30 ký tự!'],
        match: [/^[A-Z0-9_-]+$/, 'Mã giảm giá chỉ gồm chữ in hoa, số, gạch ngang/dưới!']
    },
    // Chương trình khuyến mãi gắn với mã (nếu có)
    promotion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Promotion',
        default: null
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        default: null
    },
    description: {
        type: String,
        maxlength: [300, 'Mô tả không được vượt quá 300 ký tự!'],
        default: ''
    },
    discountType: {
        type: String,
        enum: Object.values(DISCOUNT_TYPE),
        default: DISCOUNT_TYPE.PERCENT
    },
    value: {
        type: Number,
        default: 0,
        min: [0, 'Giá trị giảm phải lớn hơn hoặc bằng 0!']
    },
    maxDiscount: {
        type: Number,
        default: 0,
        min: 0
    },
    minOrderValue: {
        type: Number,
        default: 0,
        min: 0
    },
    // Tổng số lượt dùng tối đa; 0 = không giới hạn
    usageLimit: {
        type: Number,
        default: 0,
        min: 0
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0
    },
    // Số lần tối đa mỗi user được dùng
    perUserLimit: {
        type: Number,
        default: 1,
        min: 1
    },
    usedBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        count: {
            type: Number,
            default: 1
        }
    }],
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

couponSchema.index({ shop: 1, isActive: 1 });

couponSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Mã còn hiệu lực để sử dụng không
couponSchema.methods.isUsable = function () {
    const now = Date.now();
    if (!this.isActive) return false;
    if (this.startDate && new Date(this.startDate).getTime() > now) return false;
    if (this.endDate && new Date(this.endDate).getTime() < now) return false;
    if (this.usageLimit !== 0 && this.usedCount >= this.usageLimit) return false;
    return true;
};

couponSchema.set('toJSON', { virtuals: true });
couponSchema.set('toObject', { virtuals: true });

// Kiểm tra xem model đã được khởi tạo chưa, nếu chưa thì mới tạo mới
const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
Coupon.DISCOUNT_TYPE = DISCOUNT_TYPE;

module.exports = Coupon;
