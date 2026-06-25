const mongoose = require('mongoose');

const SHIPPING_STATUS = {
    PENDING: 'pending',           // Chờ lấy hàng
    PICKING: 'picking',          // Đang lấy hàng
    PICKED: 'picked',            // Đã lấy hàng
    SHIPPING: 'shipping',         // Đang giao
    DELIVERED: 'delivered',      // Đã giao
    FAILED: 'failed',            // Giao thất bại
    RETURNED: 'returned'          // Hoàn hàng
};

const shippingOrderSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    providerCode: {
        type: String,
        default: 'GHN'
    },
    trackingNumber: {
        type: String,
        default: null
    },
    externalId: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: Object.values(SHIPPING_STATUS),
        default: SHIPPING_STATUS.PENDING
    },
    shippingAddress: {
        fullName: String,
        phone: String,
        address: String,
        city: String,
        district: String,
        ward: String
    },
    weight: {
        type: Number,
        default: 1000
    },
    dimensions: {
        length: { type: Number, default: 30 },
        width: { type: Number, default: 30 },
        height: { type: Number, default: 30 }
    },
    shippingFee: {
        type: Number,
        required: true
    },
    estimatedDelivery: {
        type: Date
    },
    actualDelivery: {
        type: Date
    },
    attempts: {
        type: Number,
        default: 0
    },
    lastAttemptNote: {
        type: String,
        default: ''
    },
    statusHistory: [{
        status: {
            type: String,
            enum: Object.values(SHIPPING_STATUS)
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        note: {
            type: String,
            default: ''
        },
        location: {
            type: String,
            default: ''
        }
    }],
    codAmount: {
        type: Number,
        default: 0
    },
    isPaid: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Generate tracking number
shippingOrderSchema.pre('save', async function(next) {
    if (!this.trackingNumber) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.trackingNumber = `FS-${timestamp}-${random}`;
    }

    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            timestamp: new Date()
        });

        if (this.status === SHIPPING_STATUS.DELIVERED) {
            this.actualDelivery = new Date();
            this.isPaid = true;
        }
    }

    next();
});

// Calculate shipping fee
// provinceCode: number from open-api.vn (e.g. 79 = TP Ho Chi Minh)
// Also accepts old city string for backward compat
shippingOrderSchema.statics.calculateFee = async function(providerCode, provinceCodeOrCity, orderTotal) {
    const provider = await this.model('ShippingProvider').findOne({ code: providerCode, isActive: true });

    if (!provider) {
        return { success: false, message: 'Đơn vị vận chuyển không hợp lệ' };
    }

    let fee = provider.baseFee;

    // Province code surcharges (2025 latest, based on open-api.vn codes)
    const provinceFees = {
        1:    0,     // Thành phố Hà Nội
        48:   0,     // Thành phố Hồ Chí Minh
        31:   15000, // Thành phố Hải Phòng
        92:   15000, // Thành phố Đà Nẵng
        72:   20000, // Thành phố Cần Thơ
        2:    15000, // Thành phố Hà Nội (alternative)
        // Other major cities
        26:   20000, // Thành phố Hải Dương
        16:   20000, // Tỉnh Bắc Ninh
        15:   20000, // Tỉnh Vĩnh Phúc
        80:   20000, // Tỉnh Bình Dương
        75:   25000, // Tỉnh Đồng Nai
        82:   25000, // Tỉnh Bà Rịa - Vũng Tàu
        52:   25000, // Thành phố Cần Thơ
        74:   25000, // Thành phố Hồ Chí Minh
        60:   25000, // Thành phố Bạc Liêu
        45:   25000, // Thành phố Quảng Ninh
        // Default for all other provinces
    };

    // Support both number (province_code) and string (city name) for backward compat
    if (typeof provinceCodeOrCity === 'number') {
        fee += provinceFees[provinceCodeOrCity] ?? 30000;
    } else if (typeof provinceCodeOrCity === 'string') {
        const legacyCityFees = {
            'TP. Hồ Chí Minh': 0,
            'Thành phố Hồ Chí Minh': 0,
            'TP Hồ Chí Minh': 0,
            'Hà Nội': 15000,
            'Thành phố Hà Nội': 15000,
            'Đà Nẵng': 25000,
            'Thành phố Đà Nẵng': 25000,
            'Cần Thơ': 30000,
            'Thành phố Cần Thơ': 30000,
            'Hải Phòng': 35000,
        };
        fee += legacyCityFees[provinceCodeOrCity] ?? 40000;
    } else {
        fee += 40000;
    }

    // Free shipping if order total >= threshold
    if (orderTotal >= provider.freeThreshold) {
        fee = 0;
    }

    return {
        success: true,
        data: {
            provider: {
                _id: provider._id,
                name: provider.name,
                code: provider.code,
                logo: provider.logo
            },
            fee,
            estimatedDays: provider.estimatedDays,
            isFree: fee === 0
        }
    };
};

// Virtual
shippingOrderSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

shippingOrderSchema.set('toJSON', { virtuals: true });
shippingOrderSchema.set('toObject', { virtuals: true });

const ShippingOrder = mongoose.model('ShippingOrder', shippingOrderSchema);

module.exports = {
    ShippingOrder,
    SHIPPING_STATUS
};
