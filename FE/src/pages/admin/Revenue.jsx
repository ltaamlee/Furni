import React, { useState, useEffect, useRef } from "react";
import { getAdminRevenueApi } from "../../utils/api";
import Chart from 'chart.js/auto'; 

const AdminRevenue = () => {
    // Quản lý trạng thái
    const [timeFilter, setTimeFilter] = useState("this_month");
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ gmv: 0, commission: 0 });
    
    const chartRef = useRef(null);
    const chartInstance = useRef(null); 
    const currencyFormatter = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    });

    // Tự động gọi API mỗi khi đổi Filter
    useEffect(() => {
        fetchRevenueData();
    }, [timeFilter]);

    const fetchRevenueData = async () => {
        setLoading(true);
        try {
            const res = await getAdminRevenueApi({ timeFilter });
            if (res && res.success) {
                setSummary(res.data.summary);
                renderChart(res.data.chart); 
            }
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu doanh thu:", error);
        } finally {
            setLoading(false);
        }
    };

    //Logic vẽ biểu đồ 
    const renderChart = (chartData) => {
        const ctx = chartRef.current.getContext("2d");
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        chartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Tổng giá trị giao dịch',
                        data: chartData.gmv,
                        backgroundColor: '#95d5b2', 
                        hoverBackgroundColor: '#74c69d',
                        borderRadius: 4,
                        yAxisID: 'yGMV', 
                        barPercentage: 0.65,
                        order: 1 
                    },
                    {
                        type: 'line',
                        label: 'Doanh thu của Sàn',
                        data: chartData.commission,
                        borderColor: '#b07d62', 
                        backgroundColor: '#b07d62',
                        borderWidth: 2, 
                        pointBackgroundColor: '#ffffff', 
                        pointBorderColor: '#b07d62',
                        pointBorderWidth: 1.5, 
                        pointRadius: 3.5,      
                        pointHoverRadius: 6,
                        tension: 0.35, 
                        fill: false,
                        yAxisID: 'yCommission',
                        order: 0 
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { 
                            font: { family: 'ui-sans-serif, system-ui, sans-serif', size: 13, weight: '600' }, 
                            padding: 20 
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(51, 51, 51, 0.95)',
                        padding: 12,
                        titleFont: { size: 13, family: 'ui-sans-serif, system-ui, sans-serif', weight: 'bold' },
                        bodyFont: { size: 13, family: 'ui-sans-serif, system-ui, sans-serif' },
                        callbacks: {
                            label: function(context) {
                                return ' ' + context.dataset.label + ': ' + currencyFormatter.format(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    yGMV: {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        title: { 
                            display: true, 
                            text: 'Tổng giá trị giao dịch', 
                            font: { family: 'ui-sans-serif, system-ui, sans-serif', size: 15, weight: 'bold' }, 
                            color: '#40916c' 
                        },
                        grid: { color: '#e2d8d0', borderDash: [5, 5] },
                        ticks: {
                            font: { family: 'ui-sans-serif, system-ui, sans-serif', size: 12, weight: '500' },
                            color: '#777777',
                            callback: function(value) {
                                if(value >= 1000000) return (value / 1000000) + ' Tr';
                                if(value >= 1000) return (value / 1000) + ' K';
                                return value;
                            }
                        }
                    },
                    yCommission: {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        title: { 
                            display: true, 
                            text: 'Doanh thu của Sàn', 
                            font: { family: 'ui-sans-serif, system-ui, sans-serif', size: 15, weight: 'bold' }, 
                            color: '#b07d62' 
                        },
                        grid: { display: false },
                        ticks: {
                            font: { family: 'ui-sans-serif, system-ui, sans-serif', size: 12, weight: '500' },
                            color: '#777777',
                            callback: function(value) {
                                if(value >= 1000000) return (value / 1000000) + ' Tr';
                                if(value >= 1000) return (value / 1000) + ' K';
                                return value;
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { 
                            font: { family: 'ui-sans-serif, system-ui, sans-serif', size: 12, weight: '400' }, 
                            color: '#777777' 
                        }
                    }
                }
            }
        });
    };

    return (
        <div className="w-full font-sans">
            
            {/* THẺ THỐNG KÊ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[25px] mb-[30px]">
                <div className="bg-white rounded-[12px] p-[25px] shadow-[0_8px_20px_rgba(0,0,0,0.05)] flex items-center gap-[20px] border border-[#e2d8d0] transition-all hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(0,0,0,0.08)]">
                    <div className="w-[70px] h-[70px] rounded-[16px] flex items-center justify-center text-[30px] shrink-0 bg-[#ebf7ee] text-[#40916c]">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="m-0 mb-[8px] text-[13px] text-[#777777] uppercase tracking-[0.5px] font-semibold">Tổng giá trị giao dịch</h3>
                        <p className="m-0 text-[30px] font-bold text-[#333333]">
                            {loading ? "..." : summary.gmv.toLocaleString()} đ
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-[12px] p-[25px] shadow-[0_8px_20px_rgba(0,0,0,0.05)] flex items-center gap-[20px] border border-[#e2d8d0] transition-all hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(0,0,0,0.08)]">
                    <div className="w-[70px] h-[70px] rounded-[16px] flex items-center justify-center text-[30px] shrink-0 bg-[#fdf3e7] text-[#b07d62]">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v8z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 13v-2a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4-4v1" /></svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="m-0 mb-[8px] text-[13px] text-[#777777] uppercase tracking-[0.5px] font-semibold">Doanh thu của Sàn</h3>
                        <p className="m-0 text-[30px] font-bold text-[#b07d62]">
                            {loading ? "..." : summary.commission.toLocaleString()} đ
                        </p>
                    </div>
                </div>
            </div>

            {/* KHU VỰC BIỂU ĐỒ */}
            <div className="bg-white rounded-[12px] p-[25px] shadow-[0_8px_20px_rgba(0,0,0,0.05)] border border-[#e2d8d0]">
                <div className="flex justify-between items-center mb-[25px] flex-wrap gap-[15px]">
                    <h3 className="m-0 text-[18px] font-semibold text-[#333333]">Biểu đồ Doanh số & Lợi nhuận sàn</h3>
                    <div className="flex gap-[12px] items-center">
                        <select 
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                            className="py-[10px] px-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] outline-none cursor-pointer bg-white text-[#333333] font-medium min-w-[160px] focus:border-[#853D12]"
                        >
                            <option value="this_month">Tháng này</option>
                            <option value="last_month">Tháng trước</option>
                            <option value="2026">Năm 2026</option>
                            <option value="2025">Năm 2025</option>
                            <option value="2024">Năm 2024</option>
                        </select>
                    </div>
                </div>
                
                {/* Canvas vẽ biểu đồ */}
                <div className="relative h-[420px] w-full">
                    {loading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                            <span className="text-[#853D12] font-semibold">Đang tổng hợp dữ liệu...</span>
                        </div>
                    )}
                    <canvas ref={chartRef}></canvas>
                </div>
            </div>
            
        </div>
    );
};

export default AdminRevenue;