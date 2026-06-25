const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    fullName: {
      type: String,
      required: [true, 'Vui lòng nhập họ tên!'],
      trim: true,
      maxlength: [100, 'Họ tên không được vượt quá 100 ký tự!']
    },
    email: {
      type: String,
      required: [true, 'Vui lòng nhập email!'],
      unique: true,
      index: true,
      lowercase: true,
      validate: {
        validator: (v) => validator.isEmail(v),
        message: 'Vui lòng nhập email hợp lệ!'
      }
    },
    phone: {
      type: String,
      // Đã bỏ required để hỗ trợ Google Login
      validate: {
        validator: function(v) {
          if (!v) return true; // Nếu không nhập thì bỏ qua kiểm tra
          return validator.isMobilePhone(v, 'vi-VN');
        },
        message: 'Vui lòng nhập số điện thoại Việt Nam hợp lệ! (gồm 10 số)'
      }
    },
    username: {
      type: String,
      // Đã bỏ required để hỗ trợ Google Login
      unique: true,
      sparse: true, // Cho phép nhiều tài khoản Google có username null ban đầu
      index: true,
      minlength: [3, 'Tên đăng nhập phải có ít nhất 3 ký tự!'],
      maxlength: [50, 'Tên đăng nhập không được vượt quá 50 ký tự'],
      match: [/^[a-zA-Z0-9_]*$/, 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới!']
    },
    password: {
      type: String,
      // Đã bỏ required để hỗ trợ Google Login
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự!'],
      select: false 
    },
    role: {
      type: String,
      enum: ['customer', 'admin', 'vendor'],
      default: 'customer'
    },
    // MỚI: Dùng để phân biệt đăng nhập thường và đăng nhập Google
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    googleId: {
      type: String,
      default: null
    },
    addresses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address'
    }],
    wishlist: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    isVerified: {
      type: Boolean,
      default: false
    },
    otp: {
      code: String,
      expiresAt: Date
    },
    isBlocked:{
      type: Boolean,
      default: false
    },
    profileImage: {
      type: String,
      default: null
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    }
}, {
  timestamps: true
});

userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) return next();

    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false; // Tránh lỗi nếu tài khoản Google (không pass) cố tình đăng nhập tay
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
      return this.updateOne({
        $unset: { lockUntil: 1 },
        $set: { loginAttempts: 1 }
      });
    }
    const updates = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
      updates.$set = {
        lockUntil: Date.now() + 60 * 60 * 1000 
      };
    }
    return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
      $set: { loginAttempts: 0 },
      $unset: { lockUntil: 1 }
    });
};

userSchema.methods.generateOTP = function() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otp = {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) 
    };
    return otp;
};

userSchema.methods.verifyOTP = function(otp) {
    if (!this.otp || !this.otp.code || this.otp.expiresAt < Date.now()) {
      return false;
    }
    return this.otp.code === otp;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;