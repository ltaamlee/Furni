const mongoose = require('mongoose');

// credit = tiền vào ví, debit = tiền ra khỏi ví
const TX_TYPE = {
    CREDIT: 'credit',
    DEBIT: 'debit'
};

// Phân loại giao dịch
const TX_CATEGORY = {
    ORDER_INCOME: 'order_income',   // Doanh thu từ đơn hoàn thành
    WITHDRAW: 'withdraw',           // Rút tiền về ngân hàng
    PLATFORM_FEE: 'platform_fee',   // Phí sàn
    REFUND: 'refund',               // Hoàn tiền cho khách
    ADJUSTMENT: 'adjustment'        // Điều chỉnh thủ công
};

const TX_STATUS = {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed'
};

const transactionSchema = new mongoose.Schema({
    wallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet',
        required: [true, 'Giao dịch phải gắn với một ví!']
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        default: null
    },
    type: {
        type: String,
        enum: Object.values(TX_TYPE),
        required: [true, 'Vui lòng chọn loại giao dịch!']
    },
    category: {
        type: String,
        enum: Object.values(TX_CATEGORY),
        default: TX_CATEGORY.ORDER_INCOME
    },
    amount: {
        type: Number,
        required: [true, 'Vui lòng nhập số tiền!'],
        min: [0, 'Số tiền phải lớn hơn hoặc bằng 0!']
    },
    status: {
        type: String,
        enum: Object.values(TX_STATUS),
        default: TX_STATUS.PENDING
    },
    description: {
        type: String,
        maxlength: [300, 'Mô tả không được vượt quá 300 ký tự!'],
        default: ''
    },
    // Đơn hàng liên quan (nếu là doanh thu / hoàn tiền)
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    // Số dư ví sau giao dịch (snapshot)
    balanceAfter: {
        type: Number,
        default: null
    }
}, { timestamps: true });

transactionSchema.index({ wallet: 1, createdAt: -1 });
transactionSchema.index({ shop: 1, createdAt: -1 });

transactionSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

transactionSchema.set('toJSON', { virtuals: true });
transactionSchema.set('toObject', { virtuals: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
Transaction.TYPE = TX_TYPE;
Transaction.CATEGORY = TX_CATEGORY;
Transaction.STATUS = TX_STATUS;

module.exports = Transaction;
