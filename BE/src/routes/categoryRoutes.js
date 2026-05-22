const express = require('express');
const router = express.Router();
const {
    getAllCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    filterCategories
} = require('../controllers/categoryController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { validateCategory } = require('../middleware/validation/validationCategory');
// Public routes
router.get('/', filterCategories);
router.get('/:id', getCategory);

// Protected routes - Vendor + Admin
router.use(protect);
router.post('/', authorize('vendor', 'admin'), validateCategory, createCategory);
router.put('/:id', authorize('vendor', 'admin'), validateCategory, updateCategory);
router.delete('/:id', authorize('vendor', 'admin'), deleteCategory);

module.exports = router;