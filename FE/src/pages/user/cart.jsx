import { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../components/context/authContext";
import {
    getCartApi,
    updateCartItemApi,
    removeFromCartApi,
    getAvailableCouponsApi,
    validateCouponApi,
    getMyPointsApi
} from "../../utils/api";
import { useToast } from "../../components/context/ToastContext";

const CartPage = () => {
    const { auth } = useContext(AuthContext);
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [coupons, setCoupons] = useState([]);
    const [loadingCoupons, setLoadingCoupons] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [couponCode, setCouponCode] = useState("");
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [loyaltyPoints, setLoyaltyPoints] = useState(0);
    const [usePoints, setUsePoints] = useState(false);

    useEffect(() => {
        fetchCart();
        if (auth?.user) {
            fetchCoupons();
            fetchLoyaltyPoints();
        }
    }, []);

    const fetchCart = async () => {
        try {
            setLoading(true);
            const res = await getCartApi();
            if (res.success) {
                setCart(res.data);
            }
        } catch (error) {
            console.error("Error fetching cart:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCoupons = async () => {
        try {
            const res = await getAvailableCouponsApi();
            if (res.success) {
                setCoupons(res.data.coupons.filter(c => c.canUse));
            }
        } catch (error) {
            console.error("Error fetching coupons:", error);
        }
    };

    const fetchLoyaltyPoints = async () => {
        try {
            const res = await getMyPointsApi();
            if (res.success) {
                setLoyaltyPoints(res.data.points);
            }
        } catch (error) {
            console.error("Error fetching loyalty points:", error);
        }
    };

    const handleUpdateQuantity = async (productId, newQuantity) => {
        if (newQuantity < 1) return;
        try {
            setUpdating(productId);
            await updateCartItemApi(productId, newQuantity);
            await fetchCart();
        } catch (error) {
            showToast(error.message || "Cập nhật thất bại", "error");
        } finally {
            setUpdating(null);
        }
    };

    const handleRemoveItem = async (productId) => {
        if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
        try {
            setUpdating(productId);
            await removeFromCartApi(productId);
            await fetchCart();
            showToast("Đã xóa sản phẩm!", "success");
        } catch (error) {
            showToast(error.message || "Xóa thất bại", "error");
        } finally {
            setUpdating(null);
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) {
            showToast("Vui lòng nhập mã giảm giá!", "warning");
            return;
        }

        try {
            setApplyingCoupon(true);
            const res = await validateCouponApi({
                code: couponCode,
                orderTotal: subtotal
            });
            if (res.success) {
                setSelectedCoupon(res.data.coupon);
                setCouponDiscount(res.data.discount);
                showToast(`Áp dụng mã ${couponCode.toUpperCase()} thành công!`, "success");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Mã giảm giá không hợp lệ!", "error");
            setSelectedCoupon(null);
            setCouponDiscount(0);
        } finally {
            setApplyingCoupon(false);
        }
    };

    const handleSelectCoupon = async (coupon) => {
        try {
            setApplyingCoupon(true);
            const res = await validateCouponApi({
                code: coupon.code,
                orderTotal: subtotal
            });
            if (res.success) {
                setSelectedCoupon(res.data.coupon);
                setCouponDiscount(res.data.discount);
                setCouponCode(coupon.code);
                showToast(`Áp dụng mã ${coupon.code} thành công!`, "success");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Không thể áp dụng mã này!", "error");
        } finally {
            setApplyingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setSelectedCoupon(null);
        setCouponDiscount(0);
        setCouponCode("");
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    const products = cart?.products || [];
    const subtotal = cart?.totalPrice || 0;
    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const pointsDiscount = usePoints ? Math.min(loyaltyPoints, subtotal) : 0;
    const discount = couponDiscount + pointsDiscount;
    const total = Math.max(0, subtotal + shippingFee - discount);

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">GIỎ HÀNG</h1>
                    <p className="text-gray-500 mt-2">Xem lại giỏ hàng của bạn và chỉnh sửa số lượng</p>
                </div>

                {products.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <div className="text-6xl mb-4">🛒</div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Giỏ hàng trống</h2>
                        <p className="text-gray-500 mb-6">Hãy thêm sản phẩm vào giỏ hàng của bạn</p>
                        <Link to="/" className="inline-block bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition">
                            Tiếp tục mua sắm
                        </Link>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {products.map((item) => (
                                <div key={item.product._id || item.product} className="bg-white rounded-2xl shadow-sm p-4 flex gap-4">
                                    <img
                                        src={item.image || "/placeholder.png"}
                                        alt={item.name}
                                        className="w-24 h-24 object-cover rounded-xl cursor-pointer"
                                        onClick={() => navigate(`/product/${item.product._id || item.product}`)}
                                    />
                                    <div className="flex-1">
                                        <h3 
                                            className="font-semibold text-gray-800 cursor-pointer hover:text-[#8B4513]"
                                            onClick={() => navigate(`/product/${item.product._id || item.product}`)}
                                        >
                                            {item.name}
                                        </h3>
                                        <p className="text-green-600 font-bold mt-1">{formatPrice(item.price)}</p>
                                        <div className="flex items-center gap-3 mt-3">
                                            <div className="flex items-center border rounded-full">
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.product._id || item.product, item.quantity - 1)}
                                                    disabled={updating === (item.product._id || item.product) || item.quantity <= 1}
                                                    className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-100 disabled:opacity-50 rounded-l-full"
                                                >
                                                    -
                                                </button>
                                                <span className="w-12 text-center font-semibold">{item.quantity}</span>
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.product._id || item.product, item.quantity + 1)}
                                                    disabled={updating === (item.product._id || item.product)}
                                                    className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-100 disabled:opacity-50 rounded-r-full"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveItem(item.product._id || item.product)}
                                                disabled={updating === (item.product._id || item.product)}
                                                className="text-red-500 hover:text-red-700 p-2"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-800">{formatPrice(item.price * item.quantity)}</p>
                                    </div>
                                </div>
                            ))}

                            {/* Available Coupons */}
                            {auth?.user && coupons.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm p-6">
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span>🎟️</span> Mã giảm giá có sẵn
                                    </h3>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {coupons.slice(0, 5).map((coupon) => (
                                            <div
                                                key={coupon._id}
                                                className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition ${
                                                    selectedCoupon?.code === coupon.code
                                                        ? "border-green-500 bg-green-50"
                                                        : "border-gray-200 hover:border-[#8B4513]"
                                                }`}
                                                onClick={() => handleSelectCoupon(coupon)}
                                            >
                                                <div>
                                                    <p className="font-bold text-gray-800">{coupon.code}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {coupon.type === 'percent' ? `Giảm ${coupon.value}%` : `Giảm ${formatPrice(coupon.value)}`}
                                                        {coupon.minOrderValue > 0 && ` (Đơn từ ${formatPrice(coupon.minOrderValue)})`}
                                                    </p>
                                                </div>
                                                <button className="text-sm text-[#8B4513] font-medium">
                                                    {selectedCoupon?.code === coupon.code ? "Đang dùng" : "Dùng ngay"}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Enter Coupon Code */}
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h3 className="font-bold text-gray-800 mb-4">Nhập mã giảm giá</h3>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        placeholder="Nhập mã giảm giá..."
                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                                    />
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={applyingCoupon}
                                        className="px-6 py-3 bg-[#8B4513] text-white rounded-xl font-medium hover:bg-[#A0522D] transition disabled:opacity-50"
                                    >
                                        {applyingCoupon ? "..." : "Áp dụng"}
                                    </button>
                                </div>
                                {selectedCoupon && (
                                    <div className="mt-3 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                                        <div>
                                            <p className="font-bold text-green-700">{selectedCoupon.code}</p>
                                            <p className="text-sm text-green-600">
                                                Giảm {formatPrice(couponDiscount)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleRemoveCoupon}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">TÓM TẮT ĐƠN HÀNG</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Tạm tính ({cart.totalQuantity} sản phẩm)</span>
                                        <span className="font-medium">{formatPrice(subtotal)}</span>
                                    </div>
                                    
                                    {couponDiscount > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span>Giảm giá</span>
                                            <span className="font-medium">-{formatPrice(couponDiscount)}</span>
                                        </div>
                                    )}
                                    
                                    {pointsDiscount > 0 && (
                                        <div className="flex justify-between text-purple-600">
                                            <span>Điểm tích lũy</span>
                                            <span className="font-medium">-{formatPrice(pointsDiscount)}</span>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Phí vận chuyển</span>
                                        <span className="font-medium">{shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}</span>
                                    </div>
                                    {shippingFee > 0 && (
                                        <p className="text-xs text-green-600">Mua thêm {formatPrice(500000 - subtotal)} để được miễn phí ship!</p>
                                    )}
                                    
                                    <div className="border-t pt-3 flex justify-between">
                                        <span className="font-bold text-gray-800">Tổng cộng</span>
                                        <span className="font-bold text-xl text-green-600">{formatPrice(total)}</span>
                                    </div>
                                </div>
                                
                                {/* Loyalty Points Option */}
                                {auth?.user && loyaltyPoints > 0 && (
                                    <div className="mt-4 p-4 bg-purple-50 rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="font-medium text-purple-800">Sử dụng điểm tích lũy</p>
                                                <p className="text-sm text-purple-600">{loyaltyPoints.toLocaleString('vi-VN')} điểm có sẵn</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={usePoints}
                                                    onChange={(e) => setUsePoints(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                            </label>
                                        </div>
                                        {usePoints && (
                                            <p className="text-sm text-purple-700">
                                                Giảm thêm {formatPrice(pointsDiscount)}
                                            </p>
                                        )}
                                    </div>
                                )}
                                
                                <button
                                    onClick={() => navigate("/checkout")}
                                    className="w-full mt-6 bg-green-600 text-white py-3 rounded-full font-semibold hover:bg-green-700 transition"
                                >
                                    TIẾP TỤC
                                </button>
                                <Link to="/" className="block text-center mt-3 text-gray-500 hover:text-green-600">
                                    ← Tiếp tục mua sắm
                                </Link>
                                
                                {/* Loyalty Points Link */}
                                {auth?.user && (
                                    <Link
                                        to="/loyalty"
                                        className="block text-center mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200"
                                    >
                                        <p className="text-sm text-purple-700 font-medium">
                                            💎 {loyaltyPoints.toLocaleString('vi-VN')} điểm tích lũy
                                        </p>
                                        <p className="text-xs text-purple-500">Nhấn để xem và đổi quà</p>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartPage;
