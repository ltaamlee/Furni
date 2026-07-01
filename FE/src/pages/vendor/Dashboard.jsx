import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardTitle, StatCard, Badge, AlertStrip, Btn } from "../../components/vendor/ui";
import LineChart from "../../components/vendor/LineChart";
import { IconDollar, IconBag, IconBox, IconEye, IconTag, IconAlertTriangle, IconAlertCircle } from "../../components/vendor/icons";
import { formatVND } from "../../components/vendor/data";
import { getVendorDashboardApi } from "../../utils/api";

const RANK_STYLE = {
    1: "bg-[#FFD700] text-[#78350f]",
    2: "bg-[#C0C0C0] text-[#374151]",
    3: "bg-[#CD7F32] text-white",
};
const STATUS_META = {
    pending: { label: "Chờ xác nhận", tone: "yellow" },
    confirmed: { label: "Đã xác nhận", tone: "blue" },
    preparing: { label: "Đang chuẩn bị", tone: "orange" },
    shipping: { label: "Đang giao", tone: "blue" },
    delivered: { label: "Hoàn thành", tone: "green" },
    cancelled: { label: "Đã huỷ", tone: "red" },
    cancel_requested: { label: "Yêu cầu huỷ", tone: "yellow" },
};

const Dashboard = () => {
    const [period, setPeriod] = useState("7d");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        getVendorDashboardApi()
            .then((res) => { if (active && res.success) setData(res.data); })
            .catch(() => {})
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    if (loading || !data) {
        return <div className="vendor-fade-in py-16 text-center text-[#9E8E7E] text-[13px]">Đang tải bảng điều khiển...</div>;
    }

    const { stats, quickStats } = data;
    const series = period === "7d" ? data.revenue7d : data.revenue30d;

    const kpiCards = [
        { key: "revenue", label: "Doanh thu hôm nay", value: formatVND(stats.revenueToday), accent: true, color: "amber", icon: <IconDollar size={18} /> },
        { key: "orders", label: "Đơn hàng hôm nay", value: String(stats.ordersToday), color: "blue", icon: <IconBag size={18} /> },
        { key: "products", label: "Sản phẩm đang bán", value: String(stats.activeProducts), color: "green", icon: <IconBox size={18} /> },
        { key: "visits", label: "Lượt xem sản phẩm", value: stats.visits.toLocaleString("vi-VN"), color: "rose", icon: <IconEye size={18} /> },
        { key: "commission", label: "Chiết khấu shop", value: `${Number(data.shop?.commissionRate || 0).toLocaleString("vi-VN")}%`, color: "amber", icon: <IconTag size={18} /> },
    ].map(({ key, ...props }) => ({ ...props, statKey: key }));

    const quickRows = [
        { label: "Tỉ lệ hoàn thành đơn", value: `${quickStats.completionRate}%`, color: "text-[#16a34a]" },
        { label: "Đánh giá trung bình", value: `⭐ ${quickStats.avgRating} / 5`, color: "text-[#B86B05]" },
        { label: "Sản phẩm sắp hết hàng", value: `${quickStats.lowStock} SP`, color: "text-[#d97706]" },
        { label: "Số dư ví", value: formatVND(quickStats.walletBalance), color: "text-[#1C1108]" },
    ];

    return (
        <div className="vendor-fade-in">
            {/* Alerts */}
            <div className="space-y-2 mb-4">
                {stats.lowStock > 0 && (
                    <AlertStrip tone="warn" icon={<IconAlertTriangle size={15} className="shrink-0" />}>
                        <strong>{stats.lowStock} sản phẩm</strong> sắp hết tồn kho (dưới 5 sản phẩm) —{" "}
                        <Link to="/vendor/products?status=out_of_stock" className="font-bold underline">Xem ngay</Link>
                    </AlertStrip>
                )}
                {stats.pendingOrders > 0 && (
                    <AlertStrip tone="danger" icon={<IconAlertCircle size={15} className="shrink-0" />}>
                        <strong>{stats.pendingOrders} đơn hàng</strong> đang chờ xác nhận —{" "}
                        <Link to="/vendor/orders" className="font-bold underline">Xử lý ngay</Link>
                    </AlertStrip>
                )}
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-5">
                {kpiCards.map((s) => <StatCard key={s.statKey} {...s} />)}
            </div>

            {/* Charts + Top products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-[18px]">
                <Card>
                    <CardTitle>
                        Doanh thu
                        <div className="flex gap-1">
                            {[{ key: "7d", label: "7 ngày" }, { key: "30d", label: "30 ngày" }].map((p) => (
                                <button key={p.key} onClick={() => setPeriod(p.key)}
                                    className={`px-3 py-1 rounded-full text-[12px] font-semibold border-[1.5px] transition-colors ${period === p.key ? "bg-[#95520B] text-white border-[#95520B]" : "bg-white text-[#6B5C4C] border-[#EDE8E0]"}`}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </CardTitle>
                    <LineChart labels={series.labels} data={series.data} />
                </Card>

                <Card>
                    <CardTitle>Top 5 sản phẩm bán chạy</CardTitle>
                    <div>
                        {data.topProducts.length === 0 ? (
                            <div className="py-8 text-center text-[#9E8E7E] text-[13px]">Chưa có dữ liệu bán hàng</div>
                        ) : data.topProducts.map((p) => (
                            <div key={p.rank} className="flex items-center justify-between py-2.5 border-b border-[#EDE8E0] last:border-b-0 last:pb-0">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold ${RANK_STYLE[p.rank] || "bg-[#FAF7F4] text-[#6B5C4C] border border-[#EDE8E0]"}`}>{p.rank}</span>
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-semibold truncate">{p.name}</div>
                                        <div className="text-[11.5px] text-[#9E8E7E]">{p.cat} · {p.sold} đã bán</div>
                                    </div>
                                </div>
                                <div className="font-bold text-[#B86B05] text-[13px] whitespace-nowrap">{formatVND(p.revenue)}</div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Recent orders + Quick stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardTitle>
                        Đơn hàng gần đây
                        <Btn as="a" href="/vendor/orders" variant="ghost" size="sm" className="text-[#B86B05]">Xem tất cả →</Btn>
                    </CardTitle>
                    <div className="rounded-[10px] overflow-hidden border border-[#EDE8E0]">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    {["Mã đơn", "Khách hàng", "Tổng tiền", "Trạng thái"].map((h) => (
                                        <th key={h} className="bg-[#FAF7F4] px-3.5 py-2.5 text-left text-[11.5px] font-semibold text-[#6B5C4C] uppercase tracking-[0.04em] border-b border-[#EDE8E0] whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentOrders.length === 0 ? (
                                    <tr><td colSpan={4} className="px-3.5 py-8 text-center text-[#9E8E7E] text-[13px]">Chưa có đơn hàng</td></tr>
                                ) : data.recentOrders.map((o) => {
                                    const st = STATUS_META[o.status] || STATUS_META.pending;
                                    return (
                                        <tr key={o.orderNumber} className="border-b border-[#EDE8E0] last:border-0 hover:bg-[#FDFAF7]">
                                            <td className="px-3.5 py-3 text-[13px] font-semibold text-[#B86B05]">#{o.orderNumber}</td>
                                            <td className="px-3.5 py-3 text-[13px]">{o.customer}</td>
                                            <td className="px-3.5 py-3 text-[13px] whitespace-nowrap">{formatVND(o.total)}</td>
                                            <td className="px-3.5 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card>
                    <CardTitle>Thống kê nhanh</CardTitle>
                    <div>
                        {quickRows.map((q) => (
                            <div key={q.label} className="flex justify-between items-center py-2.5 border-b border-[#EDE8E0] last:border-b-0">
                                <span className="text-[13px] text-[#6B5C4C]">{q.label}</span>
                                <span className={`font-bold ${q.color}`}>{q.value}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
