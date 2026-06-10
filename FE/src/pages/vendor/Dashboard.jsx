import { useState } from "react";
import { Card, CardTitle, StatCard, Badge, AlertStrip, Btn } from "../../components/vendor/ui";
import LineChart from "../../components/vendor/LineChart";
import {
    IconDollar, IconBag, IconBox, IconEye, IconAlertTriangle, IconAlertCircle,
} from "../../components/vendor/icons";
import {
    dashboardStats, revenue7d, revenue30d, topProducts, recentOrders, quickStats, formatVND,
} from "../../components/vendor/data";

const STAT_ICONS = {
    revenue: <IconDollar size={18} />,
    orders: <IconBag size={18} />,
    products: <IconBox size={18} />,
    visits: <IconEye size={18} />,
};

const RANK_STYLE = {
    1: "bg-[#FFD700] text-[#78350f]",
    2: "bg-[#C0C0C0] text-[#374151]",
    3: "bg-[#CD7F32] text-white",
};

const Dashboard = () => {
    const [period, setPeriod] = useState("7d");
    const series = period === "7d" ? revenue7d : revenue30d;

    return (
        <div className="vendor-fade-in">
            {/* Alerts */}
            <div className="space-y-2 mb-4">
                <AlertStrip tone="warn" icon={<IconAlertTriangle size={15} className="shrink-0" />}>
                    <strong>3 sản phẩm</strong> sắp hết tồn kho (dưới 5 sản phẩm) —{" "}
                    <span className="font-bold underline cursor-pointer">Xem ngay</span>
                </AlertStrip>
                <AlertStrip tone="danger" icon={<IconAlertCircle size={15} className="shrink-0" />}>
                    <strong>5 đơn hàng</strong> đang chờ xác nhận quá 24h —{" "}
                    <span className="font-bold underline cursor-pointer">Xử lý ngay</span>
                </AlertStrip>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
                {dashboardStats.map((s) => (
                    <StatCard key={s.key} icon={STAT_ICONS[s.key]} {...s} />
                ))}
            </div>

            {/* Charts + Top products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-[18px]">
                <Card>
                    <CardTitle>
                        Doanh thu
                        <div className="flex gap-1">
                            {[
                                { key: "7d", label: "7 ngày" },
                                { key: "30d", label: "30 ngày" },
                            ].map((p) => (
                                <button
                                    key={p.key}
                                    onClick={() => setPeriod(p.key)}
                                    className={`px-3 py-1 rounded-full text-[12px] font-semibold border-[1.5px] transition-colors ${
                                        period === p.key
                                            ? "bg-[#95520B] text-white border-[#95520B]"
                                            : "bg-white text-[#6B5C4C] border-[#EDE8E0]"
                                    }`}
                                >
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
                        {topProducts.map((p) => (
                            <div
                                key={p.rank}
                                className="flex items-center justify-between py-2.5 border-b border-[#EDE8E0] last:border-b-0 last:pb-0"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                        className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold ${
                                            RANK_STYLE[p.rank] || "bg-[#FAF7F4] text-[#6B5C4C] border border-[#EDE8E0]"
                                        }`}
                                    >
                                        {p.rank}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-semibold truncate">{p.name}</div>
                                        <div className="text-[11.5px] text-[#9E8E7E]">{p.cat} · {p.sold} đã bán</div>
                                    </div>
                                </div>
                                <div className="font-bold text-[#B86B05] text-[13px] whitespace-nowrap">
                                    {formatVND(p.revenue)}
                                </div>
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
                        <Btn as="a" href="/vendor/orders" variant="ghost" size="sm" className="text-[#B86B05]">
                            Xem tất cả →
                        </Btn>
                    </CardTitle>
                    <div className="rounded-[10px] overflow-hidden border border-[#EDE8E0]">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    {["Mã đơn", "Khách hàng", "Tổng tiền", "Trạng thái"].map((h) => (
                                        <th
                                            key={h}
                                            className="bg-[#FAF7F4] px-3.5 py-2.5 text-left text-[11.5px] font-semibold text-[#6B5C4C] uppercase tracking-[0.04em] border-b border-[#EDE8E0] whitespace-nowrap"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((o) => (
                                    <tr key={o.code} className="border-b border-[#EDE8E0] last:border-0 hover:bg-[#FDFAF7]">
                                        <td className="px-3.5 py-3 text-[13px] font-semibold text-[#B86B05]">{o.code}</td>
                                        <td className="px-3.5 py-3 text-[13px]">{o.customer}</td>
                                        <td className="px-3.5 py-3 text-[13px] whitespace-nowrap">{formatVND(o.total)}</td>
                                        <td className="px-3.5 py-3">
                                            <Badge tone={o.tone}>{o.status}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card>
                    <CardTitle>Thống kê nhanh</CardTitle>
                    <div>
                        {quickStats.map((q) => (
                            <div
                                key={q.label}
                                className="flex justify-between items-center py-2.5 border-b border-[#EDE8E0] last:border-b-0"
                            >
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
