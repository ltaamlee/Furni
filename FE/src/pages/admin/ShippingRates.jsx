import { useState, useEffect } from "react";
import { getShippingRatesApi, seedShippingRatesApi, resetShippingRatesApi, syncShippingRatesApi } from "../../utils/api";

const PROVIDERS = {
    jt: { name: "J&T Express", logo: "JT" },
    ghtk: { name: "GHTK", logo: "GHTK" },
    viettel: { name: "Viettel Post", logo: "VT" }
};

const REGIONS = [
    { key: "north", name: "Miền Bắc", desc: "Hà Nội, Hải Phòng, Quảng Ninh..." },
    { key: "central", name: "Miền Trung", desc: "Đà Nẵng, Huế, Hội An..." },
    { key: "south", name: "Miền Nam", desc: "TP.HCM, Bình Dương, Đồng Nai..." }
];

const SERVICES = [
    { key: "economy", name: "Tiết Kiệm", short: "Tiết kiệm" },
    { key: "express", name: "Nhanh", short: "Nhanh" }
];

const WEBSITES = {
    jt: "https://www.jtexpress.vn/",
    ghtk: "https://giaohangtietkiem.vn/",
    viettel: "https://viettelpost.com.vn/"
};

const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const ShippingRates = () => {
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);

    const fetchRates = async () => {
        try {
            setLoading(true);
            const res = await getShippingRatesApi();
            if (res.success) {
                setRates(res.data.rates);
                // Get lastSynced from any rate
                const syncedRates = res.data.rates.filter(r => r.lastSynced);
                if (syncedRates.length > 0) {
                    setLastSync(new Date(syncedRates[0].lastSynced));
                }
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError('Lỗi kết nối');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRates();
    }, []);

    const handleSync = async () => {
        try {
            setSyncing(true);
            await syncShippingRatesApi();
            await fetchRates();
        } catch { 
            alert('Lỗi đồng bộ'); 
        } finally {
            setSyncing(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm('Đặt lại bảng giá về mặc định?')) return;
        try {
            setSyncing(true);
            await resetShippingRatesApi();
            await fetchRates();
        } catch { alert('Lỗi'); }
        finally { setSyncing(false); }
    };

    const formatDate = (date) => {
        if (!date) return '';
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-t-[#853D12] rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <button onClick={fetchRates} className="px-4 py-2 bg-[#853D12] text-white rounded-lg">Thử lại</button>
            </div>
        );
    }

    return (
        <div className="admin-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-[20px] font-bold text-[#2a160b]">Quản Lý Vận Chuyển</h2>
                    <p className="text-[13px] text-[#9E8E7E]">
                        {lastSync ? `Cập nhật: ${formatDate(lastSync)}` : 'Bảng giá tham khảo'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {Object.entries(PROVIDERS).map(([key, val]) => (
                        <a key={key} href={WEBSITES[key]} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1.5 text-[#6B5C4C] hover:text-[#853D12] text-[12px] font-medium">
                            {val.name}
                        </a>
                    ))}
                    <div className="h-4 w-px bg-[#e2d8d0]"></div>
                    <button onClick={handleReset} disabled={syncing}
                        className="px-3 py-1.5 text-[12px] text-[#9E8E7E] hover:text-red-500">
                        Reset
                    </button>
                    <button onClick={handleSync} disabled={syncing}
                        className="px-4 py-1.5 bg-[#853D12] text-white rounded-lg text-[12px] font-medium flex items-center gap-1.5">
                        {syncing ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Đang cập nhật...
                            </>
                        ) : (
                            'Cập nhật giá'
                        )}
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {rates.length === 0 ? (
                <div className="bg-white rounded-xl border border-[#e2d8d0] p-12 text-center">
                    <p className="text-[#6B5C4C] mb-4">Chưa có bảng giá vận chuyển</p>
                    <button onClick={async () => { setSyncing(true); await seedShippingRatesApi(); fetchRates(); setSyncing(false); }}
                        className="px-6 py-2 bg-[#853D12] text-white rounded-lg font-medium">
                        Tạo bảng giá mặc định
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-[#e2d8d0] overflow-hidden">
                    {/* Table Header */}
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="bg-gradient-to-r from-[#B86B05] to-[#95520B] text-white">
                                <th className="px-4 py-3 text-left font-semibold w-[120px]">Khu vực</th>
                                {SERVICES.map(s => (
                                    <th key={s.key} className="px-4 py-3 text-center font-semibold">Dịch vụ {s.short}</th>
                                ))}
                            </tr>
                        </thead>
                    </table>

                    {/* Regions */}
                    {REGIONS.map(region => {
                        const regionRates = rates.filter(r => r.region === region.key);
                        if (regionRates.length === 0) return null;

                        return (
                            <div key={region.key} className="border-t border-[#e2d8d0]">
                                {/* Region Label */}
                                <div className="px-4 py-3 bg-gradient-to-r from-[#faf7f4] to-[#f5f0e8] border-b border-[#e2d8d0] flex items-center justify-between">
                                    <span className="font-semibold text-[#2a160b]">{region.name}</span>
                                    <span className="text-[11px] text-[#9E8E7E]">{region.desc}</span>
                                </div>

                                {/* Service Columns */}
                                <div className="flex">
                                    {/* Column: Khu vực */}
                                    <div className="w-[120px] flex-shrink-0 border-r border-[#e2d8d0]">
                                        <div className="px-4 py-2.5 text-[11px] text-[#9E8E7E] uppercase">Hãng vận chuyển</div>
                                    </div>

                                    {/* Service Columns */}
                                    {SERVICES.map((service, idx) => (
                                        <div key={service.key} className={`flex-1 ${idx < SERVICES.length - 1 ? 'border-r border-[#e2d8d0]' : ''}`}>
                                            <div className="px-4 py-2.5 text-[11px] text-[#9E8E7E] uppercase text-center">
                                                {service.name}
                                            </div>
                                            <div className="divide-y divide-[#f5f2ef]">
                                                {Object.keys(PROVIDERS).map(provider => {
                                                    const rate = regionRates.find(r => r.provider === provider && r.serviceType === service.key);
                                                    if (!rate) {
                                                        return (
                                                            <div key={provider} className="px-4 py-2.5 text-[#9E8E7E] text-[12px]">—</div>
                                                        );
                                                    }

                                                    return (
                                                        <div key={provider} className="px-4 py-2.5 flex items-center justify-between">
                                                            <span className="text-[#2a160b] text-[13px]">{PROVIDERS[provider].name}</span>
                                                            <div className="text-right">
                                                                <span className="text-[#853D12] font-semibold text-[14px]">{formatVND(rate.baseFee)}</span>
                                                                <span className="text-[11px] text-[#9E8E7E] ml-1">
                                                                    +{formatVND(rate.feePer500g)}/{rate.estimatedDays?.min}-{rate.estimatedDays?.max}ng
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Note */}
            <div className="mt-4 text-[12px] text-[#9E8E7E]">
                Nhấn <span className="text-[#853D12]">Cập nhật giá</span> để đồng bộ bảng giá mới nhất từ các hãng vận chuyển.
            </div>
        </div>
    );
};

export default ShippingRates;
