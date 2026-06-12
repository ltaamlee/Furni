const express = require('express');
const router = express.Router();

const {
    getMyShop,
    getDashboardSummary,
    getMyProducts,
    getVendorCategories,
    exportProducts,
    getMyPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    getMyOrders,
    getMyOrderDetail,
    updateMyOrderStatus
} = require('../controllers/vendorController');

// Tái sử dụng logic sản phẩm (đã tự gán shop + kiểm tra quyền theo vendor)
const {
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');

const { uploadImagesMiddleware, uploadImages } = require('../controllers/uploadController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { validateProduct, validateProductUpdate } = require('../middleware/validationMiddleware');

// Tất cả route vendor yêu cầu đăng nhập + role vendor
router.use(protect, authorize('vendor'));

// Shop & dashboard
router.get('/shop', getMyShop);
router.get('/dashboard', getDashboardSummary);
router.get('/categories', getVendorCategories);

// Upload ảnh (Cloudinary)
router.post('/upload', uploadImagesMiddleware, uploadImages);

// Sản phẩm (gắn với shop của vendor) — đặt /export trước /:id
router.get('/products/export', exportProducts);
router.get('/products', getMyProducts);
router.post('/products', validateProduct, createProduct);
router.put('/products/:id', validateProductUpdate, updateProduct);
router.delete('/products/:id', deleteProduct);

// Đơn hàng (đơn có sản phẩm của shop)
router.get('/orders', getMyOrders);
router.get('/orders/:id', getMyOrderDetail);
router.put('/orders/:id/status', updateMyOrderStatus);

// Khuyến mãi
router.get('/promotions', getMyPromotions);
router.post('/promotions', createPromotion);
router.put('/promotions/:id', updatePromotion);
router.delete('/promotions/:id', deletePromotion);

module.exports = router;
