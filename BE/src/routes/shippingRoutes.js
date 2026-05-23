const express = require('express');
const router = express.Router();
const {
    getProviders,
    calculateFee,
    calculateAllFees,
    createShippingOrder,
    getShippingByOrderId,
    trackShipment,
    updateShippingStatus,
    seedProviders
} = require('../controllers/shippingController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/providers', getProviders);
router.get('/calculate', calculateFee);
router.get('/calculate-all', calculateAllFees);
router.get('/track/:trackingNumber', trackShipment);

// Protected routes
router.post('/orders', protect, createShippingOrder);
router.get('/orders/:orderId', protect, getShippingByOrderId);

// Admin routes
router.put('/orders/:id/status', protect, authorize('admin', 'vendor'), updateShippingStatus);
router.post('/seed', protect, authorize('admin'), seedProviders);

module.exports = router;
