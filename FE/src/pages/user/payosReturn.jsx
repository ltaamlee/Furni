import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getOrderByIdApi } from "../../utils/api";

const PayOSReturnPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [autoCancelled, setAutoCancelled] = useState(false);

  const status = searchParams.get("payment");
  const orderId = searchParams.get("orderId");
  const isSuccess = status === "success";
  const isCancelled = status === "cancelled";


  // Fetch order details
  const fetchOrderDetails = useCallback(async (id) => {
    try {
      const res = await getOrderByIdApi(id);
      if (res.success) {
        const o = res.data;
        setOrder(o);
        if (o.paymentStatus === "paid") {
          setPaymentStatus("success");
        } else if (o.status === "cancelled" || o.paymentStatus === "failed") {
          setPaymentStatus("cancelled");
        } else if (o.paymentStatus === "pending") {
          setPaymentStatus("pending");
        } else {
          setPaymentStatus("failed");
        }
      } else {
        setPaymentStatus("failed");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      setPaymentStatus("failed");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Fetch order khi orderId thay đổi
  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    } else if (isCancelled) {
      setPaymentStatus("cancelled");
      setLoading(false);
    } else {
      setPaymentStatus("failed");
      setLoading(false);
    }
  }, [orderId, isCancelled, fetchOrderDetails]);

  // Khi auto cancel thành công → chuyển sang cancelled state
  useEffect(() => {
    if (autoCancelled) {
      setPaymentStatus("cancelled");
    }
  }, [autoCancelled]);

  // Khi paymentStatus là pending → redirect về trang đơn hàng
  useEffect(() => {
    if (paymentStatus === "pending" && orderId) {
      navigate(`/orders/${orderId}`);
    }
  }, [paymentStatus, orderId, navigate]);

  // Retry payment
  const handleRetryPayment = () => {
    if (!order) return;
    // Điều hướng về trang order detail → user tự nhấn nút thanh toán lại
    navigate(`/orders/${order._id}`);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price) + " đ";
  };

  const generateConfirmationCode = () => {
    if (!order?.payosOrderCode) return "";
    return order.payosOrderCode;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(160deg, #3d2010 0%, #2d1a10 50%, #1a0e08 100%)" }}>
        <div className="w-20 h-20 border-[3px] border-amber-800 border-t-amber-400 rounded-full animate-spin mb-6" />
        <p className="text-amber-400 font-semibold text-sm tracking-wide">Đang xác minh thanh toán...</p>
        <p className="text-amber-800 text-xs mt-2">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  const confCode = generateConfirmationCode();

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #3d2010 0%, #2d1a10 50%, #1a0e08 100%)" }}
    >
      <div className="max-w-md mx-auto px-4 py-10">
        {/* Header brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-amber-300 tracking-tight">SORA FURNITURE</h1>
          <p className="text-xs text-amber-800 tracking-widest uppercase mt-1">Kết quả thanh toán</p>
        </div>

        {/* === SUCCESS STATE === */}
        {paymentStatus === "success" ? (
          <div className="space-y-5">
            <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl overflow-hidden">
              <div className="relative h-28 overflow-hidden"
                style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%)" }}>
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 50%, white 0%, transparent 50%)"
                  }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-2 shadow-lg">
                    <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight">Thanh toán thành công!</h2>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-200">
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">Mã đơn hàng</p>
                  <p className="text-xl font-extrabold text-green-800 tracking-wider">{order?.orderNumber}</p>
                </div>

                <div className="text-center py-2">
                  <p className="text-xs text-[#A8896A] font-medium uppercase tracking-wider mb-1">Số tiền đã thanh toán</p>
                  <p className="text-3xl font-black text-amber-600">{formatPrice(order?.totalPrice)}</p>
                </div>

                {confCode && (
                  <div className="bg-[#FAF7F4] rounded-2xl p-4 border border-[#EDE8E0]">
                    <p className="text-xs text-[#A8896A] font-semibold uppercase tracking-wider text-center mb-2">Mã xác nhận thanh toán</p>
                    <p className="text-center font-mono text-lg font-bold text-[#1C1108] tracking-widest select-all">
                      {confCode}
                    </p>
                    <p className="text-center text-xs text-[#A8896A] mt-2">
                      Vui lòng giữ mã này để đối soát nếu cần
                    </p>
                  </div>
                )}

                {order?.shippingAddress && (
                  <div className="bg-[#FAF7F4] rounded-2xl p-4 border border-[#EDE8E0]">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm font-bold text-[#1C1108]">Thông tin giao hàng</p>
                    </div>
                    <p className="font-semibold text-sm text-[#1C1108]">{order.shippingAddress.fullName}</p>
                    <p className="text-sm text-[#6B5C4C]">{order.shippingAddress.phone}</p>
                    <p className="text-sm text-[#6B5C4C]">
                      {[order.shippingAddress.address, order.shippingAddress.wardName, order.shippingAddress.provinceName].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}

                {order?.products && order.products.length > 0 && (
                  <div className="bg-[#FAF7F4] rounded-2xl p-4 border border-[#EDE8E0]">
                    <p className="text-sm font-bold text-[#1C1108] mb-3">
                      Sản phẩm đã đặt ({order.products.length})
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {order.products.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white rounded-xl p-2 shadow-sm">
                          <img
                            src={item.image || "/placeholder.png"}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#1C1108] line-clamp-1">{item.name}</p>
                            {item.variant && (
                              <p className="text-[10px] text-[#A8896A]">Phân loại: {item.variant}</p>
                            )}
                            <p className="text-[10px] text-[#A8896A]">×{item.quantity}</p>
                          </div>
                          <p className="text-xs font-bold text-[#1C1108] whitespace-nowrap">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Đơn hàng của bạn đang được xử lý. Bạn sẽ nhận được email xác nhận và thông báo khi đơn hàng được giao.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate(`/orders/${order?._id}`)}
                className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all shadow-lg hover:shadow-xl"
                style={{
                  background: "linear-gradient(135deg, #B86B05 0%, #95520B 100%)",
                  boxShadow: "0 4px 14px rgba(184, 107, 5, 0.35)",
                }}
              >
                📦 Xem chi tiết đơn hàng
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full py-4 rounded-2xl font-bold text-sm text-amber-300 transition-all bg-white/5 border-2 border-amber-800/30 hover:bg-white/10 hover:border-amber-700/50"
              >
                🛍️ Tiếp tục mua sắm
              </button>
            </div>
          </div>
        ) : paymentStatus === "pending" ? (
          /* === PENDING STATE — show loading then redirect === */
          <div className="space-y-5">
            <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-amber-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#1C1108]">Đang chuyển hướng...</h2>
              <p className="text-sm text-[#6B5C4C] mt-2">Vui lòng chờ trong giây lát.</p>
            </div>
          </div>
        ) : paymentStatus === "cancelled" ? (
          /* === CANCELLED STATE === */
          <div className="space-y-5">
            <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl overflow-hidden">
              <div className="relative h-28 overflow-hidden"
                style={{ background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-2 shadow-lg">
                    <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-extrabold">
                    {autoCancelled ? "Đơn hàng đã hết hạn!" : "Đơn hàng đã bị hủy!"}
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {autoCancelled ? (
                  <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
                    <p className="text-sm font-semibold text-red-800 mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Đơn hàng đã hết hạn thanh toán
                    </p>
                    <p className="text-sm text-red-700">
                      Bạn không hoàn tất thanh toán trong thời gian quy định. Đơn hàng đã tự động bị hủy và tồn kho đã được hoàn lại.
                    </p>
                  </div>
                ) : (
                  <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
                    <p className="text-sm font-semibold text-red-800 mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Đơn hàng đã bị hủy
                    </p>
                    <p className="text-sm text-red-700">
                      Đơn hàng đã được hủy bởi bạn hoặc thanh toán không thành công. Tồn kho đã được hoàn lại.
                    </p>
                  </div>
                )}

                {order && (
                  <div className="bg-[#FAF7F4] rounded-2xl p-4 border border-[#EDE8E0]">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-[#A8896A] font-semibold uppercase tracking-wider">Mã đơn hàng</p>
                        <p className="font-extrabold text-[#1C1108]">{order.orderNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#A8896A] font-semibold uppercase tracking-wider">Số tiền</p>
                        <p className="font-extrabold text-amber-600">{formatPrice(order.totalPrice)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-[#FAF7F4] rounded-2xl p-4 border border-[#EDE8E0]">
                  <p className="text-sm text-[#6B5C4C] text-center leading-relaxed">
                    Bạn vẫn có thể đặt hàng lại. Sản phẩm vẫn còn trong giỏ hàng.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate("/orders")}
                className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                  boxShadow: "0 4px 14px rgba(217, 119, 6, 0.35)",
                }}
              >
                📋 Xem danh sách đơn hàng
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full py-4 rounded-2xl font-bold text-sm text-amber-300 transition-all bg-white/5 border-2 border-amber-800/30 hover:bg-white/10 hover:border-amber-700/50"
              >
                🛍️ Tiếp tục mua sắm
              </button>
            </div>
          </div>
        ) : (
          /* === FAILED STATE === */
          <div className="space-y-5">
            <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl overflow-hidden">
              <div className="relative h-28 overflow-hidden"
                style={{ background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-2 shadow-lg">
                    <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-extrabold">Thanh toán không thành công</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
                  <p className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Nguyên nhân có thể:
                  </p>
                  <ul className="text-sm text-red-700 space-y-1.5 ml-6 list-disc">
                    <li>Bạn đã hủy thanh toán tại cổng PayOS</li>
                    <li>Đã hết thời gian thanh toán (10 phút)</li>
                    <li>Lỗi kết nối từ ngân hàng hoặc ví điện tử</li>
                    <li>Thông tin thanh toán không hợp lệ</li>
                  </ul>
                </div>

                {order && (
                  <div className="bg-[#FAF7F4] rounded-2xl p-4 border border-[#EDE8E0]">
                    <p className="text-xs text-[#A8896A] font-semibold uppercase tracking-wider mb-1">Mã đơn hàng đã tạo</p>
                    <p className="font-extrabold text-[#1C1108]">{order.orderNumber}</p>
                    <p className="text-xs text-[#A8896A] mt-1">Số tiền: {formatPrice(order.totalPrice)}</p>
                    {order.paymentExpiresAt && new Date(order.paymentExpiresAt) > new Date() ? (
                      <p className="text-xs text-amber-600 font-medium mt-2">
                        ✓ Đơn hàng còn hiệu lực — bạn có thể thanh toán lại ngay.
                      </p>
                    ) : (
                      <p className="text-xs text-red-500 font-medium mt-2">
                        ✗ Đơn hàng đã hết hạn thanh toán.
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-[#FAF7F4] rounded-2xl p-4 border border-[#EDE8E0]">
                  <p className="text-sm text-[#6B5C4C] text-center leading-relaxed">
                    Nếu đã thanh toán nhưng vẫn thấy thông báo này, vui lòng liên hệ{" "}
                    <span className="font-bold text-amber-600">1900 1234</span> để được hỗ trợ đối soát.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {order && order.paymentExpiresAt && new Date(order.paymentExpiresAt) > new Date() && (
                <button
                  onClick={handleRetryPayment}
                  className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all shadow-lg hover:shadow-xl"
                  style={{
                    background: "linear-gradient(135deg, #1a56db 0%, #1e40af 100%)",
                    boxShadow: "0 4px 14px rgba(29, 86, 219, 0.4)",
                  }}
                >
                  💳 Thanh toán lại ngay
                </button>
              )}
              <button
                onClick={() => navigate("/orders")}
                className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                  boxShadow: "0 4px 14px rgba(217, 119, 6, 0.35)",
                }}
              >
                📋 Xem đơn hàng
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full py-4 rounded-2xl font-bold text-sm text-amber-300 transition-all bg-white/5 border-2 border-amber-800/30 hover:bg-white/10 hover:border-amber-700/50"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayOSReturnPage;
