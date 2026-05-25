import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getOrderByIdApi, cancelOrderApi } from "../../utils/api";

const OrderDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const fetchOrder = async () => {
        try {
            const res = await getOrderByIdApi(id);
            if (res.success) {
                setOrder(res.data);
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

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: "bg-yellow-100 text-yellow-700",
            confirmed: "bg-blue-100 text-blue-700",
            preparing: "bg-orange-100 text-orange-700",
            shipping: "bg-purple-100 text-purple-700",
            delivered: "bg-green-100 text-green-700",
            cancelled: "bg-red-100 text-red-700",
            cancel_requested: "bg-red-100 text-red-700"
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
            cancelled: "Đã hủy",
            cancel_requested: "Yêu cầu hủy"
        };
        return texts[status] || status;
    };

    const getStatusIcon = (status) => {
        const icons = {
            pending: "📋",
            confirmed: "✓",
            preparing: "📦",
            shipping: "🚚",
            delivered: "✅",
            cancelled: "❌"
        };
        return icons[status] || "•";
    };

    const getStepStatus = (stepOrder, currentStatus) => {
        const orderMap = {
            pending: 1,
            confirmed: 2,
            preparing: 3,
            shipping: 4,
            delivered: 5,
            cancelled: 0
        };
        const currentStep = orderMap[currentStatus] || 0;
        return stepOrder <= currentStep ? "completed" : stepOrder === currentStep + 1 ? "current" : "pending";
    };

    const canCancel = () => {
        if (!order) return false;
        const thirtyMinutes = 30 * 60 * 1000;
        const timePassed = Date.now() - new Date(order.orderedAt).getTime();
        return timePassed < thirtyMinutes && ["pending", "confirmed"].includes(order.status);
    };

    const canRequestCancel = () => {
        return order?.status === "preparing";
    };

    const handleCancel = async () => {
        const reason = prompt("Nhập lý do hủy (không bắt buộc):");
        try {
            setCancelling(true);
            const res = await cancelOrderApi(order._id, reason);
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Không tìm thấy đơn hàng</p>
            </div>
        );
    }

    const steps = [
        { num: 1, status: "pending", label: "Đơn hàng mới" },
        { num: 2, status: "confirmed", label: "Đã xác nhận" },
        { num: 3, status: "preparing", label: "Đang chuẩn bị" },
        { num: 4, status: "shipping", label: "Đang giao" },
        { num: 5, status: "delivered", label: "Đã giao" }
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Back Button */}
                <Link to="/orders" className="inline-flex items-center gap-2 text-gray-600 hover:text-green-600 mb-6">
                    ← Quay lại danh sách đơn hàng
                </Link>

                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Mã đơn hàng</p>
                            <p className="text-2xl font-bold text-gray-800">{order.orderNumber}</p>
                            <p className="text-sm text-gray-500 mt-1">Ngày đặt: {formatDate(order.createdAt)}</p>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                        </span>
                    </div>
                </div>

                {/* Order Timeline */}
                {order.status !== "cancelled" && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-6">Theo dõi đơn hàng</h2>
                        <div className="flex items-start justify-between">
                            {steps.map((step, idx) => {
                                const stepStatus = getStepStatus(step.num, order.status);
                                return (
                                    <div key={step.num} className="flex flex-col items-center flex-1">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-2
                                            ${stepStatus === "completed" ? "bg-green-600 text-white" :
                                                stepStatus === "current" ? "bg-green-600 text-white animate-pulse" :
                                                    "bg-gray-200 text-gray-500"}`}>
                                            {stepStatus === "completed" ? "✓" : step.num}
                                        </div>
                                        <p className={`text-xs font-medium text-center ${stepStatus !== "pending" ? "text-gray-800" : "text-gray-400"}`}>
                                            {step.label}
                                        </p>
                                        {idx < steps.length - 1 && (
                                            <div className={`absolute h-1 w-full -z-10 ${stepStatus === "completed" ? "bg-green-600" : "bg-gray-200"}`}
                                                style={{ display: "none" }}></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Cancel Request Notice */}
                {order.status === "cancel_requested" && (
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">⏳</span>
                            <div>
                                <p className="font-medium text-orange-800">Yêu cầu hủy đang chờ xử lý</p>
                                <p className="text-sm text-orange-600">
                                    Lý do: {order.cancelRequest?.reason || "Không có"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cancelled Notice */}
                {order.status === "cancelled" && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">❌</span>
                            <div>
                                <p className="font-medium text-red-800">Đơn hàng đã bị hủy</p>
                                <p className="text-sm text-red-600">
                                    Ngày hủy: {formatDate(order.cancelledAt)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Shipping Info */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Thông tin giao hàng</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Người nhận</p>
                            <p className="font-medium">{order.shippingAddress?.fullName}</p>
                            <p className="text-gray-600">{order.shippingAddress?.phone}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Địa chỉ giao hàng</p>
                            <p className="text-gray-700">{order.shippingAddress?.address}</p>
                            <p className="text-gray-600">{order.shippingAddress?.city}</p>
                            {order.shippingAddress?.note && (
                                <p className="text-sm text-gray-500 italic mt-1">Ghi chú: {order.shippingAddress.note}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Products */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Sản phẩm đã đặt</h2>
                    <div className="space-y-4">
                        {order.products.map((item, idx) => (
                            <div key={idx} className="flex gap-4 items-center border-b pb-4 last:border-0 last:pb-0">
                                <img
                                    src={item.image || "/placeholder.png"}
                                    alt={item.name}
                                    className="w-20 h-20 object-cover rounded-xl"
                                />
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{item.name}</p>
                                    <p className="text-sm text-gray-500">Đơn giá: {formatPrice(item.price)}</p>
                                    <p className="text-sm text-gray-500">Số lượng: {item.quantity}</p>
                                </div>
                                <p className="font-bold text-green-600">{formatPrice(item.price * item.quantity)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Thanh toán</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Tạm tính</span>
                            <span>{formatPrice(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Phí vận chuyển</span>
                            <span>{order.shippingFee === 0 ? "Miễn phí" : formatPrice(order.shippingFee)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="font-bold text-gray-800">Tổng cộng</span>
                            <span className="font-bold text-xl text-green-600">{formatPrice(order.totalPrice)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                            <span className="text-gray-600">Phương thức</span>
                            <span className="font-medium">💵 {order.paymentMethod}</span>
                        </div>
                    </div>
                </div>

                {/* Status History */}
                {order.statusHistory?.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Lịch sử trạng thái</h2>
                        <div className="space-y-3">
                            {order.statusHistory.map((h, idx) => (
                                <div key={idx} className="flex gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                                        {getStatusIcon(h.status)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">{getStatusText(h.status)}</p>
                                        <p className="text-sm text-gray-500">{formatDate(h.timestamp)}</p>
                                        {h.note && <p className="text-sm text-gray-600 italic">{h.note}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-4">
                    {(canCancel() || canRequestCancel()) && (
                        <button
                            onClick={handleCancel}
                            disabled={cancelling}
                            className="px-6 py-3 border border-red-500 text-red-500 rounded-full font-medium hover:bg-red-50 transition disabled:opacity-50"
                        >
                            {cancelling ? "Đang xử lý..." : (canCancel() ? "Hủy đơn hàng" : "Yêu cầu hủy đơn")}
                        </button>
                    )}
                    <Link
                        to="/orders"
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300 transition"
                    >
                        ← Quay lại
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailPage;
