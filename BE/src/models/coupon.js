const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Vui lòng nhập mã giảm giá!'],
        unique: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên khuyến mãi!'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['percent', 'fixed', 'free_shipping', 'loyalty'],
        required: true
    },
    value: {
        type: Number,
        required: [true, 'Vui lòng nhập giá trị giảm giá!'],
        min: 0
    },
    maxDiscount: {
        type: Number,
        default: null
    },
    minOrderValue: {
        type: Number,
        default: 0,
        min: 0
    },
    maxUses: {
        type: Number,
        default: null
    },
    usedCount: {
        type: Number,
        default: 0
    },
    perUserLimit: {
        type: Number,
        default: 1
    },
    startDate: {
        type: Date,
        required: [true, 'Vui lòng chọn ngày bắt đầu!']
    },
    endDate: {
        type: Date,
        required: [true, 'Vui lòng chọn ngày kết thúc!']
    },
    applicableProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    applicableCategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    loyaltyCost: {
        type: Number,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Check if coupon is valid
couponSchema.methods.isValid = function() {
    const now = new Date();
    return this.isActive && 
           now >= this.startDate && 
           now <= this.endDate &&
           (this.maxUses === null || this.usedCount < this.maxUses);
};

// Check if user can use this coupon
couponSchema.methods.canUserUse = function(userUsageCount) {
    return this.isValid() && 
           (this.perUserLimit === null || userUsageCount < this.perUserLimit);
};

// Calculate discount amount
couponSchema.methods.calculateDiscount = function(orderTotal, productIds = []) {
    if (!this.isValid()) return 0;
    
    if (this.minOrderValue && orderTotal < this.minOrderValue) return 0;
    
    let discount = 0;
    
    switch (this.type) {
        case 'percent':
            discount = (orderTotal * this.value) / 100;
            if (this.maxDiscount) {
                discount = Math.min(discount, this.maxDiscount);
            }
            break;
        case 'fixed':
            discount = this.value;
            break;
        case 'free_shipping':
            discount = this.value;
            break;
        case 'loyalty':
            discount = this.value;
            break;
    }
    
    return Math.min(discount, orderTotal);
};

// Virtual for id
couponSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

couponSchema.set('toJSON', { virtuals: true });
couponSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Coupon', couponSchema);
