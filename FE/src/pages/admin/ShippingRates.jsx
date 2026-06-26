import { useState, useEffect } from "react";
import { useToast } from "../../components/context/ToastContext";
import {
    getShippingRatesApi,
    seedShippingRatesApi,
    resetShippingRatesApi,
    syncShippingRatesApi,
    bulkUpdateShippingRatesApi,
} from "../../utils/api";

const PROVIDERS = {
    jt: { name: "J&T Express", short: "J&T" },
    ghtk: { name: "Giao Hàng Tiết Kiệm", short: "GHTK" },
    viettel: { name: "Viettel Post", short: "VT" },
};

const REGIONS = [
    { key: "north", name: "Miền Bắc", icon: "🧭", desc: "Hà Nội, Hải Phòng, Quảng Ninh, Bắc Ninh..." },
    { key: "central", name: "Miền Trung", icon: "🏔️", desc: "Đà Nẵng, Huế, Hội An, Quảng Ngãi..." },
    { key: "south", name: "Miền Nam", icon: "🌴", desc: "TP.HCM, Bình Dương, Đồng Nai, Cần Thơ..." },
];

const TIERS = [
    {
        key: "economy",
        name: "Tiết Kiệm",
        short: "Tiết kiệm",
        icon: "⏱️",
        color: "amber",
        desc: "Giao chậm hơn, phí thấp hơn",
        badge: "text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold",
    },
    {
        key: "express",
        name: "Giao Nhanh",
        short: "Nhanh",
        icon: "⚡",
        color: "blue",
        desc: "Giao nhanh trong 1-3 ngày",
        badge: "text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold",
    },
];

const WEBSITES = {
    jt: "https://www.jtexpress.vn/",
    ghtk: "https://giaohangtietkiem.vn/",
    viettel: "https://viettelpost.com.vn/",
};

const formatVND = (amount) =>
    new Intl.NumberFormat("vi-VN").format(amount) + " đ";

