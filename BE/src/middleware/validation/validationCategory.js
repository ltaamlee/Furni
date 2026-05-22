const { body } = require('express-validator');
const { handleValidationErrors } = require('./handleValidationErrors');

const validateCategory = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập tên danh mục')
    .isLength({ max: 100 })
    .withMessage('Tên danh mục không được vượt quá 100 ký tự'),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Mô tả không được vượt quá 500 ký tự'),

  body('image')
    .optional()
    .isURL()
    .matches(/\.(jpg|jpeg|png|webp)$/i)
    .withMessage('Hình ảnh phải có định dạng jpg, jpeg, png hoặc webp'),

  body('parentCategory')
    .optional()
    .isMongoId()
    .withMessage('ID danh mục cha không hợp lệ'),

  handleValidationErrors
];

const validateCategoryUpdate = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Tên danh mục không được trống')
    .isLength({ max: 100 })
    .withMessage('Tên danh mục không được vượt quá 100 ký tự'),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Mô tả không được vượt quá 500 ký tự'),

  body('image')
    .optional()
    .isURL()
    .withMessage('Hình ảnh phải là URL hợp lệ'),

  body('parentCategory')
    .optional()
    .isMongoId()
    .withMessage('ID danh mục cha không hợp lệ'),

  handleValidationErrors
];

module.exports = {
  validateCategory,
  validateCategoryUpdate
};
