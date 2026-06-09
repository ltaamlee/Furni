import { Navigate } from "react-router-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CustomerLayout from "./components/layout/CustomerLayout";
import VendorLayout from "./components/vendor/VendorLayout";
import { useContext } from "react";
import { AuthContext } from "./components/context/authContext";

import HomePage from "./pages/home";
import ProductsPage from "./pages/user/products";
import ProductDetailPage from "./pages/user/productDetail";
import CartPage from "./pages/user/cart";
import CheckoutPage from "./pages/user/checkout";
import OrderSuccessPage from "./pages/user/orderSuccess";
import OrderHistoryPage from "./pages/user/orderHistory";
import OrderDetailPage from "./pages/user/orderDetail";
import ProductByCategoryPage from "./pages/user/productByCategory";
import BestSellersPage from "./pages/user/bestSellers";
import LoginPage from "./pages/auth/login";
import RegisterPage from "./pages/auth/register";
import VerifyPasswordPage from "./pages/auth/verify-password";
import ForgotPasswordPage from "./pages/auth/forgot-password";
import ProfilePage from "./pages/user/profile";

// Vendor pages
import VendorRegister from "./pages/vendor/Register";
import VendorDashboard from "./pages/vendor/Dashboard";
import VendorSettings from "./pages/vendor/Settings";

function App() {
    const { appLoading } = useContext(AuthContext);

    if (appLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white/60">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-[#8B4513] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-password" element={<VerifyPasswordPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/profile" element={<ProfilePage />} />

                {/* Customer Layout - with Header & Footer */}
                <Route element={<CustomerLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/product/:id" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/order-success/:id" element={<OrderSuccessPage />} />
                    <Route path="/orders" element={<OrderHistoryPage />} />
                    <Route path="/orders/:id" element={<OrderDetailPage />} />
                    <Route path="/category/:categoryId" element={<ProductByCategoryPage />} />
                    <Route path="/best-sellers" element={<BestSellersPage />} />
                </Route>

                {/* Vendor – shop registration (standalone, no sidebar) */}
                <Route path="/vendor/register" element={<VendorRegister />} />

                {/* Vendor – portal (sidebar + topbar layout) */}
                <Route path="/vendor" element={<VendorLayout />}>
                    <Route index element={<Navigate to="/vendor/dashboard" replace />} />
                    <Route path="dashboard" element={<VendorDashboard />} />
                    <Route path="settings" element={<VendorSettings />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={
                    <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                            <h1 className="text-6xl font-bold text-gray-300">404</h1>
                            <p className="text-gray-500 mt-2">Trang không tìm thấy</p>
                            <a href="/" className="text-[#8B4513] hover:underline mt-4 inline-block">Về trang chủ</a>
                        </div>
                    </div>
                } />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
