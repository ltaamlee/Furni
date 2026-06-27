const express = require('express');
const router = express.Router();
const {
    createOrder,
    getUserOrders,
    getOrderById,
    getOrderByNumber,
    cancelOrder,
    confirmOrder,
    updateOrderStatus,
    getAllOrders,
    processCancelRequest,
    autoConfirmOrders,
    confirmReceived,
    getOrderStats,
    adminForceCancelOrder,
    getAdminOrderById
} = require('../controllers/orderController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Public route: lookup order by orderNumber (for OrderSuccess page) — MUST be before /:id
router.get('/number/:orderNumber', getOrderByNumber);

// User routes - All authenticated users
router.post('/', protect, createOrder);
router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/confirm-received', protect, confirmReceived);

// Admin/Vendor routes
router.get('/admin/all', protect, authorize('admin', 'vendor'), getAllOrders);
router.put('/:id/confirm', protect, authorize('admin', 'vendor'), confirmOrder);
router.put('/:id/status', protect, authorize('admin', 'vendor'), updateOrderStatus);
router.put('/:id/cancel-request', protect, authorize('admin'), processCancelRequest);
router.post('/auto-confirm', protect, authorize('admin'), autoConfirmOrders);
router.get('/admin/stats', protect, authorize('admin'), getOrderStats);
router.put('/admin/:id/force-cancel', protect, authorize('admin'), adminForceCancelOrder);
router.get('/admin/:id', protect, authorize('admin'), getAdminOrderById);

module.exports = router;
