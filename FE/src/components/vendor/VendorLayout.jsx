import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import "./vendor.css";
import { shop } from "./data";
import {
    IconGrid, IconBox, IconBag, IconTag, IconWallet, IconReport,
    IconStar, IconBell, IconGear, IconHome, IconChevronDown, IconX,
} from "./icons";

/* Sidebar navigation. `enabled: false` items are part of the vendor
   design but not built in this iteration (only Dashboard / Settings /
   Register are implemented), so they render inert to avoid dead 404s. */
const NAV = [
    {
        label: "Quản lý",
        items: [
            { to: "/vendor/dashboard", label: "Tổng quan", icon: IconGrid, enabled: true },
            { to: "/vendor/products", label: "Sản phẩm", icon: IconBox, enabled: true },
            { to: "/vendor/orders", label: "Đơn hàng", icon: IconBag, badge: 5, enabled: true },
            { to: "/vendor/promotions", label: "Khuyến mãi", icon: IconTag, enabled: true },
            { to: "/vendor/wallet", label: "Ví điện tử", icon: IconWallet, enabled: true },
            { to: "/vendor/reports", label: "Báo cáo", icon: IconReport, enabled: true },
        ],
    },
    {
        label: "Tương tác",
        items: [
            { to: "/vendor/reviews", label: "Đánh giá", icon: IconStar, enabled: true },
            { to: "/vendor/notifications", label: "Thông báo", icon: IconBell, badge: 3, enabled: true },
        ],
    },
    {
        label: "Cài đặt",
        items: [{ to: "/vendor/settings", label: "Cấu hình shop", icon: IconGear, enabled: true }],
    },
];

const BREADCRUMBS = {
    "/vendor/dashboard": ["Trang chủ", "Tổng quan"],
    "/vendor/products": ["Sản phẩm", "Danh sách"],
    "/vendor/orders": ["Quản lý", "Đơn hàng"],
    "/vendor/promotions": ["Marketing", "Khuyến mãi"],
    "/vendor/wallet": ["Tài chính", "Ví điện tử"],
    "/vendor/reports": ["Tài chính", "Báo cáo doanh thu"],
    "/vendor/reviews": ["Tương tác", "Đánh giá & bình luận"],
    "/vendor/notifications": ["Tương tác", "Thông báo"],
    "/vendor/settings": ["Shop", "Cấu hình"],
};

