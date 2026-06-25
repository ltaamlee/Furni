/**
 * Platform Routes
 * 
 * API routes cho quản lý cấu hình sàn (Admin)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    getPlatformConfig,
    updatePlatformConfig,
    uploadPlatformFile,
    getFinanceOverview,
    runManualPayout,
    getPlatformTransactions
} = require('../controllers/platformController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/platform');
        // Create directory if not exists
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `platform-${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'));
    }
});

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
 * @route   POST /api/admin/platform/upload
 * @desc    Upload file cấu hình (logo, QR code, favicon)
 * @access  Private/Admin
 */
router.post('/upload', upload.single('file'), uploadPlatformFile);

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
