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
    trackShipmentApi
};
