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

const getShippingByOrderApi = (orderId) => {
    const URL_API = `/shipping/orders/${orderId}`;
    return axios.get(URL_API);
}

const trackShipmentApi = (trackingNumber) => {
    const URL_API = `/shipping/track/${trackingNumber}`;
    return axios.get(URL_API);
}

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
    trackShipmentApi
};
