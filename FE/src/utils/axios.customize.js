import axios from "axios";
import { useNavigate } from "react-router-dom";

const instance = axios.create({
    baseURL: import.meta.env.VITE_BE_URL + "/api",
});

instance.interceptors.request.use(function (config){
    config.headers.Authorization = `Bearer ${localStorage.getItem("access_token")}`;
    return config;
}, function (error){
    return Promise.reject(error);
});

instance.interceptors.response.use(function (response){
    if (response && response.data) return response.data;
    return response;
}, function (error){
    // Log error for debugging
    console.log("API Error:", error?.response?.status, error?.response?.data);
    
    // Handle 401 Unauthorized - clear token and redirect to login
    if (error?.response?.status === 401) {
        localStorage.removeItem("access_token");
        // Only redirect if not already on login/register page
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
            window.location.href = '/login';
        }
    }
    if (error?.response?.data) return error?.response?.data;
    return Promise.reject(error);
});

export default instance;