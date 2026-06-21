const mongoose = require('mongoose');

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
    }
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

module.exports = mongoose.model('Wallet', walletSchema);
