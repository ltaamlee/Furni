import { useState, useEffect } from "react";
import { getAvailableCouponsApi } from "../../utils/api";
import { useToast } from "../context/ToastContext";

const CouponList = () => {
    const { showToast } = useToast();
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("available");

    useEffect(() => {
        fetchCoupons();
    }, [filter]);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const res = await getAvailableCouponsApi();
            if (res.success) {
                setCoupons(res.data.coupons);
            }
        } catch (error) {
            console.error("Error fetching coupons:", error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        showToast(`Đã sao chép mã: ${code}`, "success");
    };

    const formatPrice = (price) => new Intl.NumberFormat("vi-VN").format(price) + " đ";

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("vi-VN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    const getCouponTypeLabel = (type, value) => {
        switch (type) {
            case "percent":
                return `Giảm ${value}%`;
            case "fixed":
                return `Giảm ${formatPrice(value)}`;
            case "free_shipping":
                return "Miễn phí vận chuyển";
            default:
                return `${type} - ${value}`;
        }
    };

    const isExpired = (endDate) => new Date(endDate) < new Date();

    const filteredCoupons = coupons.filter((coupon) => {
        if (filter === "available") return !isExpired(coupon.endDate) && coupon.canUse;
        if (filter === "expired") return isExpired(coupon.endDate);
        return true;
    });

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-[#8B4513] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="flex gap-2">
                {[
                    { id: "available", label: "Có thể dùng" },
                    { id: "expired", label: "Đã hết hạn" },
                    { id: "all", label: "Tất cả" }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                            filter === tab.id
                                ? "bg-[#8B4513] text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {filteredCoupons.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center">
                    <div className="text-5xl mb-4">🎟️</div>
                    <p className="text-gray-500">Không có mã giảm giá nào</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredCoupons.map((coupon) => (
                        <div
                            key={coupon._id}
                            className={`bg-white rounded-xl border-2 overflow-hidden ${
                                isExpired(coupon.endDate) ? "border-gray-200 opacity-60" : "border-[#8B4513]"
                            }`}
                        >
                            <div className="flex">
                                {/* Discount Value */}
                                <div className="w-28 bg-gradient-to-br from-[#8B4513] to-[#A0522D] flex flex-col items-center justify-center p-4 text-white">
                                    <span className="text-2xl font-bold">
                                        {getCouponTypeLabel(coupon.type, coupon.value)}
                                    </span>
                                    {coupon.maxDiscount && (
                                        <span className="text-xs mt-1 opacity-80">
                                            Tối đa {formatPrice(coupon.maxDiscount)}
                                        </span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-gray-800">{coupon.name}</h3>
                                            {coupon.description && (
                                                <p className="text-sm text-gray-500 mt-1">{coupon.description}</p>
                                            )}
                                            {coupon.minOrderValue > 0 && (
                                                <p className="text-xs text-orange-500 mt-1">
                                                    Đơn tối thiểu: {formatPrice(coupon.minOrderValue)}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-400 mt-2">
                                                HSD: {formatDate(coupon.endDate)}
                                            </p>
                                        </div>

                                        {/* Copy Button */}
                                        <button
                                            onClick={() => copyToClipboard(coupon.code)}
                                            disabled={isExpired(coupon.endDate)}
                                            className="px-4 py-2 bg-[#8B4513] text-white rounded-lg text-sm font-medium hover:bg-[#A0522D] transition disabled:opacity-50"
                                        >
                                            {isExpired(coupon.endDate) ? "Đã hết hạn" : "Sao chép"}
                                        </button>
                                    </div>

                                    {/* Code */}
                                    <div className="mt-3 flex items-center gap-2">
                                        <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm">
                                            {coupon.code}
                                        </code>
                                        {coupon.usedCount > 0 && (
                                            <span className="text-xs text-gray-400">
                                                Đã dùng: {coupon.usedCount}
                                                {coupon.maxUses && `/${coupon.maxUses}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CouponList;
