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

/* ============================================================
   Wallet (4.7)
   ============================================================ */
export const wallet = {
    available: 45320000,
    updatedAt: "08/06/2026 14:32",
    pending: 8640000,
    pendingNote: "Từ 12 đơn hoàn thành trong 7 ngày qua",
    payoutNote: "Giải ngân vào thứ 2 hàng tuần",
    stats: [
        { label: "Thu tháng này", value: "+89.200.000₫", tone: "text-[#16a34a]" },
        { label: "Đã rút tháng này", value: "−50.000.000₫", tone: "text-[#dc2626]" },
        { label: "Phí sàn (2%)", value: "−1.784.000₫", tone: "text-[#6B5C4C]" },
    ],
};

export const transactions = [
    { date: "08/06/2026", time: "14:32", desc: "Đơn #DH240608-001 hoàn thành", sub: "Giao dịch vào ví", amount: "+14.014.000₫", type: "in", status: { label: "Thành công", tone: "green" } },
    { date: "07/06/2026", time: "10:15", desc: "Rút tiền về VCB ****2345", sub: "Yêu cầu rút tiền", amount: "−20.000.000₫", type: "out", status: { label: "Thành công", tone: "green" } },
    { date: "06/06/2026", time: "16:20", desc: "Đơn #DH240606-015 hoàn thành", sub: "Giao dịch vào ví", amount: "+6.272.000₫", type: "in", status: { label: "Thành công", tone: "green" } },
    { date: "05/06/2026", time: "09:00", desc: "Phí sàn tháng 5/2026", sub: "Phí dịch vụ 2%", amount: "−1.784.000₫", type: "out", status: { label: "Thành công", tone: "green" } },
    { date: "04/06/2026", time: "11:45", desc: "Đơn #DH240604-009 hoàn thành", sub: "Giao dịch vào ví", amount: "+4.410.000₫", type: "in", status: { label: "Thành công", tone: "green" } },
    { date: "03/06/2026", time: "08:30", desc: "Rút tiền về VCB ****2345", sub: "Yêu cầu rút tiền", amount: "−30.000.000₫", type: "out", status: { label: "Đang xử lý", tone: "yellow" } },
];

export const withdrawAccounts = [
    { code: "VCB", name: "Vietcombank", detail: "STK: ****2345 · Nguyễn Đức Tâm" },
    { code: "TCB", name: "Techcombank", detail: "STK: ****8901 · Nguyễn Đức Tâm" },
];

export const withdrawQuickAmounts = [
    { label: "5 triệu", value: "5.000.000" },
    { label: "10 triệu", value: "10.000.000" },
    { label: "20 triệu", value: "20.000.000" },
    { label: "Tất cả", value: "45.320.000" },
];

export const withdrawHistory = [
    { date: "03/06/2026", amount: "30.000.000₫", account: "VCB ****2345", status: { label: "Đang xử lý", tone: "yellow" } },
    { date: "27/05/2026", amount: "20.000.000₫", account: "VCB ****2345", status: { label: "Thành công", tone: "green" } },
    { date: "15/05/2026", amount: "15.000.000₫", account: "TCB ****8901", status: { label: "Thành công", tone: "green" } },
];

/* ============================================================
   Reports (4.8)
   ============================================================ */
export const reportPeriods = ["Hôm nay", "7 ngày", "Tháng này", "Quý này", "Tuỳ chọn"];

export const reportKpis = [
    { label: "Tổng doanh thu", value: "89.200.000₫", accent: true, change: "+23% tháng trước", trend: "up" },
    { label: "Số đơn hàng", value: "142", change: "+17 đơn", trend: "up" },
    { label: "Giá trị TB / đơn", value: "628.169₫", change: "+5%", trend: "up" },
    { label: "Tỉ lệ hoàn hàng", value: "1.8%", change: "+0.3% tháng trước", trend: "down" },
];

