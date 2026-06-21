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

    // Membership tier configuration
    const membershipConfig = {
        bronze: { 
            name: 'Đồng', 
            color: '#CD7F32',
            gradient: 'from-amber-700 to-amber-900',
            bgColor: 'bg-amber-100',
            textColor: 'text-amber-800',
            icon: '🥉',
            minPoints: 0,
            benefits: ['Tích 1 điểm/1000đ', 'Đổi quà từ 500 điểm']
        },
        silver: { 
            name: 'Bạc', 
            color: '#C0C0C0',
            gradient: 'from-gray-400 to-gray-600',
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-700',
            icon: '🥈',
            minPoints: 100000,
            benefits: ['Tích 1.2 điểm/1000đ', 'Miễn phí vận chuyển 1 đơn/tháng', 'Ưu tiên xử lý đơn hàng']
        },
        gold: { 
            name: 'Vàng', 
            color: '#FFD700',
            gradient: 'from-yellow-400 to-yellow-600',
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-800',
            icon: '🥇',
            minPoints: 500000,
            benefits: ['Tích 1.5 điểm/1000đ', 'Miễn phí vận chuyển 3 đơn/tháng', 'Voucher sinh nhật 50k']
        },
        diamond: { 
            name: 'Kim Cương', 
            color: '#00D4FF',
            gradient: 'from-cyan-300 to-blue-500',
            bgColor: 'bg-cyan-100',
            textColor: 'text-cyan-800',
            icon: '💎',
            minPoints: 2000000,
            benefits: ['Tích 2 điểm/1000đ', 'Miễn phí vận chuyển không giới hạn', 'Voucher sinh nhật 100k', 'Hỗ trợ 24/7']
        }
    };

    const tiers = ['bronze', 'silver', 'gold', 'diamond'];

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

    const getCurrentTier = () => {
        const currentPoints = points?.points || 0;
        if (currentPoints >= 2000000) return 'diamond';
        if (currentPoints >= 500000) return 'gold';
        if (currentPoints >= 100000) return 'silver';
        return 'bronze';
    };

    const getNextTier = () => {
        const currentTier = getCurrentTier();
        const currentIndex = tiers.indexOf(currentTier);
        if (currentIndex === tiers.length - 1) return null;
        return tiers[currentIndex + 1];
    };

    const getProgressToNextTier = () => {
        const currentTier = getCurrentTier();
        const currentPoints = points?.points || 0;
        const currentMin = membershipConfig[currentTier].minPoints;
        const nextTier = getNextTier();
        if (!nextTier) return 100;
        const nextMin = membershipConfig[nextTier].minPoints;
        return Math.min(100, ((currentPoints - currentMin) / (nextMin - currentMin)) * 100);
    };

    const getPointsNeededForNextTier = () => {
        const nextTier = getNextTier();
        if (!nextTier) return 0;
        return membershipConfig[nextTier].minPoints - (points?.points || 0);
    };

    const currentTier = getCurrentTier();
    const nextTier = getNextTier();
    const tierConfig = membershipConfig[currentTier];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4]">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-[#B86B05] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF7F4]">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-[#1C1108] mb-2">ĐIỂM TÍCH LŨY & HẠNG THÀNH VIÊN</h1>
                    <p className="text-[#A8896A]">Tích điểm từ mỗi đơn hàng, leo rank nhận ưu đãi đặc biệt!</p>
                </div>

                {/* Membership Tier Cards */}
                <div className="grid grid-cols-4 gap-3 mb-8">
                    {tiers.map((tier) => {
                        const config = membershipConfig[tier];
                        const isCurrentOrHigher = tiers.indexOf(tier) <= tiers.indexOf(currentTier);
                        const isCurrent = tier === currentTier;
                        
                        return (
                            <div 
                                key={tier}
                                className={`relative p-4 rounded-2xl transition-all ${
                                    isCurrent 
                                        ? `bg-gradient-to-br ${config.gradient} text-white shadow-lg scale-105` 
                                        : isCurrentOrHigher
                                            ? 'bg-[#EDE8E0] text-[#1C1108]'
                                            : 'bg-white border border-[#EDE8E0] text-[#A8896A]'
                                }`}
                            >
                                {isCurrent && (
                                    <div className="absolute -top-2 -right-2 bg-[#BF4343] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        HIỆN TẠI
                                    </div>
                                )}
                                <div className="text-center">
                                    <span className="text-3xl">{config.icon}</span>
                                    <p className={`font-bold text-sm mt-2 ${isCurrent ? 'text-white' : isCurrentOrHigher ? 'text-[#1C1108]' : 'text-[#A8896A]'}`}>
                                        {config.name}
                                    </p>
                                    <p className={`text-[10px] mt-1 ${isCurrent ? 'text-white/80' : isCurrentOrHigher ? 'text-[#6B5C4C]' : 'text-[#A8896A]'}`}>
                                        {config.minPoints.toLocaleString('vi-VN')} điểm
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Current Tier Card */}
                <div className={`bg-gradient-to-br ${tierConfig.gradient} rounded-2xl p-6 text-white mb-6 shadow-lg`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Avatar with Ring */}
                            <div className="relative p-1 rounded-full bg-white/20">
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                    <span className="text-3xl">{tierConfig.icon}</span>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
                                    <span className="text-sm">{tierConfig.icon}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-white/80 text-sm">Hạng thành viên hiện tại</p>
                                <p className="text-2xl font-extrabold flex items-center gap-2">
                                    {tierConfig.icon} {tierConfig.name.toUpperCase()}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-white/80 text-sm">Điểm hiện có</p>
                            <p className="text-4xl font-extrabold">{(points?.points || 0).toLocaleString('vi-VN')}</p>
                        </div>
                    </div>

                    {/* Tier Progress */}
                    {nextTier && (
                        <div className="mt-6 pt-4 border-t border-white/20">
                            <div className="flex justify-between text-sm mb-3">
                                <div>
                                    <span>Cần thêm </span>
                                    <span className="font-bold">{getPointsNeededForNextTier().toLocaleString('vi-VN')} điểm</span>
                                    <span> để lên </span>
                                    <span className="font-bold">{membershipConfig[nextTier].icon} {membershipConfig[nextTier].name}</span>
                                </div>
                                <span className="text-white/80">{(points?.totalEarned || 0).toLocaleString('vi-VN')} điểm tích lũy</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-white/20 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-white rounded-full h-3 transition-all duration-500"
                                        style={{ width: `${getProgressToNextTier()}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm font-medium">{Math.round(getProgressToNextTier())}%</span>
                            </div>
                        </div>
                    )}

                    {!nextTier && (
                        <div className="mt-6 pt-4 border-t border-white/20 text-center">
                            <p className="text-lg font-bold">🎉 Bạn đã đạt hạng cao nhất!</p>
                            <p className="text-white/80 text-sm mt-1">Tận hưởng tất cả ưu đãi dành cho thành viên Kim Cương</p>
                        </div>
                    )}
                </div>

                {/* Tier Benefits */}
                <div className="bg-white rounded-2xl border border-[#EDE8E0] p-6 mb-6">
                    <h3 className="font-bold text-[#1C1108] mb-4 flex items-center gap-2">
                        <span>✨</span> Ưu đãi khi là thành viên {tierConfig.name}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                        {tierConfig.benefits.map((benefit, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-[#FAF7F4] rounded-xl">
                                <span className="text-green-500 mt-0.5">✓</span>
                                <span className="text-sm text-[#1C1108]">{benefit}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { id: "points", label: "Lịch sử điểm", icon: "📜" },
                        { id: "rewards", label: "Đổi quà", icon: "🎁" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 rounded-full font-semibold transition flex items-center gap-2 ${
                                activeTab === tab.id
                                    ? "bg-[#B86B05] text-white"
                                    : "bg-white text-[#6B5C4C] hover:bg-[#FAF7F4] border border-[#EDE8E0]"
                            }`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Points History */}
                {activeTab === "points" && (
                    <div className="bg-white rounded-2xl border border-[#EDE8E0] overflow-hidden">
                        {history.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="text-5xl mb-4">📜</div>
                                <p className="text-[#A8896A]">Chưa có lịch sử tích điểm</p>
                                <p className="text-sm text-[#A8896A] mt-2">Hãy đặt hàng để bắt đầu tích điểm!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#EDE8E0]">
                                {history.map((item, index) => (
                                    <div key={index} className="p-4 flex items-center justify-between hover:bg-[#FAF7F4] transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                item.type === 'earn' ? 'bg-green-100 text-green-600' :
                                                item.type === 'redeem' ? 'bg-red-100 text-red-600' :
                                                'bg-blue-100 text-blue-600'
                                            }`}>
                                                {item.type === 'earn' ? '+' : item.type === 'redeem' ? '-' : ''}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-[#1C1108]">{item.description}</p>
                                                <p className="text-sm text-[#A8896A]">
                                                    {new Date(item.createdAt).toLocaleDateString("vi-VN", { 
                                                        day: '2-digit', 
                                                        month: '2-digit', 
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`font-bold ${item.type === 'redeem' ? 'text-[#BF4343]' : 'text-green-600'}`}>
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
                        <p className="text-[#6B5C4C] mb-4">
                            Dùng điểm tích lũy để đổi các mã giảm giá hấp dẫn!
                        </p>
                        {exchangeableCoupons.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-[#EDE8E0] p-12 text-center">
                                <div className="text-5xl mb-4">🎁</div>
                                <p className="text-[#A8896A]">Không có quà để đổi</p>
                                <p className="text-sm text-[#A8896A] mt-2">Hãy tích thêm điểm để đổi quà!</p>
                            </div>
                        ) : (
                            exchangeableCoupons.map((coupon) => (
                                <div key={coupon._id} className="bg-white rounded-2xl border border-[#EDE8E0] p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-[#B86B05] to-[#95520B] rounded-xl flex items-center justify-center text-white">
                                            <span className="text-lg font-bold">{coupon.value.toLocaleString('vi-VN')}đ</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#1C1108]">{coupon.name}</h3>
                                            <p className="text-sm text-[#A8896A]">{coupon.description}</p>
                                            <p className="text-sm text-[#B86B05] font-medium">
                                                Tối thiểu đơn: {formatPrice(coupon.minOrderValue)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-4">
                                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 rounded-full mb-2">
                                            <span className="text-purple-600 text-sm">💎</span>
                                            <span className="text-purple-700 font-bold text-sm">{coupon.loyaltyCost?.toLocaleString('vi-VN')}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRedeem(coupon)}
                                            disabled={redeeming === coupon._id || (points?.points || 0) < coupon.loyaltyCost}
                                            className="block w-full bg-[#B86B05] text-white px-6 py-2 rounded-xl font-semibold hover:bg-[#95520B] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {redeeming === coupon._id ? "Đang đổi..." : "Đổi ngay"}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Info Box */}
                <div className="mt-8 p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                        <span>💡</span> Cách tích điểm
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Mỗi 1.000đ thanh toán = 1 điểm tích lũy</li>
                        <li>• Hạng Bạc: Tích 1.2 điểm/1.000đ</li>
                        <li>• Hạng Vàng: Tích 1.5 điểm/1.000đ</li>
                        <li>• Hạng Kim Cương: Tích 2 điểm/1.000đ</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default LoyaltyPointsPage;
