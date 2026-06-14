const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    // Ví thuộc về shop (mỗi shop 1 ví)
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: [true, 'Ví phải thuộc về một shop!'],
        unique: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Số dư khả dụng (có thể rút)
    balance: {
        type: Number,
        default: 0,
        min: [0, 'Số dư không được nhỏ hơn 0!']
    },
    // Số dư đang chờ giải ngân (từ đơn chưa hoàn tất đối soát)
    pendingBalance: {
        type: Number,
        default: 0,
        min: [0, 'Số dư chờ giải ngân không được nhỏ hơn 0!']
    },
    currency: {
        type: String,
        default: 'VND'
    },
    // Tài khoản ngân hàng nhận tiền
    bankAccounts: [{
        bankName: {
            type: String,
            required: [true, 'Vui lòng nhập tên ngân hàng!']
        },
        accountNumber: {
            type: String,
            required: [true, 'Vui lòng nhập số tài khoản!']
        },
        accountHolder: {
            type: String,
            required: [true, 'Vui lòng nhập tên chủ tài khoản!']
        },
        branch: {
            type: String,
            default: ''
        },
        isDefault: {
            type: Boolean,
            default: false
        }
    }]
}, { timestamps: true });

walletSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Cộng tiền vào số dư khả dụng
walletSchema.methods.credit = function (amount) {
    this.balance += amount;
    return this.save();
};

// Trừ tiền khỏi số dư khả dụng (rút tiền / phí sàn)
walletSchema.methods.debit = function (amount) {
    if (amount > this.balance) {
        throw new Error('Số dư không đủ để thực hiện giao dịch!');
    }
    this.balance -= amount;
    return this.save();
};

walletSchema.set('toJSON', { virtuals: true });
walletSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Wallet', walletSchema);
