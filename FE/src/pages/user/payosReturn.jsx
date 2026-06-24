import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getOrderByIdApi } from "../../utils/api";

const PayOSReturnPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    useEffect(() => {
        const orderId = searchParams.get("orderId");
        const status = searchParams.get("payment");
        
        if (status === "success" && orderId) {
            setPaymentSuccess(true);
            fetchOrderDetails(orderId);
        } else {
            setLoading(false);
        }
    }, [searchParams]);

    const fetchOrderDetails = async (orderId) => {
        try {
            const res = await getOrderByIdApi(orderId);
            if (res.success) {
                setOrder(res.data);
            }
        } catch (error) {
            console.error("Error fetching order:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[#6B5C4C]">Đang xử lý thanh toán...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF7F4] py-8 px-4">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <button
                        onClick={() => navigate("/")}
                        className="inline-flex items-center gap-2 text-[#6B5C4C] hover:text-[#1C1108] transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-sm">Quay về trang chủ</span>
                    </button>
                </div>

                {paymentSuccess ? (
                    /* Success State */
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        {/* Success Header */}
                        <div className="bg-gradient-to-r from-[#16a34a] to-[#22c55e] px-6 py-8 text-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h1 className="text-2xl font-extrabold text-white mb-2">Thanh toán thành công!</h1>
                            <p className="text-green-100">Cảm ơn bạn đã đặt hàng tại Furni</p>
                        </div>

                        {/* Order Info */}
                        {order && (
                            <div className="p-6">
                                {/* Order Card */}
                                <div className="bg-[#FAF7F4] rounded-xl p-4 mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm text-[#6B5C4C]">Mã đơn hàng</span>
                                        <span className="font-bold text-[#1C1108]">{order.orderNumber}</span>
                                    </div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm text-[#6B5C4C]">Phương thức</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">💳</span>
                                            <span className="font-medium text-[#1C1108]">PayOS</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-[#EDE8E0]">
                                        <span className="text-sm text-[#6B5C4C]">Tổng thanh toán</span>
                                        <span className="text-xl font-extrabold text-[#B86B05]">{formatPrice(order.totalPrice)}</span>
                                    </div>
                                </div>

                                {/* Delivery Info */}
                                {order.shippingAddress && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-[#1C1108] mb-2 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-[#B86B05]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Địa chỉ giao hàng
                                        </h3>
                                        <div className="bg-[#FAF7F4] rounded-xl p-3">
                                            <p className="font-medium text-[#1C1108]">{order.shippingAddress.fullName}</p>
                                            <p className="text-sm text-[#6B5C4C]">{order.shippingAddress.phone}</p>
                                            <p className="text-sm text-[#6B5C4C]">{order.shippingAddress.address}, {order.shippingAddress.city}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Products Preview */}
                                {order.products && order.products.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-[#1C1108] mb-3">Sản phẩm đã đặt ({order.totalQuantity})</h3>
                                        <div className="space-y-2">
                                            {order.products.slice(0, 3).map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <img
                                                        src={item.image || "/placeholder.png"}
                                                        alt={item.name}
                                                        className="w-12 h-12 object-cover rounded-lg bg-[#FAF7F4]"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-[#1C1108] line-clamp-1">{item.name}</p>
                                                        <p className="text-xs text-[#6B5C4C]">x{item.quantity}</p>
                                                    </div>
                                                    <span className="text-sm font-semibold text-[#1C1108]">{formatPrice(item.price * item.quantity)}</span>
                                                </div>
                                            ))}
                                            {order.products.length > 3 && (
                                                <p className="text-xs text-[#A8896A] text-center py-2">
                                                    +{order.products.length - 3} sản phẩm khác
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="space-y-3">
                                    <button
                                        onClick={() => navigate(`/orders/${order?._id}`)}
                                        className="w-full bg-[#B86B05] text-white py-3.5 rounded-xl font-semibold hover:bg-[#95520B] transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        Xem chi tiết đơn hàng
                                    </button>
                                    <button
                                        onClick={() => navigate("/")}
                                        className="w-full bg-white border-2 border-[#EDE8E0] text-[#6B5C4C] py-3.5 rounded-xl font-semibold hover:bg-[#FAF7F4] transition-colors"
                                    >
                                        Tiếp tục mua sắm
                                    </button>
                                </div>

                                {/* Help Text */}
                                <p className="text-xs text-center text-[#A8896A] mt-6">
                                    Bạn sẽ nhận được email xác nhận đơn hàng trong giây lát.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Failed State */
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        {/* Failed Header */}
                        <div className="bg-gradient-to-r from-[#dc2626] to-[#ef4444] px-6 py-8 text-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </div>
                            <h1 className="text-2xl font-extrabold text-white mb-2">Thanh toán thất bại</h1>
                            <p className="text-red-100">Đã có lỗi xảy ra trong quá trình thanh toán</p>
                        </div>

                        {/* Info */}
                        <div className="p-6">
                            <div className="bg-[#FEF2F2] rounded-xl p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-medium text-red-800">Có thể do:</p>
                                        <ul className="text-sm text-red-700 mt-1 space-y-1">
                                            <li>• Hủy thanh toán từ cổng PayOS</li>
                                            <li>• Hết thời gian thanh toán</li>
                                            <li>• Lỗi kết nối ngân hàng</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Order Number if available */}
                            {searchParams.get("orderId") && (
                                <div className="bg-[#FAF7F4] rounded-xl p-4 mb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#6B5C4C]">Mã đơn hàng</span>
                                        <span className="font-bold text-[#1C1108]">{searchParams.get("orderId").slice(-8).toUpperCase()}</span>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate("/checkout")}
                                    className="w-full bg-[#B86B05] text-white py-3.5 rounded-xl font-semibold hover:bg-[#95520B] transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Thử lại thanh toán
                                </button>
                                <button
                                    onClick={() => navigate("/")}
                                    className="w-full bg-white border-2 border-[#EDE8E0] text-[#6B5C4C] py-3.5 rounded-xl font-semibold hover:bg-[#FAF7F4] transition-colors"
                                >
                                    Về trang chủ
                                </button>
                            </div>

                            {/* Contact Help */}
                            <div className="mt-6 p-4 bg-[#FAF7F4] rounded-xl">
                                <p className="text-sm text-[#6B5C4C] text-center">
                                    Nếu đã thanh toán nhưng vẫn thấy thông báo này, vui lòng liên hệ{" "}
                                    <a href="tel:19001234" className="text-[#B86B05] font-medium">1900 1234</a>{" "}
                                    để được hỗ trợ.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PayOSReturnPage;
