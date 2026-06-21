import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getOrderByIdApi } from "../../utils/api";

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
                    </div>
                </div>

                {/* Order Info */}
                <div className="bg-white rounded-2xl border border-[#EDE8E0] p-6 mb-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-[#1C1108]">Thông tin đơn hàng</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order?.status)}`}>
                            {getStatusText(order?.status)}
                        </span>
                    </div>

                    <div className="border-b border-[#EDE8E0] pb-4 mb-4">
                        <h3 className="text-xs font-semibold text-[#A8896A] mb-1">Địa chỉ giao hàng</h3>
                        <p className="font-semibold text-sm text-[#1C1108]">{order?.shippingAddress?.fullName}</p>
                        <p className="text-sm text-[#6B5C4C]">{order?.shippingAddress?.phone}</p>
                        <p className="text-sm text-[#6B5C4C]">{order?.shippingAddress?.address}, {order?.shippingAddress?.city}</p>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold text-[#A8896A] mb-3">Sản phẩm đã đặt</h3>
                        <div className="space-y-3">
                            {order?.products.map((item, idx) => (
                                <div key={idx} className="flex gap-3 items-center">
                                    <img src={item.image || "/placeholder.png"} alt={item.name} className="w-14 h-14 object-cover rounded-lg" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#1C1108] line-clamp-1">{item.name}</p>
                                        <p className="text-xs text-[#A8896A]">x{item.quantity}</p>
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
                        <div className="flex justify-between">
                            <span className="text-[#6B5C4C]">Phí vận chuyển</span>
                            <span className="text-[#1C1108] font-medium">
                                {order?.shippingFee === 0 ? <span className="text-green-600">Miễn phí</span> : formatPrice(order?.shippingFee)}
                            </span>
                        </div>
                        <div className="flex justify-between border-t border-[#EDE8E0] pt-2">
                            <span className="font-bold text-[#1C1108]">Tổng cộng</span>
                            <span className="font-extrabold text-xl text-[#B86B05]">{formatPrice(order?.totalPrice)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#EDE8E0]">
                            <span className="text-[#6B5C4C]">Phương thức</span>
                            <span className="font-semibold text-sm text-[#1C1108]">💵 {order?.paymentMethod}</span>
                        </div>
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
