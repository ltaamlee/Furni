import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getUserOrdersApi, cancelOrderApi } from "../utils/api";

const OrderHistoryPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [cancellingId, setCancellingId] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, [filter]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = filter !== "all" ? { status: filter } : {};
            const res = await getUserOrdersApi(params);
            if (res.success) {
                setOrders(res.data.orders);
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
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
            pending: "Chờ xác nhận",
            confirmed: "Đã xác nhận",
            preparing: "Đang chuẩn bị",
            shipping: "Đang giao",
            delivered: "Đã giao",
            cancelled: "Đã hủy",
            cancel_requested: "Yêu cầu hủy"
        };
        return texts[status] || status;
    };

    const canCancel = (order) => {
        const thirtyMinutes = 30 * 60 * 1000;
        const timePassed = Date.now() - new Date(order.orderedAt).getTime();
        return timePassed < thirtyMinutes && ["pending", "confirmed"].includes(order.status);
    };

    const canRequestCancel = (order) => {
        return order.status === "preparing";
    };

    const handleCancel = async (orderId) => {
        const reason = prompt("Nhập lý do hủy (không bắt buộc):");
        try {
            setCancellingId(orderId);
            const res = await cancelOrderApi(orderId, reason);
            if (res.success) {
                alert(res.message);
                fetchOrders();
            } else {
                alert(res.message || "Hủy đơn thất bại!");
            }
        } catch (error) {
            alert(error.message || "Có lỗi xảy ra!");
        } finally {
            setCancellingId(null);
        }
    };

    const statusFilters = [
        { value: "all", label: "Tất cả" },
        { value: "pending", label: "Chờ xác nhận" },
        { value: "confirmed", label: "Đã xác nhận" },
        { value: "preparing", label: "Đang chuẩn bị" },
        { value: "shipping", label: "Đang giao" },
        { value: "delivered", label: "Đã giao" },
        { value: "cancelled", label: "Đã hủy" }
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">ĐƠN HÀNG CỦA TÔI</h1>
                    <p className="text-gray-500 mt-2">Theo dõi và quản lý đơn hàng của bạn</p>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {statusFilters.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition
                                ${filter === f.value
                                    ? "bg-green-600 text-white"
                                    : "bg-white text-gray-600 hover:bg-gray-100 border"
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Orders List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-12 h-12 border-4 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <div className="text-6xl mb-4">📦</div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Chưa có đơn hàng nào</h2>
                        <p className="text-gray-500 mb-6">Hãy bắt đầu mua sắm ngay hôm nay!</p>
                        <Link to="/" className="inline-block bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition">
                            Mua sắm ngay
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div key={order._id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                {/* Order Header */}
                                <div className="p-4 border-b bg-gray-50">
                                    <div className="flex flex-wrap justify-between items-start gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Mã đơn hàng</p>
                                            <p className="font-bold text-gray-800">{order.orderNumber}</p>
                                            <p className="text-xs text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                                                {getStatusText(order.status)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Products */}
                                <div className="p-4">
                                    <div className="space-y-3 mb-4">
                                        {order.products.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex gap-3 items-center">
                                                <img
                                                    src={item.image || "/placeholder.png"}
                                                    alt={item.name}
                                                    className="w-16 h-16 object-cover rounded-lg"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800 line-clamp-1">{item.name}</p>
                                                    <p className="text-sm text-gray-500">x{item.quantity}</p>
                                                </div>
                                                <p className="font-bold text-green-600">{formatPrice(item.price * item.quantity)}</p>
                                            </div>
                                        ))}
                                        {order.products.length > 3 && (
                                            <p className="text-sm text-gray-500 text-center">
                                                +{order.products.length - 3} sản phẩm khác
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Order Footer */}
                                <div className="p-4 bg-gray-50 border-t flex flex-wrap justify-between items-center gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Tổng cộng</p>
                                        <p className="text-xl font-bold text-green-600">{formatPrice(order.totalPrice)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {canCancel(order) && (
                                            <button
                                                onClick={() => handleCancel(order._id)}
                                                disabled={cancellingId === order._id}
                                                className="px-4 py-2 border border-red-500 text-red-500 rounded-full text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
                                            >
                                                {cancellingId === order._id ? "Đang hủy..." : "Hủy đơn"}
                                            </button>
                                        )}
                                        {canRequestCancel(order) && (
                                            <button
                                                onClick={() => handleCancel(order._id)}
                                                disabled={cancellingId === order._id}
                                                className="px-4 py-2 border border-orange-500 text-orange-500 rounded-full text-sm font-medium hover:bg-orange-50 transition disabled:opacity-50"
                                            >
                                                {cancellingId === order._id ? "Đang gửi..." : "Yêu cầu hủy"}
                                            </button>
                                        )}
                                        <Link
                                            to={`/orders/${order._id}`}
                                            className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition"
                                        >
                                            Chi tiết
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderHistoryPage;
