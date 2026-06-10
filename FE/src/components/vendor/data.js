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

/* ============================================================
   Products (4.4)
   ============================================================ */
export const productTabs = [
    { key: "all", label: "Tất cả", count: 156 },
    { key: "active", label: "Đang bán", count: 138 },
    { key: "hidden", label: "Ẩn", count: 10 },
    { key: "oos", label: "Hết hàng", count: 5 },
    { key: "draft", label: "Nháp", count: 3 },
];

/** stock.current / stock.total drives the bar; color derived in the page */
export const products = [
    { id: "p1", name: "Sofa Góc Chữ L Nordic", slug: "sofa-goc-chu-l-nordic", category: "Sofa", price: 12800000, stock: { current: 18, total: 30 }, sold: 124, status: { label: "Đang bán", tone: "green" }, thumb: "#e8e4de", hideAction: "Ẩn" },
    { id: "p2", name: "Bàn Làm Việc Gỗ Sồi Simple", slug: "ban-lam-viec-go-soi-simple", category: "Bàn", price: 6500000, stock: { current: 4, total: 25 }, sold: 87, status: { label: "Sắp hết", tone: "yellow" }, thumb: "#dde4ea", hideAction: "Ẩn" },
    { id: "p3", name: "Tủ Quần Áo 4 Cánh Gương", slug: "tu-quan-ao-4-canh-guong", category: "Tủ kệ", price: 8900000, stock: { current: 22, total: 20 }, sold: 56, status: { label: "Đang bán", tone: "green" }, thumb: "#ede4d8", hideAction: "Ẩn" },
    { id: "p4", name: "Ghế Ăn Gỗ Sồi Nordic Set 4", slug: "ghe-an-go-soi-nordic-set-4", category: "Ghế", price: 3200000, stock: { current: 0, total: 15 }, sold: 203, status: { label: "Hết hàng", tone: "red" }, thumb: "#e4dce8", hideAction: "Hiện" },
    { id: "p5", name: "Kệ Sách Đứng Industrial 5 Tầng", slug: "ke-sach-dung-industrial-5-tang", category: "Tủ kệ", price: 2450000, stock: { current: 31, total: 40 }, sold: 45, status: { label: "Ẩn", tone: "gray" }, thumb: "#dce8e0", hideAction: "Hiện" },
    { id: "p6", name: "Giường Ngủ Gỗ Tự Nhiên King", slug: "giuong-ngu-go-tu-nhien-king", category: "Giường", price: 15900000, stock: { current: 7, total: 10 }, sold: 29, status: { label: "Nháp", tone: "purple" }, thumb: "#e8e0d4", hideAction: "Ẩn" },
];

export const productCategories = ["Sofa", "Bàn", "Ghế", "Tủ kệ", "Giường", "Gương"];
export const productStyles = ["Scandinavian", "Industrial", "Tân cổ điển", "Hiện đại", "Tối giản"];
export const productMaterials = ["Gỗ sồi", "Gỗ MDF", "Kim loại", "Vải", "Da"];

/* ============================================================
   Orders (4.5)
   ============================================================ */
export const orderTabs = [
    { key: "all", label: "Tất cả", count: 142 },
    { key: "pending", label: "Chờ xác nhận", count: 5, chipClassName: "bg-[#fef9c3] text-[#92400e] border-[#fde68a]" },
    { key: "processing", label: "Đang xử lý", count: 18 },
    { key: "shipping", label: "Đang giao", count: 24 },
    { key: "completed", label: "Hoàn thành", count: 89 },
    { key: "cancelled", label: "Huỷ", count: 4 },
    { key: "returned", label: "Hoàn trả", count: 2 },
];

export const orders = [
    { id: "DH240608-001", customer: { name: "Nguyễn Văn An", phone: "0912 345 678" }, product: "Sofa Góc Chữ L Nordic", qty: 1, extra: "+ 1 SP khác", total: 14300000, date: "08/06/2026", time: "09:14", payment: { label: "VNPay", tone: "blue" }, status: { label: "Chờ XN", tone: "yellow" }, action: "confirm" },
    { id: "DH240607-032", customer: { name: "Trần Thị Bích", phone: "0987 654 321" }, product: "Bàn Làm Việc Gỗ Sồi", qty: 1, total: 6500000, date: "07/06/2026", time: "15:42", payment: { label: "COD", tone: "gray" }, status: { label: "Đang giao", tone: "blue" }, action: "detail" },
    { id: "DH240607-028", customer: { name: "Lê Minh Cường", phone: "0934 111 222" }, product: "Tủ Quần Áo 4 Cánh", qty: 1, total: 8900000, date: "07/06/2026", time: "11:05", payment: { label: "Momo", tone: "purple" }, status: { label: "Đang xử lý", tone: "orange" }, action: "detail" },
    { id: "DH240606-015", customer: { name: "Phạm Thị Thu", phone: "0965 333 444" }, product: "Ghế Ăn Nordic Set 4", qty: 2, total: 6400000, date: "06/06/2026", time: "16:20", payment: { label: "Chuyển khoản", tone: "blue" }, status: { label: "Hoàn thành", tone: "green" }, action: "detail" },
    { id: "DH240605-009", customer: { name: "Hoàng Quốc Quân", phone: "0901 555 666" }, product: "Kệ Sách Industrial 5T", qty: 1, total: 2450000, date: "05/06/2026", time: "10:18", payment: { label: "COD", tone: "gray" }, status: { label: "Đã huỷ", tone: "red" }, action: "detail", noPrint: true },
];

