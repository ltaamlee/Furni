import { useState, useEffect } from "react";
import { getMyVouchersApi, getVoucherCountApi } from "../../utils/api";
import { useToast } from "../context/ToastContext";

const CouponList = () => {
    const { showToast } = useToast();
    const [vouchers, setVouchers] = useState([]);
    const [counts, setCounts] = useState({ active: 0, used: 0, expired: 0, revoked: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("active"); // active | used | expired | revoked

    useEffect(() => {
        fetchVouchers();
        fetchCounts();
    }, [tab]);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const res = await getMyVouchersApi({ status: tab === 'active' ? undefined : tab });
            if (res.success) {
                setVouchers(res.data || []);
            }
        } catch (error) {
            console.error("Error fetching vouchers:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCounts = async () => {
        try {
            const res = await getVoucherCountApi();
            if (res.success) {
                setCounts(res.data);
            }
        } catch (error) {
            console.error("Error fetching voucher counts:", error);
        }
    };

    const formatPrice = (price) => new Intl.NumberFormat("vi-VN").format(price) + " đ";

    const formatDate = (dateString) => {
        if (!dateString) return "Không giới hạn";
        return new Date(dateString).toLocaleDateString("vi-VN", {
            day: "numeric", month: "short", year: "numeric"
        });
    };

    const isExpired = (endDate) => {
        if (!endDate) return false;
        return new Date(endDate) < new Date();
    };

    const formatDiscount = (v) => {
        const type = v.discountType || v.type;
        if (type === 'freeship') return 'Freeship';
        if (type === 'fixed') return `-${Number(v.value).toLocaleString('vi-VN')}đ`;
        return `-${v.value}%`;
    };

    const getBorderColor = (v) => {
        const type = v.discountType || v.type;
        if (type === 'freeship') return 'border-blue-400';
        if (type === 'fixed') return 'border-orange-400';
        if (isExpired(v.endDate)) return 'border-gray-200';
        return 'border-[#B86B05]';
    };

    const getTabBadge = (tabKey, label, icon) => {
        const countMap = {
            active: counts.active,
            used: counts.used,
            expired: counts.expired,
            revoked: counts.revoked,
        };
        const count = countMap[tabKey] ?? 0;
        return (
            <button
                onClick={() => setTab(tabKey)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    tab === tabKey
                        ? "bg-[#B86B05] text-white shadow-md shadow-[#B86B05]/20"
                        : "bg-white border border-[#EDE8E0] text-[#6B5C4C] hover:border-[#D5C9BC] hover:text-[#1C1108]"
                }`}
            >
                <span>{icon}</span>
                <span>{label}</span>
                {count > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        tab === tabKey ? "bg-white/20 text-white" : "bg-[#FAF7F4] text-[#A8896A]"
                    }`}>
                        {count}
                    </span>
                )}
            </button>
        );
    };

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                {getTabBadge("active", "Có thể dùng", "🎟️")}
                {getTabBadge("used", "Đã sử dụng", "✅")}
                {getTabBadge("expired", "Hết hạn", "⏰")}
                {counts.revoked > 0 && getTabBadge("revoked", "Đã thu hồi", "🚫")}
            </div>

            {/* Summary bar */}
            {counts.total > 0 && (
                <div className="bg-[#FAF7F4] rounded-xl p-3 flex items-center gap-4 text-xs text-[#6B5C4C] overflow-x-auto">
                    <span className="flex items-center gap-1 shrink-0">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        Có thể dùng: <strong className="text-[#1C1108]">{counts.active}</strong>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                        <span className="w-2 h-2 bg-gray-400 rounded-full" />
                        Đã dùng: <strong className="text-[#1C1108]">{counts.used}</strong>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                        <span className="w-2 h-2 bg-red-400 rounded-full" />
                        Hết hạn: <strong className="text-[#1C1108]">{counts.expired}</strong>
                    </span>
                    {counts.revoked > 0 && (
                        <span className="flex items-center gap-1 shrink-0">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                            Thu hồi: <strong className="text-[#1C1108]">{counts.revoked}</strong>
                        </span>
                    )}
                </div>
            )}

            {/* Voucher list */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-[#B86B05] rounded-full animate-spin" />
                </div>
            ) : vouchers.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-[#EDE8E0]">
                    <div className="text-5xl mb-4 select-none">
                        {tab === "active" ? "🎟️" : tab === "used" ? "📦" : tab === "revoked" ? "🚫" : "⏰"}
                    </div>
                    <h3 className="text-lg font-bold text-[#1C1108] mb-2">
                        {tab === "active" ? "Chưa có voucher nào" :
                         tab === "used" ? "Chưa có voucher nào được sử dụng" :
                         tab === "revoked" ? "Không có voucher nào bị thu hồi" :
                         "Không có voucher hết hạn"}
                    </h3>
                    <p className="text-sm text-[#A8896A]">
                        {tab === "active"
                            ? "Nhận voucher từ các shop bạn yêu thích để tiết kiệm hơn!"
                            : "Hãy tiếp tục mua sắm để sử dụng voucher nhé!"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tab === "active" && (
                        <h4 className="text-sm font-bold text-[#1C1108] flex items-center gap-2">
                            <span>🎟️</span> Voucher của tôi
                        </h4>
                    )}
                    {vouchers.map((v) => {
                        const expired = isExpired(v.endDate);
                        const used = v.status === 'used';
                        const revoked = v.status === 'revoked';
                        const discountType = v.discountType || v.type;
                        return (
                            <div
                                key={v._id}
                                className={`bg-white rounded-2xl border-2 overflow-hidden flex ${getBorderColor(v)} ${
                                    (expired || used || revoked) ? "opacity-60" : ""
                                }`}
                            >
                                {/* Left: discount value */}
                                <div className={`w-32 flex-shrink-0 flex flex-col items-center justify-center p-4 text-center ${
                                    discountType === 'freeship'
                                        ? "bg-gradient-to-br from-blue-500 to-blue-700 text-white"
                                        : discountType === 'fixed'
                                        ? "bg-gradient-to-br from-orange-500 to-orange-700 text-white"
                                        : "bg-gradient-to-br from-[#B86B05] to-[#95520B] text-white"
                                }`}>
                                    <span className="text-2xl font-black leading-tight">{formatDiscount(v)}</span>
                                    {v.maxDiscount > 0 && (
                                        <span className="text-[10px] mt-1 opacity-80">
                                            Tối đa {formatPrice(v.maxDiscount)}
                                        </span>
                                    )}
                                    {v.shopName && (
                                        <span className="text-[10px] mt-1 opacity-70 truncate max-w-[96px]">
                                            {v.shopName}
                                        </span>
                                    )}
                                </div>

                                {/* Right: info */}
                                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-[#1C1108]">{v.code}</p>
                                                <p className="text-xs text-[#6B5C4C] mt-0.5 line-clamp-2">
                                                    {v.description || 'Voucher đặc biệt từ shop'}
                                                </p>
                                            </div>
                                            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                revoked
                                                    ? "bg-yellow-50 text-yellow-600"
                                                    : expired
                                                    ? "bg-red-50 text-red-500"
                                                    : v.isExhausted
                                                    ? "bg-orange-50 text-orange-500"
                                                    : used
                                                    ? "bg-gray-100 text-gray-500"
                                                    : "bg-green-50 text-green-600"
                                            }`}>
                                                {revoked ? "Đã thu hồi" : expired ? "Hết hạn" : v.isExhausted ? "Hết lượt" : used ? "Đã dùng" : "Còn hiệu lực"}
                                            </span>
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#A8896A]">
                                            {v.minOrderValue > 0 && (
                                                <span>Đơn từ {formatPrice(v.minOrderValue)}</span>
                                            )}
                                            <span className={expired ? "text-red-400" : ""}>
                                                HSD: {formatDate(v.endDate)}
                                            </span>
                                            {v.remaining !== null && (
                                                <span>Còn {v.remaining} lượt</span>
                                            )}
                                        </div>
                                    </div>

                                    {(expired || used || revoked) && (
                                        <p className="text-[10px] text-[#A8896A] mt-1 italic">
                                            {used
                                                ? `Đã sử dụng ngày ${formatDate(v.usedAt)}`
                                                : revoked
                                                ? "Voucher đã bị thu hồi bởi shop"
                                                : `Hết hạn ngày ${formatDate(v.endDate)}`
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CouponList;
