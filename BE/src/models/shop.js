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
        default: null
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
}, { timestamps: true });

// Tự động tạo mã cửa hàng trước khi lưu
ShopSchema.pre('save', async function(next) {
    if (this.isNew && !this.code) {
        // Tạo mã 4 ký tự từ tên cửa hàng (viết tắt)
        let baseCode = '';
        
        // Lấy chữ cái đầu của mỗi từ trong tên
        const words = this.name.split(' ').filter(w => w.length > 0);
        if (words.length >= 2) {
            baseCode = words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
        } else if (words.length === 1) {
            baseCode = words[0].substring(0, 4).toUpperCase();
        }
        
        // Thêm 2 ký tự ngẫu nhiên để tránh trùng lặp
        const random = Math.random().toString(36).substring(2, 4).toUpperCase();
        this.code = `${baseCode}${random}`;
        
        // Kiểm tra xem mã đã tồn tại chưa
        const existing = await mongoose.model('Shop').findOne({ code: this.code });
        if (existing) {
            // Nếu trùng, thêm thêm ký tự
            this.code = `${baseCode}${random}${Math.random().toString(36).substring(2, 3).toUpperCase()}`;
        }
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