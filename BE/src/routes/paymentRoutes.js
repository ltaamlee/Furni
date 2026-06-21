/**
 * Payment Routes
 * 
 * API routes cho PayOS Payment Gateway
 */

const express = require('express');
const router = express.Router();
const {
    createPayOSPayment,
    createPayOSPaymentWithCart,
    payOSWebhook,
    payOSReturn,
    getPayOSPaymentStatus,
    cancelPayOSPayment
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/payments/payos/create-with-cart
 * @desc    Tạo đơn hàng và payment link PayOS từ giỏ hàng
 * @access  Private
 */
router.post('/payos/create-with-cart', protect, createPayOSPaymentWithCart);

/**
 * @route   POST /api/payments/payos/create
 * @desc    Tạo payment link PayOS cho đơn hàng đã tồn tại
 * @access  Private
 */
router.post('/payos/create', protect, createPayOSPayment);

/**
 * @route   POST /api/payments/payos/webhook
 * @desc    Webhook callback từ PayOS (server-to-server)
 * @access  Public
 */
router.post('/payos/webhook', payOSWebhook);

/**
 * @route   GET /api/payments/payos/return
 * @desc    Return URL sau khi thanh toán (redirect từ PayOS)
 * @access  Public
 */
router.get('/payos/return', payOSReturn);

/**
 * @route   GET /api/payments/payos/status/:orderId
 * @desc    Kiểm tra trạng thái thanh toán PayOS
 * @access  Private
 */
router.get('/payos/status/:orderId', protect, getPayOSPaymentStatus);

/**
 * @route   POST /api/payments/payos/cancel/:orderId
 * @desc    Hủy thanh toán PayOS
 * @access  Private
 */
router.post('/payos/cancel/:orderId', protect, cancelPayOSPayment);

module.exports = router;
