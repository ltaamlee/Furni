import { useRef, useState, useEffect, useCallback } from "react";
import { PageHeader, Card, CardTitle, Btn, Badge, Label, Hint, inputClass } from "../../components/vendor/ui";
import { formatVND } from "../../components/vendor/data";
import { IconDollar, IconPlus, IconCheck } from "../../components/vendor/icons";
import { useToast } from "../../components/context/ToastContext";
import {
    getVendorWalletApi, getVendorTransactionsApi, vendorWithdrawApi, addVendorBankAccountApi,
} from "../../utils/api";

const TX_STATUS_META = {
    success: { label: "Thành công", tone: "green" },
    pending: { label: "Đang xử lý", tone: "yellow" },
    failed: { label: "Thất bại", tone: "red" },
};
const fmtDate = (d) => new Date(d).toLocaleDateString("vi-VN");
const fmtTime = (d) => new Date(d).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
const CAT_LABEL = {
    order_income: "Nhận tiền vào ví",
    withdraw: "Rút ra ngân hàng",
};
const VENDOR_WALLET_CATEGORIES = new Set(Object.keys(CAT_LABEL));

const Wallet = () => {
    const { showToast } = useToast();
    const withdrawRef = useRef(null);
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);

    const [bank, setBank] = useState(0);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // form thêm tài khoản
    const [addingBank, setAddingBank] = useState(false);
    const [newBank, setNewBank] = useState({ bankName: "", accountNumber: "", accountHolder: "" });

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            const [w, tx, wd] = await Promise.all([
                getVendorWalletApi(),
                getVendorTransactionsApi({ limit: 15 }),
                getVendorTransactionsApi({ type: "withdraw", limit: 10 }),
            ]);
            if (w.success) setWallet(w.data);
            if (tx.success) {
                setTransactions((tx.data.transactions || []).filter((item) => VENDOR_WALLET_CATEGORIES.has(item.category)));
            }
            if (wd.success) setWithdrawals(wd.data.transactions || []);
        } catch {
            setWallet(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(fetchAll, 0);
        return () => clearTimeout(t);
    }, [fetchAll]);

    const submitWithdraw = async () => {
        const num = Number(String(amount).replace(/[^\d]/g, ""));
        if (!num || num < 100000) return showToast("Số tiền rút tối thiểu 100.000₫", "error");
        if (wallet && num > wallet.balance) return showToast("Số dư khả dụng không đủ", "error");
        try {
            setSubmitting(true);
            const res = await vendorWithdrawApi({ amount: num, note, bankIndex: bank });
            if (res.success) {
                showToast("Đã gửi yêu cầu rút tiền", "success");
                setAmount(""); setNote("");
                fetchAll();
            } else {
                showToast(res.message || "Rút tiền thất bại", "error");
            }
        } catch {
            showToast("Có lỗi xảy ra", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const submitBank = async () => {
        if (!newBank.bankName || !newBank.accountNumber || !newBank.accountHolder) return showToast("Vui lòng nhập đủ thông tin", "error");
        const res = await addVendorBankAccountApi(newBank);
        if (res.success) {
            showToast("Đã thêm tài khoản", "success");
            setNewBank({ bankName: "", accountNumber: "", accountHolder: "" });
            setAddingBank(false);
            fetchAll();
        } else {
            showToast(res.message || "Thêm tài khoản thất bại", "error");
        }
    };

    if (loading || !wallet) {
        return <div className="vendor-fade-in"><PageHeader title="Ví điện tử" sub="Quản lý số dư và lịch sử giao dịch" /><div className="py-16 text-center text-[#9E8E7E] text-[13px]">Đang tải...</div></div>;
    }

    const accounts = wallet.bankAccounts || [];
    const quickAmounts = [
        { label: "5 triệu", value: "5000000" },
        { label: "10 triệu", value: "10000000" },
        { label: "20 triệu", value: "20000000" },
        { label: "Tất cả", value: String(wallet.balance) },
    ];
    const statRows = [
        { label: "Thu tháng này", value: `+${formatVND(wallet.monthly.income)}`, tone: "text-[#16a34a]" },
        { label: "Đã rút tháng này", value: `−${formatVND(wallet.monthly.withdrawn)}`, tone: "text-[#dc2626]" },
        { label: "Phí sàn", value: `−${formatVND(wallet.monthly.platformFee)}`, tone: "text-[#6B5C4C]" },
    ];

    return (
        <div className="vendor-fade-in">
            <PageHeader title="Ví điện tử" sub="Quản lý số dư và lịch sử giao dịch" />

            {/* Balance row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
                <div className="relative overflow-hidden rounded-[14px] px-7 pt-7 pb-6 text-white bg-[linear-gradient(135deg,#95520B_0%,#B86B05_60%,#DE9601_100%)]">
                    <div className="absolute -right-10 -top-10 w-[180px] h-[180px] rounded-full bg-white/[0.07]" />
                    <div className="relative">
                        <div className="text-[12.5px] font-medium opacity-80 mb-2 tracking-[0.04em]">SỐ DƯ KHẢ DỤNG</div>
                        <div className="text-[36px] font-extrabold tracking-[-0.5px] mb-1">{formatVND(wallet.balance)}</div>
                        <button
                            onClick={() => withdrawRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                            className="mt-[18px] bg-white/20 border-[1.5px] border-white/40 text-white px-[18px] py-2 rounded-[6px] text-[13px] font-semibold cursor-pointer backdrop-blur"
                        >
                            Rút tiền ngay
                        </button>
                    </div>
                </div>

                <Card className="flex flex-col justify-center">
                    <div className="text-[11.5px] text-[#9E8E7E] mb-1 uppercase tracking-[0.04em]">Đang chờ giải ngân</div>
                    <div className="text-[28px] font-extrabold text-[#d97706]">{formatVND(wallet.pendingBalance)}</div>
                    <div className="text-[11.5px] text-[#9E8E7E] mt-1.5">Giải ngân vào thứ 2 hàng tuần</div>
                </Card>

                <Card className="flex flex-col gap-3 justify-center">
                    {statRows.map((s, i) => (
                        <div key={s.label}>
                            <div className="flex justify-between items-center">
                                <span className="text-[11.5px] text-[#9E8E7E] uppercase">{s.label}</span>
                                <span className={`font-bold text-sm ${s.tone}`}>{s.value}</span>
                            </div>
                            {i < statRows.length - 1 && <div className="h-px bg-[#EDE8E0] mt-3" />}
                        </div>
                    ))}
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* Transaction history */}
                <Card>
                    <CardTitle>Lịch sử giao dịch</CardTitle>
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
                                {transactions.length === 0 ? (
                                    <tr><td colSpan={4} className="px-3.5 py-8 text-center text-[#9E8E7E] text-[13px]">Chưa có giao dịch</td></tr>
                                ) : transactions.map((t) => {
                                    const st = TX_STATUS_META[t.status] || TX_STATUS_META.pending;
                                    const isIn = t.type === "credit";
                                    return (
                                        <tr key={t._id} className="border-b border-[#EDE8E0] last:border-0 hover:bg-[#FDFAF7]">
                                            <td className="px-3.5 py-3"><div className="text-[12.5px]">{fmtDate(t.createdAt)}</div><div className="text-[11.5px] text-[#9E8E7E]">{fmtTime(t.createdAt)}</div></td>
                                            <td className="px-3.5 py-3"><div className="text-[13px] font-medium">{t.description}</div><div className="text-[11.5px] text-[#9E8E7E]">{CAT_LABEL[t.category] || ""}</div></td>
                                            <td className={`px-3.5 py-3 font-bold whitespace-nowrap ${isIn ? "text-[#16a34a]" : "text-[#dc2626]"}`}>{isIn ? "+" : "−"}{formatVND(t.amount)}</td>
                                            <td className="px-3.5 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Withdraw */}
                <div ref={withdrawRef} className="space-y-4">
                    <Card>
                        <CardTitle>Rút tiền về ngân hàng</CardTitle>

                        <Label>Tài khoản nhận tiền</Label>
                        <div className="space-y-2 mb-3.5">
                            {accounts.map((acc, i) => {
                                const active = bank === i;
                                return (
                                    <button key={i} onClick={() => setBank(i)}
                                        className={`w-full flex items-center gap-3 px-3.5 py-3 border-[1.5px] rounded-[6px] transition-colors text-left ${active ? "border-[#B86B05] bg-[#fffbeb]" : "border-[#EDE8E0] hover:border-[#B86B05] hover:bg-[#fffbeb]"}`}>
                                        <div className="w-9 h-6 bg-[#FAF7F4] rounded flex items-center justify-center text-[9px] font-bold text-[#6B5C4C] border border-[#EDE8E0] shrink-0">{acc.bankName?.slice(0, 3).toUpperCase()}</div>
                                        <div className="flex-1">
                                            <div className="text-[13px] font-semibold">{acc.bankName}</div>
                                            <div className="text-[11.5px] text-[#9E8E7E]">STK: ****{String(acc.accountNumber).slice(-4)} · {acc.accountHolder}</div>
                                        </div>
                                        <span className={`w-[18px] h-[18px] rounded-full flex items-center justify-center ${active ? "bg-[#95520B]" : "border-2 border-[#EDE8E0]"}`}>
                                            {active && <IconCheck size={10} strokeWidth={3} className="text-white" />}
                                        </span>
                                    </button>
                                );
                            })}
                            {accounts.length === 0 && <div className="text-[12px] text-[#9E8E7E]">Chưa có tài khoản nhận tiền.</div>}

                            {addingBank ? (
                                <div className="border-[1.5px] border-[#EDE8E0] rounded-[6px] p-3 space-y-2">
                                    <input className={inputClass} placeholder="Tên ngân hàng" value={newBank.bankName} onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })} />
                                    <input className={inputClass} placeholder="Số tài khoản" value={newBank.accountNumber} onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })} />
                                    <input className={inputClass} placeholder="Chủ tài khoản" value={newBank.accountHolder} onChange={(e) => setNewBank({ ...newBank, accountHolder: e.target.value })} />
                                    <div className="flex gap-2">
                                        <Btn variant="primary" size="sm" onClick={submitBank}>Lưu</Btn>
                                        <Btn variant="outline" size="sm" onClick={() => setAddingBank(false)}>Hủy</Btn>
                                    </div>
                                </div>
                            ) : (
                                <Btn variant="ghost" size="sm" className="text-[#B86B05]" onClick={() => setAddingBank(true)}><IconPlus size={12} strokeWidth={2.5} /> Thêm tài khoản</Btn>
                            )}
                        </div>

                        <div className="mb-3.5">
                            <Label required>Số tiền rút</Label>
                            <div className="relative">
                                <input className={`${inputClass} pr-8`} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000000" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#6B5C4C]">₫</span>
                            </div>
                            <Hint>Số dư khả dụng: <strong className="text-[#B86B05]">{formatVND(wallet.balance)}</strong> · Rút tối thiểu 100.000₫</Hint>
                        </div>

                        <div className="flex gap-1.5 flex-wrap mb-4">
                            {quickAmounts.map((q) => (
                                <button key={q.label} onClick={() => setAmount(q.value)}
                                    className={`px-3.5 py-1.5 border-[1.5px] rounded-full text-[12.5px] font-semibold transition-colors ${amount === q.value ? "border-[#B86B05] bg-[#fffbeb] text-[#7B440C]" : "border-[#EDE8E0] bg-white text-[#6B5C4C] hover:border-[#B86B05] hover:bg-[#fffbeb]"}`}>
                                    {q.label}
                                </button>
                            ))}
                        </div>

                        <div className="mb-[18px]">
                            <Label>Ghi chú (tuỳ chọn)</Label>
                            <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rút tiền tháng 6/2026" />
                        </div>

                        <Btn variant="primary" className="w-full py-2.5" disabled={submitting || accounts.length === 0} onClick={submitWithdraw}>
                            <IconDollar size={15} /> {submitting ? "Đang xử lý..." : "Xác nhận rút tiền"}
                        </Btn>
                        <div className="text-[11.5px] text-[#9E8E7E] text-center mt-2">Thường xử lý trong 1–2 ngày làm việc</div>
                    </Card>

                    <Card>
                        <CardTitle>Lịch sử yêu cầu rút tiền</CardTitle>
                        <div className="rounded-[10px] overflow-x-auto border border-[#EDE8E0]">
                            <table className="w-full border-collapse min-w-[380px]">
                                <thead>
                                    <tr>
                                        {["Ngày", "Số tiền", "Mô tả", "Trạng thái"].map((h) => (
                                            <th key={h} className="bg-[#FAF7F4] px-3.5 py-2.5 text-left text-[11.5px] font-semibold text-[#6B5C4C] uppercase tracking-[0.04em] border-b border-[#EDE8E0] whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {withdrawals.length === 0 ? (
                                        <tr><td colSpan={4} className="px-3.5 py-8 text-center text-[#9E8E7E] text-[13px]">Chưa có yêu cầu rút tiền</td></tr>
                                    ) : withdrawals.map((w) => {
                                        const st = TX_STATUS_META[w.status] || TX_STATUS_META.pending;
                                        return (
                                            <tr key={w._id} className="border-b border-[#EDE8E0] last:border-0 hover:bg-[#FDFAF7]">
                                                <td className="px-3.5 py-3 text-[11.5px] text-[#9E8E7E]">{fmtDate(w.createdAt)}</td>
                                                <td className="px-3.5 py-3 font-bold whitespace-nowrap">{formatVND(w.amount)}</td>
                                                <td className="px-3.5 py-3 text-[11.5px] text-[#9E8E7E]">{w.description}</td>
                                                <td className="px-3.5 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                                            </tr>
                                        );
                                    })}
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
