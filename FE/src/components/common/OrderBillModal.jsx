import { useEffect, useState } from "react";

const FLOW = ["pending", "confirmed", "preparing", "shipping", "delivered"];

const STATUS_META = {
    pending: { label: "Chờ xác nhận" },
    confirmed: { label: "Đã xác nhận" },
    preparing: { label: "Đang chuẩn bị" },
    shipping: { label: "Đang giao hàng" },
    delivered: { label: "Giao hàng thành công" },
    cancelled: { label: "Đã hủy" },
};

const fmtDateTime = (d) => d
    ? new Date(d).toLocaleString("vi-VN", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
      })
    : "";

const fmtPrice = (p) =>
    p === null || p === undefined
        ? "—"
        : new Intl.NumberFormat("vi-VN").format(p) + " đ";

/* ─── Vertical Timeline (vendor style) ─── */
const BillTimeline = ({ order }) => {
    if (order.status === "cancelled") {
        return (
            <div className="flex items-center gap-2.5 text-[13px] font-semibold text-red-500">
                <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[11px] font-bold">✕</span>
                Đơn hàng đã hủy {order.cancelledAt ? `· ${fmtDateTime(order.cancelledAt)}` : ""}
            </div>
        );
    }

    const idx = FLOW.indexOf(order.status);
    const histMap = {};
    (order.statusHistory || []).forEach((h) => { histMap[h.status] = h.timestamp; });

    const steps = FLOW.map((s, i) => ({
        label: STATUS_META[s]?.label || s,
        time: histMap[s]
            ? fmtDateTime(histMap[s])
            : s === "pending"
            ? fmtDateTime(order.orderedAt || order.createdAt)
            : "",
        state: i < idx ? "done" : i === idx ? "current" : "todo",
    }));

    return (
        <ul className="pl-0 list-none">
            {steps.map((s, i) => (
                <li key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                    {/* Connector line */}
                    {i < steps.length - 1 && (
                        <span className={`absolute left-[9px] top-5 bottom-0 w-0.5 ${s.state === "done" ? "bg-[#95520B]" : "bg-[#EDE8E0]"}`} />
                    )}
                    {/* Circle */}
                    <div className={`w-[22px] h-[22px] rounded-full border-[2.5px] flex items-center justify-center shrink-0 mt-0.5 ${
                        s.state === "done"
                            ? "bg-[#95520B] border-[#95520B]"
                            : s.state === "current"
                            ? "bg-white border-[#B86B05]"
                            : "bg-white border-[#EDE8E0]"
                    }`}>
                        {s.state === "done" && (
                            <svg className="w-[10px] h-[10px] text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        {s.state === "current" && (
                            <span className="w-2 h-2 rounded-full bg-[#B86B05]" />
                        )}
                    </div>
                    {/* Text */}
                    <div>
                        <div className={`text-[13px] font-semibold ${
                            s.state === "current" ? "text-[#B86B05]"
                            : s.state === "todo" ? "text-[#9E8E7E]"
                            : "text-[#1C1108]"
                        }`}>
                            {s.label}
                        </div>
                        {s.time && <div className="text-[11.5px] text-[#9E8E7E] mt-0.5">{s.time}</div>}
                    </div>
                </li>
            ))}
        </ul>
    );
};

