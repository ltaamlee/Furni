import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getOrderByNumberApi } from "../../utils/api";

const OrderSuccessPage = () => {
    const { id } = useParams(); // id now contains orderNumber slug
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const fetchOrder = async () => {
        try {
            if (!id) {
                navigate("/");
                return;
            }
            const orderNumbers = decodeURIComponent(id)
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean);

            const recentRaw = localStorage.getItem("checkout_created_orders");
            if (recentRaw) {
                try {
                    const recent = JSON.parse(recentRaw);
                    const recentNumbers = Array.isArray(recent.orderNumbers) ? recent.orderNumbers : [];
                    const recentOrders = Array.isArray(recent.orders) ? recent.orders : [];
                    const isFresh = Date.now() - (recent.timestamp || 0) < 30 * 60 * 1000;
                    const belongsToThisSuccess = orderNumbers.some((orderNumber) => recentNumbers.includes(orderNumber));
                    if (isFresh && belongsToThisSuccess && recentOrders.length > 0) {
                        applyOrders(recentOrders);
                        return;
                    }
                } catch (_) {
                    localStorage.removeItem("checkout_created_orders");
                }
            }

            const responses = await Promise.all(orderNumbers.map((orderNumber) => getOrderByNumberApi(orderNumber)));
            const fetchedOrders = responses
                .filter((res) => res.success && res.data)
                .flatMap((res) => (
                    Array.isArray(res.data.relatedOrders) && res.data.relatedOrders.length > 0
                        ? res.data.relatedOrders
                        : [res.data]
                ));
            const uniqueFetchedOrders = Array.from(
                new Map(fetchedOrders.map((item) => [item._id || item.orderNumber, item])).values()
            );

            if (uniqueFetchedOrders.length > 0) {
                applyOrders(uniqueFetchedOrders);
            } else {
                navigate("/");
            }
        } catch (error) {
            navigate("/");
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    const getItemImage = (item) => {
        if (Array.isArray(item.images) && item.images.length > 0) {
            const first = item.images[0];
            if (typeof first === "string") return first;
            return first?.url || first || null;
        }
        return item.image || item.img || null;
    };

    const getShippingProviderLabel = (provider) => {
        if (!provider) return null;
        if (typeof provider === "string") return provider;
        if (typeof provider === "object") return provider.name || provider.code || null;
        return String(provider);
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: "bg-yellow-100 text-yellow-700",
            confirmed: "bg-blue-100 text-blue-700",
            preparing: "bg-orange-100 text-orange-700",
            shipping: "bg-purple-100 text-purple-700",
            delivered: "bg-green-100 text-green-700",
            cancelled: "bg-red-100 text-red-700"
        };
        return colors[status] || "bg-gray-100 text-gray-700";
    };

    const getStatusText = (status) => {
        const texts = {
            pending: "Đơn hàng mới",
            confirmed: "Đã xác nhận",
            preparing: "Đang chuẩn bị",
            shipping: "Đang giao hàng",
            delivered: "Đã giao thành công",
            cancelled: "Đã hủy"
        };
        return texts[status] || status;
    };

    const buildCombinedOrder = (list) => list.length === 1
        ? list[0]
        : {
            ...list[0],
            orderNumber: list.map((item) => item.orderNumber).join(", "),
            products: list.flatMap((item) => item.products || []),
            subtotal: list.reduce((sum, item) => sum + (item.subtotal || 0), 0),
            shippingFee: list.reduce((sum, item) => sum + (item.shippingFee || 0), 0),
            couponDiscount: list.reduce((sum, item) => sum + (item.couponDiscount || 0), 0),
            totalPrice: list.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
            totalQuantity: list.reduce((sum, item) => sum + (item.totalQuantity || 0), 0),
        };

    const applyOrders = (list) => {
        setOrders(list);
        setOrder(buildCombinedOrder(list));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF7F4] py-10">
            <div className="max-w-2xl mx-auto px-4">
                {/* Success Header */}
                <div className="bg-white rounded-2xl border border-[#EDE8E0] p-8 text-center mb-5">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" className="w-10 h-10">
                            <path d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-extrabold text-[#1C1108] mb-2">Đặt hàng thành công!</h1>
                    <p className="text-sm text-[#A8896A]">Cảm ơn bạn đã đặt hàng tại Furni</p>
                    <div className="mt-5 p-4 bg-[#FAF7F4] rounded-xl">
                        <p className="text-xs text-[#A8896A]">Mã đơn hàng</p>
                        <p className="text-xl font-extrabold text-[#B86B05]">{order?.orderNumber}</p>
                        {orders.length > 1 && (
                            <p className="text-xs text-[#A8896A] mt-1">Đơn hàng được tách thành {orders.length} đơn theo cửa hàng.</p>
                        )}
                    </div>
                </div>

                {orders.length > 1 && (
                    <div className="bg-white rounded-2xl border border-[#EDE8E0] p-6 mb-5">
                        <h2 className="text-base font-bold text-[#1C1108] mb-4">Các đơn theo cửa hàng</h2>
                        <div className="space-y-4">
                            {orders.map((orderItem) => (
                                <div key={orderItem._id || orderItem.orderNumber} className="border border-[#EDE8E0] rounded-xl p-4">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div>
                                            <p className="text-xs text-[#A8896A]">Mã đơn</p>
                                            <p className="text-sm font-extrabold text-[#B86B05]">{orderItem.orderNumber}</p>
                                            <p className="text-xs text-[#6B5C4C] mt-1">{orderItem.shopName || orderItem.shop?.name || "Cửa hàng"}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(orderItem.status)}`}>
                                            {getStatusText(orderItem.status)}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {(orderItem.products || []).map((item, idx) => (
                                            <div key={`${orderItem.orderNumber}-${idx}`} className="flex gap-3 items-start">
                                                <img
                                                    src={getItemImage(item) || "/placeholder.png"}
                                                    alt={item.name}
                                                    className="w-14 h-14 object-cover rounded-lg border border-[#EDE8E0] shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-[#1C1108] line-clamp-2">{item.name}</p>
                                                    {item.variant && (
                                                        <p className="text-[10px] text-[#A8896A] mt-0.5">Phân loại: {item.variant}</p>
                                                    )}
                                                    {/* Giá: gốc + giảm + số lượng */}
                                                    <div className="flex items-center flex-wrap gap-1.5 mt-1">
                                                        {item.originalPrice && item.discount > 0 ? (
                                                            <>
                                                                <span className="text-xs font-bold text-[#B86B05]">{formatPrice(item.price)}</span>
                                                                <span className="text-xs text-[#A8896A] line-through">{formatPrice(item.originalPrice)}</span>
                                                                <span className="px-1 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded">-{item.discount}%</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs font-semibold text-[#B86B05]">{formatPrice(item.price)}</span>
                                                        )}
                                                        <span className="text-xs text-[#A8896A] ml-auto">×{item.quantity}</span>
                                                    </div>
                                                </div>
                                                <p className="font-bold text-sm text-[#1C1108] shrink-0">{formatPrice(item.price * item.quantity)}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between pt-3 mt-3 border-t border-[#EDE8E0] text-sm">
                                        <span className="font-semibold text-[#6B5C4C]">Tổng đơn</span>
                                        <span className="font-extrabold text-[#B86B05]">{formatPrice(orderItem.totalPrice)}</span>
                                    </div>
                                    {orderItem.couponDiscount > 0 && orderItem.couponCode && (
                                        <div className="flex justify-between text-xs text-green-600 mt-1">
                                            <span>Giảm ({orderItem.couponCode})</span>
                                            <span>-{formatPrice(orderItem.couponDiscount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-xs text-[#A8896A] mt-1">
                                        <span>Phí vận chuyển</span>
                                        <span className={orderItem.shippingFee === 0 ? "text-green-600" : ""}>
                                            {orderItem.shippingFee === 0 ? "Miễn phí" : formatPrice(orderItem.shippingFee)}
                                        </span>
                                    </div>
                                    {orderItem.shippingProvider && getShippingProviderLabel(orderItem.shippingProvider) && (
                                        <div className="flex justify-between text-xs text-[#A8896A] mt-1">
                                            <span>Đơn vị vận chuyển</span>
                                            <span className="text-[#6B5C4C]">{getShippingProviderLabel(orderItem.shippingProvider)}</span>
                                        </div>
                                    )}
                                    {orderItem.trackingNumber && (
                                        <div className="flex justify-between text-xs text-[#A8896A] mt-1">
                                            <span>Mã vận đơn</span>
                                            <span className="font-mono text-[#B86B05] font-semibold">{orderItem.trackingNumber}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Order Info */}
                <div className="bg-white rounded-2xl border border-[#EDE8E0] p-6 mb-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-[#1C1108]">Thông tin</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order?.status)}`}>
                            {getStatusText(order?.status)}
                        </span>
                    </div>

                    <div className="border-b border-[#EDE8E0] pb-4 mb-4">
                        <h3 className="text-xs font-semibold text-[#A8896A] mb-1">Địa chỉ giao hàng</h3>
                        <p className="font-semibold text-sm text-[#1C1108]">{order?.shippingAddress?.fullName}</p>
                        <p className="text-sm text-[#6B5C4C]">{order?.shippingAddress?.phone}</p>
                        <p className="text-sm text-[#6B5C4C]">
                            {[order?.shippingAddress?.address,
                              order?.shippingAddress?.wardName,
                              order?.shippingAddress?.districtName,
                              order?.shippingAddress?.provinceName].filter(Boolean).join(", ")}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold text-[#A8896A] mb-3">Sản phẩm đã đặt</h3>
                        <div className="space-y-3">
                            {order?.products?.map((item, idx) => (
                                <div key={idx} className="flex gap-3 items-center">
                                    <img
                                        src={getItemImage(item) || "/placeholder.png"}
                                        alt={item.name}
                                        className="w-14 h-14 object-cover rounded-lg border border-[#EDE8E0]"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#1C1108] line-clamp-1">{item.name}</p>
                                        {item.shopName && (
                                            <p className="text-[10px] text-[#A8896A] line-clamp-1">{item.shopName}</p>
                                        )}
                                        {item.variant && (
                                            <p className="text-[10px] text-[#A8896A]">Phân loại: {item.variant}</p>
                                        )}
                                        {/* Price: giá gốc + giảm */}
                                        <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                                            {item.originalPrice && item.discount > 0 ? (
                                                <>
                                                    <span className="text-xs font-bold text-[#B86B05]">{formatPrice(item.price)}</span>
                                                    <span className="text-xs text-[#A8896A] line-through">{formatPrice(item.originalPrice)}</span>
                                                    <span className="px-1 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded">-{item.discount}%</span>
                                                </>
                                            ) : (
                                                <span className="text-xs font-semibold text-[#B86B05]">{formatPrice(item.price)}</span>
                                            )}
                                            <span className="text-xs text-[#A8896A] ml-auto">x{item.quantity}</span>
                                        </div>
                                    </div>
                                    <p className="font-bold text-sm text-[#1C1108]">{formatPrice(item.price * item.quantity)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-white rounded-2xl border border-[#EDE8E0] p-6 mb-5">
                    <h3 className="text-base font-bold text-[#1C1108] mb-4">Thanh toán</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#6B5C4C]">Tạm tính</span>
                            <span className="text-[#1C1108] font-medium">{formatPrice(order?.subtotal)}</span>
                        </div>
                        {order?.couponDiscount > 0 && (
                            <div className="flex justify-between">
                                <span className="text-[#6B5C4C]">Giảm giá {order?.couponCode ? `(${order.couponCode})` : ""}</span>
                                <span className="text-green-600 font-medium">-{formatPrice(order?.couponDiscount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-[#6B5C4C]">Phí vận chuyển</span>
                            <span className="text-[#1C1108] font-medium">
                                {order?.shippingFee === 0 ? <span className="text-green-600">Miễn phí</span> : formatPrice(order?.shippingFee)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-[#EDE8E0]">
                            <span className="font-bold text-[#1C1108]">Tổng cộng</span>
                            <span className="font-extrabold text-xl text-[#B86B05]">{formatPrice(order?.totalPrice)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#EDE8E0]">
                            <span className="text-[#6B5C4C]">Phương thức</span>
                            <span className="font-semibold text-sm text-[#1C1108]">
                                {order?.paymentMethod === "COD" ? "💵 COD — Thanh toán khi nhận hàng" :
                                 order?.paymentMethod === "VNPAY" ? "🔵 VNPay" :
                                 order?.paymentMethod === "WALLET" ? "👛 Ví SORA" :
                                 `💵 ${order?.paymentMethod}`}
                            </span>
                        </div>
                        {order?.paymentStatus === "paid" && (
                            <div className="flex justify-between">
                                <span className="text-[#6B5C4C]">Trạng thái thanh toán</span>
                                <span className="font-semibold text-sm text-green-600">✓ Đã thanh toán</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Link
                        to="/orders"
                        className="flex-1 bg-[#EDE8E0] text-[#6B5C4C] py-3.5 rounded-xl font-semibold text-sm text-center hover:bg-[#D5C9BC] transition-colors active:scale-[0.98]"
                    >
                        📦 Xem đơn hàng
                    </Link>
                    <Link
                        to="/"
                        className="flex-1 bg-[#B86B05] text-white py-3.5 rounded-xl font-semibold text-sm text-center hover:bg-[#95520B] transition-colors active:scale-[0.98]"
                    >
                        🛍️ Tiếp tục mua sắm
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccessPage;
