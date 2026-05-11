const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(e => e.msg),
      errors: errors.array()
    });
  }
  next();
};

// Registration validation
const validateRegistration = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập họ tên')
    .isLength({ min: 2, max: 100 })
    .withMessage('Họ tên phải từ 2 đến 100 ký tự'),

  body('email')
    .isEmail()
    .withMessage('Vui lòng nhập email hợp lệ')
    .normalizeEmail(),

  body('phone')
    .matches(/^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/)
    .withMessage('Vui lòng nhập số điện thoại Việt Nam hợp lệ'),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập địa chỉ')
    .isLength({ max: 500 })
    .withMessage('Địa chỉ không được vượt quá 500 ký tự'),

  body('username')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username phải từ 3 đến 50 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username chỉ được chứa chữ cái, số và gạch dưới'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password chua đủ mạnh, phải ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password bao gồm ít nhất một chữ cái viết hoa, một chữ cái viết thường và một số'),

  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('usernameOrEmail')
    .notEmpty()
    .withMessage('Vui lòng nhập email hoặc username'),
  body('password')
    .notEmpty()
    .withMessage('Vui lòng nhập password'),

  handleValidationErrors
];

// Forgot password validation
const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage('Vui lòng nhập email hợp lệ')
    .normalizeEmail(),

  handleValidationErrors
];

// Reset password validation
const validateResetPassword = [
  body('email')
    .isEmail()
    .withMessage('Vui lòng nhập email hợp lệ')
    .normalizeEmail(),

  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('Vui lòng nhập OTP gồm 6 chữ số')
    .isNumeric()
    .withMessage('OTP chỉ được chứa số'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Vui lòng nhập mật khẩu mới có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu mới phải chứa ít nhất một chữ cái viết hoa, một chữ cái viết thường và một số'),

  handleValidationErrors
];

// Verify OTP validation
const validateVerifyOTP = [
  body('email')
    .isEmail()
    .withMessage('Vui lòng nhập email hợp lệ')
    .normalizeEmail(),

  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('Vui lòng nhập OTP gồm 6 chữ số')
    .isNumeric()
    .withMessage('OTP chỉ được chứa số'),

  handleValidationErrors
];

// Update profile validation
const validateUpdateProfile = [
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập họ tên')
    .isLength({ min: 2, max: 100 })
    .withMessage('Họ tên phải từ 2 đến 100 ký tự'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Vui lòng nhập email hợp lệ')
    .normalizeEmail(),

  body('phone')
    .optional()
    .matches(/^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/)
    .withMessage('Vui lòng nhập số điện thoại Việt Nam hợp lệ'),

  body('address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập địa chỉ')
    .isLength({ max: 500 })
    .withMessage('Địa chỉ không được vượt quá 500 ký tự'),

  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyOTP,
  validateUpdateProfile
};