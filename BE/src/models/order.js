const mongoose = require('mongoose');
const slugify = require('slugify');

const ORDER_STATUS = {
    PENDING: 'pending',                    // 1. Đơn hàng mới
    CONFIRMED: 'confirmed',                // 2. Đã xác nhận (sau 30 phút hoặc thủ công)
    PREPARING: 'preparing',                // 3. Shop đang chuẩn bị hàng
    SHIPPING: 'shipping',                  // 4. Đang giao hàng
    DELIVERED: 'delivered',                // 5. Đã giao thành công
    CANCELLED: 'cancelled',                // 6. Hủy đơn hàng
    CANCEL_REQUESTED: 'cancel_requested'   // 6b. Gửi yêu cầu hủy (khi đang ở bước 3)
};

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Vui lòng đăng nhập để đặt hàng!']
    },
    // ID của đơn "gốc" - dùng để nhóm các đơn từ cùng 1 giỏ hàng (multi-vendor)
    parentOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
        index: true
    },
    // Các đơn con có cùng parentOrderId thuộc về 1 giỏ hàng
    isChildOrder: {
        type: Boolean,
        default: false
    },
    // Danh sách các đơn con (chỉ có ở đơn gốc)
    subOrders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    // Shop chủ của đơn hàng (đơn con chỉ thuộc 1 shop)
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        default: null,
        index: true
    },
    // Shop name snapshot
    shopName: {
        type: String,
        default: ''
    },
    orderNumber: {
        type: String,
        unique: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        // Shop bán sản phẩm này (multi-vendor) — mỗi dòng đơn thuộc về 1 shop
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shop',
            default: null,
            index: true
        },
        // Snapshot tên shop tại thời điểm đặt (đơn cũ không vỡ khi shop đổi tên/đóng cửa)
        shopName: {
            type: String,
            default: ''
        },
        // Mã viết tắt của shop (ví dụ: FURNI01) - dùng để phân loại đơn
        shopCode: {
            type: String,
            default: ''
        },
        // Mã đơn riêng của shop cho dòng sản phẩm này
        shopOrderCode: {
            type: String,
            default: ''
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Số lượng phải lớn hơn 0!']
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        // Giá gốc (trước giảm) — snapshot tại thời điểm đặt
        originalPrice: {
            type: Number,
            default: null
        },
        // % giảm giá tại thời điểm đặt
        discount: {
            type: Number,
            default: 0,
            min: 0
        },
        name: {
            type: String,
            required: true
        },
        image: {
            type: String,
            default: null
        }
    }],
    shippingAddress: {
        fullName: {
            type: String,
            required: [true, 'Vui lòng nhập họ tên!'],
            trim: true
        },
        phone: {
            type: String,
            required: [true, 'Vui lòng nhập số điện thoại!'],
            trim: true
        },
        address: {
            type: String,
            required: [true, 'Vui lòng nhập địa chỉ!'],
            trim: true
        },
        city: {
            type: String,
            default: ''
        },
        // Administrative division codes (from open-api.vn)
        provinceCode: {
            type: Number,
            default: null
        },
        provinceName: {
            type: String,
            default: ''
        },
        districtCode: {
            type: Number,
            default: null
        },
        districtName: {
            type: String,
            default: ''
        },
        wardCode: {
            type: Number,
            default: null
        },
        wardName: {
            type: String,
            default: ''
        },
        wardCode: {
            type: Number,
            default: null
        },
        wardName: {
            type: String,
            default: ''
        },
        note: {
            type: String,
            default: ''
        }
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'VNPAY', 'MOMO', 'ZALOPAY', 'PAYOS'],
        default: 'COD'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    // PayOS order code (for online payment tracking)
    payosOrderCode: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: Object.values(ORDER_STATUS),
        default: ORDER_STATUS.PENDING
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    shippingFee: {
        type: Number,
        default: 0,
        min: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    totalQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    // Theo dõi thời gian các trạng thái
    statusHistory: [{
        status: {
            type: String,
            enum: Object.values(ORDER_STATUS)
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        note: {
            type: String,
            default: ''
        }
    }],
    // Yêu cầu hủy đơn
    cancelRequest: {
        reason: {
            type: String,
            default: ''
        },
        requestedAt: {
            type: Date
        },
        processedAt: {
            type: Date
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        }
    },
    // Thời điểm đặt hàng (để kiểm tra 30 phút)
    orderedAt: {
        type: Date,
        default: Date.now
    },
    confirmedAt: {
        type: Date
    },
    deliveredAt: {
        type: Date
    },
    cancelledAt: {
        type: Date
    },
    estimatedDelivery: {
        type: Date
    },
    // Thời hạn thanh toán PayOS (mặc định 30 phút kể từ khi tạo đơn)
    paymentExpiresAt: {
        type: Date,
        index: true
    }
}, { timestamps: true });

