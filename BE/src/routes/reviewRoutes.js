const express = require('express');
const router = express.Router();
const {
    createReview,
    getProductReviews,
    getMyReviews,
    updateReview,
    deleteReview,
    getPurchasableProducts,
    getProductStats
} = require('../controllers/reviewController');

const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/product/:productId', getProductReviews);
router.get('/stats/:productId', getProductStats);

// Protected routes
router.use(protect);
router.get('/my-reviews', getMyReviews);
router.get('/purchasable', getPurchasableProducts);
router.post('/', createReview);
router.put('/:reviewId', updateReview);
router.delete('/:reviewId', deleteReview);

module.exports = router;
