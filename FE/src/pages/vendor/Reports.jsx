import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, CardTitle, Badge } from "../../components/vendor/ui";
import LineChart from "../../components/vendor/LineChart";
import DonutChart from "../../components/vendor/DonutChart";
import { formatVND } from "../../components/vendor/data";
import { IconTrendUp, IconTrendDown } from "../../components/vendor/icons";
import { getVendorReportsApi } from "../../utils/api";

const PERIODS = [
    { key: "today", label: "Hôm nay" },
    { key: "7d", label: "7 ngày" },
    { key: "month", label: "Tháng này" },
    { key: "quarter", label: "Quý này" },
];

const KpiCard = ({ label, value, accent, change, trend }) => (
    <div className="bg-white border border-[#EDE8E0] rounded-[10px] px-[18px] py-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="text-[11.5px] text-[#6B5C4C] font-medium uppercase tracking-[0.04em] mb-1">{label}</div>
        <div className={`text-[22px] font-bold mb-1 ${accent ? "text-[#B86B05]" : "text-[#1C1108]"}`}>{value}</div>
        {change != null && change !== "" && (
            <span className={`inline-flex items-center gap-1 text-[11.5px] px-2 py-0.5 rounded-full font-semibold ${trend === "down" ? "bg-[#fee2e2] text-[#b91c1c]" : "bg-[#dcfce7] text-[#15803d]"}`}>
                {trend === "down" ? <IconTrendDown size={10} strokeWidth={2.5} /> : <IconTrendUp size={10} strokeWidth={2.5} />}
                {change}
            </span>
        )}
    </div>
);

const Reports = () => {
    const [period, setPeriod] = useState("month");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getVendorReportsApi({ period });
            if (res.success) setData(res.data);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        const t = setTimeout(fetchReports, 0);
        return () => clearTimeout(t);
    }, [fetchReports]);

    const kpis = data?.kpis || {};
    const revenue = data?.revenue || { labels: [], data: [] };
    const categoryShares = data?.categoryShares || [];
    const topProducts = data?.topProducts || [];

    const kpiCards = [
        { label: "Tổng doanh thu", value: formatVND(kpis.totalRevenue || 0), accent: true, change: `${(kpis.revenueChangePct || 0) >= 0 ? "+" : ""}${kpis.revenueChangePct || 0}%`, trend: (kpis.revenueChangePct || 0) < 0 ? "down" : "up" },
        { label: "Số đơn hàng", value: kpis.orderCount || 0 },
        { label: "Giá trị TB / đơn", value: formatVND(kpis.avgOrderValue || 0) },
        { label: "Tỉ lệ hủy đơn", value: `${kpis.returnRate || 0}%`, change: `${kpis.returnRate || 0}%`, trend: "down" },
    ];

    return (
        <div className="vendor-fade-in">
            <PageHeader title="Báo cáo doanh thu" sub="Thống kê hiệu quả kinh doanh của cửa hàng" />

            {/* Period selector */}
            <div className="flex gap-1 flex-wrap mb-5">
                {PERIODS.map((p) => (
                    <button key={p.key} onClick={() => setPeriod(p.key)}
                        className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border-[1.5px] transition-colors ${period === p.key ? "bg-[#95520B] text-white border-[#95520B]" : "bg-white text-[#6B5C4C] border-[#EDE8E0] hover:border-[#B86B05] hover:text-[#B86B05]"}`}>
                        {p.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-16 text-center text-[#9E8E7E] text-[13px]">Đang tải báo cáo...</div>
            ) : (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
                        {kpiCards.map((k) => <KpiCard key={k.label} {...k} />)}
                    </div>

                    {/* Revenue + category share */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-[18px]">
                        <Card>
                            <CardTitle>Doanh thu theo ngày</CardTitle>
                            {revenue.data.some((v) => v > 0) ? (
                                <LineChart labels={revenue.labels} data={revenue.data} height={240} />
                            ) : (
                                <div className="h-[240px] flex items-center justify-center text-[#9E8E7E] text-[13px]">Chưa có doanh thu trong kỳ</div>
                            )}
                        </Card>

                        <Card>
                            <CardTitle>Tỉ trọng theo danh mục</CardTitle>
                            {categoryShares.length > 0 ? (
                                <div className="flex items-center gap-5">
                                    <div className="shrink-0"><DonutChart data={categoryShares} size={170} /></div>
                                    <div className="flex-1">
                                        {categoryShares.map((c, i) => (
                                            <div key={c.label} className={`flex items-center justify-between py-[5px] text-[12.5px] ${i < categoryShares.length - 1 ? "border-b border-[#EDE8E0]" : ""}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                                                    {c.label}
                                                </div>
                                                <span className="font-bold">{c.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[170px] flex items-center justify-center text-[#9E8E7E] text-[13px]">Chưa có dữ liệu</div>
                            )}
                        </Card>
                    </div>

                    {/* Top products */}
                    <Card>
                        <CardTitle>Top sản phẩm bán chạy</CardTitle>
                        <div className="rounded-[10px] overflow-x-auto border border-[#EDE8E0]">
                            <table className="w-full border-collapse min-w-[640px]">
                                <thead>
                                    <tr>
                                        {["#", "Sản phẩm", "Danh mục", "Số lượng bán", "Doanh thu", "Tỉ trọng doanh thu"].map((h) => (
                                            <th key={h} className="bg-[#FAF7F4] px-3.5 py-2.5 text-left text-[11.5px] font-semibold text-[#6B5C4C] uppercase tracking-[0.04em] border-b border-[#EDE8E0] whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.length === 0 ? (
                                        <tr><td colSpan={6} className="px-3.5 py-8 text-center text-[#9E8E7E] text-[13px]">Chưa có dữ liệu bán hàng</td></tr>
                                    ) : topProducts.map((p) => (
                                        <tr key={p.rank} className="border-b border-[#EDE8E0] last:border-0 hover:bg-[#FDFAF7]">
                                            <td className="px-3.5 py-3 font-bold text-[#B86B05]">{p.rank}</td>
                                            <td className="px-3.5 py-3"><div className="font-semibold text-[13px]">{p.name}</div></td>
                                            <td className="px-3.5 py-3"><Badge tone="gray">{p.cat}</Badge></td>
                                            <td className="px-3.5 py-3 text-[13px]">{p.sold}</td>
                                            <td className="px-3.5 py-3 font-bold whitespace-nowrap">{formatVND(p.revenue)}</td>
                                            <td className="px-3.5 py-3 min-w-[140px]">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-[#EDE8E0] rounded-[3px] overflow-hidden">
                                                        <div className="h-full bg-[#B86B05] rounded-[3px]" style={{ width: `${p.share}%` }} />
                                                    </div>
                                                    <span className="text-[12px] text-[#6B5C4C] w-8">{p.share}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default Reports;
