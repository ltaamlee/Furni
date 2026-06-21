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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-md mx-auto">
                <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                    {paymentSuccess ? (
                        <>
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-800 mb-2">Thanh toán thành công!</h1>
                            <p className="text-gray-500 mb-6">Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đang được xử lý.</p>
                            
                            {order && (
                                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-500">Mã đơn hàng:</span>
                                        <span className="font-medium">{order.orderNumber}</span>
                                    </div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-500">Tổng tiền:</span>
                                        <span className="font-bold text-green-600">{formatPrice(order.totalPrice)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Phương thức:</span>
                                        <span className="font-medium">PayOS</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate(`/orders/${order?._id}`)}
                                    className="w-full bg-green-600 text-white py-3 rounded-full font-semibold hover:bg-green-700 transition"
                                >
                                    Xem chi tiết đơn hàng
                                </button>
                                <button
                                    onClick={() => navigate("/")}
                                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-full font-semibold hover:bg-gray-200 transition"
                                >
                                    Tiếp tục mua sắm
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-800 mb-2">Thanh toán thất bại</h1>
                            <p className="text-gray-500 mb-6">Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.</p>
                            
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate("/checkout")}
                                    className="w-full bg-green-600 text-white py-3 rounded-full font-semibold hover:bg-green-700 transition"
                                >
                                    Thử lại
                                </button>
                                <button
                                    onClick={() => navigate("/")}
                                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-full font-semibold hover:bg-gray-200 transition"
                                >
                                    Về trang chủ
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PayOSReturnPage;
