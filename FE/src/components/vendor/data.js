/* ============================================================
   Vendor Portal – formatting helpers + sample/mock data.
   Sample data mirrors the static HTML mockups so the screens
   render fully. Swap these for real API calls when the vendor
   endpoints exist (see BE/src/models: Shop, Product, Order...).
   ============================================================ */

/** Format a number as Vietnamese đồng, e.g. 12450000 -> "12.450.000₫" */
export const formatVND = (n) => `${Number(n || 0).toLocaleString("vi-VN")}₫`;

/** Compact đồng for chart axes, e.g. 12000000 -> "12M₫" */
export const formatVNDShort = (n) => `${Math.round(Number(n || 0) / 1_000_000)}M₫`;

/* ---- The (single) shop owned by the logged-in vendor ---- */
export const shop = {
    name: "Nội Thất Đức Tâm",
    initial: "N",
    owner: "Đức Tâm",
    ownerInitials: "NT",
    status: "active", // active | paused | closed
};

/* ---- Dashboard: KPI cards ---- */
export const dashboardStats = [
    { key: "revenue", label: "Doanh thu hôm nay", value: formatVND(12450000), accent: true, change: "+18% so hôm qua", trend: "up", color: "amber" },
    { key: "orders", label: "Đơn hàng mới", value: "24", change: "+5 so hôm qua", trend: "up", color: "blue" },
    { key: "products", label: "Sản phẩm đang bán", value: "138", change: "+3 tháng này", trend: "up", color: "green" },
    { key: "visits", label: "Lượt truy cập", value: "1.843", change: "-4% so hôm qua", trend: "down", color: "rose" },
];

/* ---- Dashboard: revenue series ---- */
export const revenue7d = {
    labels: ["02/06", "03/06", "04/06", "05/06", "06/06", "07/06", "08/06"],
    data: [8500000, 11200000, 9800000, 14600000, 10300000, 13100000, 12450000],
};

export const revenue30d = (() => {
    const labels = [];
    const data = [];
    const start = new Date("2026-05-10");
    for (let i = 0; i < 30; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        labels.push(`${d.getDate()}/0${d.getMonth() + 1}`);
        // deterministic pseudo-random so re-renders are stable
        data.push(Math.round((Math.sin(i * 1.7) * 0.5 + 0.5) * 9000000 + 5000000));
    }
    return { labels, data };
})();

/* ---- Dashboard: top 5 best-selling products ---- */
export const topProducts = [
    { rank: 1, name: "Sofa Góc Chữ L Nordic", cat: "Sofa", sold: 24, revenue: 28800000 },
    { rank: 2, name: "Bàn Làm Việc Gỗ Sồi", cat: "Bàn", sold: 31, revenue: 18600000 },
    { rank: 3, name: "Tủ Quần Áo 4 Cánh", cat: "Tủ", sold: 18, revenue: 14400000 },
    { rank: 4, name: "Ghế Ăn Gỗ Sồi Nordic", cat: "Ghế", sold: 42, revenue: 12600000 },
    { rank: 5, name: "Kệ Sách Đứng Industrial", cat: "Kệ", sold: 15, revenue: 9750000 },
];

/* ---- Dashboard: recent orders ---- */
export const recentOrders = [
    { code: "#DH240608", customer: "Nguyễn Văn A", total: 6500000, status: "Chờ XN", tone: "yellow" },
    { code: "#DH240607", customer: "Trần Thị B", total: 2800000, status: "Đang giao", tone: "blue" },
    { code: "#DH240606", customer: "Lê Minh C", total: 12000000, status: "Đang xử lý", tone: "orange" },
    { code: "#DH240605", customer: "Phạm Thu D", total: 850000, status: "Hoàn thành", tone: "green" },
    { code: "#DH240604", customer: "Hoàng Quân E", total: 4500000, status: "Hoàn thành", tone: "green" },
];

/* ---- Dashboard: quick stats list ---- */
export const quickStats = [
    { label: "Tỉ lệ hoàn thành đơn", value: "94.2%", color: "text-[#16a34a]" },
    { label: "Đánh giá trung bình", value: "⭐ 4.7 / 5", color: "text-[#B86B05]" },
    { label: "Tỉ lệ hoàn hàng", value: "1.8%", color: "text-[#dc2626]" },
    { label: "Sản phẩm sắp hết hàng", value: "3 SP", color: "text-[#d97706]" },
    { label: "Số dư ví", value: formatVND(45320000), color: "text-[#1C1108]" },
];

/* ---- Register / Settings: industry categories ---- */
export const industryCategories = [
    "Sofa", "Bàn", "Ghế", "Tủ kệ", "Giường", "Gương", "Phụ kiện", "Đèn",
];

/* ---- Settings: shipping carriers ---- */
export const carriers = [
    { code: "GHN", name: "Giao Hàng Nhanh", note: "Giao 2–3 ngày · Hỗ trợ COD", enabled: true },
    { code: "GHTK", name: "Giao Hàng Tiết Kiệm", note: "Giao 3–5 ngày · Hỗ trợ COD", enabled: true },
    { code: "VTP", name: "Viettel Post", note: "Giao 2–4 ngày · Hỗ trợ COD", enabled: false },
];