export const reportRevenue = {
    labels: ["01/06", "02/06", "03/06", "04/06", "05/06", "06/06", "07/06", "08/06"],
    data: [9800000, 11200000, 14600000, 8500000, 13100000, 16800000, 14300000, 12450000],
};

export const categoryShares = [
    { label: "Sofa", value: 32, color: "#B86B05" },
    { label: "Bàn", value: 21, color: "#95520B" },
    { label: "Tủ kệ", value: 16, color: "#DE9601" },
    { label: "Ghế", value: 14, color: "#FBC309" },
    { label: "Giường", value: 11, color: "#7B440C" },
    { label: "Khác", value: 6, color: "#C4A882" },
];

export const reportTopProducts = [
    { rank: 1, name: "Sofa Góc Chữ L Nordic", cat: "Sofa", sold: 24, revenue: 28800000, share: 32 },
    { rank: 2, name: "Bàn Làm Việc Gỗ Sồi Simple", cat: "Bàn", sold: 31, revenue: 18600000, share: 21 },
    { rank: 3, name: "Tủ Quần Áo 4 Cánh Gương", cat: "Tủ kệ", sold: 18, revenue: 14400000, share: 16 },
    { rank: 4, name: "Ghế Ăn Gỗ Sồi Nordic Set 4", cat: "Ghế", sold: 42, revenue: 12600000, share: 14 },
    { rank: 5, name: "Kệ Sách Đứng Industrial 5T", cat: "Tủ kệ", sold: 15, revenue: 9750000, share: 11 },
];

/* ============================================================
   Reviews (4.9)
   ============================================================ */
export const reviewSummary = {
    avg: 4.7,
    total: 256,
    distribution: [
        { star: 5, pct: 74 },
        { star: 4, pct: 16 },
        { star: 3, pct: 6 },
        { star: 2, pct: 3 },
        { star: 1, pct: 1 },
    ],
};

export const reviewStats = [
    { label: "Chưa phản hồi", value: 12, color: "text-[#dc2626]", sub: "cần xử lý" },
    { label: "Đã phản hồi", value: 244, color: "text-[#16a34a]", sub: "tỉ lệ 95.3%" },
    { label: "Đánh giá tháng này", value: 38, color: "text-[#B86B05]", sub: "+12 so tháng trước" },
    { label: "Vi phạm bị báo cáo", value: 2, color: "text-[#d97706]", sub: "đang xem xét" },
];

export const reviews = [
    { id: "r1", name: "Nguyễn Văn An", initial: "A", avatar: "from-[#B86B05] to-[#DE9601]", rating: 5, date: "05/06/2026", product: "Sofa Góc Chữ L Nordic · Màu nâu gỗ", content: "Sản phẩm rất đẹp, chất lượng vượt mong đợi. Giao hàng nhanh, đóng gói cẩn thận. Sofa rất chắc chắn và êm ái. Sẽ ủng hộ shop thêm!", reply: { date: "05/06/2026", text: "Cảm ơn anh An rất nhiều! Shop rất vui khi sản phẩm làm anh hài lòng. Anh cần hỗ trợ gì thêm cứ nhắn shop nhé!" } },
    { id: "r2", name: "Trần Thị Bích", initial: "T", avatar: "from-[#6366f1] to-[#8b5cf6]", rating: 3, date: "07/06/2026", product: "Bàn Làm Việc Gỗ Sồi Simple", content: "Bàn khá ổn, nhưng giao hàng hơi chậm so với dự kiến. Màu sắc đúng như ảnh. Tuy nhiên khi lắp ráp có 1 ốc vít bị thiếu, shop nên kiểm tra kỹ hơn trước khi giao.", reply: null, cardBorder: "border-[#DE9601]" },
    { id: "r3", name: "Lê Minh Cường", initial: "M", avatar: "from-[#0891b2] to-[#06b6d4]", rating: 5, date: "06/06/2026", product: "Tủ Quần Áo 4 Cánh Gương", content: "Tủ quần áo rất đẹp và chắc chắn. Thợ lắp đặt chuyên nghiệp, cẩn thận. Gương phản chiếu sắc nét. Rất hài lòng với chất lượng!", reply: { date: "06/06/2026", text: "Cảm ơn anh Cường! Shop rất vui vì anh hài lòng. Chúc anh sử dụng tốt chiếc tủ nhé!" } },
    { id: "r4", name: "Phạm Thị Thu", initial: "P", avatar: "from-[#dc2626] to-[#b91c1c]", rating: 1, date: "07/06/2026", product: "Ghế Ăn Gỗ Sồi Nordic Set 4", content: "Ghế giao về bị gãy chân, đóng gói sơ sài. Đã liên hệ shop nhưng chưa được giải quyết. Rất thất vọng.", reply: null, cardBorder: "border-[#fecaca]", alert: true },
];

