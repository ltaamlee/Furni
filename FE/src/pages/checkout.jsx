import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../components/context/authContext";
import { getCartApi, createOrderApi, getShippingProvidersApi, calculateShippingFeesApi } from "../utils/api";
import CheckoutSteps from "../components/common/CheckoutSteps";

const CheckoutPage = () => {
    const { auth } = useContext(AuthContext);
    const { user } = auth;
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cart, setCart] = useState(null);
    const [providers, setProviders] = useState([]);
    const [shippingFees, setShippingFees] = useState([]);

    // Form data
    const [customerInfo, setCustomerInfo] = useState({
        fullName: user?.fullName || "",
        phone: user?.phone || "",
        email: user?.email || ""
    });

    const [shippingInfo, setShippingInfo] = useState({
        address: "",
        city: "TP. Hồ Chí Minh",
        district: "",
        ward: "",
        note: "",
        selectedProvider: null
    });

    const formatPrice = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    useEffect(() => {
        fetchCart();
        fetchProviders();
    }, []);

    const fetchCart = async () => {
        try {
            const res = await getCartApi();
            if (res.success && res.data.products?.length > 0) {
                setCart(res.data);
            } else {
                navigate("/cart");
            }
        } catch (error) {
            navigate("/cart");
        } finally {
            setLoading(false);
        }
    };

    const fetchProviders = async () => {
        try {
            const res = await getShippingProvidersApi();
            if (res.success) {
                setProviders(res.data.providers || []);
            }
        } catch (error) {
            console.error("Error fetching providers:", error);
        }
    };

    const fetchShippingFees = async () => {
        if (!shippingInfo.city) return;
        try {
            const res = await calculateShippingFeesApi({
                city: shippingInfo.city,
                orderTotal: cart?.totalPrice || 0
            });
            if (res.success) {
                setShippingFees(res.data.fees || []);
            }
        } catch (error) {
            console.error("Error fetching shipping fees:", error);
        }
    };

    useEffect(() => {
        if (shippingInfo.city && cart?.totalPrice) {
            fetchShippingFees();
        }
    }, [shippingInfo.city, cart?.totalPrice]);

    const handleCustomerInfoSubmit = (e) => {
        e.preventDefault();
        if (!customerInfo.fullName || !customerInfo.phone || !customerInfo.email) {
            alert("Vui lòng điền đầy đủ thông tin!");
            return;
        }
        setStep(2);
    };

    const handleShippingSubmit = (e) => {
        e.preventDefault();
        if (!shippingInfo.address) {
            alert("Vui lòng nhập địa chỉ giao hàng!");
            return;
        }
        if (!shippingInfo.selectedProvider) {
            alert("Vui lòng chọn đơn vị vận chuyển!");
            return;
        }
        setStep(3);
    };

    const handlePlaceOrder = async () => {
        try {
            setSubmitting(true);
            const selectedProviderData = shippingFees.find(f => f.provider.code === shippingInfo.selectedProvider);

            const orderData = {
                shippingAddress: {
                    fullName: customerInfo.fullName,
                    phone: customerInfo.phone,
                    address: shippingInfo.address,
                    city: shippingInfo.city,
                    note: shippingInfo.note
                },
                paymentMethod: "COD",
                shippingProvider: shippingInfo.selectedProvider,
                shippingFee: selectedProviderData?.fee || 0
            };

            const res = await createOrderApi(orderData);
            if (res.success) {
                navigate(`/order-success/${res.data._id}`);
            } else {
                alert(res.message || "Đặt hàng thất bại!");
            }
        } catch (error) {
            alert(error.message || "Có lỗi xảy ra!");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    const selectedProviderData = shippingFees.find(f => f.provider.code === shippingInfo.selectedProvider);
    const subtotal = cart?.totalPrice || 0;
    const shippingFee = selectedProviderData?.fee || 0;
    const total = subtotal + shippingFee;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">THANH TOÁN ĐƠN HÀNG</h1>
                </div>

                {/* Progress Steps */}
                <CheckoutSteps currentStep={step} />

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        {/* Step 1: Customer Info */}
                        {step === 1 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="text-2xl">👤</span>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800">THÔNG TIN KHÁCH HÀNG</h2>
                                        <p className="text-gray-500 text-sm">Add your name, phone number and address.</p>
                                    </div>
                                </div>
                                <form onSubmit={handleCustomerInfoSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
                                        <input
                                            type="text"
                                            value={customerInfo.fullName}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, fullName: e.target.value })}
                                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            placeholder="Nhập họ và tên"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                                        <input
                                            type="tel"
                                            value={customerInfo.phone}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            placeholder="0xxx xxx xxx"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                        <input
                                            type="email"
                                            value={customerInfo.email}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            placeholder="email@example.com"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-green-600 text-white py-3 rounded-full font-semibold hover:bg-green-700 transition"
                                    >
                                        TIẾP TỤC
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Step 2: Shipping & Payment */}
                        {step === 2 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="text-2xl">🚚</span>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800">VẬN CHUYỂN</h2>
                                        <p className="text-gray-500 text-sm">With many payment method, included yours.</p>
                                    </div>
                                </div>
                                <form onSubmit={handleShippingSubmit} className="space-y-4">
                                    {/* Address */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ giao hàng *</label>
                                        <input
                                            type="text"
                                            value={shippingInfo.address}
                                            onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            placeholder="Số nhà, đường, phường/xã, quận/huyện"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành phố</label>
                                            <select
                                                value={shippingInfo.city}
                                                onChange={(e) => {
                                                    setShippingInfo({ ...shippingInfo, city: e.target.value, selectedProvider: null });
                                                }}
                                                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                                            >
                                                <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                                                <option value="Hà Nội">Hà Nội</option>
                                                <option value="Đà Nẵng">Đà Nẵng</option>
                                                <option value="Cần Thơ">Cần Thơ</option>
                                                <option value="Hải Phòng">Hải Phòng</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
                                        <textarea
                                            value={shippingInfo.note}
                                            onChange={(e) => setShippingInfo({ ...shippingInfo, note: e.target.value })}
                                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            placeholder="Ghi chú cho đơn hàng..."
                                            rows={2}
                                        />
                                    </div>

                                    {/* Shipping Providers */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Đơn vị vận chuyển *</label>
                                        <div className="space-y-2">
                                            {providers.length === 0 ? (
                                                <p className="text-gray-500 text-sm">Đang tải đơn vị vận chuyển...</p>
                                            ) : (
                                                shippingFees.map((fee) => (
                                                    <label
                                                        key={fee.provider.code}
                                                        className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition
                                                            ${shippingInfo.selectedProvider === fee.provider.code
                                                                ? 'border-green-500 bg-green-50'
                                                                : 'hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="provider"
                                                            value={fee.provider.code}
                                                            checked={shippingInfo.selectedProvider === fee.provider.code}
                                                            onChange={(e) => setShippingInfo({ ...shippingInfo, selectedProvider: e.target.value })}
                                                            className="w-5 h-5 text-green-600"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-medium">{fee.provider.name}</span>
                                                                <span className={`font-bold ${fee.isFree ? 'text-green-600' : 'text-gray-800'}`}>
                                                                    {fee.isFree ? 'MIỄN PHÍ' : formatPrice(fee.fee)}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-500">
                                                                Giao trong {fee.estimatedDays.min}-{fee.estimatedDays.max} ngày
                                                            </p>
                                                        </div>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Method */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Phương thức thanh toán</label>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-gray-50">
                                                <input
                                                    type="radio"
                                                    name="payment"
                                                    value="COD"
                                                    checked={true}
                                                    readOnly
                                                    className="w-5 h-5 text-green-600"
                                                />
                                                <span className="font-medium">💵 COD - Thanh toán khi nhận hàng</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-full font-semibold hover:bg-gray-300 transition"
                                        >
                                            ← QUAY LẠI
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 bg-green-600 text-white py-3 rounded-full font-semibold hover:bg-green-700 transition"
                                        >
                                            TIẾP TỤC
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {step === 3 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="text-2xl">📋</span>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800">XÁC NHẬN ĐẶT HÀNG</h2>
                                        <p className="text-gray-500 text-sm">Review all your information before the confimation.</p>
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className="border-b pb-4 mb-4">
                                    <h3 className="font-semibold text-gray-700 mb-2">👤 Thông tin khách hàng</h3>
                                    <p className="text-gray-600">{customerInfo.fullName}</p>
                                    <p className="text-gray-600">{customerInfo.phone} | {customerInfo.email}</p>
                                </div>

                                {/* Shipping Info */}
                                <div className="border-b pb-4 mb-4">
                                    <h3 className="font-semibold text-gray-700 mb-2">🚚 Địa chỉ giao hàng</h3>
                                    <p className="text-gray-600">{shippingInfo.address}</p>
                                    <p className="text-gray-600">{shippingInfo.city}</p>
                                    {shippingInfo.note && <p className="text-gray-500 text-sm italic">Ghi chú: {shippingInfo.note}</p>}
                                </div>

                                {/* Shipping Provider */}
                                <div className="border-b pb-4 mb-4">
                                    <h3 className="font-semibold text-gray-700 mb-2">🚚 Đơn vị vận chuyển</h3>
                                    <p className="text-gray-600">{selectedProviderData?.provider.name}</p>
                                    <p className="text-sm text-gray-500">
                                        Dự kiến giao: {selectedProviderData?.estimatedDays.min}-{selectedProviderData?.estimatedDays.max} ngày
                                    </p>
                                </div>

                                {/* Products */}
                                <div className="mb-4">
                                    <h3 className="font-semibold text-gray-700 mb-3">📦 Sản phẩm ({cart?.totalQuantity})</h3>
                                    <div className="space-y-3">
                                        {cart?.products.map((item) => (
                                            <div key={item.product._id || item.product} className="flex gap-3 items-center">
                                                <img
                                                    src={item.image || "/placeholder.png"}
                                                    alt={item.name}
                                                    className="w-16 h-16 object-cover rounded-lg"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800">{item.name}</p>
                                                    <p className="text-sm text-gray-500">x{item.quantity}</p>
                                                </div>
                                                <p className="font-bold text-green-600">{formatPrice(item.price * item.quantity)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-full font-semibold hover:bg-gray-300 transition"
                                    >
                                        ← QUAY LẠI
                                    </button>
                                    <button
                                        onClick={handlePlaceOrder}
                                        disabled={submitting}
                                        className="flex-1 bg-green-600 text-white py-3 rounded-full font-semibold hover:bg-green-700 transition disabled:opacity-50"
                                    >
                                        {submitting ? "ĐANG XỬ LÝ..." : "ĐẶT HÀNG"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">TÓM TẮT ĐƠN HÀNG</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Tạm tính ({cart?.totalQuantity} sản phẩm)</span>
                                    <span className="font-medium">{formatPrice(subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Phí vận chuyển</span>
                                    <span className="font-medium">
                                        {shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}
                                    </span>
                                </div>
                                {selectedProviderData?.isFree && (
                                    <p className="text-xs text-green-600">✓ Miễn phí vận chuyển!</p>
                                )}
                                {!selectedProviderData?.isFree && subtotal < 500000 && (
                                    <p className="text-xs text-orange-500">Mua thêm {formatPrice(500000 - subtotal)} để được miễn phí ship!</p>
                                )}
                                <div className="border-t pt-3 flex justify-between">
                                    <span className="font-bold text-gray-800">Tổng cộng</span>
                                    <span className="font-bold text-xl text-green-600">{formatPrice(total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
