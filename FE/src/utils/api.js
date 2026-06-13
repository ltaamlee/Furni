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
    const URL_API = "/user/me";
    return axios.get(URL_API);
}

const updateUserApi = (data) => {
    const URL_API = "/user/me";
    return axios.put(URL_API, data);
}

const updatePasswordApi = (currentPassword, newPassword) => {
    const URL_API = "/user/change-password";
    return axios.put(URL_API, { currentPassword, newPassword });
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

const cancelOrderApi = (orderId, reason) => {
    const URL_API = `/orders/${orderId}/cancel`;
    return axios.put(URL_API, { reason });
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

const getProductsByCategoryApi = (categoryId, params = {}) => {
    const URL_API = `/products/category/${categoryId}`;
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

const getCategoriesApi = () => {
    const URL_API = "/categories";
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
const getShopProductsApi = (id, params = {}) => axios.get(`/shops/${id}/products`, { params });

// Admin — duyệt cửa hàng
const getAdminShopsApi = (params = {}) => axios.get("/admin/shops", { params });
const updateShopStatusApi = (id, status, statusNote) => axios.put(`/admin/shops/${id}/status`, { status, statusNote });

// Vendor APIs (role: vendor) — shop-scoped
const getMyShopApi = () => axios.get("/vendor/shop");
const updateMyShopApi = (data) => axios.put("/vendor/shop", data);
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

export {
    createUserApi,
    loginApi,
    getUserApi,
    updateUserApi,
    updatePasswordApi,
    getCartApi,
    addToCartApi,
    updateCartItemApi,
    removeFromCartApi,
    clearCartApi,
    createOrderApi,
    getUserOrdersApi,
    getOrderByIdApi,
    cancelOrderApi,
    getProductsApi,
    getProductByIdApi,
    getProductsByCategoryApi,
    getBestSellersApi,
    getTrendingProductsApi,
    getCategoriesApi,
    getShippingProvidersApi,
    calculateShippingFeesApi,
    getShippingByOrderApi,
    trackShipmentApi,
    getShopApi,
    getShopProductsApi,
    getAdminShopsApi,
    updateShopStatusApi,
    getMyShopApi,
    updateMyShopApi,
    getVendorDashboardApi,
    getVendorReportsApi,
    getVendorWalletApi,
    getVendorTransactionsApi,
    vendorWithdrawApi,
    addVendorBankAccountApi,
    getVendorReviewsApi,
    replyVendorReviewApi,
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
    deleteVendorPromotionApi
};