/* ============================================================
   Notifications (4.10)
   ============================================================ */
export const notifTabs = [
    { key: "all", label: "Tất cả", count: 12 },
    { key: "order", label: "Đơn hàng" },
    { key: "review", label: "Đánh giá" },
    { key: "stock", label: "Tồn kho" },
    { key: "system", label: "Hệ thống" },
];

export const notifications = [
    { id: "n1", group: "Hôm nay", type: "order", title: "Đơn hàng mới #DH240608-001", body: "Nguyễn Văn An đặt Sofa Góc Chữ L Nordic · 14.300.000₫ · Cần xác nhận", time: "09:14 · Vừa xong", unread: true },
    { id: "n2", group: "Hôm nay", type: "review", title: "Đánh giá 1 sao cần phản hồi", body: "Phạm Thị Thu để lại đánh giá 1 sao cho Ghế Ăn Gỗ Sồi Nordic Set 4", time: "08:45 · 28 phút trước", unread: true },
    { id: "n3", group: "Hôm nay", type: "stock", title: "Cảnh báo tồn kho thấp", body: "Bàn Làm Việc Gỗ Sồi Simple chỉ còn 4 sản phẩm trong kho", time: "07:30 · 2 giờ trước", unread: true },
    { id: "n4", group: "Hôm qua", type: "wallet", title: "Giải ngân thành công", body: "20.000.000₫ đã được chuyển vào VCB ****2345", time: "10:15 · Hôm qua", unread: false },
    { id: "n5", group: "Hôm qua", type: "order", title: "Đơn #DH240607-032 đã giao thành công", body: "Trần Thị Bích đã nhận hàng · 6.500.000₫", time: "15:42 · Hôm qua", unread: false },
    { id: "n6", group: "Hôm qua", type: "system", title: "Cập nhật chính sách phí sàn", body: "Furni điều chỉnh phí dịch vụ từ 2% → 1.8% áp dụng từ 01/07/2026", time: "09:00 · Hôm qua", unread: false },
];

export const notifSettings = [
    { key: "newOrder", label: "Đơn hàng mới", sub: "Khi có đơn mới cần xác nhận", on: true },
    { key: "lateOrder", label: "Đơn hàng quá hạn xác nhận", sub: "Đơn chờ xác nhận quá 24h", on: true },
    { key: "newReview", label: "Đánh giá mới", sub: "Khi khách để lại đánh giá sản phẩm", on: true },
    { key: "lowStock", label: "Cảnh báo tồn kho thấp", sub: "Khi sản phẩm dưới ngưỡng tồn kho", on: true },
    { key: "payout", label: "Giải ngân ví điện tử", sub: "Khi tiền được giải ngân vào ví", on: true },
    { key: "system", label: "Thông báo hệ thống", sub: "Cập nhật chính sách, bảo trì sàn", on: false },
];

export const notif7d = [
    { label: "Đơn hàng", value: 38, color: "text-[#2563eb]" },
    { label: "Đánh giá", value: 12, color: "text-[#B86B05]" },
    { label: "Cảnh báo kho", value: 3, color: "text-[#dc2626]" },
    { label: "Hệ thống", value: 2, color: "text-[#16a34a]" },
];
