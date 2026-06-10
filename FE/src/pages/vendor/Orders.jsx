import { useState } from "react";
import { PageHeader, Btn, Tabs, Badge, AlertStrip, SearchInput, selectClass } from "../../components/vendor/ui";
import SlideOver from "../../components/vendor/SlideOver";
import { orders, orderTabs, sampleOrderDetail, formatVND } from "../../components/vendor/data";
import { IconDownload, IconAlertCircle, IconPrinter, IconCheck } from "../../components/vendor/icons";

const SectionHdr = ({ children }) => (
    <div className="text-[12px] font-bold text-[#6B5C4C] uppercase tracking-[0.06em] mb-2.5">{children}</div>
);

const DetailCard = ({ children, className = "" }) => (
    <div className={`border border-[#EDE8E0] rounded-[10px] p-[14px_16px] mb-4 ${className}`}>{children}</div>
);

/* ---- Order status timeline ---- */
const Timeline = ({ steps }) => (
    <ul className="pl-1 mb-5">
        {steps.map((s, i) => (
            <li key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                {i < steps.length - 1 && <span className="absolute left-[10px] top-[22px] bottom-0 w-0.5 bg-[#EDE8E0]" />}
                <div
                    className={`w-[22px] h-[22px] rounded-full border-[2.5px] flex items-center justify-center shrink-0 ${
                        s.state === "done"
                            ? "bg-[#95520B] border-[#95520B]"
                            : s.state === "current"
                            ? "bg-white border-[#B86B05]"
                            : "bg-white border-[#EDE8E0]"
                    }`}
                >
                    {s.state === "done" && <IconCheck size={10} strokeWidth={3} className="text-white" />}
                    {s.state === "current" && <span className="w-2 h-2 rounded-full bg-[#B86B05]" />}
                </div>
                <div>
                    <div className={`text-[13px] font-semibold ${s.state === "current" ? "text-[#B86B05]" : s.state === "todo" ? "text-[#9E8E7E]" : "text-[#1C1108]"}`}>
                        {s.label}
                    </div>
                    {s.time && <div className="text-[11.5px] text-[#9E8E7E] mt-0.5">{s.time}</div>}
                </div>
            </li>
        ))}
    </ul>
);

