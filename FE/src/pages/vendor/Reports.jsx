import { useState } from "react";
import { PageHeader, Card, CardTitle, Btn, Badge } from "../../components/vendor/ui";
import LineChart from "../../components/vendor/LineChart";
import DonutChart from "../../components/vendor/DonutChart";
import {
    reportPeriods, reportKpis, reportRevenue, categoryShares, reportTopProducts, formatVND,
} from "../../components/vendor/data";
import { IconDownload, IconDoc, IconTrendUp, IconTrendDown } from "../../components/vendor/icons";

const KpiCard = ({ label, value, accent, change, trend }) => (
    <div className="bg-white border border-[#EDE8E0] rounded-[10px] px-[18px] py-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="text-[11.5px] text-[#6B5C4C] font-medium uppercase tracking-[0.04em] mb-1">{label}</div>
        <div className={`text-[22px] font-bold mb-1 ${accent ? "text-[#B86B05]" : "text-[#1C1108]"}`}>{value}</div>
        <span className={`inline-flex items-center gap-1 text-[11.5px] px-2 py-0.5 rounded-full font-semibold ${trend === "down" ? "bg-[#fee2e2] text-[#b91c1c]" : "bg-[#dcfce7] text-[#15803d]"}`}>
            {trend === "down" ? <IconTrendDown size={10} strokeWidth={2.5} /> : <IconTrendUp size={10} strokeWidth={2.5} />}
            {change}
        </span>
    </div>
);

const Reports = () => {
    const [period, setPeriod] = useState("Tháng này");

    return (
        <div className="vendor-fade-in">
            <PageHeader
                title="Báo cáo doanh thu"
                sub="Tháng 6/2026 · 01/06 – 08/06/2026"
                actions={
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Btn variant="outline" size="sm"><IconDownload size={13} /> Excel</Btn>
                        <Btn variant="outline" size="sm"><IconDoc size={13} /> PDF</Btn>
                    </div>
                }
            />

            {/* Period selector */}
            <div className="flex gap-1 flex-wrap mb-5">
                {reportPeriods.map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border-[1.5px] transition-colors ${
                            period === p ? "bg-[#95520B] text-white border-[#95520B]" : "bg-white text-[#6B5C4C] border-[#EDE8E0] hover:border-[#B86B05] hover:text-[#B86B05]"
                        }`}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
                {reportKpis.map((k) => <KpiCard key={k.label} {...k} />)}
            </div>

            {/* Revenue + category share */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-[18px]">
                <Card>
                    <CardTitle>Doanh thu theo ngày</CardTitle>
                    <LineChart labels={reportRevenue.labels} data={reportRevenue.data} height={240} />
                </Card>

                <Card>
                    <CardTitle>Tỉ trọng theo danh mục</CardTitle>
                    <div className="flex items-center gap-5">
                        <div className="shrink-0"><DonutChart data={categoryShares} size={170} /></div>
                        <div className="flex-1">
                            {categoryShares.map((c, i) => (
                                <div
                                    key={c.label}
                                    className={`flex items-center justify-between py-[5px] text-[12.5px] ${i < categoryShares.length - 1 ? "border-b border-[#EDE8E0]" : ""}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                                        {c.label}
                                    </div>
                                    <span className="font-bold">{c.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Top products */}
            <Card>
                <CardTitle>
                    Top sản phẩm bán chạy
                    <Btn variant="outline" size="sm"><IconDownload size={12} /> Xuất</Btn>
                </CardTitle>
                <div className="rounded-[10px] overflow-x-auto border border-[#EDE8E0]">
                    <table className="w-full border-collapse min-w-[640px]">
                        <thead>
                            <tr>
                                {["#", "Sản phẩm", "Danh mục", "Số lượng bán", "Doanh thu", "Tỉ trọng"].map((h) => (
                                    <th key={h} className="bg-[#FAF7F4] px-3.5 py-2.5 text-left text-[11.5px] font-semibold text-[#6B5C4C] uppercase tracking-[0.04em] border-b border-[#EDE8E0] whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {reportTopProducts.map((p) => (
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
        </div>
    );
};

export default Reports;
