/**
 * Platform Routes
 * 
 * API routes cho quản lý cấu hình sàn (Admin)
 */

const express = require('express');
const router = express.Router();
const {
    getPlatformConfig,
    updatePlatformConfig,
    getFinanceOverview,
    runManualPayout,
    getPlatformTransactions
} = require('../controllers/platformController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Tất cả routes đều cần quyền Admin
router.use(protect, authorize('admin'));

/**
 * @route   GET /api/admin/platform/config
 * @desc    Lấy tất cả cấu hình sàn
 * @access  Private/Admin
 */
router.get('/config', getPlatformConfig);

/**
 * @route   PUT /api/admin/platform/config
 * @desc    Cập nhật cấu hình sàn
 * @access  Private/Admin
 */
router.put('/config', updatePlatformConfig);

/**
 * @route   GET /api/admin/platform/finance-overview
 * @desc    Lấy tổng quan tài chính sàn
 * @access  Private/Admin
 */
router.get('/finance-overview', getFinanceOverview);

/**
 * @route   POST /api/admin/platform/run-payout
 * @desc    Chạy settlement thủ công
 * @access  Private/Admin
 */
router.post('/run-payout', runManualPayout);

/**
 * @route   GET /api/admin/platform/transactions
 * @desc    Lấy danh sách giao dịch platform
 * @access  Private/Admin
 */
router.get('/transactions', getPlatformTransactions);

module.exports = router;
