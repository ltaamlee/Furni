import React from "react";

const AdminLayout = ({ title, pageTitle, activePage, children }) => {
    const sidebarItems = [
        {
            section: "Tổng quan",
            items: [
                {
                    key: "dashboard",
                    label: "Tổng quan",
                    href: "/admin",
                    icon: (
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    ),
                },
            ],
        },
        {
            section: "Người dùng",
            items: [
                {
                    key: "shops",
                    label: "cửa hàng",
                    href: "/admin/shops",
                    icon: (
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    ),
                },
                {
                    key: "customers",
                    label: "Khách hàng",
                    href: "/admin/customers",
                    icon: (
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ),
                },
            ],
        },
        {
            section: "Sản phẩm",
            items: [
                {
                    key: "categories",
                    label: "Danh mục",
                    href: "/admin/categories",
                    icon: (
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                    ),
                },
                {
                    key: "products",
                    label: "Sản phẩm",
                    href: "/admin/products",
                    icon: (
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    ),
                },
            ],
        },
        {
            section: "Đơn hàng",
            items: [
                {
                    key: "orders",
                    label: "Đơn hàng",
                    href: "/admin/orders",
                    icon: (
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    ),
                },
                {
                    key: "shipping",
                    label: "Vận chuyển",
                    href: "/admin/shipping",
                    icon: (
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2" />
                        </svg>
                    ),
                },
            ],
        },
        {
            section: "Cài đặt",
            items: [
                {
                    key: "config",
                    label: "Cấu hình website",
                    href: "/admin/config",
                    icon: (
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    ),
                },
                {
                    key: "profile",
                    label: "Hồ sơ cá nhân",
                    href: "/admin/profile",
                    icon: (
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    ),
                },
            ],
        },
    ];

    return (
        <div className="flex min-h-screen bg-[#FFFBF7]">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-[#eaddd7] fixed lg:static inset-y-0 left-0 z-50">
                {/* Logo */}
                <div className="h-16 flex items-center justify-center border-b border-[#eaddd7] bg-linear-to-r from-[#977669] to-[#a67c52]">
                    <a href="/admin" className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-[#977669]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>

                        <span className="text-xl font-bold text-white">
                            SORA
                        </span>
                    </a>
                </div>

                {/* Menu */}
                <nav className="px-4 py-6 space-y-4 overflow-y-auto">
                    {sidebarItems.map((section, idx) => (
                        <div key={idx}>
                            <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-[#bfa094]">
                                {section.section}
                            </p>

                            <div className="space-y-1">
                                {section.items.map((item) => (
                                    <a
                                        key={item.key}
                                        href={item.href}
                                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                                            activePage === item.key
                                                ? "bg-linear-to-r from-[#a67c52] to-[#977669] text-white shadow-lg"
                                                : "text-[#43302b] hover:bg-[#f5efe6]"
                                        }`}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User */}
                <div className="p-4 border-t border-[#eaddd7]">
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#bfa094] to-[#a67c52] flex items-center justify-center text-white font-semibold">
                            A
                        </div>

                        <div className="ml-3">
                            <p className="text-sm font-medium text-[#43302b]">
                                Admin
                            </p>

                            <p className="text-xs text-[#977669]">
                                admin@ntfurniture.com
                            </p>
                        </div>
                    </div>

                    <a
                        href="/logout"
                        className="mt-3 flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Đăng xuất
                    </a>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white border-b border-[#eaddd7] flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
                    <h1 className="text-xl font-semibold text-[#43302b]">
                        {pageTitle}
                    </h1>

                    <div className="relative hidden md:block">
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            className="w-64 pl-10 pr-4 py-2 border border-[#eaddd7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a67c52]"
                        />

                        <svg
                            className="w-5 h-5 text-[#bfa094] absolute left-3 top-2.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </header>

                {/* Content */}
                <div className="p-4 lg:p-8">{children}</div>
            </main>
        </div>
    );
};

export default AdminLayout;