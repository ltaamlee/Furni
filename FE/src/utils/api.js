import axios from "./axios.customize";

// Auth APIs
const createUserApi = (name, email, password) => {
    const URL_API = "/auth/register";
    return axios.post(URL_API, { fullName: name, email, password });
}

const loginApi = (usernameOrEmail, password) => {
    const URL_API = "/auth/login";
    return axios.post(URL_API, { usernameOrEmail, password });
}

const getUserApi = () => {
    const URL_API = "/user/profile";
    return axios.get(URL_API);
}

const updateUserApi = (data) => {
    const URL_API = "/user/profile";
    return axios.put(URL_API, data);
}

const uploadAvatarApi = (formData) => {
    const URL_API = "/user/avatar";
    return axios.post(URL_API, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
}

const updatePasswordApi = (currentPassword, newPassword) => {
    const URL_API = "/user/change-password";
    return axios.put(URL_API, { currentPassword, newPassword });
}

// Address APIs
const getDefaultAddressApi = () => {
    const URL_API = "/user/addresses/default";
    return axios.get(URL_API);
}

const getAddressesApi = () => {
    const URL_API = "/user/addresses";
    return axios.get(URL_API);
}

const createAddressApi = (data) => {
    const URL_API = "/user/addresses";
    return axios.post(URL_API, data);
}

const setDefaultAddressApi = (addressId) => {
    const URL_API = `/user/addresses/${addressId}/default`;
    return axios.put(URL_API);
}

// Cart APIs
const getCartApi = () => {
    const URL_API = "/cart";
    return axios.get(URL_API);
}

const addToCartApi = (productId, quantity) => {
    const URL_API = "/cart";
    return axios.post(URL_API, { productId, quantity });
}

const updateCartItemApi = (productId, quantity) => {
    const URL_API = `/cart/${productId}`;
    return axios.put(URL_API, { quantity });
}

const removeFromCartApi = (productId) => {
    const URL_API = `/cart/${productId}`;
    return axios.delete(URL_API);
}

const clearCartApi = () => {
    const URL_API = "/cart";
    return axios.delete(URL_API);
}

// Order APIs
const createOrderApi = (data) => {
    const URL_API = "/orders";
    return axios.post(URL_API, data);
}

const getUserOrdersApi = (params = {}) => {
    const URL_API = "/orders";
    return axios.get(URL_API, { params });
}

const getOrderByIdApi = (orderId) => {
    const URL_API = `/orders/${orderId}`;
    return axios.get(URL_API);
}

const getOrderByNumberApi = (orderNumber) => {
    const URL_API = `/orders/number/${orderNumber}`;
    return axios.get(URL_API);
}

const cancelOrderApi = (orderId, reason) => {
    const URL_API = `/orders/${orderId}/cancel`;
    return axios.put(URL_API, { reason });
}

const confirmReceivedApi = (orderId) => {
    const URL_API = `/orders/${orderId}/confirm-received`;
    return axios.put(URL_API);
}

// Product APIs
const getProductsApi = (params = {}) => {
    const URL_API = "/products";
    return axios.get(URL_API, { params });
}

const getProductByIdApi = (productId) => {
    const URL_API = `/products/${productId}`;
    return axios.get(URL_API);
}

const incrementProductViewApi = (productId) => {
    const URL_API = `/products/${productId}/view`;
    return axios.post(URL_API);
}

const getProductsByCategoryApi = (slug, params = {}) => {
    const URL_API = `/products/category/${slug}`;
    return axios.get(URL_API, { params });
}

const getBestSellersApi = (params = {}) => {
    const URL_API = "/products/best-sellers";
    return axios.get(URL_API, { params });
}

const getTrendingProductsApi = (params = {}) => {
    const URL_API = "/products/trending";
    return axios.get(URL_API, { params });
}

const getSimilarProductsApi = (productId, params = {}) => {
    const URL_API = `/products/similar/${productId}`;
    return axios.get(URL_API, { params });
}

const getCategoriesApi = () => {
    const URL_API = "/categories";
    return axios.get(URL_API);
}

// Review APIs
const getProductReviewsApi = (productId, params = {}) => {
    const URL_API = `/reviews/product/${productId}`;
    return axios.get(URL_API, { params });
}

const getMyReviewsApi = (params = {}) => {
    const URL_API = "/reviews/my-reviews";
    return axios.get(URL_API, { params });
}

const createReviewApi = (data) => {
    const URL_API = "/reviews";
    return axios.post(URL_API, data);
}

const updateReviewApi = (reviewId, data) => {
    const URL_API = `/reviews/${reviewId}`;
    return axios.put(URL_API, data);
}

const deleteReviewApi = (reviewId) => {
    const URL_API = `/reviews/${reviewId}`;
    return axios.delete(URL_API);
}

const getPurchasableProductsApi = () => {
    const URL_API = "/reviews/purchasable";
    return axios.get(URL_API);
}

const getProductStatsApi = (productId) => {
    const URL_API = `/reviews/stats/${productId}`;
    return axios.get(URL_API);
}

// Wishlist APIs
const getWishlistApi = (params = {}) => {
    const URL_API = "/wishlist";
    return axios.get(URL_API, { params });
}

const addToWishlistApi = (productId) => {
    const URL_API = `/wishlist/${productId}`;
    return axios.post(URL_API);
}

const removeFromWishlistApi = (productId) => {
    const URL_API = `/wishlist/${productId}`;
    return axios.delete(URL_API);
}

const checkWishlistApi = (productId) => {
    const URL_API = `/wishlist/check/${productId}`;
    return axios.get(URL_API);
}

// Recently Viewed APIs
const getRecentlyViewedApi = (params = {}) => {
    const URL_API = "/wishlist/recently-viewed";
    return axios.get(URL_API, { params });
}

const addToRecentlyViewedApi = (productId) => {
    const URL_API = `/wishlist/recently-viewed/${productId}`;
    return axios.post(URL_API);
}

// Coupon APIs
const getAvailableCouponsApi = () => {
    const URL_API = "/loyalty/coupons";
    return axios.get(URL_API);
}

const getMyCouponsApi = (params = {}) => {
    const URL_API = "/loyalty/coupons/my-coupons";
    return axios.get(URL_API, { params });
}

const validateCouponApi = (data) => {
    const URL_API = "/loyalty/coupons/validate";
    return axios.post(URL_API, data);
}

const redeemCouponApi = (couponId) => {
    const URL_API = "/loyalty/coupons/redeem";
    return axios.post(URL_API, { couponId });
}

// Loyalty Points APIs
const getMyPointsApi = () => {
    const URL_API = "/loyalty/points";
    return axios.get(URL_API);
}

const getPointHistoryApi = (params = {}) => {
    const URL_API = "/loyalty/points/history";
    return axios.get(URL_API, { params });
}

const getExchangeableCouponsApi = () => {
    const URL_API = "/loyalty/points/exchangeable";
    return axios.get(URL_API);
}

// Shipping APIs
const getShippingProvidersApi = () => {
    const URL_API = "/shipping/providers";
    return axios.get(URL_API);
}

const calculateShippingFeesApi = (params) => {
    const URL_API = "/shipping/calculate-all";
    return axios.get(URL_API, { params });
}

// Location APIs (Vietnam administrative divisions)
const getProvincesApi = () => {
    const URL_API = "/locations/provinces";
    return axios.get(URL_API);
}

const getShippingByOrderApi = (orderId) => {
    const URL_API = `/shipping/orders/${orderId}`;
    return axios.get(URL_API);
}

const trackShipmentApi = (trackingNumber) => {
    const URL_API = `/shipping/track/${trackingNumber}`;
    return axios.get(URL_API);
}

// Public shop (storefront)
const getShopApi = (idOrSlug) => axios.get(`/shops/${idOrSlug}`);
const getShopVouchersApi = (idOrSlug) => axios.get(`/shops/${idOrSlug}/vouchers`);

// Voucher wallet APIs
const claimVoucherApi = (couponId) => axios.post("/vouchers/claim", { couponId });
const getMyVouchersApi = (params = {}) => axios.get("/vouchers/wallet", { params });
const getVoucherCountApi = () => axios.get("/vouchers/count");
const getAvailableVouchersApi = () => axios.get("/vouchers/available");
const applyVoucherApi = (voucherWalletId, orderId) =>
    axios.post("/vouchers/apply", { voucherWalletId, orderId });
const getAllVouchersApi = () => axios.get("/vouchers/all");
const getShopProductsApi = (id, params = {}) => axios.get(`/shops/${id}/products`, { params });
const registerShopApi = (data) => axios.post("/shops/register", data);
const getMyShopRegistrationApi = () => axios.get("/shops/my-registration");
const resubmitShopApi = (data) => axios.put("/shops/resubmit", data);
const uploadShopImagesApi = (files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append("images", f));
    return axios.post("/shops/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
};

// Admin — duyệt cửa hàng
const getAdminShopsApi = (params = {}) => axios.get("/admin/shops", { params });
const updateShopStatusApi = (id, status, statusNote) => axios.put(`/admin/shops/${id}/status`, { status, statusNote });

// Vendor APIs (role: vendor) — shop-scoped
const getMyShopApi = () => axios.get("/vendor/shop");
const updateMyShopApi = (data) => axios.put("/vendor/shop", data);
const updateShippingConfigApi = (data) => axios.put("/vendor/shop/shipping-config", data);
const getVendorDashboardApi = () => axios.get("/vendor/dashboard");
const getVendorReportsApi = (params = {}) => axios.get("/vendor/reports", { params });

// Vendor wallet
const getVendorWalletApi = () => axios.get("/vendor/wallet");
const getVendorTransactionsApi = (params = {}) => axios.get("/vendor/wallet/transactions", { params });
const vendorWithdrawApi = (data) => axios.post("/vendor/wallet/withdraw", data);
const addVendorBankAccountApi = (data) => axios.post("/vendor/wallet/bank-accounts", data);

// Vendor reviews
const getVendorReviewsApi = (params = {}) => axios.get("/vendor/reviews", { params });
const replyVendorReviewApi = (id, content) => axios.put(`/vendor/reviews/${id}/reply`, { content });

// Vendor blog
const getVendorBlogsApi = (params = {}) => axios.get("/vendor/blogs", { params });
const getVendorBlogApi = (id) => axios.get(`/vendor/blogs/${id}`);
const createVendorBlogApi = (data) => axios.post("/vendor/blogs", data);
const updateVendorBlogApi = (id, data) => axios.put(`/vendor/blogs/${id}`, data);
const deleteVendorBlogApi = (id) => axios.delete(`/vendor/blogs/${id}`);

// Public blog
const getPublicBlogsApi = (params = {}) => axios.get("/blogs", { params });
const getPublicBlogApi = (idOrSlug) => axios.get(`/blogs/${idOrSlug}`);
const likeBlogApi = (blogId) => axios.post(`/blogs/${blogId}/like`);
const checkLikeBlogApi = (blogId) => axios.get(`/blogs/${blogId}/like`);
const getBlogCommentsApi = (blogId, params = {}) => axios.get(`/blogs/${blogId}/comments`, { params });
const createBlogCommentApi = (blogId, content, parentComment = null) =>
    axios.post(`/blogs/${blogId}/comments`, { content, parentComment });
const deleteBlogCommentApi = (blogId, commentId) => axios.delete(`/blogs/${blogId}/comments/${commentId}`);
const getBlogRepliesApi = (blogId, commentId, params = {}) =>
    axios.get(`/blogs/${blogId}/comments/${commentId}/replies`, { params });

// Vendor notifications
const getVendorNotificationsApi = (params = {}) => axios.get("/vendor/notifications", { params });
const markNotificationReadApi = (id) => axios.put(`/vendor/notifications/${id}/read`);
const markAllNotificationsReadApi = () => axios.put("/vendor/notifications/read-all");
const deleteNotificationApi = (id) => axios.delete(`/vendor/notifications/${id}`);

const getVendorProductsApi = (params = {}) => axios.get("/vendor/products", { params });
const createVendorProductApi = (data) => axios.post("/vendor/products", data);
const updateVendorProductApi = (id, data) => axios.put(`/vendor/products/${id}`, data);
const deleteVendorProductApi = (id) => axios.delete(`/vendor/products/${id}`);

// Danh mục mà shop đang bán (cho phạm vi khuyến mãi)
const getVendorCategoriesApi = () => axios.get("/vendor/categories");

// Upload ảnh sản phẩm lên Cloudinary (multipart/form-data, field "images")
const uploadVendorImagesApi = (files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append("images", f));
    return axios.post("/vendor/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
};

// Xuất danh sách sản phẩm ra Excel (trả về Blob)
const exportVendorProductsApi = (params = {}) =>
    axios.get("/vendor/products/export", { params, responseType: "blob" });

// Vendor orders (đơn hàng có sản phẩm của shop)
const getVendorOrdersApi = (params = {}) => axios.get("/vendor/orders", { params });
const getVendorOrderApi = (id) => axios.get(`/vendor/orders/${id}`);
const updateVendorOrderStatusApi = (id, status, note) => axios.put(`/vendor/orders/${id}/status`, { status, note });

const getVendorPromotionsApi = (params = {}) => axios.get("/vendor/promotions", { params });
const createVendorPromotionApi = (data) => axios.post("/vendor/promotions", data);
const updateVendorPromotionApi = (id, data) => axios.put(`/vendor/promotions/${id}`, data);
const deleteVendorPromotionApi = (id) => axios.delete(`/vendor/promotions/${id}`);

// Payment APIs
const createPayOSPaymentWithCartApi = (data) => {
    const URL_API = "/payments/payos/create-with-cart";
    return axios.post(URL_API, data);
};

const getPayOSPaymentStatusApi = (orderId) => {
    const URL_API = `/payments/payos/status/${orderId}`;
    return axios.get(URL_API);
};

const cancelPayOSPaymentApi = (orderId) => {
    const URL_API = `/payments/payos/cancel/${orderId}`;
    return axios.post(URL_API);
};

// User Wallet APIs
const getUserWalletApi = () => {
    const URL_API = "/wallets/my";
    return axios.get(URL_API);
};

const getUserTransactionHistoryApi = (params = {}) => {
    const URL_API = "/wallets/transactions";
    return axios.get(URL_API, { params });
};

const addUserWalletAccountApi = (data) => {
    const URL_API = "/wallets";
    return axios.post(URL_API, data);
};

const updateUserWalletAccountApi = (accountId, data) => {
    const URL_API = `/wallets/${accountId}`;
    return axios.put(URL_API, data);
};

const deleteUserWalletAccountApi = (accountId) => {
    const URL_API = `/wallets/${accountId}`;
    return axios.delete(URL_API);
};

const setDefaultWalletAccountApi = (accountId) => {
    const URL_API = `/wallets/${accountId}/default`;
    return axios.put(URL_API);
};

// Admin Platform APIs
const getPlatformConfigApi = () => {
    const URL_API = "/admin/platform/config";
    return axios.get(URL_API);
};

const updatePlatformConfigApi = (key, value) => {
    const URL_API = "/admin/platform/config";
    return axios.put(URL_API, { key, value });
};

const getFinanceOverviewApi = () => {
    const URL_API = "/admin/platform/finance-overview";
    return axios.get(URL_API);
};

const runManualPayoutApi = (orderIds) => {
    const URL_API = "/admin/platform/run-payout";
    return axios.post(URL_API, { orderIds });
};

const getPlatformTransactionsApi = (params) => {
    const URL_API = "/admin/platform/transactions";
    return axios.get(URL_API, { params });
};

// Admin — Thông báo
const getAdminUnreadNotifCountApi = () => axios.get("/admin/notifications/unread-count");
const getAdminNotificationsApi = (params) => axios.get("/admin/notifications", { params });
const markAdminNotificationReadApi = (id) => axios.put("/admin/notifications/read", { id });
const markAllAdminNotificationsReadApi = () => axios.put("/admin/notifications/read");
const deleteAdminNotificationApi = (id) => axios.delete(`/admin/notifications/${id}`);
// Admin — quản lý user 
const getAdminUsersApi = (params = {}) => axios.get("/admin/users", { params });
const updateAdminUserApi = (id, data) => axios.put(`/admin/users/${id}`, data);
const toggleBlockUserApi = (id) => axios.put(`/admin/users/${id}/toggle-block`); 
// Admin — quản lý danh mục 
const getAdminCategoriesApi = (params = {}) => axios.get("/categories", { params });
const createAdminCategoryApi = (data) => axios.post("/categories", data);
const updateAdminCategoryApi = (id, data) => axios.put(`/categories/${id}`, data);
const deleteAdminCategoryApi = (id) => axios.delete(`/categories/${id}`);
// Admin — quản lý cửa hàng
const getAdminShopDetailApi = (id) => axios.get(`/admin/shops/${id}`);
const getAdminShopProductsApi = (id, params = {}) => axios.get(`/admin/shops/${id}/products`, { params });
const toggleProductVisibilityAdminApi = (productId, data = {}) => axios.put(`/admin/products/${productId}/toggle-visibility`, data);
// Admin — Quản lý khuyến mãi toàn sàn
const getAdminPromotionsSiteApi = (params = {}) => axios.get("/admin/promotions", { params });
const createAdminPromotionSiteApi = (data) => axios.post("/admin/promotions", data);
const updateAdminPromotionSiteApi = (id, data) => axios.put(`/admin/promotions/${id}`, data);
const deleteAdminPromotionSiteApi = (id) => axios.delete(`/admin/promotions/${id}`);
// Admin — Quản lý chiết khấu 
const getAdminCommissionsApi = (params = {}) => axios.get("/admin/commissions", { params });
const updateShopCommissionApi = (id, data) => axios.put(`/admin/commissions/${id}/rate`, data);
// Admin — Báo cáo doanh thu
const getAdminRevenueApi = (params) => axios.get("/admin/revenue", { params });

// Shipping - GHN districts
const getGhnDistrictsApi = (provinceId) =>
    axios.get("https://online-gateway.ghn.vn/shiip/public-api/master-data/district", {
        params: { province_id: provinceId },
        headers: { token: "637170d5-942b-11ea-9821-0281a26fb5d4" } // Public token
    });

const getGhnProvincesApi = () =>
    axios.get("https://online-gateway.ghn.vn/shiip/public-api/master-data/province", {
        headers: { token: "637170d5-942b-11ea-9821-0281a26fb5d4" }
    });

export { getGhnDistrictsApi, getGhnProvincesApi };

export {
    createUserApi,
    loginApi,
    getUserApi,
    updateUserApi,
    uploadAvatarApi,
    updatePasswordApi,
    getDefaultAddressApi,
    getAddressesApi,
    createAddressApi,
    setDefaultAddressApi,
    getCartApi,
    addToCartApi,
    updateCartItemApi,
    removeFromCartApi,
    clearCartApi,
    createOrderApi,
    getUserOrdersApi,
    getOrderByIdApi,
    getOrderByNumberApi,
    cancelOrderApi,
    confirmReceivedApi,
    getProductsApi,
    getProductByIdApi,
    incrementProductViewApi,
    getProductsByCategoryApi,
    getBestSellersApi,
    getTrendingProductsApi,
    getSimilarProductsApi,
    getCategoriesApi,
    getProductReviewsApi,
    getMyReviewsApi,
    createReviewApi,
    updateReviewApi,
    deleteReviewApi,
    getPurchasableProductsApi,
    getProductStatsApi,
    getWishlistApi,
    addToWishlistApi,
    removeFromWishlistApi,
    checkWishlistApi,
    getRecentlyViewedApi,
    addToRecentlyViewedApi,
    getAvailableCouponsApi,
    getMyCouponsApi,
    validateCouponApi,
    redeemCouponApi,
    getMyPointsApi,
    getPointHistoryApi,
    getExchangeableCouponsApi,
    getShippingProvidersApi,
    calculateShippingFeesApi,
    getShippingByOrderApi,
    trackShipmentApi,
    getProvincesApi,
    // GeoVina APIs
    getShopApi,
    getShopVouchersApi,
    claimVoucherApi,
    getMyVouchersApi,
    getVoucherCountApi,
    getAvailableVouchersApi,
    getAllVouchersApi,
    applyVoucherApi,
    getShopProductsApi,
    registerShopApi,
    uploadShopImagesApi,
    getMyShopRegistrationApi,
    resubmitShopApi,
    getAdminShopsApi,
    updateShopStatusApi,
    getMyShopApi,
    updateMyShopApi,
    updateShippingConfigApi,
    getVendorDashboardApi,
    getVendorReportsApi,
    getVendorWalletApi,
    getVendorTransactionsApi,
    vendorWithdrawApi,
    addVendorBankAccountApi,
    getVendorReviewsApi,
    replyVendorReviewApi,
    getVendorBlogsApi,
    getVendorBlogApi,
    createVendorBlogApi,
    updateVendorBlogApi,
    deleteVendorBlogApi,
    getPublicBlogsApi,
    getPublicBlogApi,
    likeBlogApi,
    checkLikeBlogApi,
    getBlogCommentsApi,
    createBlogCommentApi,
    deleteBlogCommentApi,
    getBlogRepliesApi,
    getVendorNotificationsApi,
    markNotificationReadApi,
    markAllNotificationsReadApi,
    deleteNotificationApi,
    getVendorProductsApi,
    createVendorProductApi,
    updateVendorProductApi,
    deleteVendorProductApi,
    getVendorCategoriesApi,
    uploadVendorImagesApi,
    exportVendorProductsApi,
    getVendorOrdersApi,
    getVendorOrderApi,
    updateVendorOrderStatusApi,
    getVendorPromotionsApi,
    createVendorPromotionApi,
    updateVendorPromotionApi,
    deleteVendorPromotionApi,
    // Payment APIs
    createPayOSPaymentWithCartApi,
    getPayOSPaymentStatusApi,
    cancelPayOSPaymentApi,
    // User Wallet APIs
    getUserWalletApi,
    getUserTransactionHistoryApi,
    addUserWalletAccountApi,
    updateUserWalletAccountApi,
    deleteUserWalletAccountApi,
    setDefaultWalletAccountApi,
    // Admin Platform APIs
    getPlatformConfigApi,
    updatePlatformConfigApi,
    getFinanceOverviewApi,
    runManualPayoutApi,
    getPlatformTransactionsApi,

    getAdminUsersApi,
    updateAdminUserApi,
    toggleBlockUserApi,
    getAdminCategoriesApi,
    createAdminCategoryApi,
    updateAdminCategoryApi,
    deleteAdminCategoryApi,
    getAdminShopDetailApi,
    getAdminShopProductsApi,
    toggleProductVisibilityAdminApi,
    getAdminPromotionsSiteApi,
    createAdminPromotionSiteApi,
    updateAdminPromotionSiteApi,
    deleteAdminPromotionSiteApi,
    getAdminCommissionsApi,
    updateShopCommissionApi,
    getAdminUnreadNotifCountApi,
    getAdminNotificationsApi,
    markAdminNotificationReadApi,
    markAllAdminNotificationsReadApi,
    deleteAdminNotificationApi,
    getAdminRevenueApi,
};
