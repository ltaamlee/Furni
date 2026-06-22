const express = require('express');
const router = express.Router();
const { getShop, getShopProducts, registerShop, getMyRegistration, resubmitRegistration } = require('../controllers/shopController');
const { protect } = require('../middleware/authMiddleware');
const { uploadImagesMiddleware, uploadImages } = require('../controllers/uploadController'); 

// CÁC API PRIVATE 
router.get('/my-registration', protect, getMyRegistration); // Lấy đơn đăng ký cũ (nếu có)
router.put('/resubmit', protect, resubmitRegistration);     // Cập nhật gửi lại đơn
router.post('/register', protect, registerShop);            // Đăng ký mới
router.post('/upload', protect, uploadImagesMiddleware, uploadImages); 


// CÁC API PUBLIC
router.get('/:id/products', getShopProducts);
router.get('/:idOrSlug', getShop);

module.exports = router;