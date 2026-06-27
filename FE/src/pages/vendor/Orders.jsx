import { useState, useEffect, useCallback } from "react";
import { PageHeader, Btn, Tabs, Badge, AlertStrip, SearchInput } from "../../components/vendor/ui";
import SlideOver from "../../components/vendor/SlideOver";
import { formatVND } from "../../components/vendor/data";
import { IconAlertCircle, IconCheck } from "../../components/vendor/icons";
import { useToast } from "../../components/context/ToastContext";
import { getVendorOrdersApi, updateVendorOrderStatusApi } from "../../utils/api";

const STATUS_META = {
    pending: { label: "Chờ xác nhận", tone: "yellow" },
    confirmed: { label: "Đã xác nhận", tone: "blue" },
    preparing: { label: "Đang chuẩn bị", tone: "orange" },
    shipping: { label: "Đang giao", tone: "blue" },
    delivered: { label: "Hoàn thành", tone: "green" },
    cancelled: { label: "Đã huỷ", tone: "red" },
    cancel_requested: { label: "Yêu cầu huỷ", tone: "yellow" },
};
const PAYMENT_META = {
    COD: { label: "COD", tone: "gray" },
    VNPAY: { label: "VNPay", tone: "blue" },
    MOMO: { label: "Momo", tone: "purple" },
    ZALOPAY: { label: "ZaloPay", tone: "blue" },
};

const PROVIDER_OPTIONS = [
    { key: 'ghtk', name: 'Giao Hàng Tiết Kiệm', short: 'GHTK', desc: 'Dịch vụ tiết kiệm', color: 'from-yellow-400 to-orange-400' },
    { key: 'jt', name: 'J&T Express', short: 'J&T', desc: 'Giao hàng nhanh', color: 'from-blue-500 to-blue-600' },
    { key: 'viettel', name: 'Viettel Post', short: 'VT', desc: 'Bưu chính Viettel', color: 'from-red-500 to-red-600' },
];

const TAB_DEFS = [
    { key: "all", label: "Tất cả" },
    { key: "pending", label: "Chờ xác nhận" },
    { key: "confirmed", label: "Đã xác nhận" },
    { key: "preparing", label: "Đang chuẩn bị" },
    { key: "shipping", label: "Đang giao" },
    { key: "delivered", label: "Hoàn thành" },
    { key: "cancelled", label: "Đã huỷ" },
];
// Hành động chuyển trạng thái kế tiếp theo luồng đơn
const NEXT_ACTION = {
    pending: { to: "confirmed", label: "Xác nhận đơn" },
    confirmed: { to: "preparing", label: "Chuẩn bị hàng" },
    preparing: { to: "shipping", label: "Giao hàng" },
    shipping: { to: "delivered", label: "Đã giao" },
};
const FLOW = ["pending", "confirmed", "preparing", "shipping", "delivered"];
const CANCELLABLE = ["pending", "confirmed", "preparing"];

