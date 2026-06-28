import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getOrderByIdApi, cancelOrderApi, confirmReceivedApi, cancelPayOSPaymentApi } from "../../utils/api";
import OrderBillModal from "../../components/common/OrderBillModal";

const OrderDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [payosCountdown, setPayosCountdown] = useState(null); // seconds remaining for PayOS
    const [billModalOpen, setBillModalOpen] = useState(false);

    useEffect(() => {
        fetchOrder();
    }, [id]);

    // PayOS countdown timer — auto-refresh khi hết hạn
    useEffect(() => {
        if (payosCountdown === null || payosCountdown <= 0) return;
        const timer = setInterval(() => {
            setPayosCountdown((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(timer);
                    fetchOrder(); // re-fetch để cập nhật trạng thái
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [payosCountdown]);

    const fetchOrder = async () => {
        try {
            const res = await getOrderByIdApi(id);
            if (res.success) {
                const o = res.data;
                setOrder(o);

                // Compute PayOS countdown from paymentExpiresAt
                if (
                    o.paymentMethod === "PAYOS" &&
                    o.paymentStatus === "pending" &&
                    o.status === "pending" &&
                    o.paymentExpiresAt
                ) {
                    const remaining = Math.max(
                        0,
                        Math.floor((new Date(o.paymentExpiresAt) - Date.now()) / 1000)
                    );
                    setPayosCountdown(remaining);
                } else {
                    setPayosCountdown(null);
                }
            } else {
                navigate("/orders");
            }
        } catch (error) {
            navigate("/orders");
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    const formatPayOSCountdown = (seconds) => {
        if (seconds === null || seconds === undefined) return null;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString("vi-VN", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: "bg-amber-50 text-amber-700 border border-amber-200",
            confirmed: "bg-blue-50 text-blue-700 border border-blue-200",
            preparing: "bg-orange-50 text-orange-700 border border-orange-200",
            shipping: "bg-purple-50 text-purple-700 border border-purple-200",
            delivered: "bg-green-50 text-green-700 border border-green-200",
            cancelled: "bg-red-50 text-red-600 border border-red-200",
            cancel_requested: "bg-red-50 text-red-600 border border-red-200"
        };
        return colors[status] || "bg-gray-50 text-gray-600 border border-gray-200";
    };

    const getStatusText = (status) => {
        const texts = {
            pending: "Chờ xác nhận",
            confirmed: "Đã xác nhận",
            preparing: "Đang chuẩn bị",
            shipping: "Đang giao hàng",
            delivered: "Giao hàng thành công",
            cancelled: "Đã hủy",
            cancel_requested: "Yêu cầu hủy"
        };
        return texts[status] || status;
    };

    const canCancel = () => {
        if (!order) return false;
        const thirtyMinutes = 30 * 60 * 1000;
        const timePassed = Date.now() - new Date(order.orderedAt || order.createdAt).getTime();
        return timePassed < thirtyMinutes && ["pending", "confirmed"].includes(order.status);
    };

    const canRequestCancel = () => {
        return order?.status === "preparing";
    };

    const handleCancel = async () => {
        const reason = prompt("Nhập lý do hủy (không bắt buộc):");
        try {
            setCancelling(true);
            let res;
            if (order.paymentMethod === "PAYOS" && order.paymentStatus === "pending") {
                res = await cancelPayOSPaymentApi(order._id);
            } else {
                res = await cancelOrderApi(order._id, reason);
            }
            if (res.success) {
                alert(res.message);
                fetchOrder();
            } else {
                alert(res.message || "Hủy đơn thất bại!");
            }
        } catch (error) {
            alert(error.message || "Có lỗi xảy ra!");
        } finally {
            setCancelling(false);
        }
    };

    const handleConfirmReceived = async () => {
        if (!confirm("Bạn đã nhận được hàng và hài lòng với đơn hàng?")) return;
        try {
            setConfirming(true);
            const res = await confirmReceivedApi(order._id);
            if (res.success) {
                alert("Xác nhận nhận hàng thành công!");
                fetchOrder();
            } else {
                alert(res.message || "Xác nhận thất bại!");
            }
        } catch (error) {
            alert(error.message || "Có lỗi xảy ra!");
        } finally {
            setConfirming(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4]">
                <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4]">
                <p className="text-[#A8896A]">Không tìm thấy đơn hàng</p>
            </div>
        );
    }

    // Progress steps
    const steps = [
        { num: 1, label: "Đặt hàng thành công", icon: "✓" },
        { num: 2, label: "Đã xác nhận", icon: "✓" },
        { num: 3, label: "Đang chuẩn bị", icon: "✓" },
        { num: 4, label: "Đang giao", icon: "✓" },
        { num: 5, label: "Giao hàng thành công", icon: "✓" }
    ];

    const orderStepIndex = {
        pending: 0, confirmed: 1, preparing: 2,
        shipping: 3, delivered: 4, cancelled: -1, cancel_requested: -1
    };
    const currentStep = orderStepIndex[order.status] ?? -1;

    // Group products by shop
    const productGroups = order.products?.reduce((groups, item) => {
        const key = item.shopCode || "_default";
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
        return groups;
    }, {}) || {};

    return (
        <div className="min-h-screen bg-[#FAF7F4]">

            {/* ─── Progress Bar (Shopee-style top bar) ─── */}
            {order.status !== "cancelled" && order.status !== "cancel_requested" && (
                <div className="bg-gradient-to-r from-[#B86B05] to-[#D4881C]">
                    <div className="max-w-5xl mx-auto px-4 py-5">
                        <div className="flex items-center justify-between">
                            {steps.map((step, idx) => {
                                const done = idx < currentStep;
                                const active = idx === currentStep;
                                const future = idx > currentStep;
                                return (
                                    <div key={step.num} className="flex items-center flex-1 last:flex-none">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                                done || active ? "bg-white text-[#B86B05]" : "bg-white/30 text-white/60"
                                            }`}>
                                                {done ? "✓" : step.num}
                                            </div>
                                            <span className={`mt-1.5 text-xs font-medium text-center leading-tight ${
                                                active ? "text-white font-semibold" : done ? "text-white/90" : "text-white/50"
                                            }`}>
                                                {step.label}
                                            </span>
                                        </div>
                                        {idx < steps.length - 1 && (
                                            <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${
                                                idx < currentStep ? "bg-white" : "bg-white/30"
                                            }`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

                {/* ─── Cancelled / Cancel Requested Banner ─── */}
                {order.status === "cancel_requested" && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">⏳</span>
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-amber-800 text-sm">Yêu cầu hủy đang chờ xử lý</p>
                                <p className="text-xs text-amber-600 mt-0.5">
                                    Lý do: {order.cancelRequest?.reason || "Không có"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {order.status === "cancelled" && (
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-5">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">❌</span>
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-red-700 text-sm">Đơn hàng đã bị hủy</p>
                                <p className="text-xs text-red-500 mt-0.5">
                                    Ngày hủy: {order.cancelledAt ? formatDate(order.cancelledAt) : "—"}
                                </p>
                                {order.cancelRequest?.reason && (
                                    <p className="text-xs text-red-500 mt-0.5">Lý do: {order.cancelRequest.reason}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── PayOS: countdown banner + nút thanh toán lại ─── */}
                {order.paymentMethod === "PAYOS" && order.paymentStatus === "pending" && order.status === "pending" && (
                    (() => {
                        const isExpired = payosCountdown !== null && payosCountdown <= 0;
                        return (
                            <div className={`rounded-2xl p-5 border ${
                                isExpired
                                    ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-200"
                                    : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
                            }`}>
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                        isExpired ? "bg-red-100" : "bg-amber-100"
                                    }`}>
                                        <span className="text-2xl">{isExpired ? "⏰" : "⏳"}</span>
                                    </div>
                                    <div className="flex-1">
                                        {isExpired ? (
                                            <>
                                                <p className="font-bold text-red-700 text-sm">Đơn hàng đã hết hạn thanh toán!</p>
                                                <p className="text-xs text-red-500 mt-0.5">
                                                    Bạn đã không thanh toán trong thời gian quy định. Đơn hàng sẽ tự động bị hủy.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <p className="font-bold text-amber-700 text-sm">Chờ thanh toán PayOS</p>
                                                    {payosCountdown !== null && (
                                                        <span className={`font-mono font-black text-lg tracking-wider ${
                                                            payosCountdown <= 60 ? "text-red-500 animate-pulse" : "text-amber-600"
                                                        }`}>
                                                            {formatPayOSCountdown(payosCountdown)}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-amber-600 mt-0.5">
                                                    Vui lòng thanh toán trước khi hết thời gian để tránh đơn tự động bị hủy.
                                                </p>
                                            </>
                                        )}
                                        {order.paymentExpiresAt && (
                                            <p className="text-xs text-amber-500 mt-1">
                                                Hạn thanh toán: {formatDate(order.paymentExpiresAt)}
                                            </p>
                                        )}
                                        {/* Nút thanh toán lại */}
                                        {!isExpired && order.paymentExpiresAt && new Date(order.paymentExpiresAt) > new Date() && (
                                            <button
                                                onClick={() => navigate("/payment/payos/return?orderId=" + order._id)}
                                                className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-md hover:shadow-lg"
                                                style={{
                                                    background: "linear-gradient(135deg, #1a56db 0%, #1e40af 100%)",
                                                    boxShadow: "0 4px 14px rgba(29, 86, 219, 0.4)",
                                                }}
                                            >
                                                💳 Thanh toán ngay
                                            </button>
                                        )}
                                        {isExpired && (
                                            <button
                                                onClick={() => navigate("/")}
                                                className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 border border-amber-300 hover:bg-amber-200 transition-all"
                                            >
                                                🛍️ Tiếp tục mua sắm
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()
                )}

                {/* ─── Nhận hàng Banner (khi đang giao) ─── */}
                {order.status === "shipping" && (
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">📦</span>
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-purple-800 text-sm">Đơn hàng đang được giao đến bạn</p>
                                <p className="text-xs text-purple-600 mt-0.5">
                                    Vui lòng kiểm tra hàng trước khi bấm "Đã nhận được hàng"
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Product Cards (Shopee-style: each shop = one card) ─── */}
                {Object.entries(productGroups).map(([shopKey, items]) => (
                    <div key={shopKey} className="bg-white rounded-2xl overflow-hidden shadow-sm shadow-black/5 border border-[#EDE8E0]">
                        {/* Shop Header */}
                        <div className="flex items-center justify-between px-5 py-4 bg-[#FAF7F4] border-b border-[#EDE8E0]">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-[#B86B05]/10 rounded-full flex items-center justify-center">
                                    <span className="text-sm">🏪</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-[#1C1108]">
                                        {items[0]?.shopName || items[0]?.shopCode || "SORA FURNITURE"}
                                    </p>
                                    {items[0]?.shopOrderCode && (
                                        <p className="text-xs text-[#A8896A]">
                                            Mã đơn Shop: <span className="font-mono font-semibold text-[#B86B05]">{items[0].shopOrderCode}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                                {getStatusText(order.status)}
                            </span>
                        </div>

                        {/* Products in this shop */}
                        <div className="divide-y divide-[#F0EDE8]">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex gap-4 px-5 py-4 hover:bg-[#FDFCFA] transition-colors">
                                    <Link
                                        to={`/product/${item.product?.slug || item.product?._id || ''}`}
                                        className="shrink-0"
                                    >
                                        <img
                                            src={item.image || "/placeholder.png"}
                                            alt={item.name}
                                            className="w-20 h-20 object-cover rounded-xl flex-shrink-0 bg-[#FAF7F4]"
                                        />
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            to={`/product/${item.product?.slug || item.product?._id || ''}`}
                                            className="text-sm font-medium text-[#1C1108] line-clamp-2 leading-snug hover:text-[#B86B05] transition-colors"
                                        >
                                            {item.name}
                                        </Link>
                                        <p className="text-xs text-[#A8896A] mt-1">
                                            Phân loại: {item.variant || 'Mặc định'}
                                        </p>

                                        {/* Price display — giá gốc + giá giảm */}
                                        <div className="flex items-center flex-wrap gap-2 mt-2">
                                            {item.originalPrice && item.discount > 0 ? (
                                                <>
                                                    <span className="text-[#B86B05] font-bold text-sm">
                                                        {formatPrice(item.price)}
                                                    </span>
                                                    <span className="text-xs text-[#A8896A] line-through">
                                                        {formatPrice(item.originalPrice)}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded">
                                                        -{item.discount}%
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-xs font-medium text-[#B86B05]">
                                                    {formatPrice(item.price)}
                                                </span>
                                            )}
                                            <span className="text-xs text-[#A8896A] ml-auto">x{item.quantity}</span>
                                        </div>

                                        {/* Thành tiền */}
                                        <div className="flex items-center justify-between mt-2">
                                            {item.originalPrice && item.discount > 0 ? (
                                                <span className="text-xs text-[#A8896A]">Thành tiền:</span>
                                            ) : null}
                                            <span className="font-bold text-sm text-[#1C1108] ml-auto">
                                                {formatPrice(item.price * item.quantity)}
                                            </span>
                                        </div>

                                        {/* Nút đánh giá — chỉ khi đã giao */}
                                        {order.status === "delivered" && (
                                            <div className="mt-2">
                                                <Link
                                                    to={`/product/${item.product?.slug || item.product?._id || ''}?write-review=true`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#B86B05] text-[#B86B05] text-xs font-semibold rounded-lg hover:bg-[#B86B05] hover:text-white transition-colors"
                                                >
                                                    <span>⭐</span>
                                                    Đánh giá
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Shop summary footer */}
                        <div className="px-5 py-4 bg-[#FDFCFA] border-t border-[#F0EDE8] flex items-center justify-between gap-3">
                            {/* Cancel buttons */}
                            {canCancel() && order.status !== "cancelled" && order.status !== "cancel_requested" ? (
                                <button
                                    onClick={handleCancel}
                                    disabled={cancelling}
                                    className="px-4 py-2 border border-[#BF4343] text-[#BF4343] rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    {cancelling ? "Đang hủy..." : "Hủy đơn hàng"}
                                </button>
                            ) : canRequestCancel() ? (
                                <button
                                    onClick={handleCancel}
                                    disabled={cancelling}
                                    className="px-4 py-2 border border-[#BF4343] text-[#BF4343] rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    {cancelling ? "Đang xử lý..." : "Yêu cầu hủy đơn"}
                                </button>
                            ) : <div />}

                            {/* Nút Nhận hàng — khi đang giao */}
                            {order.status === "shipping" && (
                                <button
                                    onClick={handleConfirmReceived}
                                    disabled={confirming}
                                    className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors shadow-md shadow-green-600/20 disabled:opacity-60"
                                >
                                    {confirming ? "Đang xác nhận..." : "✓ Đã nhận được hàng"}
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {/* ─── Delivery / Shipping Info Card ─── */}
                <div className="bg-white rounded-2xl shadow-sm shadow-black/5 border border-[#EDE8E0] overflow-hidden">
                    <div className="px-5 py-4 bg-[#FAF7F4] border-b border-[#EDE8E0]">
                        <h3 className="text-sm font-bold text-[#1C1108] flex items-center gap-2">
                            <span className="text-base">🚚</span> Địa chỉ nhận hàng
                        </h3>
                    </div>
                    <div className="px-5 py-4">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-[#B86B05]/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <span className="text-lg">📍</span>
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-sm text-[#1C1108]">
                                    {order.shippingAddress?.fullName}
                                    <span className="font-normal text-[#A8896A] ml-2">{order.shippingAddress?.phone}</span>
                                </p>
                                <p className="text-sm text-[#6B5C4C] mt-0.5 leading-relaxed">
                                    {[order.shippingAddress?.address,
                                      order.shippingAddress?.wardName,
                                      order.shippingAddress?.districtName,
                                      order.shippingAddress?.provinceName].filter(Boolean).join(", ")}
                                </p>
                                {order.shippingAddress?.note && (
                                    <p className="text-xs text-[#A8896A] italic mt-1.5 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" />
                                        Ghi chú: {order.shippingAddress.note}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Lời nhắn cho shop ─── */}
                {(() => {
                    const notes = order.orderNotes;
                    const notesObj = (notes instanceof Map ? Object.fromEntries(notes) : (notes || {})) || order.orderNotesObject || {};
                    const noteValue = notesObj[order.shop?._id?.toString() || ''] || notesObj[order.shop] || '';
                    if (!noteValue) return null;
                    return (
                        <div className="bg-white rounded-2xl shadow-sm shadow-black/5 border border-[#EDE8E0] overflow-hidden">
                            <div className="px-5 py-4 bg-[#FAF7F4] border-b border-[#EDE8E0]">
                                <h3 className="text-sm font-bold text-[#1C1108] flex items-center gap-2">
                                    <span className="text-base">💬</span> Lời nhắn cho cửa hàng
                                </h3>
                            </div>
                            <div className="px-5 py-4">
                                <p className="text-sm text-[#6B5C4C] italic leading-relaxed">"{noteValue}"</p>
                            </div>
                        </div>
                    );
                })()}

                {/* ─── Payment Method Card ─── */}
                <div className="bg-white rounded-2xl shadow-sm shadow-black/5 border border-[#EDE8E0] overflow-hidden">
                    <div className="px-5 py-4 bg-[#FAF7F4] border-b border-[#EDE8E0]">
                        <h3 className="text-sm font-bold text-[#1C1108] flex items-center gap-2">
                            <span className="text-base">💳</span> Phương thức thanh toán
                        </h3>
                    </div>
                    <div className="px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#B86B05]/10 rounded-2xl flex items-center justify-center">
                                <span className="text-lg">{order.paymentMethod === "PAYOS" ? "💳" : "💵"}</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[#1C1108]">
                                    {order.paymentMethod === "COD" ? "Thanh toán khi nhận hàng (COD)" :
                                     order.paymentMethod === "PAYOS" ? "Thanh toán qua PayOS" :
                                     order.paymentMethod === "VNPAY" ? "VNPay" :
                                     order.paymentMethod === "WALLET" ? "Ví SORA" : order.paymentMethod}
                                </p>
                                <p className="text-xs text-[#A8896A] mt-0.5">
                                    {order.paymentStatus === "paid" ? "✓ Đã thanh toán" :
                                     order.paymentStatus === "pending" ? "Chờ thanh toán" :
                                     "Chưa thanh toán"}
                                </p>
                            </div>
                        </div>
                        {order.paymentStatus === "paid" && (
                            <span className="px-3 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-semibold">
                                ✓ Đã thanh toán
                            </span>
                        )}
                    </div>
                </div>

                {/* ─── Price Summary Card (Shopee-style) ─── */}
                <div className="bg-white rounded-2xl shadow-sm shadow-black/5 border border-[#EDE8E0] overflow-hidden">
                    <div className="px-5 py-4 bg-[#FAF7F4] border-b border-[#EDE8E0]">
                        <h3 className="text-sm font-bold text-[#1C1108] flex items-center gap-2">
                            <span className="text-base">💰</span> Thanh toán
                        </h3>
                    </div>
                    <div className="px-5 py-4 space-y-2.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-[#6B5C4C]">Tổng tiền sản phẩm</span>
                            <span className="text-[#1C1108] font-medium">{formatPrice(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-[#6B5C4C]">Phí vận chuyển</span>
                            <span className={`font-medium ${order.shippingFee === 0 ? "text-green-600" : "text-[#1C1108]"}`}>
                                {order.shippingFee === 0 ? "Miễn phí" : formatPrice(order.shippingFee)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-[#EDE8E0]">
                            <span className="text-base font-bold text-[#1C1108]">Tổng số tiền</span>
                            <span className="text-xl font-extrabold text-[#B86B05]">{formatPrice(order.totalPrice)}</span>
                        </div>
                    </div>
                </div>

                {/* ─── Order Info Card ─── */}
                <div className="bg-white rounded-2xl shadow-sm shadow-black/5 border border-[#EDE8E0] overflow-hidden">
                    <div className="px-5 py-4 bg-[#FAF7F4] border-b border-[#EDE8E0]">
                        <h3 className="text-sm font-bold text-[#1C1108] flex items-center gap-2">
                            <span className="text-base">📋</span> Thông tin đơn hàng
                        </h3>
                    </div>
                    <div className="px-5 py-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#A8896A]">Mã đơn hàng</span>
                            <span className="font-mono font-semibold text-[#1C1108]">{order.orderNumber || order._id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#A8896A]">Ngày đặt</span>
                            <span className="text-[#6B5C4C]">{formatDate(order.createdAt)}</span>
                        </div>
                        {order.deliveredAt && (
                            <div className="flex justify-between">
                                <span className="text-[#A8896A]">Ngày nhận hàng</span>
                                <span className="text-[#6B5C4C]">{formatDate(order.deliveredAt)}</span>
                            </div>
                        )}
                        {order.shippingProvider && (
                            <div className="flex justify-between">
                                <span className="text-[#A8896A]">Đơn vị vận chuyển</span>
                                <span className="text-[#6B5C4C]">{order.shippingProvider}</span>
                            </div>
                        )}
                        {order.trackingNumber && (
                            <div className="flex justify-between">
                                <span className="text-[#A8896A]">Mã vận đơn</span>
                                <span className="font-mono font-semibold text-[#B86B05]">{order.trackingNumber}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Action Buttons ─── */}
                <div className="flex items-center justify-between pt-2 pb-6">
                    <Link
                        to="/orders"
                        className="px-5 py-2.5 bg-[#EDE8E0] text-[#6B5C4C] rounded-xl font-semibold text-sm hover:bg-[#D5C9BC] transition-colors flex items-center gap-1.5"
                    >
                        ← Danh sách đơn hàng
                    </Link>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setBillModalOpen(true)}
                            className="px-4 py-2.5 border-2 border-[#B86B05] text-[#B86B05] rounded-xl font-semibold text-sm hover:bg-[#B86B05] hover:text-white transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Hóa đơn
                        </button>
                        {order.status === "delivered" && (
                            <Link
                                to="/orders"
                                className="px-5 py-2.5 bg-[#B86B05] text-white rounded-xl font-semibold text-sm hover:bg-[#9a5a04] transition-colors shadow-md shadow-[#B86B05]/20 flex items-center gap-1.5"
                            >
                                ⭐ Xem đánh giá đã gửi
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Bill Modal ─── */}
            <OrderBillModal
                open={billModalOpen}
                onClose={() => setBillModalOpen(false)}
                order={order}
            />
        </div>
    );
};

export default OrderDetailPage;
