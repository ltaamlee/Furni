const mongoose = require('mongoose');

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
        note: {
            type: String,
            default: ''
        }
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'VNPAY', 'MOMO', 'ZALOPAY'],
        default: 'COD'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
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
    }
}, { timestamps: true });

// Tạo mã đơn hàng tự động
orderSchema.pre('save', async function(next) {
    if (!this.orderNumber) {
        const count = await mongoose.model('Order').countDocuments();
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.orderNumber = `ORD-${timestamp}-${random}`;
    }

    // Thêm vào lịch sử trạng thái nếu có thay đổi
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            timestamp: new Date()
        });

        // Cập nhật thời gian tương ứng
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

// Kiểm tra có thể gửi yêu cầu hủy không (đang ở bước 3)
orderSchema.methods.canRequestCancel = function() {
    return this.status === ORDER_STATUS.PREPARING;
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

module.exports = mongoose.model('Order', orderSchema);
