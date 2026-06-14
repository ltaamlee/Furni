const express = require('express');
const router = express.Router();
const {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    checkWishlist,
    addToRecentlyViewed,
    getRecentlyViewed,
    clearRecentlyViewed,
    getSimilarProducts
} = require('../controllers/wishlistController');

const { protect } = require('../middleware/authMiddleware');

// Similar products - public
router.get('/similar/:productId', getSimilarProducts);

// Recently viewed - mixed
router.get('/recently-viewed', protect, getRecentlyViewed);
router.post('/recently-viewed/:productId', protect, addToRecentlyViewed);
router.delete('/recently-viewed', protect, clearRecentlyViewed);

// Wishlist - protected
router.get('/', protect, getWishlist);
router.get('/check/:productId', protect, checkWishlist);
router.post('/:productId', protect, addToWishlist);
router.delete('/:productId', protect, removeFromWishlist);

module.exports = router;