const ShippingRates = () => {
    const { showToast } = useToast();
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [seeding, setSeeding] = useState(false);
    // Track inline edits: { rateId: { baseFee, feePer500g } }
    const [editedRates, setEditedRates] = useState({});
    const [saving, setSaving] = useState(false);

    // Group rates by region → tier → cheapest provider
    const grouped = REGIONS.map((region) => {
        const regionRates = rates.filter((r) => r.region === region.key);
        const tiers = TIERS.map((tier) => {
            const tierRates = regionRates.filter((r) => r.serviceType === tier.key);
            // Find cheapest per provider
            const providers = Object.entries(PROVIDERS).map(([key, info]) => {
                const rate = tierRates.find((r) => r.provider === key);
                return { key, ...info, rate };
            });
            // Find cheapest overall for this tier
            const cheapest = providers
                .filter((p) => p.rate)
                .reduce((best, p) => {
                    if (!best) return p;
                    const a = best.rate.baseFee + best.rate.feePer500g * 2; // approx total
                    const b = p.rate.baseFee + p.rate.feePer500g * 2;
                    return b < a ? p : best;
                }, null);
            return { tier, providers, cheapest: cheapest?.key || null };
        });
        return { region, tiers };
    });

    const fetchRates = async () => {
        try {
            setLoading(true);
            const res = await getShippingRatesApi();
            if (res.success) {
                setRates(res.data.rates || []);
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError("Lỗi kết nối máy chủ");
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
            showToast("Đồng bộ bảng giá thành công!", "success");
        } catch {
            showToast("Lỗi đồng bộ bảng giá!", "error");
        } finally {
            setSyncing(false);
        }
    };

    const handleReset = () => {
        if (!window.confirm("Đặt lại bảng giá về mặc định? Tất cả thay đổi sẽ bị mất.")) return;
        (async () => {
            try {
                setSyncing(true);
                await resetShippingRatesApi();
                await fetchRates();
                showToast("Đã đặt lại bảng giá mặc định!", "success");
            } catch {
                showToast("Lỗi reset bảng giá!", "error");
            } finally {
                setSyncing(false);
            }
        })();
    };

    const handleSeed = async () => {
        try {
            setSeeding(true);
            await seedShippingRatesApi();
            await fetchRates();
            showToast("Đã tạo bảng giá mặc định!", "success");
        } catch {
            showToast("Lỗi tạo bảng giá mặc định!", "error");
        } finally {
            setSeeding(false);
        }
    };

    const startEdit = (rateId) => {
        const rate = rates.find((r) => r._id === rateId);
        if (!rate) return;
        setEditedRates((prev) => ({
            ...prev,
            [rateId]: { baseFee: rate.baseFee, feePer500g: rate.feePer500g },
        }));
    };

    const cancelEdit = (rateId) => {
        setEditedRates((prev) => {
            const next = { ...prev };
            delete next[rateId];
            return next;
        });
    };

    const handleBulkSave = async () => {
        const updates = Object.entries(editedRates).map(([id, vals]) => ({
            id,
            baseFee: vals.baseFee,
            feePer500g: vals.feePer500g,
        }));
        if (updates.length === 0) {
            showToast("Không có thay đổi nào để lưu.", "info");
            return;
        }
        try {
            setSaving(true);
            await bulkUpdateShippingRatesApi(updates);
            await fetchRates();
            setEditedRates({});
            showToast(`Đã lưu ${updates.length} bản ghi thành công!`, "success");
        } catch {
            showToast("Lỗi lưu bảng giá!", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⚠️</span>
                </div>
                <p className="text-slate-500 mb-4 font-medium">{error}</p>
                <button
                    onClick={fetchRates}
                    className="px-5 py-2 bg-teal-500 text-white rounded-xl font-semibold text-sm hover:bg-teal-600 transition-colors"
                >
                    Thử lại
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="text-2xl">🚚</span>
                        Bảng Giá Vận Chuyển
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Quản lý phí vận chuyển theo khu vực và tầng dịch vụ
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {Object.entries(PROVIDERS).map(([key, val]) => (
                        <a
                            key={key}
                            href={WEBSITES[key]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-teal-600 border border-slate-200 rounded-lg hover:border-teal-300 transition-colors"
                        >
                            {val.name}
                        </a>
                    ))}
                    <button
                        onClick={handleReset}
                        disabled={syncing || saving}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-red-500 border border-slate-200 rounded-lg transition-colors disabled:opacity-40"
                    >
                        Reset
                    </button>
                    <button
                        onClick={handleBulkSave}
                        disabled={syncing || saving}
                        className="px-4 py-1.5 bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-teal-600 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {syncing || saving ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Đang lưu...
                            </>
                        ) : (
                            "Lưu thay đổi"
                        )}
                    </button>
                </div>
            </div>

            {/* Tier Legend */}
            <div className="flex items-center gap-4 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Tầng vận chuyển:</span>
                {TIERS.map((tier) => (
                    <div key={tier.key} className="flex items-center gap-1.5">
                        <span>{tier.icon}</span>
                        <span className="text-sm font-semibold text-slate-700">{tier.name}</span>
                        <span className="text-xs text-slate-400">— {tier.desc}</span>
                    </div>
                ))}
                <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-teal-400 inline-block" />
                    Giá rẻ nhất
                </span>
            </div>

            {/* Empty State */}
            {rates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">📦</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa có bảng giá vận chuyển</h3>
                    <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
                        Tạo bảng giá mặc định để bắt đầu quản lý phí vận chuyển cho từng khu vực và tầng dịch vụ.
                    </p>
                    <button
                        onClick={handleSeed}
                        disabled={seeding}
                        className="px-6 py-2.5 bg-teal-500 text-white rounded-xl font-semibold text-sm hover:bg-teal-600 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {seeding ? "Đang tạo..." : "Tạo bảng giá mặc định"}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {grouped.map(({ region, tiers }) => (
                        <div key={region.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Region Header */}
                            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 flex items-center gap-3">
                                <span className="text-2xl">{region.icon}</span>
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">{region.name}</h3>
                                    <p className="text-xs text-slate-400">{region.desc}</p>
                                </div>
                                <span className="ml-auto text-xs text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
                                    {rates.filter((r) => r.region === region.key).length} bản ghi
                                </span>
                            </div>

                            {/* Tiers: 2-column grid */}
                            <div className="divide-y divide-slate-100">
                                {tiers.map(({ tier, providers, cheapest }) => (
                                    <div key={tier.key} className="px-5 py-4">
                                        {/* Tier label */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-xl">{tier.icon}</span>
                                            <span className="font-bold text-slate-800">{tier.name}</span>
                                            <span className={tier.badge}>{tier.desc}</span>
                                        </div>

                                        {/* Providers */}
                                        <div className="space-y-2">
                                            {providers.map(({ key, name, short, rate }) => {
                                                const isCheapest = key === cheapest;
                                                    const isEditing = rate && !!editedRates[rate._id];
                                                        const editVal = editedRates[rate._id];
                                                return (
                                                    <div
                                                        key={key}
                                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                                                            isEditing
                                                                ? "border-teal-400 bg-teal-50"
                                                                : isCheapest
                                                                ? "border-teal-300 bg-teal-50/50"
                                                                : "border-slate-100 bg-white hover:border-slate-300"
                                                        }`}
                                                    >
                                                        {/* Provider info */}
                                                        <div className="w-36 flex items-center gap-2 flex-shrink-0">
                                                            {isCheapest && (
                                                                <span className="w-4 h-4 rounded-full bg-teal-400 flex items-center justify-center flex-shrink-0" title="Giá rẻ nhất">
                                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </span>
                                                            )}
                                                            <div>
                                                                <p className={`text-sm font-semibold ${isCheapest ? "text-teal-700" : "text-slate-700"}`}>
                                                                    {name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400">{short}</p>
                                                            </div>
                                                        </div>

                                                        {/* Fee fields */}
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-4 flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <label className="text-xs text-slate-500 font-medium">Phí cơ bản</label>
                                                                    <input
                                                                        type="number"
                                                                        value={editVal?.baseFee ?? rate.baseFee}
                                                                        onChange={(e) =>
                                                                            setEditedRates((prev) => ({
                                                                                ...prev,
                                                                                [rate._id]: { ...(prev[rate._id] || rate), baseFee: Number(e.target.value) },
                                                                            }))
                                                                        }
                                                                        className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                                                                    />
                                                                    <span className="text-xs text-slate-400">đ</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <label className="text-xs text-slate-500 font-medium">+Mỗi 500g</label>
                                                                    <input
                                                                        type="number"
                                                                        value={editVal?.feePer500g ?? rate.feePer500g}
                                                                        onChange={(e) =>
                                                                            setEditedRates((prev) => ({
                                                                                ...prev,
                                                                                [rate._id]: { ...(prev[rate._id] || rate), feePer500g: Number(e.target.value) },
                                                                            }))
                                                                        }
                                                                        className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                                                                    />
                                                                    <span className="text-xs text-slate-400">đ</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => cancelEdit(rate._id)}
                                                                    className="px-3 py-1.5 text-slate-400 hover:text-slate-600 text-xs"
                                                                >
                                                                    Hủy
                                                                </button>
                                                            </div>
                                                        ) : rate ? (
                                                            <div className="flex items-center gap-4 flex-1">
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`font-bold text-base ${isCheapest ? "text-teal-600" : "text-slate-700"}`}>
                                                                        {formatVND(rate.baseFee)}
                                                                    </span>
                                                                    <span className="text-xs text-slate-400">
                                                                        + {formatVND(rate.feePer500g)} / 500g
                                                                    </span>
                                                                    <span className="text-xs text-slate-400">
                                                                        • {rate.estimatedDays?.min}–{rate.estimatedDays?.max} ngày
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => startEdit(rate._id)}
                                                                    className="ml-auto px-3 py-1 text-xs text-teal-600 hover:text-teal-700 font-semibold hover:bg-teal-50 rounded-lg transition-colors"
                                                                >
                                                                    Sửa giá
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex-1 text-xs text-slate-300 italic">
                                                                Chưa có bản ghi
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer note */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs text-slate-400">
                    <strong className="text-slate-600">Ghi chú:</strong>{" "}
                    Nhấn "Sửa giá" để chỉnh phí cơ bản và phí theo trọng lượng.{" "}
                    Nhấn "Lưu thay đổi" để đồng bộ bảng giá mới nhất từ các hãng vận chuyển.{" "}
                    Phí hiển thị là giá trị tham khảo — đơn hàng sẽ chọn provider rẻ nhất cho mỗi tầng dịch vụ.
                </p>
            </div>
        </div>
    );
};

export default ShippingRates;
