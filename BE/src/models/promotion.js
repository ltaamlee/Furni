const mongoose = require('mongoose');

// Loại chương trình khuyến mãi (SRS 4.6)
const PROMO_TYPE = {
    FLASH_SALE: 'flash_sale',   // Giảm % trong thời gian giới hạn
    COUPON: 'coupon',           // Mã giảm giá nhập khi thanh toán
    BUNDLE: 'bundle',           // Mua bộ (bàn + ghế...)
    GIFT: 'gift',               // Quà tặng kèm
    FREESHIP: 'freeship'        // Miễn phí vận chuyển
};

// Cách tính giảm giá
const DISCOUNT_TYPE = {
    PERCENT: 'percent',         // Theo phần trăm
    FIXED: 'fixed',             // Số tiền cố định
    FREESHIP: 'freeship'        // Miễn phí ship
};

// Phạm vi áp dụng
const APPLIES_TO = {
    ALL: 'all',                 // Toàn bộ sản phẩm
    CATEGORY: 'category',       // Theo danh mục
    PRODUCT: 'product'          // Sản phẩm cụ thể
};

const PROMO_STATUS = {
    DRAFT: 'draft',             // Nháp
    SCHEDULED: 'scheduled',     // Sắp diễn ra
    RUNNING: 'running',         // Đang chạy
    PAUSED: 'paused',           // Tạm dừng
    ENDED: 'ended'              // Đã kết thúc
};

const promotionSchema = new mongoose.Schema({
    // Shop sở hữu khuyến mãi. null = khuyến mãi toàn sàn (admin tạo).
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        default: null,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên chương trình!'],
        trim: true,
        maxlength: [150, 'Tên chương trình không được vượt quá 150 ký tự!']
    },
    description: {
        type: String,
        maxlength: [500, 'Mô tả không được vượt quá 500 ký tự!'],
        default: ''
    },
    type: {
        type: String,
        enum: Object.values(PROMO_TYPE),
        required: [true, 'Vui lòng chọn loại khuyến mãi!']
    },
    discountType: {
        type: String,
        enum: Object.values(DISCOUNT_TYPE),
        default: DISCOUNT_TYPE.PERCENT
    },
    // Giá trị giảm: % nếu percent, số tiền nếu fixed (bỏ qua nếu freeship)
    value: {
        type: Number,
        default: 0,
        min: [0, 'Giá trị giảm phải lớn hơn hoặc bằng 0!']
    },
    // Giảm tối đa (chỉ áp dụng khi discountType = percent); 0 = không giới hạn
    maxDiscount: {
        type: Number,
        default: 0,
        min: 0
    },
    // Điều kiện giá trị đơn tối thiểu
    minOrderValue: {
        type: Number,
        default: 0,
        min: 0
    },
    appliesTo: {
        type: String,
        enum: Object.values(APPLIES_TO),
        default: APPLIES_TO.ALL
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    startDate: {
        type: Date,
        required: [true, 'Vui lòng chọn thời gian bắt đầu!']
    },
    endDate: {
        type: Date,
        required: [true, 'Vui lòng chọn thời gian kết thúc!'],
        validate: {
            validator: function (v) {
                return !this.startDate || v > this.startDate;
            },
            message: 'Thời gian kết thúc phải sau thời gian bắt đầu!'
        }
    },
    // Tổng số lượt sử dụng tối đa; 0 = không giới hạn
    maxUsage: {
        type: Number,
        default: 0,
        min: 0
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: Object.values(PROMO_STATUS),
        default: PROMO_STATUS.DRAFT
    }
}, { timestamps: true });

promotionSchema.index({ shop: 1, status: 1 });
promotionSchema.index({ startDate: 1, endDate: 1 });

promotionSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Còn lượt sử dụng không
promotionSchema.virtual('hasUsageLeft').get(function () {
    return this.maxUsage === 0 || this.usedCount < this.maxUsage;
});

// Khuyến mãi toàn sàn (không gắn shop cụ thể)
promotionSchema.virtual('isPlatformWide').get(function () {
    return !this.shop;
});

// Đang trong thời gian hiệu lực và còn lượt dùng
promotionSchema.methods.isCurrentlyActive = function () {
    const now = Date.now();
    return (
        this.status === PROMO_STATUS.RUNNING &&
        new Date(this.startDate).getTime() <= now &&
        new Date(this.endDate).getTime() >= now &&
        (this.maxUsage === 0 || this.usedCount < this.maxUsage)
    );
};

// Keep lifecycle statuses aligned with the promotion's actual time window.
// Draft and paused are intentional manual states, so they are never changed here.
promotionSchema.pre('validate', function () {
    if (![PROMO_STATUS.SCHEDULED, PROMO_STATUS.RUNNING, PROMO_STATUS.ENDED].includes(this.status)) return;

    const now = Date.now();
    const startsAt = new Date(this.startDate).getTime();
    const endsAt = new Date(this.endDate).getTime();
    if (endsAt <= now || (this.maxUsage > 0 && this.usedCount >= this.maxUsage)) {
        this.status = PROMO_STATUS.ENDED;
    } else if (startsAt > now) {
        this.status = PROMO_STATUS.SCHEDULED;
    } else {
        this.status = PROMO_STATUS.RUNNING;
    }
});

promotionSchema.statics.syncLifecycleStatuses = async function (filter = {}) {
    const now = new Date();
    const lifecycleStatuses = [PROMO_STATUS.SCHEDULED, PROMO_STATUS.RUNNING, PROMO_STATUS.ENDED];
    const scoped = (extra) => ({ ...filter, status: { $in: lifecycleStatuses }, ...extra });
    const hasUsageLeft = {
        $expr: { $or: [{ $eq: ['$maxUsage', 0] }, { $lt: ['$usedCount', '$maxUsage'] }] }
    };

    await this.updateMany(scoped({
        $or: [
            { endDate: { $lte: now } },
            { $expr: { $and: [{ $gt: ['$maxUsage', 0] }, { $gte: ['$usedCount', '$maxUsage'] }] } }
        ]
    }), { $set: { status: PROMO_STATUS.ENDED } });
    await this.updateMany(
        scoped({ startDate: { $gt: now }, endDate: { $gt: now }, ...hasUsageLeft }),
        { $set: { status: PROMO_STATUS.SCHEDULED } }
    );
    await this.updateMany(
        scoped({ startDate: { $lte: now }, endDate: { $gt: now }, ...hasUsageLeft }),
        { $set: { status: PROMO_STATUS.RUNNING } }
    );
};

promotionSchema.set('toJSON', { virtuals: true });
promotionSchema.set('toObject', { virtuals: true });

const Promotion = mongoose.models.Promotion || mongoose.model('Promotion', promotionSchema);
Promotion.TYPE = PROMO_TYPE;
Promotion.DISCOUNT_TYPE = DISCOUNT_TYPE;
Promotion.APPLIES_TO = APPLIES_TO;
Promotion.STATUS = PROMO_STATUS;

module.exports = Promotion;
