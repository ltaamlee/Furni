const mongoose = require('mongoose');
const validator = require('validator');
const slugify = require('slugify');

// Trạng thái duyệt cửa hàng — shop phải được admin duyệt (approved) mới được bán
const SHOP_STATUS = {
    PENDING: 'pending',     // Chờ duyệt (mới đăng ký)
    APPROVED: 'approved',   // Đã duyệt — được phép đăng bán
    SUSPENDED: 'suspended', // Bị tạm khoá
    REJECTED: 'rejected'    // Bị từ chối
};

const SHOP_CODE_LENGTH = 4;
const SHOP_CODE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const randomLetters = (length) => Array.from(
    { length },
    () => SHOP_CODE_LETTERS[Math.floor(Math.random() * SHOP_CODE_LETTERS.length)]
).join('');

const normalizeShopNameWords = (name) => slugify(name || '', {
    replacement: ' ',
    lower: false,
    strict: true,
    locale: 'vi'
})
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

const buildBaseShopCode = (name) => {
    const words = normalizeShopNameWords(name);
    const letters = words.join('');
    const base = letters.slice(0, SHOP_CODE_LENGTH);

    return base.padEnd(SHOP_CODE_LENGTH, randomLetters(SHOP_CODE_LENGTH)).slice(0, SHOP_CODE_LENGTH);
};

const buildUniqueShopCode = async (name) => {
    const baseCode = buildBaseShopCode(name);

    for (let attempt = 0; attempt < 30; attempt++) {
        const suffixLength = Math.min(Math.floor(attempt / 10) + 1, SHOP_CODE_LENGTH);
        const candidate = attempt === 0
            ? baseCode
            : `${baseCode.slice(0, SHOP_CODE_LENGTH - suffixLength)}${randomLetters(suffixLength)}`;
        const existing = await mongoose.model('Shop').findOne({ code: candidate }).select('_id');

        if (!existing) return candidate;
    }

    return randomLetters(SHOP_CODE_LENGTH);
};

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
    // Mã cửa hàng - viết tắt 4 ký tự để dùng trong mã đơn hàng
    code: {
        type: String,
        uppercase: true,
        trim: true,
        default: null,
        match: [/^[A-Z]+$/, 'Mã cửa hàng chỉ được gồm chữ cái A-Z!']
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
    provinceCode: {
        type: String,
        default: null,
        description: 'Mã tỉnh/thành phố của cửa hàng'
    },
    provinceName: {
        type: String,
        default: null,
        description: 'Tên tỉnh/thành phố của cửa hàng'
    },
    // Trạng thái duyệt (admin kiểm duyệt trước khi shop được bán)
    status: {
        type: String,
        enum: Object.values(SHOP_STATUS),
        default: SHOP_STATUS.PENDING
    },
    // Lý do từ chối / tạm khoá (admin nhập)
    statusNote: {
        type: String,
        default: ''
    },
    // isActive: vendor tự bật/tắt cửa hàng (nghỉ bán tạm thời) — khác với duyệt
    isActive: {
        type: Boolean,
        default: true
    },
    commissionRate: {
        type: Number,
        default: 2, // Mặc định thu 2% phí sàn
        min: 0,
        max: 100
    },
    // Cấu hình vận chuyển của shop
    shippingConfig: {
        // Các đơn vị vận chuyển mà shop hỗ trợ (tick chọn)
        enabledProviders: {
            type: [String],
            enum: ['jt', 'ghtk', 'viettel'],
            default: ['ghtk', 'jt'] // Mặc định: GHTK + J&T
        },
        // Ngưỡng free ship (đơn hàng từ bao nhiêu thì miễn phí vận chuyển)
        freeShippingThreshold: {
            type: Number,
            default: 500000  // 500k VND
        },
        // Đơn vị vận chuyển mặc định khi bàn giao
        defaultProvider: {
            type: String,
            enum: ['jt', 'ghtk', 'viettel'],
            default: 'ghtk'
        },
        // Cửa hàng có ở khu vực nội thành không → phí giao nội tỉnh giảm 30%
        isUrbanZone: {
            type: Boolean,
            default: false
        }
    },
}, { timestamps: true });

// Tự động tạo mã cửa hàng trước khi lưu
ShopSchema.pre('save', async function(next) {
    if (this.isNew && !this.code) {
        this.code = await buildUniqueShopCode(this.name);
    }
    next();
});

// Shop có đang được phép bán không (đã duyệt + đang mở)
ShopSchema.methods.canSell = function () {
    return this.status === SHOP_STATUS.APPROVED && this.isActive !== false;
};

const Shop = mongoose.models.Shop || mongoose.model('Shop', ShopSchema);

Shop.STATUS = SHOP_STATUS;

module.exports = Shop;
module.exports.STATUS = SHOP_STATUS;
