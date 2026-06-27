const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['deposit', 'withdraw', 'payment', 'refund', 'cancellation_refund'],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Số tiền không được nhỏ hơn 0!'],
    },
    description: {
        type: String,
        default: '',
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
    },
    orderNumber: {
        type: String,
        default: null,
    },
    paymentMethod: {
        type: String,
        default: null,
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'completed',
    },
}, { timestamps: true });

const walletAccountSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['bank', 'momo', 'zalopay', 'vnpay'],
        required: true
    },
    accountNumber: {
        type: String,
        required: [true, 'Vui lòng nhập số tài khoản/số ví!']
    },
    accountHolder: {
        type: String,
        required: [true, 'Vui lòng nhập tên chủ tài khoản!']
    },
    bankName: {
        type: String,
        default: ''
    },
    branch: {
        type: String,
        default: ''
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { _id: true });

const walletSchema = new mongoose.Schema({
    // Ví thuộc về user
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Ví phải thuộc về một người dùng!'],
        unique: true
    },
    // Danh sách các tài khoản thanh toán
    accounts: [walletAccountSchema],
    // Số dư ví (có thể dùng cho ví điện tử tích hợp)
    balance: {
        type: Number,
        default: 0,
        min: [0, 'Số dư không được nhỏ hơn 0!']
    },
    currency: {
        type: String,
        default: 'VND'
    },
    // Lịch sử giao dịch ví
    transactions: [walletTransactionSchema],
}, { timestamps: true });

walletSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Virtual populate defaultAccount
walletSchema.virtual('defaultAccount').get(function () {
    return this.accounts.find(acc => acc.isDefault) || this.accounts[0] || null;
});

walletSchema.set('toJSON', { virtuals: true });
walletSchema.set('toObject', { virtuals: true });

/**
 * Hoàn tiền vào ví (khi hủy PayOS hoặc cancellation refund)
 * @param {number} amount - Số tiền cần hoàn
 * @param {object} opts - { orderId, orderNumber, description }
 */
walletSchema.methods.refundFromCancellation = async function(amount, opts = {}) {
    this.balance = Math.max(0, this.balance + Number(amount));
    this.transactions.push({
        type: 'cancellation_refund',
        amount: Number(amount),
        description: opts.description || `Hoàn tiền từ hủy thanh toán PayOS đơn #${opts.orderNumber || ''}`,
        orderId: opts.orderId || null,
        orderNumber: opts.orderNumber || null,
        paymentMethod: opts.paymentMethod || 'PAYOS',
        status: 'completed',
    });
    await this.save();
};

/**
 * Trừ tiền từ ví (khi thanh toán bằng ví)
 * @param {number} amount - Số tiền cần trừ
 * @param {object} opts - { orderId, orderNumber, description }
 */
walletSchema.methods.deductForPayment = async function(amount, opts = {}) {
    if (this.balance < amount) {
        throw new Error('Số dư ví không đủ!');
    }
    this.balance = Math.max(0, this.balance - Number(amount));
    this.transactions.push({
        type: 'payment',
        amount: Number(amount),
        description: opts.description || `Thanh toán đơn hàng #${opts.orderNumber || ''}`,
        orderId: opts.orderId || null,
        orderNumber: opts.orderNumber || null,
        paymentMethod: opts.paymentMethod || 'WALLET',
        status: 'completed',
    });
    await this.save();
};

module.exports = mongoose.model('Wallet', walletSchema);
