const express = require('express');
const router = express.Router();
const {
    getAvailableCoupons,
    getMyCoupons,
    validateCoupon,
    redeemCoupon,
    getMyPoints,
    getPointHistory,
    getExchangeableCoupons,
    addPointsFromOrder
} = require('../controllers/loyaltyController');

const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Coupon routes
router.get('/coupons', getAvailableCoupons);
router.get('/coupons/my-coupons', getMyCoupons);
router.post('/coupons/validate', validateCoupon);
router.post('/coupons/redeem', redeemCoupon);

// Loyalty points routes
router.get('/points', getMyPoints);
router.get('/points/history', getPointHistory);
router.get('/points/exchangeable', getExchangeableCoupons);
router.post('/points/add-from-order', addPointsFromOrder);

module.exports = router;
