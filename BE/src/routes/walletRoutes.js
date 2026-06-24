const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getMyWallets,
    getTransactionHistory,
    addAccount,
    updateAccount,
    deleteAccount,
    setDefaultAccount
} = require('../controllers/walletController');

// Tất cả routes đều cần đăng nhập
router.use(protect);

// GET /api/wallets/my - Lấy danh sách ví của user
router.get('/my', getMyWallets);

// GET /api/wallets/transactions - Lấy lịch sử giao dịch
router.get('/transactions', getTransactionHistory);

// POST /api/wallets - Thêm tài khoản mới
router.post('/', addAccount);

// PUT /api/wallets/:accountId - Cập nhật tài khoản
router.put('/:accountId', updateAccount);

// DELETE /api/wallets/:accountId - Xóa tài khoản
router.delete('/:accountId', deleteAccount);

// PUT /api/wallets/:accountId/default - Đặt làm mặc định
router.put('/:accountId/default', setDefaultAccount);

module.exports = router;
