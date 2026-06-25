const mongoose = require('mongoose');

const REGION = {
    NORTH: 'north',     // Miền Bắc
    CENTRAL: 'central', // Miền Trung
    SOUTH: 'south'      // Miền Nam
};

const SERVICE_TYPE = {
    ECONOMY: 'economy',   // Tiết kiệm
    EXPRESS: 'express'    // Nhanh
};

const PROVIDER_CODE = {
    JT: 'jt',           // J&T Express
    GHTK: 'ghtk',       // Giao Hàng Tiết Kiệm
    VIETTEL: 'viettel'   // Viettel Post
};

const shippingRateSchema = new mongoose.Schema({
    provider: {
        type: String,
        required: true,
        enum: Object.values(PROVIDER_CODE)
    },
    serviceType: {
        type: String,
        required: true,
        enum: Object.values(SERVICE_TYPE)
    },
    region: {
        type: String,
        required: true,
        enum: Object.values(REGION)
    },
    minWeight: {
        type: Number,
        default: 0  // Gram
    },
    maxWeight: {
        type: Number,
        default: 1000  // Gram
    },
    baseFee: {
        type: Number,
        required: true  // Phí cơ bản (VNĐ)
    },
    feePer500g: {
        type: Number,
        default: 0  // Phí cho mỗi 500g tiếp theo
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
    },
    isActive: {
        type: Boolean,
        default: true
    },
    notes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Compound index for unique provider + service + region
shippingRateSchema.index({ provider: 1, serviceType: 1, region: 1 }, { unique: true });

const ShippingRate = mongoose.model('ShippingRate', shippingRateSchema);

module.exports = {
    ShippingRate,
    REGION,
    SERVICE_TYPE,
    PROVIDER_CODE
};
