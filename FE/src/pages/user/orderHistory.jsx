import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getUserOrdersApi, cancelOrderApi, confirmReceivedApi } from "../../utils/api";
import { useToast } from "../../components/context/ToastContext";

const ORDER_TABS = [
    { key: "all", label: "Tất cả" },
    { key: "pending", label: "Chờ xác nhận" },
    { key: "confirmed", label: "Đã xác nhận" },
    { key: "preparing", label: "Đang chuẩn bị" },
    { key: "shipping", label: "Đang giao" },
    { key: "delivered", label: "Đã giao" },
    { key: "cancelled", label: "Đã hủy" },
];

const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN").format(price) + " đ";

const OrderHistoryPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { showToast } = useToast();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [cancellingId, setCancellingId] = useState(null);
    const [confirmingId, setConfirmingId] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchOrders(activeTab);
    }, [activeTab]);

    const fetchOrders = async (status) => {
        try {
            setLoading(true);
            setError(null);
            const params = {};
            if (status !== "all") params.status = status;

            const res = await getUserOrdersApi(params);

            if (res.success) {
                const ordersData = res.data?.orders || res.data || res.data?.data || [];
                setOrders(Array.isArray(ordersData) ? ordersData : []);
            } else {
                setError(res.message || "Không thể tải đơn hàng");
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
            setError(error.message || "Lỗi kết nối");
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const handleCancelOrder = async (orderId) => {
        if (!confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;

        try {
            setCancellingId(orderId);
            const res = await cancelOrderApi(orderId, "Khách hàng hủy");
            if (res.success) {
                showToast("Đơn hàng đã được hủy!", "success");
                fetchOrders(activeTab);
            }
        } catch (error) {
            showToast(error.message || "Không thể hủy đơn hàng!", "error");
        } finally {
            setCancellingId(null);
        }
    };

    const handleConfirmReceived = async (orderId) => {
        if (!confirm("Bạn đã nhận được hàng và hài lòng với đơn hàng?")) return;

        try {
            setConfirmingId(orderId);
            const res = await confirmReceivedApi(orderId);
            if (res.success) {
                showToast("Xác nhận nhận hàng thành công!", "success");
                fetchOrders(activeTab);
            } else {
                showToast(res.message || "Xác nhận thất bại!", "error");
            }
        } catch (error) {
            showToast(error.message || "Có lỗi xảy ra!", "error");
        } finally {
            setConfirmingId(null);
        }
    };

    const getStatusInfo = (status) => {
        const statusMap = {
            pending: { label: "Chờ xác nhận", color: "text-orange-500", bg: "bg-orange-50" },
            confirmed: { label: "Đã xác nhận", color: "text-blue-500", bg: "bg-blue-50" },
            preparing: { label: "Đang chuẩn bị", color: "text-purple-500", bg: "bg-purple-50" },
            shipping: { label: "Đang giao", color: "text-indigo-500", bg: "bg-indigo-50" },
            delivered: { label: "Đã giao", color: "text-green-600", bg: "bg-green-50" },
            cancelled: { label: "Đã hủy", color: "text-gray-500", bg: "bg-gray-100" },
            cancel_requested: { label: "Yêu cầu hủy", color: "text-red-500", bg: "bg-red-50" },
        };
        return statusMap[status?.toLowerCase()] || { label: status, color: "text-gray-500", bg: "bg-gray-100" };
    };

    return (
        <div className="bg-white rounded-2xl border border-[#EDE8E0] overflow-hidden">
                {/* Header Tabs - Giống Shopee */}
                <div className="border-b border-[#EDE8E0] overflow-x-auto">
                    <div className="flex min-w-max">
                        {ORDER_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                    activeTab === tab.key
                                        ? "text-[#B86B05] border-[#B86B05]"
                                        : "text-[#6B5C4C] border-transparent hover:text-[#1C1108] hover:border-[#EDE8E0]"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-16">
                            <div className="w-12 h-12 border-4 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin mx-auto"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-red-600 mb-2">Lỗi</h3>
                            <p className="text-sm text-[#A8896A] mb-4">{error}</p>
                            <button
                                onClick={() => fetchOrders(activeTab)}
                                className="px-6 py-2.5 bg-[#B86B05] text-white font-medium rounded-xl hover:bg-[#95520B] transition-colors"
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-24 h-24 bg-[#FAF7F4] rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#A8896A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-[#1C1108] mb-2">Chưa có đơn hàng</h3>
                            <p className="text-sm text-[#A8896A] mb-6">
                                {activeTab === "all"
                                    ? "Bạn chưa có đơn hàng nào"
                                    : `Không có đơn hàng ở trạng thái "${ORDER_TABS.find(t => t.key === activeTab)?.label}"`}
                            </p>
                            <Link
                                to="/products"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[#B86B05] text-white font-medium rounded-xl hover:bg-[#95520B] transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Mua sắm ngay
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => {
                                const statusInfo = getStatusInfo(order.status);
                                return (
                                    <div key={order._id} className="border border-[#EDE8E0] rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                                        {/* Order Header */}
                                        <div className="flex items-center justify-between px-4 py-3 bg-[#FAF7F4] border-b border-[#EDE8E0]">
                                            <div className="flex items-center gap-3">
                                                {/* Lấy shop info từ order hoặc từ sản phẩm đầu tiên */}
                                                {(() => {
                                                    const shopLogo = order.shop?.logo;
                                                    const shopName = order.shopName || order.products?.[0]?.shopName || order.shop?.name || "Cửa hàng";
                                                    const firstChar = shopName?.charAt(0) || "C";
                                                    return shopLogo ? (
                                                        <img src={shopLogo} alt={shopName} className="w-8 h-8 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B86B05] to-[#95520B] flex items-center justify-center text-white text-sm font-bold">
                                                            {firstChar}
                                                        </div>
                                                    );
                                                })()}
                                                <span className="font-semibold text-[#1C1108]">
                                                    {order.shopName || order.products?.[0]?.shopName || order.shop?.name || "Cửa hàng"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                                <Link
                                                    to={`/orders/${order._id}`}
                                                    className="text-sm text-[#B86B05] hover:text-[#95520B] font-medium"
                                                >
                                                    Xem chi tiết →
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Order Items */}
                                        <div className="p-4 space-y-3">
                                            {order.products?.slice(0, 3).map((item, idx) => (
                                                <div key={item._id || idx} className="flex gap-3">
                                                    <Link to={`/product/${item.product?.slug || item.product?._id || ''}`} className="shrink-0">
                                                        <img
                                                            src={item.product?.images?.[0] || item.image || "/placeholder.png"}
                                                            alt={item.product?.name || item.name}
                                                            className="w-16 h-16 object-cover rounded-lg border border-[#EDE8E0]"
                                                        />
                                                    </Link>
                                                    <div className="flex-1 min-w-0">
                                                        <Link
                                                            to={`/product/${item.product?.slug || item.product?._id || ''}`}
                                                            className="text-sm font-medium text-[#1C1108] line-clamp-2 hover:text-[#B86B05] transition-colors"
                                                        >
                                                            {item.product?.name || item.name || "Sản phẩm"}
                                                        </Link>
                                                        {item.variant && (
                                                            <p className="text-[11px] text-[#A8896A] mt-0.5">Phân loại: {item.variant}</p>
                                                        )}

                                                        {/* Price display: original + discounted */}
                                                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                                                            {item.originalPrice && item.discount > 0 ? (
                                                                <>
                                                                    <span className="text-xs font-bold text-[#B86B05]">
                                                                        {formatPrice(item.price)}
                                                                    </span>
                                                                    <span className="text-xs text-[#A8896A] line-through">
                                                                        {formatPrice(item.originalPrice)}
                                                                    </span>
                                                                    <span className="px-1 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded">
                                                                        -{item.discount}%
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-xs font-semibold text-[#B86B05]">
                                                                    {formatPrice(item.price)}
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-[#A8896A] ml-auto">x{item.quantity}</span>
                                                        </div>
                                                        <p className="text-xs font-semibold text-[#1C1108] mt-1 text-right">
                                                            {formatPrice(item.price * item.quantity)}
                                                        </p>
                                                    </div>
                                                    {/* Đánh giá — chỉ khi đã giao */}
                                                    {order.status === "delivered" && (
                                                        <div className="shrink-0">
                                                            <Link
                                                                to={`/product/${item.product?.slug || item.product?._id || ''}?write-review=true`}
                                                                className="text-xs text-[#B86B05] border border-[#B86B05] px-3 py-1.5 rounded-lg hover:bg-[#B86B05] hover:text-white transition-colors"
                                                            >
                                                                ⭐ Đánh giá
                                                            </Link>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {order.products?.length > 3 && (
                                                <p className="text-sm text-[#A8896A] text-center py-2">
                                                    +{order.products.length - 3} sản phẩm khác
                                                </p>
                                            )}
                                        </div>

                                        {/* Order Footer */}
                                        <div className="px-4 py-3 bg-[#FAF7F4] border-t border-[#EDE8E0] flex items-center justify-between gap-3">
                                            <div className="text-sm">
                                                {order.products?.length > 0 && (
                                                    <span className="text-[#A8896A]">
                                                        {order.products.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 flex-wrap justify-end">
                                                {/* Nút Nhận hàng — khi đang giao */}
                                                {order.status === "shipping" && (
                                                    <button
                                                        onClick={() => handleConfirmReceived(order._id)}
                                                        disabled={confirmingId === order._id}
                                                        className="px-4 py-2 text-sm font-bold text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm shadow-green-600/20 disabled:opacity-50"
                                                    >
                                                        {confirmingId === order._id ? "Đang xác nhận..." : "✓ Đã nhận được hàng"}
                                                    </button>
                                                )}
                                                {/* Nút Hủy đơn */}
                                                {order.canCancel && (
                                                    <button
                                                        onClick={() => handleCancelOrder(order._id)}
                                                        disabled={cancellingId === order._id}
                                                        className="px-4 py-2 text-sm font-medium text-[#BF4343] border border-[#BF4343] rounded-lg hover:bg-[#BF4343] hover:text-white transition-colors disabled:opacity-50"
                                                    >
                                                        {cancellingId === order._id ? "Đang hủy..." : "Hủy đơn"}
                                                    </button>
                                                )}
                                                {/* Tổng tiền */}
                                                <div className="text-right">
                                                    <span className="text-xs text-[#A8896A]">Thành tiền: </span>
                                                    <span className="text-lg font-bold text-[#B86B05]">
                                                        {formatPrice(order.totalPrice)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Order ID & Date */}
                                        <div className="px-4 py-2 border-t border-[#EDE8E0] flex items-center justify-between text-xs text-[#A8896A]">
                                            <div className="flex flex-col">
                                                <span>Mã đơn: <span className="font-mono text-[#1C1108] font-medium">#{order.orderNumber}</span></span>
                                                {order.products?.some(p => p.shopOrderCode) && (
                                                    <span className="mt-0.5">
                                                        Mã shop: {order.products.filter(p => p.shopOrderCode).map(p => p.shopOrderCode).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                            <span>Ngày đặt: {new Date(order.createdAt).toLocaleDateString("vi-VN")}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
    );
};

export default OrderHistoryPage;
