const mongoose = require('mongoose');
const validator = require('validator');
const slugify = require('slugify');

const ShopSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên cửa hàng!'],
        trim: true,
        maxlength: [100, 'Tên cửa hàng không được vượt quá 100 ký tự!'],
        unique: true
    },
    slug: {
        type: String,
        unique: true,
        index: true,
        set: (v) => slugify(v, { lower: true })
    },
    description: {
        type: String,
        maxlength: [500, 'Mô tả cửa hàng không được vượt quá 500 ký tự!'],
        default: null
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    logo: {
        type: String,
        default: null
    },
    banner: {
        type: String,
        default: null
    },
    phone: {
        type: String,
        required: [true, 'Vui lòng nhập số điện thoại cửa hàng!'],
        validate: {
            validator: (v) => validator.isMobilePhone(v, 'vi-VN'),
            message: 'Vui lòng nhập số điện thoại Việt Nam hợp lệ! (gồm 10 số)'
        }
    },
    email: {
        type: String,
        required: [true, 'Vui lòng nhập email cửa hàng!'],
        unique: true,
        index: true,
        validate: {
            validator: (v) => validator.isEmail(v),
            message: 'Vui lòng nhập email hợp lệ!'
        }
    },
    address: {
        type: String,
        maxlength: [500, 'Địa chỉ không được vượt quá 500 ký tự!'],
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Shop', ShopSchema);