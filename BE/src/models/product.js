const mongoose = require('mongoose');
const slugify = require('slugify');

// Trạng thái sản phẩm (SRS 4.4 / 6.3)
const PRODUCT_STATUS = {
    ACTIVE: 'active',           // Đang bán / công khai
    HIDDEN: 'hidden',           // Ẩn
    DRAFT: 'draft',             // Nháp
    OUT_OF_STOCK: 'out_of_stock'// Hết hàng
};

// Loại giao hàng
const DELIVERY_TYPE = {
    STANDARD: 'standard',               // Giao hàng thường
    WITH_INSTALLATION: 'with_installation' // Giao + lắp đặt
};

// Biến thể sản phẩm (embedded) – màu sắc / hoàn thiện bề mặt + giá & tồn kho riêng
const variantSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        maxlength: [100, 'Tên biến thể không được vượt quá 100 ký tự!']
    },
    size: {
        type: String,
        default: ''
    },
    price: {
        type: Number,
        min: [0, 'Giá biến thể phải lớn hơn hoặc bằng 0!']
    },
    stock: {
        type: Number,
        default: 0,
        min: [0, 'Tồn kho biến thể phải lớn hơn hoặc bằng 0!']
    },
    sku: {
        type: String,
        default: ''
    }
}, { _id: true });

const productSchema = new mongoose.Schema({
    // Shop sở hữu sản phẩm (multi-vendor)
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        default: null,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên sản phẩm!'],
        trim: true,
        maxlength: [200, 'Tên sản phẩm không được vượt quá 200 ký tự!']
    },
    slug: {
        type: String,
        index: true
    },
    description: {
        type: String,
        maxlength: [5000, 'Mô tả sản phẩm không được vượt quá 5000 ký tự!']
    },
    // Kích thước DxRxC (cm). Giữ `depth` (legacy) + thêm `length` theo SRS.
    dimensions: {
        length: { type: Number, min: 0 },
        width: { type: Number, min: 0 },
        depth: { type: Number, min: 0 },
        height: { type: Number, min: 0 }
    },
    weight: {
        type: Number,
        min: [0, 'Cân nặng phải lớn hơn hoặc bằng 0!']
    },
    brand: {
        type: String,
        maxlength: [100, 'Thương hiệu không được vượt quá 100 ký tự!']
    },
    color: {
        type: String,
        maxlength: [50, 'Màu sắc không được vượt quá 50 ký tự!']
    },
    material: {
        type: String,
        maxlength: [100, 'Chất liệu không được vượt quá 100 ký tự!']
    },
    // Phong cách thiết kế (Scandinavian, Industrial, Tân cổ điển...)
    style: {
        type: String,
        maxlength: [100, 'Phong cách không được vượt quá 100 ký tự!']
    },
    requiresAssembly: {
        type: Boolean,
        default: false
    },
    deliveryType: {
        type: String,
        enum: Object.values(DELIVERY_TYPE),
        default: DELIVERY_TYPE.STANDARD
    },
    // Biến thể đơn giản (legacy string) – giữ để không phá dữ liệu cũ
    variant: {
        type: String,
        maxlength: [100, 'Biến thể không được vượt quá 100 ký tự!']
    },
    // Bảng biến thể (màu/hoàn thiện + giá + tồn kho)
    variants: [variantSchema],
    // Giá bán hiển thị (giá gốc)
    price: {
        type: Number,
        required: [true, 'Vui lòng nhập giá sản phẩm!'],
        min: [0, 'Giá sản phẩm phải lớn hơn hoặc bằng 0!']
    },
    // Giá trước khuyến mãi (để hiển thị gạch ngang)
    originalPrice: {
        type: Number,
        min: [0, 'Giá phải lớn hơn hoặc bằng 0!'],
        default: null
    },
    quantity: {
        type: Number,
        required: [true, 'Vui lòng nhập số lượng tồn kho!'],
        min: [0, 'Số lượng tồn kho phải lớn hơn hoặc bằng 0!']
    },
    sold: {
        type: Number,
        default: 0,
        min: [0, 'Số lượng đã bán phải lớn hơn hoặc bằng 0!']
    },
    views: {
        type: Number,
        default: 0,
        min: 0
    },
    isStock: {
        type: Boolean,
        default: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Vui lòng chọn danh mục sản phẩm!']
    },
    images: [{
        type: String,
        default: null
    }],
    ratings: [{
        star: {
            type: Number,
            min: [1, 'Số sao phải từ 1 đến 5'],
            max: [5, 'Số sao phải từ 1 đến 5']
        },
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        comment: {
            type: String,
            maxlength: [500, 'Bình luận không được vượt quá 500 ký tự!']
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    totalRatings: {
        type: Number,
        default: 0,
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    // SEO
    metaTitle: {
        type: String,
        maxlength: [200, 'Meta title không được vượt quá 200 ký tự!']
    },
    metaDescription: {
        type: String,
        maxlength: [300, 'Meta description không được vượt quá 300 ký tự!']
    },
    // Trạng thái hiển thị
    status: {
        type: String,
        enum: Object.values(PRODUCT_STATUS),
        default: PRODUCT_STATUS.ACTIVE
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

productSchema.index({ shop: 1, status: 1 });

// Đồng bộ trạng thái tồn kho từ số lượng:
//  - quantity = 0 + đang "active"      -> "out_of_stock"
//  - quantity > 0 + đang "out_of_stock"-> "active"
//  (không đụng tới "hidden"/"draft")
const syncStockStatus = (quantity, status) => {
    const qty = Number(quantity) || 0;
    let next = status;
    if (qty <= 0 && status === PRODUCT_STATUS.ACTIVE) next = PRODUCT_STATUS.OUT_OF_STOCK;
    else if (qty > 0 && status === PRODUCT_STATUS.OUT_OF_STOCK) next = PRODUCT_STATUS.ACTIVE;
    return { status: next, isStock: qty > 0 };
};

productSchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = slugify(this.name, {
            lower: true,
            strict: true,
            locale: 'vi'
        });
    }
    const synced = syncStockStatus(this.quantity, this.status);
    this.status = synced.status;
    this.isStock = synced.isStock;
    next();
});

// Khi cập nhật qua findOneAndUpdate (vendor/admin sửa sản phẩm)
productSchema.pre('findOneAndUpdate', async function (next) {
    try {
        const update = this.getUpdate() || {};
        const $set = update.$set || update;

        // Số lượng & trạng thái sau cập nhật (nếu không gửi thì lấy từ bản ghi hiện tại)
        let quantity = $set.quantity;
        let status = $set.status;
        if (quantity === undefined || status === undefined) {
            const current = await this.model.findOne(this.getQuery()).select('quantity status');
            if (current) {
                if (quantity === undefined) quantity = current.quantity;
                if (status === undefined) status = current.status;
            }
        }
        if (quantity === undefined) return next();

        const synced = syncStockStatus(quantity, status);
        if (update.$set) {
            update.$set.status = synced.status;
            update.$set.isStock = synced.isStock;
        } else {
            update.status = synced.status;
            update.isStock = synced.isStock;
        }
        this.setUpdate(update);
        next();
    } catch (err) {
        next(err);
    }
});

productSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product =
  mongoose.models.Product ||
  mongoose.model('Product', productSchema);

module.exports = Product;