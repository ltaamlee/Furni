const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator')

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
      required: [true, 'Vui lòng nhập số điện thoại!'],
      validate: {
        validator: (v) => validator.isMobilePhone(v, 'vi-VN'),
        message: 'Vui lòng nhập số điện thoại Việt Nam hợp lệ! (gồm 10 số)'
      }
    },
    username: {
      type: String,
      required: [true, 'Vui lòng nhập tên đăng nhập!'],
      unique: true,
      index: true,
      minlength: [3, 'Tên đăng nhập phải có ít nhất 3 ký tự!'],
      maxlength: [50, 'Tên đăng nhập không được vượt quá 50 ký tự'],
      match: [/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới!']
    },
    password: {
      type: String,
      required: [true, 'Vui lòng nhập mật khẩu!'],
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự!'],
      select: false 
    },
    role: {
      type: String,
      enum: ['customer', 'admin', 'vendor'],
      default: 'customer'
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
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', ''],
      default: ''
    },
    dateOfBirth: {
      type: Date,
      default: null
    }
}, {
  timestamps: true
});

// Virtual for account lock
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
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
        lockUntil: Date.now() + 60 * 60 * 1000 // 1 hour lock
      };
    }

    return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
      $set: { loginAttempts: 0 },
      $unset: { lockUntil: 1 }
    });
};

// Method to generate OTP
userSchema.methods.generateOTP = function() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otp = {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    return otp;
};

// Method to verify OTP
userSchema.methods.verifyOTP = function(otp) {
    if (!this.otp || !this.otp.code || this.otp.expiresAt < Date.now()) {
      return false;
    }
    return this.otp.code === otp;
};

const User =
  mongoose.models.User ||
  mongoose.model('User', userSchema);

module.exports = User;