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
    shopCode: {
        type: String,
        uppercase: true,
        trim: true,
        default: ''
    },
    orderNumber: {
        type: String,
        unique: true
    },
    checkoutGroupId: {
        type: String,
        default: null,
        index: true
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
        variant: {
            type: String,
            default: null
        },
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        variantSku: {
            type: String,
            default: null
        },
        variantSize: {
            type: String,
            default: null
        },
        variantColor: {
            type: String,
            default: null
        },
        variantMaterial: {
            type: String,
            default: null
        },
        variantStyle: {
            type: String,
            default: null
        },
        variantDimensions: {
            length: { type: Number, default: 0 },
            width:  { type: Number, default: 0 },
            depth:  { type: Number, default: 0 },
            height: { type: Number, default: 0 }
        },
        variantWeight: {
            type: Number,
            default: 0,
            min: 0
        },
        variantDescription: {
            type: String,
            default: null
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
        enum: ['COD', 'VNPAY', 'MOMO', 'ZALOPAY', 'PAYOS', 'WALLET'],
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
    // Tầng vận chuyển: 'economy' (tiết kiệm) hoặc 'express' (nhanh) — chọn tại checkout
    shippingTier: {
        type: String,
        enum: ['economy', 'express'],
        default: 'express'
    },
    // Provider thực tế shop chọn khi bàn giao cho đơn vị vận chuyển (J&T, GHTK, Viettel)
    shippingProvider: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    // Tracking number từ đơn vị vận chuyển (sau khi shop bàn giao)
    trackingNumber: {
        type: String,
        default: null
    },
    // Link tới ShippingOrder document
    shippingOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShippingOrder',
        default: null
    },
    couponDiscount: {
        type: Number,
        default: 0,
        min: 0
    },
    couponCode: {
        type: String,
        default: null
    },
    usedCouponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VoucherWallet',
        default: null
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    walletUsedAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    payableAmount: {
        type: Number,
        default: null,
        min: 0
    },
    walletRefundedAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    refundedToWalletAt: {
        type: Date,
        default: null
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
    },

    // ── Platform Ledger fields (ghi nhận chiết khấu & voucher) ──────────
    // Ai tài trợ voucher trên đơn này
    voucherSponsorType: {
        type: String,
        enum: ['shop', 'platform', null],
        default: null,
    },
    // Số tiền voucher do sàn tài trợ (để quyết toán sau)
    voucherPlatformAmount: {
        type: Number,
        default: 0,
        min: 0,
    },
    // Ai tài trợ phí vận chuyển
    shippingSponsorType: {
        type: String,
        enum: ['shop', 'platform', null],
        default: null,
    },
    // Phí vận chuyển do sàn tài trợ (để quyết toán sau)
    shippingPlatformAmount: {
        type: Number,
        default: 0,
        min: 0,
    },
    // Phí sàn đã thu (snapshot tại payout)
    platformFeeAmount: {
        type: Number,
        default: 0,
        min: 0,
    },
    // % phí sàn áp dụng (snapshot)
    platformFeePercent: {
        type: Number,
        default: 5,
        min: 0,
    },
    // Trạng thái payout
    payoutStatus: {
        type: String,
        enum: ['pending', 'paid', 'reversed'],
        default: 'pending',
    },
    payoutAt: {
        type: Date,
        default: null,
    },
    // Đã refund voucher chưa (để tránh trùng lặp)
    voucherRolledBack: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Truy vấn đơn theo shop (vendor) + lọc trạng thái nhanh
orderSchema.index({ 'products.shop': 1, status: 1, createdAt: -1 });
orderSchema.index({ 'products.shopOrderCode': 1 });

const orderCounterSchema = new mongoose.Schema({
    key: {
        type: String,
        unique: true,
        required: true
    },
    shopCode: {
        type: String,
        required: true
    },
    dateCode: {
        type: String,
        required: true
    },
    sequence: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const OrderCounter = mongoose.models.OrderCounter || mongoose.model('OrderCounter', orderCounterSchema);

const normalizeShopCode = (code) => {
    const normalized = String(code || 'SHOP').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return normalized || 'SHOP';
};

const getVietnamDateParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).formatToParts(date);

    return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

const getVietnamDateCode = (date = new Date()) => {
    const parts = getVietnamDateParts(date);
    return `${parts.day}${parts.month}${parts.year.slice(-2)}`;
};

const getVietnamDayRange = (date = new Date()) => {
    const parts = getVietnamDateParts(date);
    const start = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), -7));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
};

const generateOrderNumber = async (order) => {
    const shopCode = normalizeShopCode(order.shopCode || order.products?.[0]?.shopCode);
    const dateCode = getVietnamDateCode(order.orderedAt || new Date());
    const key = `${shopCode}:${dateCode}`;

    const existingCounter = await OrderCounter.findOne({ key }).select('_id');
    if (!existingCounter) {
        const { start, end } = getVietnamDayRange(order.orderedAt || new Date());
        const existingOrderCount = await mongoose.model('Order').countDocuments({
            orderedAt: { $gte: start, $lt: end },
            $or: [
                { shopCode },
                { 'products.shopCode': shopCode }
            ]
        });

        try {
            await OrderCounter.create({ key, shopCode, dateCode, sequence: existingOrderCount });
        } catch (error) {
            if (error.code !== 11000) throw error;
        }
    }

    const counter = await OrderCounter.findOneAndUpdate(
        { key },
        {
            $inc: { sequence: 1 },
            $setOnInsert: { key, shopCode, dateCode }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    order.shopCode = shopCode;
    return `${shopCode}${dateCode}${String(counter.sequence).padStart(4, '0')}`;
};

// Tạo mã đơn hàng tự động
orderSchema.pre('save', async function(next) {
    if (!this.orderNumber) {
        this.orderNumber = await generateOrderNumber(this);
    }

    // Tạo shopCode ở level order nếu chưa có (từ products đầu tiên)
    if (!this.shopCode && this.products?.length > 0) {
        this.shopCode = this.products[0].shopCode || '';
    }

    // Tạo mã đơn riêng cho từng shop trong đơn (multi-vendor)
    if (this.isNew) {
        for (const item of this.products) {
            if (!item.shopOrderCode) {
                item.shopOrderCode = this.orderNumber;
            }
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

// Virtual: serialize orderNotes Map → plain object (works with both .lean() and regular queries)
orderSchema.virtual('orderNotesObject').get(function () {
    const raw = this.orderNotes;
    if (!raw) return {};
    if (raw instanceof Map) return Object.fromEntries(raw);
    return raw; // already plain object
});

// Enable virtuals in JSON
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

const Order =
    mongoose.models.Order ||
    mongoose.model('Order', orderSchema);

Order.ORDER_STATUS = ORDER_STATUS;

module.exports = Order;
module.exports.ORDER_STATUS = ORDER_STATUS;