const msgOf = (res) => (Array.isArray(res?.message) ? res.message.join(", ") : res?.message);
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("vi-VN") : "");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");
const getOrderShopId = (order) => String(order?.shop?._id || order?.shop || order?.products?.[0]?.shop || "");
const getShippingProvider = (order) => {
    const provider = order?.shippingProvider;
    if (!provider || typeof provider === "string") return provider || null;
    if (provider.code || provider.name || provider._id) return provider;
    const shopProvider = provider[getOrderShopId(order)];
    if (shopProvider) return shopProvider;
    return Object.values(provider).find(Boolean) || null;
};
const providerCodeOf = (provider) => {
    if (!provider) return "";
    if (typeof provider === "string") return provider.toLowerCase();
    return String(provider.code || provider._id || "").toLowerCase();
};
const providerNameOf = (provider) => {
    const code = providerCodeOf(provider);
    const option = PROVIDER_OPTIONS.find((p) => p.key === code);
    if (option) return option.name;
    if (provider && typeof provider === "object") return provider.name || provider.code || "—";
    return provider || "—";
};
const providerShortOf = (provider) => {
    const code = providerCodeOf(provider);
    const option = PROVIDER_OPTIONS.find((p) => p.key === code);
    if (option) return option.short;
    if (provider && typeof provider === "object") return provider.code || provider.name || "";
    return provider || "";
};
const getShopSubtotal = (order) => {
    if (typeof order?.shopSubtotal === "number") return order.shopSubtotal;
    if (typeof order?.subtotal === "number") return order.subtotal;
    return (order?.products || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
};
const getShopRevenue = (order) => {
    if (typeof order?.shopRevenue === "number") return order.shopRevenue;
    const rate = Math.max(0, 10 - Number(order?.commissionRate || 0));
    return Math.round(getShopSubtotal(order) * rate / 100);
};

const SectionHdr = ({ children }) => (
    <div className="text-[12px] font-bold text-[#6B5C4C] uppercase tracking-[0.06em] mb-2.5">{children}</div>
);
const DetailCard = ({ children, className = "" }) => (
    <div className={`border border-[#EDE8E0] rounded-[10px] p-[14px_16px] mb-4 ${className}`}>{children}</div>
);

/* ---- Timeline suy ra từ trạng thái + statusHistory ---- */
const Timeline = ({ order }) => {
    if (order.status === "cancelled") {
        return (
            <div className="flex items-center gap-2.5 mb-5 text-[13px] font-semibold text-[#dc2626]">
                <span className="w-[22px] h-[22px] rounded-full bg-[#dc2626] flex items-center justify-center text-white text-[12px]">✕</span>
                Đơn hàng đã huỷ {order.cancelledAt ? `· ${fmtDateTime(order.cancelledAt)}` : ""}
            </div>
        );
    }
    const idx = FLOW.indexOf(order.status);
    const histMap = {};
    (order.statusHistory || []).forEach((h) => { histMap[h.status] = h.timestamp; });
    const steps = FLOW.map((s, i) => ({
        label: STATUS_META[s].label,
        time: histMap[s] ? fmtDateTime(histMap[s]) : (s === "pending" ? fmtDateTime(order.orderedAt || order.createdAt) : ""),
        state: i < idx ? "done" : i === idx ? "current" : "todo",
    }));
    return (
        <ul className="pl-1 mb-5">
            {steps.map((s, i) => (
                <li key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                    {i < steps.length - 1 && <span className="absolute left-[10px] top-[22px] bottom-0 w-0.5 bg-[#EDE8E0]" />}
                    <div className={`w-[22px] h-[22px] rounded-full border-[2.5px] flex items-center justify-center shrink-0 ${s.state === "done" ? "bg-[#95520B] border-[#95520B]" : s.state === "current" ? "bg-white border-[#B86B05]" : "bg-white border-[#EDE8E0]"}`}>
                        {s.state === "done" && <IconCheck size={10} strokeWidth={3} className="text-white" />}
                        {s.state === "current" && <span className="w-2 h-2 rounded-full bg-[#B86B05]" />}
                    </div>
                    <div>
                        <div className={`text-[13px] font-semibold ${s.state === "current" ? "text-[#B86B05]" : s.state === "todo" ? "text-[#9E8E7E]" : "text-[#1C1108]"}`}>{s.label}</div>
                        {s.time && <div className="text-[11.5px] text-[#9E8E7E] mt-0.5">{s.time}</div>}
                    </div>
                </li>
            ))}
        </ul>
    );
};

/* ---- Order detail drawer ---- */
const OrderDetail = ({ open, onClose, order, onAction, busy }) => {
    if (!order) return null;
    const st = STATUS_META[order.status] || STATUS_META.pending;
    const pay = PAYMENT_META[order.paymentMethod] || { label: order.paymentMethod, tone: "gray" };
    const addr = order.shippingAddress || {};
    const next = NEXT_ACTION[order.status];
    const canCancel = CANCELLABLE.includes(order.status);
    const shippingProvider = getShippingProvider(order);

    return (
        <SlideOver
            open={open}
            onClose={onClose}
            widthClass="sm:w-[620px]"
            title={
                <div className="min-w-0">
                    <div className="text-base font-bold truncate">#{order.orderNumber}</div>
                    <div className="text-[11.5px] text-[#9E8E7E] mt-0.5">Đặt lúc {fmtDateTime(order.orderedAt || order.createdAt)} · <Badge tone={st.tone}>{st.label}</Badge></div>
                </div>
            }
        >
            <SectionHdr>Trạng thái đơn hàng</SectionHdr>
            <Timeline order={order} />

            <SectionHdr>Thông tin khách hàng</SectionHdr>
            <DetailCard>
                <div className="grid grid-cols-2 gap-2.5 text-[13px]">
                    <div><div className="text-[11.5px] text-[#9E8E7E] mb-0.5">Người nhận</div><div className="font-semibold">{addr.fullName || order.user?.fullName || "—"}</div></div>
                    <div><div className="text-[11.5px] text-[#9E8E7E] mb-0.5">Số điện thoại</div><div className="font-semibold">{addr.phone || "—"}</div></div>
                    <div className="col-span-2"><div className="text-[11.5px] text-[#9E8E7E] mb-0.5">Địa chỉ giao hàng</div><div className="font-semibold">{[addr.address, addr.city].filter(Boolean).join(", ") || "—"}</div></div>
                    {addr.note && <div className="col-span-2"><div className="text-[11.5px] text-[#9E8E7E] mb-0.5">Ghi chú</div><div>{addr.note}</div></div>}
                </div>
            </DetailCard>

            <SectionHdr>Sản phẩm của cửa hàng bạn trong đơn</SectionHdr>
            <div className="border border-[#EDE8E0] rounded-[10px] overflow-hidden mb-4">
                {(order.products || []).map((it, i) => (
                    <div key={i} className="px-3.5 py-2.5 border-b border-[#EDE8E0] last:border-b-0">
                        <div className="flex items-center gap-3">
                            <div className="w-[50px] h-[50px] rounded-lg bg-[#FAF7F4] border border-[#EDE8E0] shrink-0 overflow-hidden">
                                {it.image && <img src={it.image} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-semibold truncate">{it.name}</div>
                                <div className="text-[11.5px] text-[#9E8E7E]">SL: ×{it.quantity}</div>
                            </div>
                            <div className="font-bold whitespace-nowrap">{formatVND(it.price * it.quantity)}</div>
                        </div>
                        {it.shopOrderCode && (
                            <div className="mt-1.5 text-[11px] text-[#9E8E7E]">
                                Mã đơn shop: <span className="font-mono font-semibold text-[#B86B05]">{it.shopOrderCode}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <SectionHdr>Tóm tắt</SectionHdr>
            <DetailCard>
                <div className="flex justify-between py-1.5 text-[13px]"><span className="text-[#6B5C4C]">Tạm tính (sản phẩm shop)</span><span>{formatVND(getShopSubtotal(order))}</span></div>
                <div className="flex justify-between py-1.5 text-[13px]"><span className="text-[#6B5C4C]">Phương thức TT</span><Badge tone={pay.tone}>{pay.label}</Badge></div>
                <div className="flex justify-between py-1.5 text-[13px]"><span className="text-[#6B5C4C]">Tổng cả đơn (mọi shop)</span><span className="text-[#9E8E7E]">{formatVND(order.totalPrice || 0)}</span></div>
                <div className="flex justify-between border-t border-[#EDE8E0] mt-1 pt-2.5 font-bold text-sm"><span>Doanh thu shop</span><span className="text-[#B86B05] text-[15px]">{formatVND(getShopRevenue(order))}</span></div>
            </DetailCard>

            {/* Shipping info if already shipped */}
            {(shippingProvider || order.trackingNumber) && (
                <div className="bg-teal-50 rounded-xl p-4 border border-teal-200 mb-4">
                    <p className="text-xs font-semibold text-teal-700 mb-1">Đơn vị vận chuyển</p>
                    <p className="text-sm font-bold text-teal-800">{providerNameOf(shippingProvider)}</p>
                    {order.trackingNumber && (
                        <p className="text-xs text-teal-600 mt-1">Mã vận đơn: <span className="font-mono font-semibold">{order.trackingNumber}</span></p>
                    )}
                </div>
            )}

            {(next || canCancel) && (
                <div className="flex gap-2 flex-wrap">
                    {next && (
                        <Btn variant="primary" className="flex-1" disabled={busy} onClick={() => onAction(order, next.to)}>
                            <IconCheck size={14} strokeWidth={2.5} /> {next.label}
                        </Btn>
                    )}
                    {canCancel && (
                        <Btn variant="danger" size="sm" disabled={busy} onClick={() => onAction(order, "cancelled")}>Huỷ đơn</Btn>
                    )}
                </div>
            )}
        </SlideOver>
    );
};

const Orders = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const [orders, setOrders] = useState([]);
    const [counts, setCounts] = useState({});
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);

    const [panelOpen, setPanelOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [busy, setBusy] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getVendorOrdersApi({ status: tab, search: search || undefined, page, limit: 10 });
            if (res.success) {
                setOrders(res.data.orders || []);
                setCounts(res.data.counts || {});
                setPagination(res.data.pagination || { total: 0, pages: 1 });
            } else {
                setOrders([]);
            }
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [tab, search, page]);

    useEffect(() => {
        const t = setTimeout(fetchOrders, 300);
        return () => clearTimeout(t);
    }, [fetchOrders]);

    const tabs = TAB_DEFS.map((t) => ({ ...t, count: counts[t.key] ?? 0 }));
    const selected = orders.find((o) => o._id === selectedId) || null;

    const openDetail = (o) => { setSelectedId(o._id); setPanelOpen(true); };

    const changeFilter = (fn) => { fn(); setPage(1); };

    const doAction = async (order, status) => {
        if (status === "cancelled" && !window.confirm("Huỷ đơn hàng này? Tồn kho sản phẩm của bạn sẽ được hoàn lại.")) return;
        try {
            setBusy(true);
            const res = await updateVendorOrderStatusApi(order._id, status);
            if (res.success) {
                showToast("Cập nhật trạng thái thành công", "success");
                await fetchOrders();
            } else {
                showToast(msgOf(res) || "Cập nhật thất bại", "error");
            }
        } catch {
            showToast("Có lỗi xảy ra", "error");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="vendor-fade-in">
            <PageHeader title="Quản lý đơn hàng" sub={`${counts.all ?? 0} đơn có sản phẩm của cửa hàng`} />

            {(counts.pending ?? 0) > 0 && (
                <AlertStrip tone="danger" icon={<IconAlertCircle size={15} className="shrink-0" />} className="mb-4">
                    <strong>{counts.pending} đơn hàng</strong> đang chờ xác nhận. Vui lòng xử lý sớm để tránh ảnh hưởng đánh giá.
                </AlertStrip>
            )}

            <Tabs tabs={tabs} active={tab} onChange={(k) => changeFilter(() => setTab(k))} />

            <div className="flex items-center gap-2 mb-3.5 flex-wrap">
                <SearchInput placeholder="Mã đơn, tên / SĐT khách hàng..." value={search} onChange={(e) => changeFilter(() => setSearch(e.target.value))} />
                {search && <Btn variant="ghost" size="sm" className="text-[#9E8E7E]" onClick={() => changeFilter(() => setSearch(""))}>Xóa lọc</Btn>}
            </div>

            <div className="rounded-[10px] overflow-x-auto border border-[#EDE8E0]">
                <table className="w-full border-collapse min-w-[820px]">
                    <thead>
                        <tr>
                            {["Mã đơn", "Khách hàng", "Sản phẩm (shop)", "Doanh thu shop", "Ngày đặt", "Thanh toán", "Trạng thái", "Thao tác"].map((h) => (
                                <th key={h} className="bg-[#FAF7F4] px-3.5 py-2.5 text-left text-[11.5px] font-semibold text-[#6B5C4C] uppercase tracking-[0.04em] border-b border-[#EDE8E0] whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="px-3.5 py-10 text-center text-[#9E8E7E] text-[13px]">Đang tải...</td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={8} className="px-3.5 py-10 text-center text-[#9E8E7E] text-[13px]">Chưa có đơn hàng nào</td></tr>
                        ) : orders.map((o) => {
                            const st = STATUS_META[o.status] || STATUS_META.pending;
                            const pay = PAYMENT_META[o.paymentMethod] || { label: o.paymentMethod, tone: "gray" };
                            const first = o.products?.[0];
                            const more = (o.products?.length || 0) - 1;
                            const next = NEXT_ACTION[o.status];
                            // Get shop order code from first product
                            const shopOrderCode = first?.shopOrderCode || o.shopOrderCode;
                            const shippingProvider = getShippingProvider(o);
                            return (
                                <tr key={o._id} className="border-b border-[#EDE8E0] last:border-0 hover:bg-[#FDFAF7]">
                                    <td className="px-3.5 py-3">
                                        <button onClick={() => openDetail(o)} className="font-bold text-[#B86B05] text-[13px] hover:underline">#{o.orderNumber}</button>
                                        {shopOrderCode && (
                                            <div className="text-[11px] text-[#9E8E7E] font-mono mt-0.5">Shop: {shopOrderCode}</div>
                                        )}
                                    </td>
                                    <td className="px-3.5 py-3">
                                        <div className="font-semibold text-[13px]">{o.shippingAddress?.fullName || o.user?.fullName || "—"}</div>
                                        <div className="text-[11.5px] text-[#9E8E7E]">{o.shippingAddress?.phone || ""}</div>
                                    </td>
                                    <td className="px-3.5 py-3">
                                        <div className="text-[13px] truncate max-w-[220px]">{first?.name || "—"} {first && <span className="text-[11.5px] text-[#9E8E7E]">×{first.quantity}</span>}</div>
                                        {more > 0 && <div className="text-[11.5px] text-[#9E8E7E]">+{more} sản phẩm khác</div>}
                                    </td>
                                    <td className="px-3.5 py-3 font-bold whitespace-nowrap">{formatVND(getShopRevenue(o))}</td>
                                    <td className="px-3.5 py-3">
                                        <div className="text-[13px]">{fmtDate(o.orderedAt || o.createdAt)}</div>
                                    </td>
                                    <td className="px-3.5 py-3"><Badge tone={pay.tone}>{pay.label}</Badge></td>
                                    <td className="px-3.5 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                                    <td className="px-3.5 py-3">
                                        <div className="flex gap-1">
                                            {next ? (
                                                <Btn variant="primary" size="xs" disabled={busy} onClick={() => doAction(o, next.to)}>
                                                    {next.label}{shippingProvider && next.to === 'shipping' ? ` (${providerShortOf(shippingProvider)})` : ''}
                                                </Btn>
                                            ) : (
                                                <Btn variant="outline" size="xs" onClick={() => openDetail(o)}>Chi tiết</Btn>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                    <span className="text-[11.5px] text-[#9E8E7E]">Trang {page} / {pagination.pages} · {pagination.total} đơn hàng</span>
                    <div className="flex gap-1">
                        <Btn variant="outline" size="xs" onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</Btn>
                        <Btn variant="outline" size="xs" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}>›</Btn>
                    </div>
                </div>
            )}

            <OrderDetail
                open={panelOpen}
                onClose={() => setPanelOpen(false)}
                order={selected}
                onAction={doAction}
                busy={busy}
            />
        </div>
    );
};

export default Orders;
