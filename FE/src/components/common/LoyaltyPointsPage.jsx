import { useState, useEffect } from "react";
import { getMyPointsApi, getPointHistoryApi, getExchangeableCouponsApi, redeemCouponApi } from "../../utils/api";
import { useToast } from "../context/ToastContext";

const LoyaltyPointsPage = () => {
    const { showToast } = useToast();
    const [points, setPoints] = useState(null);
    const [history, setHistory] = useState([]);
    const [exchangeableCoupons, setExchangeableCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("points");
    const [redeeming, setRedeeming] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [pointsRes, historyRes, couponsRes] = await Promise.all([
                getMyPointsApi(),
                getPointHistoryApi({ page: 1, limit: 20 }),
                getExchangeableCouponsApi()
            ]);

            if (pointsRes.success) setPoints(pointsRes.data);
            if (historyRes.success) setHistory(historyRes.data.history);
            if (couponsRes.success) setExchangeableCoupons(couponsRes.data.coupons);
        } catch (error) {
            console.error("Error fetching loyalty data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async (coupon) => {
        if (!confirm(`Đổi ${coupon.loyaltyCost} điểm lấy mã giảm giá ${coupon.value.toLocaleString('vi-VN')}đ?`)) {
            return;
        }

        try {
            setRedeeming(coupon._id);
            const res = await redeemCouponApi(coupon._id);
            if (res.success) {
                showToast(`Đổi thành công! Mã: ${res.data.coupon.code}`, "success");
                fetchData();
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Đổi thất bại!", "error");
        } finally {
            setRedeeming(null);
        }
    };

    const formatPrice = (price) => new Intl.NumberFormat("vi-VN").format(price) + " đ";

    const getTierColor = (tier) => {
        const colors = {
            bronze: "from-amber-700 to-amber-900",
            silver: "from-gray-400 to-gray-600",
            gold: "from-yellow-400 to-yellow-600",
            platinum: "from-purple-400 to-purple-700"
        };
        return colors[tier] || colors.bronze;
    };

    const getTierIcon = (tier) => {
        const icons = {
            bronze: "🥉",
            silver: "🥈",
            gold: "🥇",
            platinum: "💎"
        };
        return icons[tier] || "⭐";
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-[#8B4513] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F0]">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">ĐIỂM TÍCH LŨY</h1>
                    <p className="text-gray-500">Tích điểm từ mỗi đơn hàng, đổi quà hấp dẫn!</p>
                </div>

                {/* Points Card */}
                <div className={`bg-gradient-to-br ${getTierColor(points?.tier || 'bronze')} rounded-2xl p-6 text-white mb-8 shadow-lg`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/80 text-sm">Hạng thành viên</p>
                            <p className="text-2xl font-bold flex items-center gap-2">
                                {getTierIcon(points?.tier)} {points?.tier?.toUpperCase() || 'BRONZE'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-white/80 text-sm">Điểm hiện có</p>
                            <p className="text-4xl font-bold">{points?.points?.toLocaleString('vi-VN') || 0}</p>
                        </div>
                    </div>

                    {/* Tier Progress */}
                    {points?.tierProgress && (
                        <div className="mt-4 pt-4 border-t border-white/20">
                            <div className="flex justify-between text-sm mb-2">
                                <span>Cần thêm {points.tierProgress.pointsNeeded?.toLocaleString('vi-VN')} điểm để lên {points.tierProgress.nextTier?.toUpperCase()}</span>
                                <span>{points.totalEarned?.toLocaleString('vi-VN')} điểm tích lũy</span>
                            </div>
                            <div className="bg-white/20 rounded-full h-2">
                                <div
                                    className="bg-white rounded-full h-2 transition-all"
                                    style={{ width: `${Math.min((points.totalEarned / (points.totalEarned + points.tierProgress.pointsNeeded)) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { id: "points", label: "Lịch sử điểm" },
                        { id: "rewards", label: "Đổi quà" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 rounded-full font-medium transition ${
                                activeTab === tab.id
                                    ? "bg-[#8B4513] text-white"
                                    : "bg-white text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Points History */}
                {activeTab === "points" && (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        {history.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="text-5xl mb-4">📜</div>
                                <p className="text-gray-500">Chưa có lịch sử tích điểm</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {history.map((item, index) => (
                                    <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                item.type === 'earn' ? 'bg-green-100 text-green-600' :
                                                item.type === 'redeem' ? 'bg-red-100 text-red-600' :
                                                'bg-blue-100 text-blue-600'
                                            }`}>
                                                {item.type === 'earn' ? '+' : item.type === 'redeem' ? '-' : ''}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">{item.description}</p>
                                                <p className="text-sm text-gray-500">
                                                    {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`font-bold ${item.type === 'redeem' ? 'text-red-500' : 'text-green-500'}`}>
                                            {item.type === 'earn' ? '+' : item.type === 'redeem' ? '-' : ''}{Math.abs(item.points).toLocaleString('vi-VN')} điểm
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Exchange Rewards */}
                {activeTab === "rewards" && (
                    <div className="space-y-4">
                        <p className="text-gray-600 mb-4">
                            Dùng điểm tích lũy để đổi các mã giảm giá hấp dẫn!
                        </p>
                        {exchangeableCoupons.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 text-center">
                                <div className="text-5xl mb-4">🎁</div>
                                <p className="text-gray-500">Không có quà để đổi</p>
                                <p className="text-gray-400 text-sm mt-2">Hãy tích thêm điểm để đổi quà!</p>
                            </div>
                        ) : (
                            exchangeableCoupons.map((coupon) => (
                                <div key={coupon._id} className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-[#8B4513] to-[#A0522D] rounded-xl flex items-center justify-center text-white">
                                            <span className="text-2xl font-bold">{coupon.value.toLocaleString('vi-VN')}đ</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">{coupon.name}</h3>
                                            <p className="text-sm text-gray-500">{coupon.description}</p>
                                            <p className="text-sm text-[#8B4513] font-medium">
                                                Tối thiểu đơn: {formatPrice(coupon.minOrderValue)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-[#8B4513] mb-2">
                                            {coupon.loyaltyCost?.toLocaleString('vi-VN')} điểm
                                        </p>
                                        <button
                                            onClick={() => handleRedeem(coupon)}
                                            disabled={redeeming === coupon._id || (points?.points || 0) < coupon.loyaltyCost}
                                            className="bg-[#8B4513] text-white px-6 py-2 rounded-full font-medium hover:bg-[#A0522D] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {redeeming === coupon._id ? "Đang đổi..." : "Đổi ngay"}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoyaltyPointsPage;
