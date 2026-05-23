import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getOrderByIdApi } from "../utils/api";

const OrderSuccessPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const fetchOrder = async () => {
        try {
            const res = await getOrderByIdApi(id);
            if (res.success) {
                setOrder(res.data);
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-2xl mx-auto px-4">
                {/* Success Header */}
                <div className="bg-white rounded-2xl shadow-sm p-8 text-center mb-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">✓</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Đặt hàng thành công!</h1>
                    <p className="text-gray-500">Cảm ơn bạn đã đặt hàng tại Furni</p>
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-500">Mã đơn hàng</p>
                        <p className="text-xl font-bold text-green-600">{order?.orderNumber}</p>
                    </div>
                </div>

                {/* Order Info */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800">Thông tin đơn hàng</h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order?.status)}`}>
                            {getStatusText(order?.status)}
                        </span>
                    </div>

                    {/* Shipping Address */}
                    <div className="border-b pb-4 mb-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Địa chỉ giao hàng</h3>
                        <p className="font-medium">{order?.shippingAddress?.fullName}</p>
                        <p className="text-gray-600">{order?.shippingAddress?.phone}</p>
                        <p className="text-gray-600">{order?.shippingAddress?.address}, {order?.shippingAddress?.city}</p>
                    </div>

                    {/* Products */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-3">Sản phẩm đã đặt</h3>
                        <div className="space-y-3">
                            {order?.products.map((item, idx) => (
                                <div key={idx} className="flex gap-3 items-center">
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
                </div>

                {/* Payment Summary */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Thanh toán</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Tạm tính</span>
                            <span>{formatPrice(order?.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Phí vận chuyển</span>
                            <span>{order?.shippingFee === 0 ? "Miễn phí" : formatPrice(order?.shippingFee)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="font-bold text-gray-800">Tổng cộng</span>
                            <span className="font-bold text-xl text-green-600">{formatPrice(order?.totalPrice)}</span>
                        </div>
                        <div className="flex justify-between mt-2 pt-2 border-t">
                            <span className="text-gray-600">Phương thức</span>
                            <span className="font-medium">💵 {order?.paymentMethod}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <Link
                        to="/orders"
                        className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-full font-semibold text-center hover:bg-gray-300 transition"
                    >
                        📦 Xem đơn hàng
                    </Link>
                    <Link
                        to="/"
                        className="flex-1 bg-green-600 text-white py-3 rounded-full font-semibold text-center hover:bg-green-700 transition"
                    >
                        🛍️ Tiếp tục mua sắm
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccessPage;