/* ---- Order detail drawer ---- */
const OrderDetail = ({ open, onClose, order }) => {
    const d = sampleOrderDetail;
    return (
        <SlideOver
            open={open}
            onClose={onClose}
            widthClass="sm:w-[620px]"
            title={
                <div className="min-w-0">
                    <div className="text-base font-bold truncate">#{order.id}</div>
                    <div className="text-[11.5px] text-[#9E8E7E] mt-0.5">
                        Đặt lúc {order.date} {order.time} · <Badge tone={order.status.tone}>{order.status.label}</Badge>
                    </div>
                </div>
            }
            headerRight={<Btn variant="outline" size="sm"><IconPrinter size={13} /> In đơn</Btn>}
        >
            <SectionHdr>Trạng thái đơn hàng</SectionHdr>
            <Timeline steps={d.timeline} />

            <SectionHdr>Thông tin khách hàng</SectionHdr>
            <DetailCard>
                <div className="grid grid-cols-2 gap-2.5 text-[13px]">
                    <div><div className="text-[11.5px] text-[#9E8E7E] mb-0.5">Họ tên</div><div className="font-semibold">{order.customer.name}</div></div>
                    <div><div className="text-[11.5px] text-[#9E8E7E] mb-0.5">Số điện thoại</div><div className="font-semibold">{order.customer.phone}</div></div>
                    <div className="col-span-2"><div className="text-[11.5px] text-[#9E8E7E] mb-0.5">Địa chỉ giao hàng</div><div className="font-semibold">{d.customer.address}</div></div>
                    <div><div className="text-[11.5px] text-[#9E8E7E] mb-0.5">Ghi chú</div><div>{d.customer.note}</div></div>
                </div>
            </DetailCard>

            <SectionHdr>Sản phẩm trong đơn</SectionHdr>
            <div className="border border-[#EDE8E0] rounded-[10px] overflow-hidden mb-4">
                {d.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 border-b border-[#EDE8E0] last:border-b-0">
                        <div className="w-[50px] h-[50px] rounded-lg bg-[#FAF7F4] border border-[#EDE8E0] shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold">{it.name}</div>
                            <div className="text-[11.5px] text-[#9E8E7E]">{it.variant}</div>
                        </div>
                        <div className="font-bold whitespace-nowrap">{formatVND(it.price)}</div>
                    </div>
                ))}
            </div>

            <SectionHdr>Thông tin vận chuyển</SectionHdr>
            <DetailCard className="text-[13px]">
                <div className="grid grid-cols-2 gap-2">
                    <div><div className="text-[11.5px] text-[#9E8E7E]">Đơn vị vận chuyển</div><div className="font-semibold mt-0.5">{d.shipping.carrier}</div></div>
                    <div><div className="text-[11.5px] text-[#9E8E7E]">Mã vận đơn</div><div className="font-semibold text-[#B86B05] mt-0.5">{d.shipping.trackingCode}</div></div>
                    <div><div className="text-[11.5px] text-[#9E8E7E]">Loại giao hàng</div><div className="font-semibold mt-0.5">{d.shipping.deliveryType}</div></div>
                    <div><div className="text-[11.5px] text-[#9E8E7E]">Dự kiến giao</div><div className="font-semibold mt-0.5">{d.shipping.eta}</div></div>
                </div>
            </DetailCard>

            <SectionHdr>Tóm tắt tài chính</SectionHdr>
            <DetailCard>
                <div className="flex justify-between py-1.5 text-[13px]"><span className="text-[#6B5C4C]">Tạm tính</span><span>{formatVND(d.finance.subtotal)}</span></div>
                <div className="flex justify-between py-1.5 text-[13px]"><span className="text-[#6B5C4C]">Phí vận chuyển</span><span>{d.finance.shippingFee === 0 ? "Miễn phí" : formatVND(d.finance.shippingFee)}</span></div>
                <div className="flex justify-between py-1.5 text-[13px]"><span className="text-[#6B5C4C]">Giảm giá</span><span className="text-[#16a34a]">−{formatVND(d.finance.discount)}</span></div>
                <div className="flex justify-between py-1.5 text-[13px]"><span className="text-[#6B5C4C]">Phương thức TT</span><Badge tone={d.finance.payment.tone}>{d.finance.payment.label}</Badge></div>
                <div className="flex justify-between border-t border-[#EDE8E0] mt-1 pt-2.5 font-bold text-sm"><span>Tổng thanh toán</span><span className="text-[#B86B05] text-[15px]">{formatVND(d.finance.total)}</span></div>
            </DetailCard>

            <div className="flex gap-2 flex-wrap">
                <Btn variant="primary" className="flex-1"><IconCheck size={14} strokeWidth={2.5} /> Xác nhận đơn</Btn>
                <Btn variant="outline">In phiếu giao</Btn>
                <Btn variant="danger" size="sm">Huỷ đơn</Btn>
            </div>
        </SlideOver>
    );
};