/* ─── Order Bill Modal ─── */
const OrderBillModal = ({ open, onClose, order }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (open) {
            setVisible(true);
        } else {
            const t = setTimeout(() => setVisible(false), 300);
            return () => clearTimeout(t);
        }
    }, [open]);

    if (!visible) return null;

    const addr = order?.shippingAddress || {};
    const hasVoucher = order?.couponCode && order?.couponDiscount > 0;
    const isCancelled = order?.status === "cancelled";

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
                onClick={onClose}
            />

            {/* Modal sheet */}
            <div
                className={`relative w-full sm:max-w-lg bg-[#FAF7F4] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
                    open ? "translate-y-0 opacity-100" : "translate-y-full sm:translate-y-4 opacity-0"
                }`}
                style={{ maxHeight: "92vh" }}
            >
                {/* ── Header ── */}
                <div className="bg-gradient-to-r from-[#B86B05] to-[#D4881C] px-5 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-white font-bold text-base">Hóa đơn đơn hàng</h2>
                        <p className="text-amber-200 text-xs mt-0.5">
                            #{order?.orderNumber} · {order?.createdAt ? fmtDateTime(order.createdAt) : ""}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="overflow-y-auto flex-1 overscroll-contain">

                    {/* ── Trạng thái giao hàng (timeline dọc) ── */}
                    {!isCancelled && (
                        <div className="px-5 pt-5 pb-4">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-5 h-5 rounded-full bg-[#B86B05]/10 flex items-center justify-center">
                                    <svg className="w-3 h-3 text-[#B86B05]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <span className="text-sm font-bold text-[#1C1108]">Trạng thái giao hàng</span>
                            </div>
                            <div className="bg-white rounded-xl border border-[#EDE8E0] p-4">
                                <BillTimeline order={order} />
                            </div>
                        </div>
                    )}

                    {isCancelled && (
                        <div className="px-5 pt-5 pb-4">
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[11px] font-bold">✕</span>
                                <div>
                                    <p className="text-sm font-semibold text-red-600">Đơn hàng đã bị hủy</p>
                                    {order?.cancelledAt && (
                                        <p className="text-xs text-red-400 mt-0.5">{fmtDateTime(order.cancelledAt)}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Thông tin giao hàng ── */}
                    <div className="px-5 pb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded-full bg-[#B86B05]/10 flex items-center justify-center">
                                <svg className="w-3 h-3 text-[#B86B05]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <span className="text-sm font-bold text-[#1C1108]">Địa chỉ giao hàng</span>
                        </div>
                        <div className="bg-white rounded-xl border border-[#EDE8E0] px-4 py-3.5">
                            <p className="text-sm font-semibold text-[#1C1108]">{addr.fullName || "—"}</p>
                            <p className="text-xs text-[#9E8E7E] mt-0.5">{addr.phone || ""}</p>
                            <p className="text-xs text-[#6B5C4C] mt-1 leading-relaxed">
                                {[addr.address, addr.wardName, addr.districtName, addr.provinceName].filter(Boolean).join(", ")}
                            </p>
                            {addr.note && (
                                <p className="text-xs text-[#A8896A] italic mt-1.5 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] inline-block" />
                                    Ghi chú: {addr.note}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Sản phẩm ── */}
                    <div className="px-5 pb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded-full bg-[#B86B05]/10 flex items-center justify-center">
                                <svg className="w-3 h-3 text-[#B86B05]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <span className="text-sm font-bold text-[#1C1108]">Sản phẩm ({order?.products?.length || 0})</span>
                        </div>

                        <div className="bg-white rounded-xl border border-[#EDE8E0] divide-y divide-[#EDE8E0] overflow-hidden">
                            {(order?.products || []).map((item, idx) => {
                                const hasDiscount = item.originalPrice && item.discount > 0;
                                return (
                                    <div key={idx} className="p-4">
                                        <div className="flex gap-3">
                                            {/* Hình ảnh */}
                                            <div className="w-[60px] h-[60px] rounded-lg border border-[#EDE8E0] overflow-hidden bg-[#FAF7F4] shrink-0">
                                                <img
                                                    src={item.image || "/placeholder.png"}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>

                                            {/* Thông tin sản phẩm */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-medium text-[#1C1108] line-clamp-2 leading-snug">{item.name}</p>
                                                <p className="text-[11.5px] text-[#9E8E7E] mt-1">Phân loại: {item.variant || 'Mặc định'}</p>

                                                {/* Giá */}
                                                <div className="flex items-center flex-wrap gap-1.5 mt-2">
                                                    {hasDiscount ? (
                                                        <>
                                                            <span className="text-[13px] font-bold text-[#B86B05]">{fmtPrice(item.price)}</span>
                                                            <span className="text-[11px] text-[#9E8E7E] line-through">{fmtPrice(item.originalPrice)}</span>
                                                            <span className="px-1.5 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded">
                                                                -{item.discount}%
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-[13px] font-medium text-[#B86B05]">{fmtPrice(item.price)}</span>
                                                    )}
                                                    <span className="text-[11.5px] text-[#9E8E7E] ml-auto">×{item.quantity}</span>
                                                </div>

                                                {/* Thành tiền */}
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-[11.5px] text-[#9E8E7E]">Thành tiền</span>
                                                    <span className="text-[13px] font-bold text-[#1C1108]">{fmtPrice(item.price * item.quantity)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Thanh toán ── */}
                    <div className="px-5 pb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded-full bg-[#B86B05]/10 flex items-center justify-center">
                                <svg className="w-3 h-3 text-[#B86B05]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                            <span className="text-sm font-bold text-[#1C1108]">Chi tiết thanh toán</span>
                        </div>
                        <div className="bg-white rounded-xl border border-[#EDE8E0] overflow-hidden">
                            <div className="px-4 py-3.5 space-y-2.5">
                                {/* Tạm tính */}
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-[#6B5C4C]">Tổng tiền sản phẩm</span>
                                    <span className="text-[#1C1108] font-medium">{fmtPrice(order?.subtotal)}</span>
                                </div>

                                {/* Voucher giảm giá */}
                                {hasVoucher ? (
                                    <div className="flex justify-between text-[13px]">
                                        <span className="text-[#6B5C4C] flex items-center gap-1.5">
                                            <span className="px-1.5 py-0.5 bg-[#B86B05]/10 text-[#B86B05] text-[10px] font-bold rounded">VOUCHER</span>
                                            {order.couponCode}
                                        </span>
                                        <span className="text-green-600 font-medium">-{fmtPrice(order.couponDiscount)}</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between text-[13px]">
                                        <span className="text-[#6B5C4C]">Giảm giá voucher</span>
                                        <span className="text-[#9E8E7E] text-[#9E8E7E]">Không có</span>
                                    </div>
                                )}

                                {/* Phí vận chuyển */}
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-[#6B5C4C]">Phí vận chuyển</span>
                                    <span className={`font-medium ${order?.shippingFee === 0 ? "text-green-600" : "text-[#1C1108]"}`}>
                                        {order?.shippingFee === 0 ? "Miễn phí" : fmtPrice(order?.shippingFee)}
                                    </span>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-[#EDE8E0] my-1" />

                                {/* Tổng cộng */}
                                <div className="flex justify-between items-center">
                                    <span className="text-[14px] font-bold text-[#1C1108]">Tổng số tiền</span>
                                    <span className="text-[18px] font-extrabold text-[#B86B05]">{fmtPrice(order?.totalPrice)}</span>
                                </div>

                                {/* Thanh toán */}
                                <div className="flex justify-between text-[13px] items-center pt-1">
                                    <span className="text-[#6B5C4C]">Thanh toán</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-semibold text-[#1C1108]">
                                            {order?.paymentMethod === "COD" ? "COD"
                                            : order?.paymentMethod === "PAYOS" ? "PayOS"
                                            : order?.paymentMethod === "VNPAY" ? "VNPay"
                                            : order?.paymentMethod === "WALLET" ? "Ví SORA"
                                            : order?.paymentMethod || "—"}
                                        </span>
                                        {order?.paymentStatus === "paid" && (
                                            <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-600 text-[10px] font-bold rounded-full">
                                                ✓ Đã thanh toán
                                            </span>
                                        )}
                                        {order?.paymentStatus === "pending" && (
                                            <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-bold rounded-full">
                                                Chờ thanh toán
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Thông tin đơn hàng ── */}
                    <div className="px-5 pb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded-full bg-[#B86B05]/10 flex items-center justify-center">
                                <svg className="w-3 h-3 text-[#B86B05]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-sm font-bold text-[#1C1108]">Thông tin đơn hàng</span>
                        </div>
                        <div className="bg-white rounded-xl border border-[#EDE8E0] px-4 py-3.5 space-y-2">
                            <div className="flex justify-between text-[13px]">
                                <span className="text-[#9E8E7E]">Mã đơn hàng</span>
                                <span className="font-mono font-semibold text-[#1C1108] text-[12px]">{order?.orderNumber || order?._id}</span>
                            </div>
                            <div className="flex justify-between text-[13px]">
                                <span className="text-[#9E8E7E]">Ngày đặt</span>
                                <span className="text-[#6B5C4C]">{order?.createdAt ? fmtDateTime(order.createdAt) : "—"}</span>
                            </div>
                            {order?.orderedAt && (
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-[#9E8E7E]">Thời gian đặt</span>
                                    <span className="text-[#6B5C4C]">{fmtDateTime(order.orderedAt)}</span>
                                </div>
                            )}
                            {order?.deliveredAt && (
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-[#9E8E7E]">Ngày nhận</span>
                                    <span className="text-[#6B5C4C]">{fmtDateTime(order.deliveredAt)}</span>
                                </div>
                            )}
                            {order?.shippingProvider && (
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-[#9E8E7E]">Đơn vị vận chuyển</span>
                                    <span className="text-[#6B5C4C]">{order.shippingProvider}</span>
                                </div>
                            )}
                            {order?.trackingNumber && (
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-[#9E8E7E]">Mã vận đơn</span>
                                    <span className="font-mono font-semibold text-[#B86B05]">{order.trackingNumber}</span>
                                </div>
                            )}
                        </div>
                    </div>

                </div>{/* end scrollable body */}
            </div>
        </div>
    );
};

export default OrderBillModal;
