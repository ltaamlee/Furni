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

const shippingProviderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    logo: {
        type: String,
        default: null
    },
    description: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    baseFee: {
        type: Number,
        default: 0
    },
    feePerKm: {
        type: Number,
        default: 0
    },
    freeThreshold: {
        type: Number,
        default: 500000
    },
    estimatedDays: {
        min: {
            type: Number,
            default: 2
        },
        max: {
            type: Number,
            default: 5
        }
    }
});

const shippingOrderSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShippingProvider'
    },
    providerCode: {
        type: String,
        required: true
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
shippingOrderSchema.statics.calculateFee = async function(providerCode, city, orderTotal) {
    const providers = await this.model('ShippingProvider').find({ code: providerCode, isActive: true });
    const provider = providers[0];

    if (!provider) {
        return { success: false, message: 'Đơn vị vận chuyển không hợp lệ' };
    }

    let fee = provider.baseFee;

    // City surcharges (mock)
    const cityFees = {
        'TP. Hồ Chí Minh': 0,
        'Hà Nội': 15000,
        'Đà Nẵng': 25000,
        'Cần Thơ': 30000,
        'Hải Phòng': 35000
    };

    fee += cityFees[city] || 40000;

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

const ShippingProvider = mongoose.model('ShippingProvider', shippingProviderSchema);
const ShippingOrder = mongoose.model('ShippingOrder', shippingOrderSchema);

module.exports = {
    ShippingProvider,
    ShippingOrder,
    SHIPPING_STATUS
};
