import { Navigate } from "react-router-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CustomerLayout from "./components/layout/CustomerLayout";
import UserLayout from "./components/layout/UserLayout";
import VendorLayout from "./components/vendor/VendorLayout";
import VendorGuard from './components/vendor/VendorGuard';
import AdminLayout from "./components/layout/admin";
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
import ShopPage from "./pages/user/shop";
import LoginPage from "./pages/auth/login";
import RegisterPage from "./pages/auth/register";
import VerifyPasswordPage from "./pages/auth/verify-password";
import ForgotPasswordPage from "./pages/auth/forgot-password";
import ResetPasswordPage from "./pages/auth/reset-password";
import ProfilePage from "./pages/user/profile";
import WishlistPage from "./components/common/WishlistPage";
import MyReviewsPage from "./pages/user/myReviews";
import CouponList from "./components/common/CouponList";
import RecentlyViewedPage from "./components/common/RecentlyViewedPage";
import PayOSReturnPage from "./pages/user/payosReturn";
import ChangePasswordPage from "./pages/user/changePassword";
import AddressesPage from "./pages/user/addresses";
import BlogPage from "./pages/user/Blog";

//admin
import AdminCustomersPage from "./pages/admin/Customers";
import AdminCategoriesPage from "./pages/admin/Categories";
import AdminShops from "./pages/admin/Shops";
import AdminShopDetail from "./pages/admin/ShopDetail";
import AdminPromotions from './pages/admin/Promotions';
import AdminCommission from './pages/admin/Commission';
import AdminNotifications from "./pages/admin/Notifications";
import AdminRevenue from "./pages/admin/Revenue";
import AdminShippingRates from "./pages/admin/ShippingRates";
import AdminPlatformSettings from "./pages/admin/PlatformSettings";

// Vendor pages
import VendorRegister from "./pages/vendor/Register";
import VendorDashboard from "./pages/vendor/Dashboard";
import VendorSettings from "./pages/vendor/Settings";
import VendorProducts from "./pages/vendor/Products";
import VendorOrders from "./pages/vendor/Orders";
import VendorPromotions from "./pages/vendor/Promotions";
import VendorWallet from "./pages/vendor/Wallet";
import VendorReports from "./pages/vendor/Reports";
import VendorReviews from "./pages/vendor/Reviews";
import VendorNotifications from "./pages/vendor/Notifications";
import VendorBlog from "./pages/vendor/Blog";
import SuspendedPage from './pages/vendor/SuspendedPage';

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
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Vendor – shop registration (standalone, no sidebar) */}
                <Route path="/vendor/register" element={<VendorRegister />} />

                {/* Customer Layout - with Header & Footer */}
                <Route element={<CustomerLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/blog/:idOrSlug" element={<BlogPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/best-sellers" element={<BestSellersPage />} />
                    <Route path="/product/:slug" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/order-success/:id" element={<OrderSuccessPage />} />
                    <Route path="/payment/payos/return" element={<PayOSReturnPage />} />
                    <Route path="/category/:slug" element={<ProductByCategoryPage />} />
                    <Route path="/shop/:id" element={<ShopPage />} />
                </Route>

                {/* User Layout - with Sidebar + Header & Footer */}
                <Route element={<CustomerLayout />}>
                    <Route element={<UserLayout />}>
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/orders" element={<OrderHistoryPage />} />
                        <Route path="/orders/:id" element={<OrderDetailPage />} />
                        <Route path="/wishlist" element={<WishlistPage />} />
                        <Route path="/my-reviews" element={<MyReviewsPage />} />
                        <Route path="/coupons" element={<CouponList />} />
                        <Route path="/recently-viewed" element={<RecentlyViewedPage />} />
                        <Route path="/change-password" element={<ChangePasswordPage />} />
                        <Route path="/addresses" element={<AddressesPage />} />
                    </Route>
                </Route>

                <Route path="/vendor/suspended" element={<SuspendedPage />} />
                <Route path="/vendor" element={<VendorGuard />}>
                    <Route element={<VendorLayout />}>
                        <Route index element={<Navigate to="/vendor/dashboard" replace />} />
                        <Route path="dashboard" element={<VendorDashboard />} />
                        <Route path="products" element={<VendorProducts />} />
                        <Route path="orders" element={<VendorOrders />} />
                        <Route path="promotions" element={<VendorPromotions />} />
                        <Route path="wallet" element={<VendorWallet />} />
                        <Route path="reports" element={<VendorReports />} />
                        <Route path="blog" element={<VendorBlog />} />
                        <Route path="reviews" element={<VendorReviews />} />
                        <Route path="notifications" element={<VendorNotifications />} />
                        <Route path="settings" element={<VendorSettings />} />
                    </Route>
                </Route>

                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/revenue" replace />} />
                    
                    {/* Các route con tự động nhận layout bên trên */}
                    <Route path="revenue" element={<AdminRevenue />} />
                    <Route path="customers" element={<AdminCustomersPage />} />
                    <Route path="shops" element={<AdminShops />} />
                    <Route path="shops/:id" element={<AdminShopDetail />} />
                    <Route path="categories" element={<AdminCategoriesPage />} />
                    <Route path="promotions" element={<AdminPromotions />} />
                    <Route path="commissions" element={<AdminCommission />} />
                    <Route path="shipping-rates" element={<AdminShippingRates />} />
                    <Route path="settings" element={<AdminPlatformSettings />} />
                    <Route path="notifications" element={<AdminNotifications />} />
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
