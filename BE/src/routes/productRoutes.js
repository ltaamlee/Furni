const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    ratings,
    getProductRatings,
    getProductsByCategory,
    getBestSellers,
    getTrendingProducts
} = require('../controllers/productController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { validateProduct } = require('../middleware/validationMiddleware');

// Public routes
router.get('/', getAllProducts);
router.get('/best-sellers', getBestSellers);
router.get('/trending', getTrendingProducts);
router.get('/category/:slug', getProductsByCategory);
router.get('/:id', getProduct);
router.get('/ratings/:pid', getProductRatings);

// Protected routes - Vendor and Admin only
router.use(protect);
router.post('/', authorize('vendor', 'admin'), validateProduct, createProduct);
router.put('/:id', authorize('vendor', 'admin'), validateProduct, updateProduct);
router.delete('/:id', authorize('vendor', 'admin'), deleteProduct);

// Rating routes - Customer only
router.post('/ratings/:pid', ratings);

module.exports = router;