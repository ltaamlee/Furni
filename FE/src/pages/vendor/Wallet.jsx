import { useRef, useState } from "react";
import { PageHeader, Card, CardTitle, Btn, Badge, Label, Hint, inputClass } from "../../components/vendor/ui";
import { wallet, transactions, withdrawAccounts, withdrawQuickAmounts, withdrawHistory, formatVND } from "../../components/vendor/data";
import { IconDownload, IconDollar, IconPlus, IconCheck } from "../../components/vendor/icons";

const Wallet = () => {
    const withdrawRef = useRef(null);
    const [bank, setBank] = useState(0);
    const [amount, setAmount] = useState("10.000.000");

    return (
        <div className="vendor-fade-in">
            <PageHeader title="Ví điện tử" sub="Quản lý số dư và lịch sử giao dịch" />

            {/* Balance row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
                {/* Main balance */}
                <div className="relative overflow-hidden rounded-[14px] px-7 pt-7 pb-6 text-white bg-[linear-gradient(135deg,#95520B_0%,#B86B05_60%,#DE9601_100%)]">
                    <div className="absolute -right-10 -top-10 w-[180px] h-[180px] rounded-full bg-white/[0.07]" />
                    <div className="absolute right-10 -bottom-16 w-[140px] h-[140px] rounded-full bg-white/[0.05]" />
                    <div className="relative">
                        <div className="text-[12.5px] font-medium opacity-80 mb-2 tracking-[0.04em]">SỐ DƯ KHẢ DỤNG</div>
                        <div className="text-[36px] font-extrabold tracking-[-0.5px] mb-1">{formatVND(wallet.available)}</div>
                        <div className="text-[12.5px] opacity-75">Cập nhật: {wallet.updatedAt}</div>
                        <button
                            onClick={() => withdrawRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                            className="mt-[18px] bg-white/20 border-[1.5px] border-white/40 text-white px-[18px] py-2 rounded-[6px] text-[13px] font-semibold cursor-pointer backdrop-blur"
                        >
                            Rút tiền ngay
                        </button>
                    </div>
                </div>

                {/* Pending */}
                <Card className="flex flex-col justify-center">
                    <div className="text-[11.5px] text-[#9E8E7E] mb-1 uppercase tracking-[0.04em]">Đang chờ giải ngân</div>
                    <div className="text-[28px] font-extrabold text-[#d97706]">{formatVND(wallet.pending)}</div>
                    <div className="text-[11.5px] text-[#9E8E7E] mt-1">{wallet.pendingNote}</div>
                    <div className="text-[11.5px] text-[#9E8E7E] mt-1.5">{wallet.payoutNote}</div>
                </Card>

                {/* Stats */}
                <Card className="flex flex-col gap-3 justify-center">
                    {wallet.stats.map((s, i) => (
                        <div key={s.label}>
                            <div className="flex justify-between items-center">
                                <span className="text-[11.5px] text-[#9E8E7E] uppercase">{s.label}</span>
                                <span className={`font-bold text-sm ${s.tone}`}>{s.value}</span>
                            </div>
                            {i < wallet.stats.length - 1 && <div className="h-px bg-[#EDE8E0] mt-3" />}
                        </div>
                    ))}
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* Transaction history */}
                <Card>
                    <CardTitle>
                        Lịch sử giao dịch
                        <div className="flex gap-1.5">
                            <select className="px-2 py-1 border-[1.5px] border-[#EDE8E0] rounded-[6px] text-[12px] text-[#6B5C4C] bg-white outline-none cursor-pointer focus:border-[#B86B05]"><option>Tất cả</option><option>Tiền vào</option><option>Tiền ra</option></select>
                            <Btn variant="outline" size="sm"><IconDownload size={12} /></Btn>
                        </div>
                    </CardTitle>
                    <div className="rounded-[10px] overflow-x-auto border border-[#EDE8E0]">
                        <table className="w-full border-collapse min-w-[420px]">
                            <thead>
                                <tr>
                                    {["Ngày", "Mô tả", "Số tiền", "Trạng thái"].map((h) => (
                                        <th key={h} className="bg-[#FAF7F4] px-3.5 py-2.5 text-left text-[11.5px] font-semibold text-[#6B5C4C] uppercase tracking-[0.04em] border-b border-[#EDE8E0] whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t, i) => (
                                    <tr key={i} className="border-b border-[#EDE8E0] last:border-0 hover:bg-[#FDFAF7]">
                                        <td className="px-3.5 py-3"><div className="text-[12.5px]">{t.date}</div><div className="text-[11.5px] text-[#9E8E7E]">{t.time}</div></td>
                                        <td className="px-3.5 py-3"><div className="text-[13px] font-medium">{t.desc}</div><div className="text-[11.5px] text-[#9E8E7E]">{t.sub}</div></td>
                                        <td className={`px-3.5 py-3 font-bold whitespace-nowrap ${t.type === "in" ? "text-[#16a34a]" : "text-[#dc2626]"}`}>{t.amount}</td>
                                        <td className="px-3.5 py-3"><Badge tone={t.status.tone}>{t.status.label}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="text-center mt-3">
                        <Btn variant="ghost" size="sm" className="text-[#B86B05]">Xem thêm giao dịch →</Btn>
                    </div>
                </Card>

                {/* Withdraw */}
                <div ref={withdrawRef} className="space-y-4">
                    <Card>
                        <CardTitle>Rút tiền về ngân hàng</CardTitle>

                        <Label>Tài khoản nhận tiền</Label>
                        <div className="space-y-2 mb-3.5">
                            {withdrawAccounts.map((acc, i) => {
                                const active = bank === i;
                                return (
                                    <button
                                        key={acc.code}
                                        onClick={() => setBank(i)}
                                        className={`w-full flex items-center gap-3 px-3.5 py-3 border-[1.5px] rounded-[6px] transition-colors text-left ${
                                            active ? "border-[#B86B05] bg-[#fffbeb]" : "border-[#EDE8E0] hover:border-[#B86B05] hover:bg-[#fffbeb]"
                                        }`}
                                    >
                                        <div className="w-9 h-6 bg-[#FAF7F4] rounded flex items-center justify-center text-[9px] font-bold text-[#6B5C4C] border border-[#EDE8E0] shrink-0">{acc.code}</div>
                                        <div className="flex-1">
                                            <div className="text-[13px] font-semibold">{acc.name}</div>
                                            <div className="text-[11.5px] text-[#9E8E7E]">{acc.detail}</div>
                                        </div>
                                        <span className={`w-[18px] h-[18px] rounded-full flex items-center justify-center ${active ? "bg-[#95520B]" : "border-2 border-[#EDE8E0]"}`}>
                                            {active && <IconCheck size={10} strokeWidth={3} className="text-white" />}
                                        </span>
                                    </button>
                                );
                            })}
                            <Btn variant="ghost" size="sm" className="text-[#B86B05]"><IconPlus size={12} strokeWidth={2.5} /> Thêm tài khoản</Btn>
                        </div>

                        <div className="mb-3.5">
                            <Label required>Số tiền rút</Label>
                            <div className="relative">
                                <input className={`${inputClass} pr-8`} value={amount} onChange={(e) => setAmount(e.target.value)} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#6B5C4C]">₫</span>
                            </div>
                            <Hint>Số dư khả dụng: <strong className="text-[#B86B05]">{formatVND(wallet.available)}</strong> · Rút tối thiểu 100.000₫</Hint>
                        </div>

                        <div className="flex gap-1.5 flex-wrap mb-4">
                            {withdrawQuickAmounts.map((q) => (
                                <button
                                    key={q.value}
                                    onClick={() => setAmount(q.value)}
                                    className={`px-3.5 py-1.5 border-[1.5px] rounded-full text-[12.5px] font-semibold transition-colors ${
                                        amount === q.value ? "border-[#B86B05] bg-[#fffbeb] text-[#7B440C]" : "border-[#EDE8E0] bg-white text-[#6B5C4C] hover:border-[#B86B05] hover:bg-[#fffbeb]"
                                    }`}
                                >
                                    {q.label}
                                </button>
                            ))}
                        </div>

                        <div className="mb-[18px]">
                            <Label>Ghi chú (tuỳ chọn)</Label>
                            <input className={inputClass} placeholder="Rút tiền tháng 6/2026" />
                        </div>

                        <div className="bg-[#FAF7F4] rounded-[6px] p-[12px_14px] mb-4">
                            <div className="flex justify-between text-[13px] mb-1.5"><span className="text-[#6B5C4C]">Số tiền rút</span><span className="font-semibold">{amount}₫</span></div>
                            <div className="flex justify-between text-[13px] mb-1.5"><span className="text-[#6B5C4C]">Phí rút tiền</span><span className="font-semibold text-[#16a34a]">Miễn phí</span></div>
                            <div className="flex justify-between text-[13px] border-t border-[#EDE8E0] pt-2 mt-0.5"><span className="font-bold">Thực nhận</span><span className="font-bold text-[#B86B05]">{amount}₫</span></div>
                        </div>

                        <Btn variant="primary" className="w-full py-2.5"><IconDollar size={15} /> Xác nhận rút tiền</Btn>
                        <div className="text-[11.5px] text-[#9E8E7E] text-center mt-2">Thường xử lý trong 1–2 ngày làm việc</div>
                    </Card>

                    <Card>
                        <CardTitle>Lịch sử yêu cầu rút tiền</CardTitle>
                        <div className="rounded-[10px] overflow-x-auto border border-[#EDE8E0]">
                            <table className="w-full border-collapse min-w-[380px]">
                                <thead>
                                    <tr>
                                        {["Ngày", "Số tiền", "Tài khoản", "Trạng thái"].map((h) => (
                                            <th key={h} className="bg-[#FAF7F4] px-3.5 py-2.5 text-left text-[11.5px] font-semibold text-[#6B5C4C] uppercase tracking-[0.04em] border-b border-[#EDE8E0] whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {withdrawHistory.map((w, i) => (
                                        <tr key={i} className="border-b border-[#EDE8E0] last:border-0 hover:bg-[#FDFAF7]">
                                            <td className="px-3.5 py-3 text-[11.5px] text-[#9E8E7E]">{w.date}</td>
                                            <td className="px-3.5 py-3 font-bold whitespace-nowrap">{w.amount}</td>
                                            <td className="px-3.5 py-3 text-[11.5px] text-[#9E8E7E]">{w.account}</td>
                                            <td className="px-3.5 py-3"><Badge tone={w.status.tone}>{w.status.label}</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Wallet;