const NavRow = ({ item, onNavigate }) => {
    const Icon = item.icon;
    const inner = (
        <>
            <Icon size={16} className="opacity-75 shrink-0" />
            {item.label}
            {item.badge && (
                <span className="ml-auto bg-[#BF4343] text-white text-[10px] font-bold px-1.5 py-px rounded-full min-w-[18px] text-center">
                    {item.badge}
                </span>
            )}
            {!item.enabled && (
                <span className="ml-auto text-[9.5px] text-[#A8896A] border border-[#A8896A]/40 rounded px-1.5 py-px">
                    Sắp có
                </span>
            )}
        </>
    );

    if (!item.enabled) {
        return (
            <div
                title="Tính năng đang được phát triển"
                className="flex items-center gap-2.5 px-2.5 py-[8.5px] rounded-[6px] text-[13px] font-medium text-[#EDD9C0]/55 cursor-not-allowed select-none"
            >
                {inner}
            </div>
        );
    }

    return (
        <NavLink
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-[8.5px] rounded-[6px] text-[13px] font-medium transition-colors ${
                    isActive
                        ? "bg-[#95520B] text-white"
                        : "text-[#EDD9C0] hover:bg-[#4e2710] hover:text-white"
                }`
            }
        >
            {inner}
        </NavLink>
    );
};

const Sidebar = ({ open, onClose }) => (
    <>
        {/* Mobile backdrop */}
        {open && (
            <div className="fixed inset-0 bg-black/40 z-[99] lg:hidden" onClick={onClose} />
        )}

        <aside
            className={`w-[236px] bg-[#3a1d06] flex flex-col fixed left-0 top-0 bottom-0 overflow-y-auto z-[100] vendor-sidebar-scroll transition-transform duration-200 ${
                open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            }`}
        >
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-4 pt-[18px] pb-3.5 border-b border-white/[0.07]">
                <div className="w-[34px] h-[34px] bg-[#95520B] rounded-lg flex items-center justify-center font-extrabold text-[15px] text-white shrink-0">F</div>
                <div>
                    <div className="text-white font-bold text-[15px] leading-none">Furni</div>
                    <div className="text-[#A8896A] text-[10.5px]">Vendor Portal</div>
                </div>
                <button onClick={onClose} className="ml-auto text-[#EDD9C0] lg:hidden" aria-label="Đóng menu">
                    <IconX size={18} />
                </button>
            </div>

            {/* Shop */}
            <div className="px-3.5 py-3 border-b border-white/[0.07] flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#95520B] rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {shop.initial}
                </div>
                <div className="min-w-0">
                    <div className="text-white font-semibold text-[12.5px] truncate">{shop.name}</div>
                    <div className="flex items-center gap-1 text-[#A8896A] text-[11px] mt-0.5">
                        <span className="w-1.5 h-1.5 bg-[#4ade80] rounded-full" />
                        Đang hoạt động
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2.5 py-2">
                {NAV.map((section) => (
                    <div key={section.label}>
                        <p className="text-[#A8896A] text-[9.5px] font-semibold uppercase tracking-[0.08em] px-2 pt-2.5 pb-1">
                            {section.label}
                        </p>
                        <div className="space-y-0.5">
                            {section.items.map((item) => (
                                <NavRow key={item.label} item={item} onNavigate={onClose} />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-2.5 border-t border-white/[0.07]">
                <a
                    href="/"
                    className="flex items-center gap-2.5 px-2.5 py-[8.5px] rounded-[6px] text-[13px] font-medium text-[#EDD9C0] hover:bg-[#4e2710] hover:text-white transition-colors"
                >
                    <IconHome size={16} className="opacity-75" />
                    Về trang chủ
                </a>
            </div>
        </aside>
    </>
);

const Topbar = ({ crumbs, onOpenSidebar }) => (
    <header className="bg-white border-b border-[#EDE8E0] px-4 sm:px-6 h-14 flex items-center gap-3.5 sticky top-0 z-50">
        {/* Mobile hamburger */}
        <button onClick={onOpenSidebar} className="lg:hidden text-[#6B5C4C]" aria-label="Mở menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
        </button>

        <div className="flex-1 text-[#6B5C4C] text-[13px]">
            {crumbs.map((c, i) => (
                <span key={i}>
                    {i > 0 && " / "}
                    {i === crumbs.length - 1 ? <strong className="text-[#1C1108] font-semibold">{c}</strong> : c}
                </span>
            ))}
        </div>

        <div className="flex items-center gap-2">
            <button
                className="w-[34px] h-[34px] border-[1.5px] border-[#EDE8E0] bg-white rounded-[6px] flex items-center justify-center text-[#6B5C4C] relative transition-colors hover:border-[#B86B05] hover:text-[#B86B05]"
                title="Thông báo"
            >
                <IconBell size={16} />
                <span className="absolute top-1 right-1 w-[7px] h-[7px] bg-[#BF4343] rounded-full border-[1.5px] border-white" />
            </button>
            <div className="flex items-center gap-2 px-2.5 py-[5px] border-[1.5px] border-[#EDE8E0] rounded-[6px] cursor-pointer transition-colors hover:border-[#B86B05]">
                <div className="w-6 h-6 bg-[#B86B05] rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                    {shop.ownerInitials}
                </div>
                <span className="text-[13px] font-medium text-[#1C1108] hidden sm:inline">{shop.owner}</span>
                <IconChevronDown size={12} strokeWidth={2.5} className="text-[#6B5C4C]" />
            </div>
        </div>
    </header>
);

const VendorLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { pathname } = useLocation();
    const crumbs = BREADCRUMBS[pathname] || ["Vendor"];

    return (
        <div className="vendor-shell flex min-h-screen bg-[#FAF7F4]">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-h-screen lg:ml-[236px]">
                <Topbar crumbs={crumbs} onOpenSidebar={() => setSidebarOpen(true)} />
                <main className="flex-1 p-[22px_16px] sm:p-[22px_24px]">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default VendorLayout;
