import React, { useState, useContext, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContext";
import { Outlet } from "react-router-dom"

const UserLayout = ({ children }) => {
    const { auth, logout } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = auth;
    const [expandedMenu, setExpandedMenu] = useState(null);

    // Chặn vendor/admin truy cập trang user — redirect về dashboard phù hợp
    useEffect(() => {
        if (user?.role === 'vendor') {
            navigate('/vendor/dashboard', { replace: true });
        } else if (user?.role === 'admin') {
            navigate('/admin', { replace: true });
        }
    }, [user?.role, navigate]);

    const handleLogout = () => {
        if (confirm("Bạn có chắc muốn đăng xuất?")) {
            logout();
            window.location.href = "/login";
        }
    };

    const isAccountPath = (path) => {
        return ["/profile", "/change-password", "/addresses"].includes(path);
    };

    // Menu chỉ hiển thị cho customer
    const menuItems = [
        {
            id: "account",
            label: "Tài khoản của tôi",
            icon: UserIcon,
            children: [
                { path: "/profile", label: "Thông tin cá nhân", icon: InfoIcon },
                { path: "/addresses", label: "Địa chỉ", icon: AddressIcon },
                { path: "/profile#wallet", label: "Ví thanh toán", icon: WalletIcon },
                { path: "/change-password", label: "Đổi mật khẩu", icon: LockIcon },
            ]
        },
        { path: "/orders", label: "Đơn hàng của tôi", icon: OrderIcon },
        { path: "/coupons", label: "Kho Voucher", icon: VoucherIcon },
        { path: "/my-reviews", label: "Đánh giá của tôi", icon: StarIcon },
        { path: "/wishlist", label: "Yêu thích", icon: HeartIcon },
    ];

    const isActive = (path) => {
        return location.pathname === path;
    };

    const toggleMenu = (id) => {
        setExpandedMenu(expandedMenu === id ? null : id);
    };

    const handleMenuClick = (item) => {
        if (item.children) {
            // If has children, toggle expand and go to first child
            toggleMenu(item.id);
            if (expandedMenu !== item.id) {
                navigate(item.children[0].path);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF7F4] py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Left Sidebar */}
                    <div className="lg:col-span-1">
                        {/* User Info Card */}
                        <div className="bg-white rounded-2xl border border-[#EDE8E0] p-6 mb-4">
                            <div className="flex flex-col items-center text-center">
                                <div className="relative mb-3">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#B86B05] to-[#95520B] flex items-center justify-center text-white text-2xl font-bold shadow-md">
                                        {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                                    </div>
                                </div>
                                <h2 className="text-base font-semibold text-[#1C1108]">Xin chào,</h2>
                                <p className="text-lg font-bold text-[#1C1108]">{user?.fullName || "Người dùng"}</p>
                            </div>
                        </div>

                        {/* Navigation Menu */}
                        <div className="bg-white rounded-2xl border border-[#EDE8E0] overflow-hidden">
                            <nav className="divide-y divide-[#EDE8E0]">
                                {/* Account Menu with Submenu */}
                                <div>
                                    <button
                                        onClick={() => handleMenuClick(menuItems[0])}
                                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
                                            isAccountPath(location.pathname)
                                                ? "bg-[#B86B05]/10 text-[#B86B05]"
                                                : "text-[#6B5C4C] hover:bg-[#FAF7F4]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <UserIcon active={isAccountPath(location.pathname)} />
                                            <span className={`text-sm font-medium ${
                                                isAccountPath(location.pathname) ? "text-[#B86B05]" : "text-[#1C1108]"
                                            }`}>
                                                {menuItems[0].label}
                                            </span>
                                        </div>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className={`h-4 w-4 transition-transform ${expandedMenu === menuItems[0].id ? "rotate-180" : ""}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Submenu Items */}
                                    {expandedMenu === menuItems[0].id && (
                                        <div className="bg-[#FAF7F4]">
                                            {menuItems[0].children.map((child) => (
                                                <Link
                                                    key={child.path}
                                                    to={child.path}
                                                    className={`flex items-center gap-3 pl-10 pr-4 py-2.5 text-sm transition-colors ${
                                                        isActive(child.path)
                                                            ? "text-[#B86B05] font-semibold bg-white"
                                                            : "text-[#6B5C4C] hover:text-[#B86B05]"
                                                    }`}
                                                >
                                                    <child.icon active={isActive(child.path)} />
                                                    {child.label}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Other Menu Items */}
                                {menuItems.slice(1).map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                                            isActive(item.path)
                                                ? "bg-[#B86B05]/10 text-[#B86B05]"
                                                : "text-[#6B5C4C] hover:bg-[#FAF7F4]"
                                        }`}
                                    >
                                        <item.icon active={isActive(item.path)} />
                                        <span className={`text-sm font-medium ${
                                            isActive(item.path) ? "text-[#B86B05]" : "text-[#1C1108]"
                                        }`}>
                                            {item.label}
                                        </span>
                                    </Link>
                                ))}

                                {/* Logout Button */}
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-[#BF4343] hover:bg-red-50 transition-colors"
                                >
                                    <LogoutIcon />
                                    <span className="text-sm font-medium">Đăng xuất</span>
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="lg:col-span-3">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Icons
const UserIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${active ? "text-[#B86B05]" : "text-[#A8896A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const InfoIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${active ? "text-[#B86B05]" : "text-[#A8896A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const AddressIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${active ? "text-[#B86B05]" : "text-[#A8896A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const LockIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${active ? "text-[#B86B05]" : "text-[#A8896A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const OrderIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${active ? "text-[#B86B05]" : "text-[#A8896A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
);

const VoucherIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${active ? "text-[#B86B05]" : "text-[#A8896A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
);

const StarIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${active ? "text-[#B86B05]" : "text-[#A8896A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
);

const HeartIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${active ? "text-[#B86B05]" : "text-[#A8896A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
);

const WalletIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${active ? "text-[#B86B05]" : "text-[#A8896A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
);

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#BF4343]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

export default UserLayout;