const Orders = () => {
    const [tab, setTab] = useState("all");
    const [panelOpen, setPanelOpen] = useState(false);
    const [selected, setSelected] = useState(orders[0]);

    const openDetail = (order) => {
        setSelected(order);
        setPanelOpen(true);
    };

    return (
        <div className="vendor-fade-in">
            <PageHeader
                title="Quản lý đơn hàng"
                sub="Cập nhật lúc 08/06/2026 – 14:32"
                actions={<Btn variant="outline" size="sm"><IconDownload size={13} /> Xuất Excel</Btn>}
            />

            <AlertStrip tone="danger" icon={<IconAlertCircle size={15} className="shrink-0" />} className="mb-4">
                <strong>5 đơn hàng</strong> chờ xác nhận đã quá 24 giờ. Vui lòng xử lý sớm để tránh bị ảnh hưởng đánh giá.
            </AlertStrip>

            <Tabs tabs={orderTabs} active={tab} onChange={setTab} />

            {/* Filters */}
            <div className="flex items-center gap-2 mb-3.5 flex-wrap">
                <SearchInput placeholder="Mã đơn, tên khách hàng..." />
                <input type="date" defaultValue="2026-06-01" className={selectClass} />
                <span className="text-[13px] text-[#9E8E7E]">→</span>
                <input type="date" defaultValue="2026-06-08" className={selectClass} />
                <select className={selectClass}><option>Tất cả thanh toán</option><option>COD</option><option>Chuyển khoản</option><option>VNPay</option><option>Momo</option></select>
            </div>

            {/* Table */}
            <div className="rounded-[10px] overflow-x-auto border border-[#EDE8E0]">
                <table className="w-full border-collapse min-w-[860px]">
                    <thead>
                        <tr>
                            {["Mã đơn", "Khách hàng", "Sản phẩm", "Tổng tiền", "Ngày đặt", "Thanh toán", "Trạng thái", "Thao tác"].map((h) => (
                                <th key={h} className="bg-[#FAF7F4] px-3.5 py-2.5 text-left text-[11.5px] font-semibold text-[#6B5C4C] uppercase tracking-[0.04em] border-b border-[#EDE8E0] whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((o) => (
                            <tr key={o.id} className="border-b border-[#EDE8E0] last:border-0 hover:bg-[#FDFAF7]">
                                <td className="px-3.5 py-3">
                                    <button onClick={() => openDetail(o)} className="font-bold text-[#B86B05] text-[13px] hover:underline">#{o.id}</button>
                                </td>
                                <td className="px-3.5 py-3">
                                    <div className="font-semibold text-[13px]">{o.customer.name}</div>
                                    <div className="text-[11.5px] text-[#9E8E7E]">{o.customer.phone}</div>
                                </td>
                                <td className="px-3.5 py-3">
                                    <div className="text-[13px]">{o.product} <span className="text-[11.5px] text-[#9E8E7E]">×{o.qty}</span></div>
                                    {o.extra && <div className="text-[11.5px] text-[#9E8E7E]">{o.extra}</div>}
                                </td>
                                <td className="px-3.5 py-3 font-bold whitespace-nowrap">{formatVND(o.total)}</td>
                                <td className="px-3.5 py-3">
                                    <div className="text-[13px]">{o.date}</div>
                                    <div className="text-[11.5px] text-[#9E8E7E]">{o.time}</div>
                                </td>
                                <td className="px-3.5 py-3"><Badge tone={o.payment.tone}>{o.payment.label}</Badge></td>
                                <td className="px-3.5 py-3"><Badge tone={o.status.tone}>{o.status.label}</Badge></td>
                                <td className="px-3.5 py-3">
                                    <div className="flex gap-1">
                                        {o.action === "confirm" ? (
                                            <Btn variant="primary" size="xs" onClick={() => openDetail(o)}>Xác nhận</Btn>
                                        ) : (
                                            <Btn variant="outline" size="xs" onClick={() => openDetail(o)}>Chi tiết</Btn>
                                        )}
                                        {!o.noPrint && <Btn variant="ghost" size="xs">In</Btn>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                <span className="text-[11.5px] text-[#9E8E7E]">Hiển thị 1–5 / 142 đơn hàng</span>
                <div className="flex gap-1">
                    <Btn variant="outline" size="xs">‹</Btn>
                    <Btn variant="primary" size="xs">1</Btn>
                    <Btn variant="outline" size="xs">2</Btn>
                    <Btn variant="outline" size="xs">3</Btn>
                    <Btn variant="outline" size="xs">›</Btn>
                </div>
            </div>

            <OrderDetail open={panelOpen} onClose={() => setPanelOpen(false)} order={selected} />
        </div>
    );
};

export default Orders;
