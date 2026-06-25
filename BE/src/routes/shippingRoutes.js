const express = require('express');
const router = express.Router();
const {
    calculateFee,
    calculateAllFees,
    createShippingOrder,
    getShippingByOrderId,
    trackShipment,
    updateShippingStatus,
} = require('../controllers/shippingController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/calculate', calculateFee);
router.get('/calculate-all', calculateAllFees);
router.get('/track/:trackingNumber', trackShipment);

// Protected routes
router.post('/orders', protect, createShippingOrder);
router.get('/orders/:orderId', protect, getShippingByOrderId);

// Admin routes
router.put('/orders/:id/status', protect, authorize('admin', 'vendor'), updateShippingStatus);

module.exports = router;