/* Static rich sample shown in the order-detail drawer */
export const sampleOrderDetail = {
    customer: { name: "Nguyễn Văn An", phone: "0912 345 678", address: "123 Nguyễn Trãi, P. Nguyễn Cư Trinh, Q.1, TP.HCM", note: "Giao buổi sáng trước 10h" },
    items: [
        { name: "Sofa Góc Chữ L Nordic", variant: "Màu: Nâu gỗ tự nhiên · ×1", price: 12800000 },
        { name: "Đệm Sofa Nordic Extra", variant: "Xanh navy · ×1", price: 1500000 },
    ],
    shipping: { carrier: "GHN Express", trackingCode: "—", deliveryType: "Giao + Lắp đặt", eta: "10–11/06/2026" },
    finance: { subtotal: 14300000, shippingFee: 0, discount: 0, payment: { label: "VNPay", tone: "blue" }, total: 14300000 },
    timeline: [
        { label: "Đặt hàng", time: "08/06/2026 09:14", state: "done" },
        { label: "Chờ xác nhận", time: "Đang chờ vendor xử lý", state: "current" },
        { label: "Đóng gói", state: "todo" },
        { label: "Đang giao", state: "todo" },
        { label: "Hoàn thành", state: "todo" },
    ],
};

/* ============================================================
   Promotions (4.6)
   ============================================================ */
export const promoTabs = [
    { key: "all", label: "Tất cả", count: 8 },
    { key: "running", label: "Đang chạy", count: 4 },
    { key: "upcoming", label: "Sắp diễn ra", count: 2 },
    { key: "ended", label: "Đã kết thúc", count: 2 },
];

export const promotions = [
    { id: "pr1", name: "Flash Sale Sofa – Cuối tuần", type: { label: "Flash Sale", tone: "red" }, status: { label: "Đang chạy", tone: "green" }, highlight: "25%", highlightTone: "text-[#dc2626]", desc: "toàn bộ Sofa", period: "07/06 – 08/06/2026", usage: "Đã dùng: 38 / 100 lượt", progress: 38, actions: ["edit", "stop"] },
    { id: "pr2", name: "Coupon SUMMER20", type: { label: "Coupon", tone: "purple" }, status: { label: "Đang chạy", tone: "green" }, highlight: "20%", highlightTone: "text-[#B86B05]", desc: "đơn từ 3.000.000₫", period: "01/06 – 30/06/2026", usage: "Đã dùng: 156 / 500 lượt", progress: 31, actions: ["edit", "copy"] },
    { id: "pr3", name: "Combo Bàn + Ghế", type: { label: "Mua bộ", tone: "orange" }, status: { label: "Đang chạy", tone: "green" }, highlight: "500.000₫", highlightTone: "text-[#B86B05]", desc: "khi mua combo", period: "01/06 – 15/06/2026", usage: "Đã dùng: 24 / 50 lượt", progress: 48, actions: ["edit", "copy"] },
    { id: "pr4", name: "Freeship toàn quốc T6", type: { label: "Free ship", tone: "blue" }, status: { label: "Đang chạy", tone: "green" }, desc: "Miễn phí ship toàn quốc đơn từ 1.000.000₫", period: "01/06 – 30/06/2026", usage: "Không giới hạn lượt", actions: ["edit", "stop"] },
    { id: "pr5", name: "Flash Sale 12/12", type: { label: "Flash Sale", tone: "red" }, status: { label: "Đã kết thúc", tone: "gray" }, desc: "Giảm 30% toàn bộ sản phẩm", period: "12/12/2025 – 13/12/2025", usage: "Đã dùng: 200 / 200 lượt", ended: true, actions: ["report", "duplicate"] },
];

export const promoTypes = [
    { key: "flash", label: "Flash Sale", sub: "Giảm % trong thời gian giới hạn" },
    { key: "coupon", label: "Mã coupon", sub: "Mã giảm giá nhập khi thanh toán" },
    { key: "combo", label: "Mua bộ", sub: "Giảm khi mua combo sản phẩm" },
    { key: "freeship", label: "Free ship", sub: "Miễn phí vận chuyển" },
];
