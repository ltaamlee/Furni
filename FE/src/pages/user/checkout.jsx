import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../components/context/authContext";
import { getCartApi, createOrderApi, getShippingProvidersApi, calculateShippingFeesApi, createPayOSPaymentWithCartApi } from "../../utils/api";
import CheckoutSteps from "../../components/common/CheckoutSteps";

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

    const [paymentMethod, setPaymentMethod] = useState("COD");

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
                paymentMethod: paymentMethod,
                shippingProvider: shippingInfo.selectedProvider,
                shippingFee: selectedProviderData?.fee || 0
            };

            // Nếu là COD thì tạo đơn hàng trực tiếp
            if (paymentMethod === "COD") {
                const res = await createOrderApi(orderData);
                if (res.success) {
                    navigate(`/order-success/${res.data._id}`);
                } else {
                    alert(res.message || "Đặt hàng thất bại!");
                }
            } else if (paymentMethod === "PAYOS") {
                // Nếu là PayOS thì gọi API tạo payment link
                const res = await createPayOSPaymentWithCartApi(orderData);
                if (res.success && res.data.checkoutUrl) {
                    // Chuyển hướng đến trang thanh toán PayOS
                    window.location.href = res.data.checkoutUrl;
                } else {
                    alert(res.message || "Không thể tạo thanh toán PayOS!");
                }
            }
        } catch (error) {
            alert(error.message || "Có lỗi xảy ra!");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4]">
                <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin"></div>
            </div>
        );
    }

    const selectedProviderData = shippingFees.find(f => f.provider.code === shippingInfo.selectedProvider);
    const subtotal = cart?.totalPrice || 0;
    const shippingFee = selectedProviderData?.fee || 0;
    const total = subtotal + shippingFee;

    return (
        <div className="min-h-screen bg-[#FAF7F4] py-10">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#1C1108]">THANH TOÁN ĐƠN HÀNG</h1>
                    <p className="text-sm text-[#A8896A] mt-1">Hoàn tất đơn hàng của bạn</p>
                </div>

                {/* Progress Steps */}
                <CheckoutSteps currentStep={step} />

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        {/* Step 1: Customer Info */}
                        {step === 1 && (
                            <div className="bg-white rounded-2xl border border-[#EDE8E0] p-6 md:p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-[#B86B05]/10 rounded-xl flex items-center justify-center">
                                        <span className="text-lg">👤</span>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-[#1C1108]">THÔNG TIN KHÁCH HÀNG</h2>
                                        <p className="text-xs text-[#A8896A] mt-0.5">Vui lòng điền đầy đủ thông tin</p>
                                    </div>
                                </div>
                                <form onSubmit={handleCustomerInfoSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-[#1C1108] mb-1.5">Họ và tên *</label>
                                        <input
                                            type="text"
                                            value={customerInfo.fullName}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, fullName: e.target.value })}
                                            className="input"
                                            placeholder="Nhập họ và tên"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#1C1108] mb-1.5">Số điện thoại *</label>
                                        <input
                                            type="tel"
                                            value={customerInfo.phone}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                            className="input"
                                            placeholder="0xxx xxx xxx"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#1C1108] mb-1.5">Email *</label>
                                        <input
                                            type="email"
                                            value={customerInfo.email}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                            className="input"
                                            placeholder="email@example.com"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full btn-primary py-3.5 mt-2"
                                    >
                                        TIẾP TỤC →
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Step 2: Shipping & Payment */}
                        {step === 2 && (
                            <div className="bg-white rounded-2xl border border-[#EDE8E0] p-6 md:p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-[#B86B05]/10 rounded-xl flex items-center justify-center">
                                        <span className="text-lg">🚚</span>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-[#1C1108]">VẬN CHUYỂN</h2>
                                        <p className="text-xs text-[#A8896A] mt-0.5">Chọn đơn vị vận chuyển và phương thức thanh toán</p>
                                    </div>
                                </div>
                                <form onSubmit={handleShippingSubmit} className="space-y-5">
                                    {/* Address */}
                                    <div>
                                        <label className="block text-sm font-semibold text-[#1C1108] mb-1.5">Địa chỉ giao hàng *</label>
                                        <input
                                            type="text"
                                            value={shippingInfo.address}
                                            onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                                            className="input"
                                            placeholder="Số nhà, đường, phường/xã, quận/huyện"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#1C1108] mb-1.5">Tỉnh/Thành phố</label>
                                        <select
                                            value={shippingInfo.city}
                                            onChange={(e) => {
                                                setShippingInfo({ ...shippingInfo, city: e.target.value, selectedProvider: null });
                                            }}
                                            className="input"
                                        >
                                            <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                                            <option value="Hà Nội">Hà Nội</option>
                                            <option value="Đà Nẵng">Đà Nẵng</option>
                                            <option value="Cần Thơ">Cần Thơ</option>
                                            <option value="Hải Phòng">Hải Phòng</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#1C1108] mb-1.5">Ghi chú (tùy chọn)</label>
                                        <textarea
                                            value={shippingInfo.note}
                                            onChange={(e) => setShippingInfo({ ...shippingInfo, note: e.target.value })}
                                            className="input resize-none"
                                            placeholder="Ghi chú cho đơn hàng..."
                                            rows={2}
                                        />
                                    </div>

                                    {/* Shipping Providers */}
                                    <div>
                                        <label className="block text-sm font-semibold text-[#1C1108] mb-3">Đơn vị vận chuyển *</label>
                                        <div className="space-y-2">
                                            {providers.length === 0 ? (
                                                <p className="text-sm text-[#A8896A] py-4 text-center">Đang tải đơn vị vận chuyển...</p>
                                            ) : (
                                                shippingFees.map((fee) => (
                                                    <label
                                                        key={fee.provider.code}
                                                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                                                            shippingInfo.selectedProvider === fee.provider.code
                                                                ? 'border-[#B86B05] bg-[#B86B05]/5'
                                                                : 'border-[#EDE8E0] hover:border-[#D5C9BC]'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="provider"
                                                            value={fee.provider.code}
                                                            checked={shippingInfo.selectedProvider === fee.provider.code}
                                                            onChange={(e) => setShippingInfo({ ...shippingInfo, selectedProvider: e.target.value })}
                                                            className="w-4 h-4 accent-[#B86B05]"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-semibold text-sm text-[#1C1108]">{fee.provider.name}</span>
                                                                <span className={`font-bold text-sm ${fee.isFree ? 'text-green-600' : 'text-[#1C1108]'}`}>
                                                                    {fee.isFree ? 'MIỄN PHÍ' : formatPrice(fee.fee)}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-[#A8896A] mt-0.5">
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
                                        <label className="block text-sm font-semibold text-[#1C1108] mb-3">Phương thức thanh toán</label>
                                        <div className="space-y-2">
                                            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                                                paymentMethod === "COD" ? 'border-[#B86B05] bg-[#B86B05]/5' : 'border-[#EDE8E0] hover:border-[#D5C9BC]'
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="payment"
                                                    value="COD"
                                                    checked={paymentMethod === "COD"}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    className="w-4 h-4 accent-[#B86B05]"
                                                />
                                                <span className="font-semibold text-sm text-[#1C1108]">💵 COD - Thanh toán khi nhận hàng</span>
                                            </label>

                                            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                                                paymentMethod === "PAYOS" ? 'border-[#B86B05] bg-[#B86B05]/5' : 'border-[#EDE8E0] hover:border-[#D5C9BC]'
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="payment"
                                                    value="PAYOS"
                                                    checked={paymentMethod === "PAYOS"}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    className="w-4 h-4 accent-[#B86B05]"
                                                />
                                                <span className="font-semibold text-sm text-[#1C1108]">💳 PayOS - Thanh toán qua Ví điện tử / Ngân hàng</span>
                                            </label>
                                        </div>
                                        {paymentMethod === "PAYOS" && (
                                            <p className="mt-2 text-xs text-[#A8896A]">
                                                Bạn sẽ được chuyển đến cổng thanh toán PayOS để hoàn tất thanh toán.
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="flex-1 btn-secondary py-3.5"
                                        >
                                            ← QUAY LẠI
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 btn-primary py-3.5"
                                        >
                                            TIẾP TỤC →
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {step === 3 && (
                            <div className="bg-white rounded-2xl border border-[#EDE8E0] p-6 md:p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-[#B86B05]/10 rounded-xl flex items-center justify-center">
                                        <span className="text-lg">📋</span>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-[#1C1108]">XÁC NHẬN ĐẶT HÀNG</h2>
                                        <p className="text-xs text-[#A8896A] mt-0.5">Kiểm tra thông tin trước khi xác nhận</p>
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className="border-b border-[#EDE8E0] pb-4 mb-4">
                                    <h3 className="font-semibold text-sm text-[#1C1108] mb-2 flex items-center gap-2">👤 Thông tin khách hàng</h3>
                                    <p className="text-sm text-[#6B5C4C]">{customerInfo.fullName}</p>
                                    <p className="text-sm text-[#6B5C4C]">{customerInfo.phone} | {customerInfo.email}</p>
                                </div>

                                {/* Shipping Info */}
                                <div className="border-b border-[#EDE8E0] pb-4 mb-4">
                                    <h3 className="font-semibold text-sm text-[#1C1108] mb-2 flex items-center gap-2">🚚 Địa chỉ giao hàng</h3>
                                    <p className="text-sm text-[#6B5C4C]">{shippingInfo.address}, {shippingInfo.city}</p>
                                    {shippingInfo.note && <p className="text-xs text-[#A8896A] italic mt-1">Ghi chú: {shippingInfo.note}</p>}
                                </div>

                                {/* Shipping Provider */}
                                <div className="border-b border-[#EDE8E0] pb-4 mb-4">
                                    <h3 className="font-semibold text-sm text-[#1C1108] mb-2 flex items-center gap-2">📦 Đơn vị vận chuyển</h3>
                                    <p className="text-sm text-[#6B5C4C]">{selectedProviderData?.provider.name}</p>
                                    <p className="text-xs text-[#A8896A]">Dự kiến giao: {selectedProviderData?.estimatedDays.min}-{selectedProviderData?.estimatedDays.max} ngày</p>
                                </div>

                                {/* Payment Method */}
                                <div className="border-b border-[#EDE8E0] pb-4 mb-4">
                                    <h3 className="font-semibold text-sm text-[#1C1108] mb-2 flex items-center gap-2">💳 Phương thức thanh toán</h3>
                                    <p className="text-sm text-[#6B5C4C]">
                                        {paymentMethod === "COD" ? "💵 COD - Thanh toán khi nhận hàng" : "💳 PayOS - Thanh toán qua Ví điện tử / Ngân hàng"}
                                    </p>
                                </div>

                                {/* Products */}
                                <div className="mb-5">
                                    <h3 className="font-semibold text-sm text-[#1C1108] mb-3 flex items-center gap-2">🛒 Sản phẩm ({cart?.totalQuantity})</h3>
                                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                                        {cart?.products.map((item) => (
                                            <div key={item.product._id || item.product} className="flex gap-3 items-center">
                                                <img
                                                    src={item.image || "/placeholder.png"}
                                                    alt={item.name}
                                                    className="w-14 h-14 object-cover rounded-lg"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-[#1C1108] line-clamp-1">{item.name}</p>
                                                    <p className="text-xs text-[#A8896A]">x{item.quantity}</p>
                                                </div>
                                                <p className="font-bold text-sm text-[#1C1108]">{formatPrice(item.price * item.quantity)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="flex-1 btn-secondary py-3.5"
                                    >
                                        ← QUAY LẠI
                                    </button>
                                    <button
                                        onClick={handlePlaceOrder}
                                        disabled={submitting}
                                        className="flex-1 btn-primary py-3.5 disabled:opacity-50"
                                    >
                                        {submitting ? "ĐANG XỬ LÝ..." : paymentMethod === "PAYOS" ? "THANH TOÁN NGAY" : "ĐẶT HÀNG"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl border border-[#EDE8E0] p-6 sticky top-24">
                            <h3 className="text-base font-bold text-[#1C1108] mb-5">TÓM TẮT ĐƠN HÀNG</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-[#6B5C4C]">Tạm tính ({cart?.totalQuantity} sản phẩm)</span>
                                    <span className="font-semibold text-[#1C1108]">{formatPrice(subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#6B5C4C]">Phí vận chuyển</span>
                                    <span className="font-semibold text-[#1C1108]">
                                        {shippingFee === 0 ? <span className="text-green-600">Miễn phí</span> : formatPrice(shippingFee)}
                                    </span>
                                </div>
                                {selectedProviderData?.isFree && (
                                    <p className="text-xs text-green-600 font-medium">✓ Miễn phí vận chuyển!</p>
                                )}
                                {!selectedProviderData?.isFree && subtotal < 500000 && (
                                    <p className="text-xs text-orange-500">Mua thêm {formatPrice(500000 - subtotal)} để được miễn phí ship!</p>
                                )}
                                <div className="border-t border-[#EDE8E0] pt-3 flex justify-between">
                                    <span className="font-bold text-[#1C1108]">Tổng cộng</span>
                                    <span className="font-extrabold text-xl text-[#B86B05]">{formatPrice(total)}</span>
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