// Truy vấn đơn theo shop (vendor) + lọc trạng thái nhanh
orderSchema.index({ 'products.shop': 1, status: 1, createdAt: -1 });
orderSchema.index({ 'products.shopOrderCode': 1 });

// Tạo mã đơn hàng tự động
orderSchema.pre('save', async function(next) {
    if (!this.orderNumber) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();

        if (this.isChildOrder) {
            // Child order: {shopCode}-{timestamp}-{random}
            const shopCode = (this.shopCode || this.products?.[0]?.shopCode || 'SHOP');
            this.orderNumber = `${shopCode}-${timestamp}-${random}`;
        } else {
            // Parent order (multi-vendor hoặc single shop không có shopCode)
            this.orderNumber = `ORD-${timestamp}-${random}`;
        }
    }

    // Tạo shopCode ở level order nếu chưa có (từ products đầu tiên)
    if (!this.shopCode && this.products?.length > 0) {
        this.shopCode = this.products[0].shopCode || '';
    }

    // Tạo mã đơn riêng cho từng shop trong đơn (multi-vendor)
    if (this.isNew) {
        const shopOrderCounts = {};

        for (const item of this.products) {
            const shopId = item.shop?.toString() || 'default';

            if (!shopOrderCounts[shopId]) {
                shopOrderCounts[shopId] = await mongoose.model('Order').countDocuments({
                    'products.shop': item.shop
                });
            }

            const shopCode = item.shopCode || 'SHOP';
            const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
            const sequence = String(shopOrderCounts[shopId] + 1).padStart(4, '0');

            item.shopOrderCode = `${shopCode}-${timestamp}-${sequence}`;
            shopOrderCounts[shopId]++;
        }
    }

    // Thêm vào lịch sử trạng thái nếu có thay đổi
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            timestamp: new Date()
        });

        if (this.status === ORDER_STATUS.CONFIRMED) {
            this.confirmedAt = new Date();
        } else if (this.status === ORDER_STATUS.DELIVERED) {
            this.deliveredAt = new Date();
        } else if (this.status === ORDER_STATUS.CANCELLED) {
            this.cancelledAt = new Date();
        }
    }

    next();
});

// Virtual for cart ID
orderSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

// Kiểm tra có thể hủy đơn không (30 phút sau khi đặt)
orderSchema.methods.canCancel = function() {
    const thirtyMinutes = 30 * 60 * 1000;
    const timePassed = Date.now() - new Date(this.orderedAt).getTime();
    return timePassed < thirtyMinutes && 
           [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(this.status);
};

// Kiểm tra đơn PayOS đã hết hạn thanh toán chưa
orderSchema.methods.isPaymentExpired = function() {
    if (!this.paymentExpiresAt) return false;
    return this.status === ORDER_STATUS.PENDING && Date.now() > new Date(this.paymentExpiresAt).getTime();
};

// Kiểm tra có thể gửi yêu cầu hủy không (đang ở bước 3)
orderSchema.methods.canRequestCancel = function() {
    return this.status === ORDER_STATUS.PREPARING;
};

// Kiểm tra có thể thanh toán lại không (PayOS pending + chưa expired)
orderSchema.methods.canRetryPayment = function() {
    if (this.paymentMethod !== 'PAYOS') return false;
    if (this.paymentStatus === 'paid') return false;
    if (this.status === ORDER_STATUS.CANCELLED) return false;
    if (this.isPaymentExpired()) return false;
    return true;
};

// Kiểm tra có thể xác nhận tự động không
orderSchema.methods.canAutoConfirm = function() {
    const thirtyMinutes = 30 * 60 * 1000;
    const timePassed = Date.now() - new Date(this.orderedAt).getTime();
    return this.status === ORDER_STATUS.PENDING && timePassed >= thirtyMinutes;
};

// Enable virtuals in JSON
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

const Order =
    mongoose.models.Order ||
    mongoose.model('Order', orderSchema);

Order.ORDER_STATUS = ORDER_STATUS;

module.exports = Order;
module.exports.ORDER_STATUS = ORDER_STATUS;
