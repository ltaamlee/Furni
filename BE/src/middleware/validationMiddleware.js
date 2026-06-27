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

// Product validation
const validateProduct = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập tên sản phẩm')
    .isLength({ min: 2, max: 200 })
    .withMessage('Tên sản phẩm phải từ 2 đến 200 ký tự'),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Mô tả không được vượt quá 1000 ký tự'),

  body('dimensions.length')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Chiều dài phải là số'),

  body('dimensions.width')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Chiều rộng phải là số'),

  body('dimensions.depth')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Độ dày phải là số'),

  body('dimensions.height')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Chiều cao phải là số'),

  body('weight')
    .notEmpty()
    .withMessage('Vui lòng nhập cân nặng sản phẩm')
    .isNumeric()
    .withMessage('Cân nặng phải là số')
    .custom(value => Number(value) > 0)
    .withMessage('Cân nặng phải lớn hơn 0'),

  body('brand')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Thương hiệu không được vượt quá 100 ký tự'),

  body('color')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Màu sắc không được vượt quá 50 ký tự'),

  body('material')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Chất liệu không được vượt quá 100 ký tự'),

  body('style')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Phong cách không được vượt quá 100 ký tự'),

  body('status')
    .optional()
    .isIn(['active', 'hidden', 'draft', 'out_of_stock'])
    .withMessage('Trạng thái không hợp lệ'),

  body('deliveryType')
    .optional()
    .isIn(['standard', 'with_installation'])
    .withMessage('Loại giao hàng không hợp lệ'),

  body('variants')
    .optional()
    .isArray()
    .withMessage('Biến thể phải là mảng'),

  body('price')
    .notEmpty()
    .withMessage('Vui lòng nhập giá sản phẩm')
    .isNumeric()
    .withMessage('Giá phải là số')
    .custom(value => value >= 0)
    .withMessage('Giá phải lớn hơn hoặc bằng 0'),

  body('quantity')
    .notEmpty()
    .withMessage('Vui lòng nhập số lượng tồn kho')
    .isInt({ min: 0 })
    .withMessage('Số lượng phải là số nguyên không âm'),

  body('category')
    .notEmpty()
    .withMessage('Vui lòng chọn danh mục sản phẩm')
    .isMongoId()
    .withMessage('ID danh mục không hợp lệ'),

  body('images')
    .optional()
    .isArray()
    .withMessage('Hình ảnh phải là mảng'),

  handleValidationErrors
];

// Product update validation
const validateProductUpdate = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Tên sản phẩm không được trống')
    .isLength({ min: 2, max: 200 })
    .withMessage('Tên sản phẩm phải từ 2 đến 200 ký tự'),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Mô tả không được vượt quá 1000 ký tự'),

  body('dimensions')
    .optional()
    .isObject()
    .withMessage('Kích thước phải là object'),

  body('dimensions.width')
    .optional()
    .isNumeric()
    .withMessage('Chiều rộng phải là số'),

  body('dimensions.depth')
    .optional()
    .isNumeric()
    .withMessage('Độ dày phải là số'),

  body('dimensions.height')
    .optional()
    .isNumeric()
    .withMessage('Chiều cao phải là số'),

  body('price')
    .optional()
    .isNumeric()
    .withMessage('Giá phải là số')
    .custom(value => value >= 0)
    .withMessage('Giá phải lớn hơn hoặc bằng 0'),

  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Số lượng phải là số nguyên không âm'),

  body('category')
    .optional()
    .isMongoId()
    .withMessage('ID danh mục không hợp lệ'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive phải là boolean'),

  handleValidationErrors
];

// Stock update validation
const validateStockUpdate = [
  body('quantity')
    .notEmpty()
    .withMessage('Vui lòng nhập số lượng')
    .isInt({ min: 1 })
    .withMessage('Số lượng phải là số nguyên dương'),

  body('type')
    .notEmpty()
    .withMessage('Vui lòng chọn loại cập nhật')
    .isIn(['add', 'subtract'])
    .withMessage('Loại cập nhật phải là "add" hoặc "subtract"'),

  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyOTP,
  validateUpdateProfile,
  validateProduct,
  validateProductUpdate,
  validateStockUpdate
};
