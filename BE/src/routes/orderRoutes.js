const express = require('express');
const router = express.Router();
const {
    createOrder,
    getUserOrders,
    getOrderById,
    cancelOrder,
    confirmOrder,
    updateOrderStatus,
    getAllOrders,
    processCancelRequest,
    autoConfirmOrders,
    getOrderStats
} = require('../controllers/orderController');

const { protect, authorize } = require('../middleware/authMiddleware');

// User routes - All authenticated users
router.post('/', protect, createOrder);
router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/cancel', protect, cancelOrder);

// Admin/Vendor routes
router.get('/admin/all', protect, authorize('admin', 'vendor'), getAllOrders);
router.put('/:id/confirm', protect, authorize('admin', 'vendor'), confirmOrder);
router.put('/:id/status', protect, authorize('admin', 'vendor'), updateOrderStatus);
router.put('/:id/cancel-request', protect, authorize('admin'), processCancelRequest);
router.post('/auto-confirm', protect, authorize('admin'), autoConfirmOrders);
router.get('/admin/stats', protect, authorize('admin'), getOrderStats);

module.exports = router;
