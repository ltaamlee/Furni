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
    updateMyOrderStatus,
    getReports,
    getWallet,
    getTransactions,
    requestWithdraw,
    addBankAccount,
    getReviews,
    replyReview,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    updateMyShop,
    updateShippingConfig
} = require('../controllers/vendorController');

// Tái sử dụng logic sản phẩm (đã tự gán shop + kiểm tra quyền theo vendor)
const {
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');

const { uploadImagesMiddleware, uploadImages } = require('../controllers/uploadController');

const {
    getMyBlogs,
    getMyBlog,
    createBlog,
    updateBlog,
    deleteBlog
} = require('../controllers/blogController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { validateProduct, validateProductUpdate } = require('../middleware/validationMiddleware');

// Tất cả route vendor yêu cầu đăng nhập + role vendor
router.use(protect, authorize('vendor'));

// Shop & dashboard
router.get('/shop', getMyShop);
router.put('/shop', updateMyShop);
router.put('/shop/shipping-config', updateShippingConfig);
router.get('/dashboard', getDashboardSummary);
router.get('/reports', getReports);
router.get('/categories', getVendorCategories);

// Ví điện tử
router.get('/wallet', getWallet);
router.get('/wallet/transactions', getTransactions);
router.post('/wallet/withdraw', requestWithdraw);
router.post('/wallet/bank-accounts', addBankAccount);

// Đánh giá
router.get('/reviews', getReviews);
router.put('/reviews/:id/reply', replyReview);

// Thông báo
router.get('/notifications', getNotifications);
router.put('/notifications/read-all', markAllNotificationsRead);
router.put('/notifications/:id/read', markNotificationRead);
router.delete('/notifications/:id', deleteNotification);

// Upload ảnh (Cloudinary)
router.post('/upload', uploadImagesMiddleware, uploadImages);

// Sản phẩm (gắn với shop của vendor) — đặt /export trước /:id
router.get('/products/export', exportProducts);
router.get('/products', getMyProducts);
router.post('/products', validateProduct, createProduct);
router.put('/products/:id', validateProductUpdate, updateProduct);
router.delete('/products/:id', deleteProduct);

// Blog (bài viết của shop)
router.get('/blogs', getMyBlogs);
router.post('/blogs', createBlog);
router.get('/blogs/:id', getMyBlog);
router.put('/blogs/:id', updateBlog);
router.delete('/blogs/:id', deleteBlog);

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
