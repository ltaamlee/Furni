import React, { useState, useEffect, useContext } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getAdminUnreadNotifCountApi } from "../../utils/api";
import { AuthContext } from "../context/authContext"; 

const AdminLayout = () => {
    const { pathname } = useLocation();
    const navigate = useNavigate(); 
    const { logout } = useContext(AuthContext); 

    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const res = await getAdminUnreadNotifCountApi();
                if (res && res.success) {
                    setUnreadCount(res.data.count);
                }
            } catch (error) {
                console.error("Lỗi tải số lượng thông báo Admin:", error);
            }
        };
        fetchUnreadCount();
    }, [pathname]);

    // Tự động hiển thị Tiêu đề trên Header dựa vào đường dẫn URL hiện tại
    const getPageTitle = () => {
        if (pathname.startsWith("/admin/shops/") && pathname !== "/admin/shops") {
            return "Chi Tiết Cửa Hàng";
        }
        switch (pathname) {
            case "/admin/revenue": return "Báo Cáo Doanh Thu";
            case "/admin/customers": return "Quản Lý User";
            case "/admin/shops": return "Quản Lý Cửa Hàng";
            case "/admin/orders": return "Quản Lý Đơn Hàng";
            case "/admin/categories": return "Quản Lý Danh Mục";
            case "/admin/promotions": return "Quản Lý Khuyến Mãi";
            case "/admin/commissions": return "Quản Lý Chiết Khấu";
            case "/admin/shipping-rates": return "Quản lý vận chuyển";
            case "/admin/settings": return "Cấu Hình Sàn";
            case "/admin/notifications": return "Thông Báo Hệ Thống";
            default: return "Admin Control";
        }
    };

    // Hàm xử lý đăng xuất an toàn
    const handleLogout = () => {
        logout(); 
        navigate('/login'); 
    };

    const sidebarItems = [
        {
            path: "/admin/revenue",
            label: "Doanh Thu",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            )
        },
        {
            path: "/admin/customers",
            label: "Quản Lý User",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        },
        {
            path: "/admin/shops",
            label: "Quản Lý Cửa Hàng",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            )
        },
        {
            path: "/admin/orders",
            label: "Quản Lý Đơn Hàng",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
            )
        },
        {
            path: "/admin/categories",
            label: "Quản Lý Danh Mục",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
            )
        },
        {
            path: "/admin/promotions",
            label: "Quản Lý Khuyến Mãi",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 8h.01M8 16h.01M16 16h.01M9 11h.01M15 11h.01" />
                </svg>
            )
        },
        {
            path: "/admin/commissions",
            label: "Quản Lý Chiết Khấu",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 11h.01M15 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            path: "/admin/shipping-rates",
            label: "Quản lý vận chuyển",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            path: "/admin/settings",
            label: "Cấu Hình Sàn",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        },
        {
            path: "/admin/notifications",
            label: "Thông báo",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            )
        }
    ];

    return (
        <div className="min-h-screen flex bg-[#f7f4f1] font-sans w-full">
            {/* ASIDE SIDEBAR  */}
            <aside className="w-[250px] bg-[#2a160b] text-white flex flex-col fixed h-screen left-0 top-0 z-[100] border-none select-none">
                {/* Sidebar Brand */}
                <div className="p-[15px_20px] text-center border-b border-white/10">
                    <h2 className="m-0 text-[22px] text-[#f8e5c8] tracking-[1px] font-serif font-bold">Sora</h2>
                    <p className="m-0 mt-[2px] text-[10px] uppercase text-[#aaaaaa] tracking-[1.5px] font-semibold">Admin Control</p>
                </div>
                
                {/* Sidebar Menu Navigation*/}
                <ul className="list-none p-0 m-0 py-[10px] flex-1 overflow-y-hidden hover:overflow-y-auto space-y-[2px] scrollbar-hide">
                    {sidebarItems.map((item, idx) => (
                        <li key={idx}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center justify-between px-[20px] py-[10px] text-[13px] font-medium transition-all duration-300 no-underline ${
                                        isActive
                                            ? "bg-[#853D12] text-white border-l-4 border-[#f8e5c8]"
                                            : "text-[#d4c5b9] hover:bg-[#3d2111] hover:text-white"
                                    }`
                                }
                            >
                                <div className="flex items-center">
                                    <span className="text-[18px] mr-[10px] w-[20px] text-center flex items-center justify-center">
                                        {item.icon}
                                    </span>
                                    {item.label}
                                </div>

                                {/* HIỂN THỊ CỤC BADGE ĐỎ CHỈ Ở TAB THÔNG BÁO */}
                                {item.path === "/admin/notifications" && unreadCount > 0 && (
                                    <span className="bg-[#d93025] text-white text-[10px] font-bold h-[18px] min-w-[18px] px-[5px] flex items-center justify-center rounded-[9px] shadow-sm">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </NavLink>
                        </li>
                    ))}
                </ul>

                {/* Sidebar Footer Logout */}
                <div className="py-[10px] border-t border-white/10">
                    <button 
                        onClick={handleLogout}
                        className="w-full text-left bg-transparent border-none cursor-pointer flex items-center px-[20px] py-[10px] text-[#d4c5b9] hover:bg-[#3d2111] hover:text-[#fca5a5] text-[13px] font-medium transition-all no-underline outline-none"
                    >
                        <span className="text-[18px] mr-[10px] w-[20px] text-center flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </span>
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT CONTAINER */}
            <main className="flex-1 ml-[260px] flex flex-col min-h-screen">
                {/* Topbar Header */}
                <header className="bg-white h-[70px] px-[30px] flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.05)] z-10 sticky top-0">
                    <h1 className="m-0 text-[20px] font-semibold text-[#853D12]">{getPageTitle()}</h1>
                    <div className="flex items-center gap-[10px] text-[14px] font-medium text-[#333333]">
                        <span>Xin chào, <b className="font-semibold text-[#333333]">Admin</b></span>
                        <img 
                            src="https://ui-avatars.com/api/?name=Admin&background=853D12&color=fff" 
                            alt="Admin Avatar"
                            className="w-[35px] h-[35px] rounded-full object-cover border-2 border-[#e2d8d0]"
                        />
                    </div>
                </header>

                {/* Content Render Area inside Content-Wrapper */}
                <div className="p-[30px] flex-1 w-full box-border">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;