const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { validateProduct } = require('../middleware/validationMiddleware');
// Public routes
router.get('/', getAllProducts);
router.get('/:id', getProduct);

// Protected routes - Vendor and Admin only
router.use(protect);
router.post('/', authorize('vendor', 'admin'), validateProduct, createProduct);
router.put('/:id', authorize('vendor', 'admin'), validateProduct, updateProduct);
router.delete('/:id', authorize('vendor', 'admin'), deleteProduct);

module.exports = router;