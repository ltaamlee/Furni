const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    claimVoucher,
    getMyVouchers,
    getVoucherCount,
    applyVoucher,
    getAvailableVouchers,
    validateVoucher,
} = require('../controllers/voucherWalletController');
const { getAllVouchers } = require('../controllers/shopController');

// Public: all active vouchers across all shops (no auth required)
router.get('/all', getAllVouchers);

// All routes below require authentication
router.use(protect);

// Customer voucher wallet
router.post('/claim', authorize('customer'), claimVoucher);
router.get('/wallet', authorize('customer'), getMyVouchers);
router.get('/count', authorize('customer'), getVoucherCount);
router.post('/apply', authorize('customer'), applyVoucher);
router.get('/available', authorize('customer'), getAvailableVouchers);
router.post('/validate', authorize('customer'), validateVoucher);

module.exports = router;
