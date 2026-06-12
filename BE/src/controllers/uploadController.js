const multer = require('multer');
const { isConfigured, uploadBuffer } = require('../config/cloudinary');

// Lưu file trong RAM rồi đẩy thẳng lên Cloudinary (không ghi xuống đĩa)
const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB / ảnh
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Chỉ chấp nhận file hình ảnh (JPEG, PNG, GIF, WEBP)'), false);
    }
});

// Middleware nhận tối đa 6 ảnh ở field "images", có bắt lỗi của multer
const uploadImagesMiddleware = (req, res, next) => {
    memoryUpload.array('images', 6)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            const msg = err.code === 'LIMIT_FILE_SIZE'
                ? 'Kích thước ảnh quá lớn. Tối đa 5MB.'
                : err.code === 'LIMIT_UNEXPECTED_FILE'
                    ? 'Chỉ được tải lên tối đa 6 ảnh.'
                    : err.message;
            return res.status(400).json({ success: false, message: msg });
        }
        if (err) return res.status(400).json({ success: false, message: err.message });
        next();
    });
};

// @desc    Upload ảnh sản phẩm lên Cloudinary
// @route   POST /api/vendor/upload
// @access  Private/Vendor
const uploadImages = async (req, res) => {
    try {
        if (!isConfigured()) {
            return res.status(500).json({
                success: false,
                message: 'Cloudinary chưa được cấu hình. Vui lòng kiểm tra biến môi trường.'
            });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất một ảnh' });
        }

        const folder = (req.query.folder || 'furni/products').toString();
        const results = await Promise.all(req.files.map((f) => uploadBuffer(f.buffer, folder)));

        res.status(200).json({
            success: true,
            message: 'Tải ảnh lên thành công',
            data: {
                images: results.map((r) => r.url),
                files: results
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi tải ảnh lên Cloudinary', error: error.message });
    }
};

module.exports = { uploadImagesMiddleware, uploadImages };
