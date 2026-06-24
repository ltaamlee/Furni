const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    fullName: {
        type: String,
        required: [true, 'Vui lòng nhập họ tên'],
        trim: true,
        maxlength: 100
    },
    phone: {
        type: String,
        required: [true, 'Vui lòng nhập số điện thoại'],
        trim: true,
        maxlength: 20
    },
    street: {
        type: String,
        trim: true,
        maxlength: 255,
        default: ''
    },
    // Province
    provinceCode: {
        type: Number,
        default: null
    },
    provinceName: {
        type: String,
        default: ''
    },
    // District
    districtCode: {
        type: Number,
        default: null
    },
    districtName: {
        type: String,
        default: ''
    },
    // Ward
    wardCode: {
        type: Number,
        default: null
    },
    wardName: {
        type: String,
        default: ''
    },
    // Coordinates
    lat: {
        type: Number,
        default: null
    },
    lng: {
        type: Number,
        default: null
    },
    formattedAddress: {
        type: String,
        default: ''
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Ensure one default address per user
addressSchema.pre('save', async function(next) {
    if (this.isDefault) {
        await this.constructor.updateMany(
            { user: this.user, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
