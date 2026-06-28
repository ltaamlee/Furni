import React, { useState, useEffect, useCallback } from "react";
import { getAdminCommissionsApi, updateShopCommissionApi, getAdminWalletBalancesApi } from "../../utils/api";

/* ─── helpers ─────────────────────────────────────────── */
const fmtDate = (d) => new Date(d).toLocaleDateString("vi-VN");
const fmtTime = (d) => new Date(d).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
const fmtFull = (d) => d ? `${fmtDate(d)} lúc ${fmtTime(d)}` : "—";

/** Format số tiền có khoảng trắng trước đơn vị, e.g. 1234567 → "1.234.567 đ" */
const fmtVND = (n) => `${Number(n || 0).toLocaleString("vi-VN")} đ`;

const LEDGER_LABEL = {
    PAYOS_SETTLEMENT_IN:    "Tiền PayOS vào",
    PAYOS_SETTLEMENT_OUT:   "Tiền PayOS ra",
    PLATFORM_FEE_IN:        "Thu phí sàn",
    PLATFORM_FEE_REFUND:    "Hoàn phí sàn",
    VOUCHER_SPONSOR_IN:     "Nợ voucher sàn",
    VOUCHER_SPONSOR_SETTLE: "Quyết toán voucher",
    VOUCHER_SPONSOR_REFUND: "Hoàn voucher sàn",
    FREESHIP_SPONSOR_IN:    "Nợ freeship sàn",
    FREESHIP_SPONSOR_SETTLE:"Quyết toán freeship",
    FREESHIP_SPONSOR_REFUND:"Hoàn freeship",
    PAYOUT_TO_VENDOR:       "Chi trả vendor",
    VENDOR_REFUND_IN:       "Vendor hoàn tiền",
    REFUND_TO_CUSTOMER:      "Hoàn tiền khách",
    ADJUSTMENT:             "Điều chỉnh thủ công",
};

const ACCOUNT_META = {
    PAYOS_HOLDING: { label: "PAYOS Holding",   desc: "Tiền PayOS chưa phân bổ",       color: "blue",   gradient: "from-[#1e40af] to-[#3b82f6]",   cardBg: "bg-blue-50",    cardBorder: "border-blue-200" },
    PLATFORM_FEE:   { label: "Phí Sàn",          desc: "Phí dịch vụ sàn đã thu",        color: "green",  gradient: "from-[#15803d] to-[#22c55e]",   cardBg: "bg-green-50",   cardBorder: "border-green-200" },
    VOUCHER_LIAB:  { label: "Nợ Voucher",        desc: "Nợ voucher sàn (chờ quyết toán)",color: "amber",  gradient: "from-[#b45309] to-[#f59e0b]",   cardBg: "bg-amber-50",   cardBorder: "border-amber-200" },
    PAYOUT_POOL:   { label: "Payout Pool",        desc: "Tiền chờ chi trả cho vendor",    color: "purple", gradient: "from-[#7e22ce] to-[#a855f7]",   cardBg: "bg-purple-50",  cardBorder: "border-purple-200" },
};

const LEDGER_TYPE_META = {
    PAYOS_SETTLEMENT_IN:     { color: "blue",   isCredit: true },
    PAYOS_SETTLEMENT_OUT:    { color: "gray",   isCredit: false },
    PLATFORM_FEE_IN:          { color: "green",  isCredit: true },
    PLATFORM_FEE_REFUND:      { color: "orange", isCredit: false },
    VOUCHER_SPONSOR_IN:       { color: "amber",  isCredit: true },
    VOUCHER_SPONSOR_SETTLE:  { color: "amber",  isCredit: false },
    VOUCHER_SPONSOR_REFUND:   { color: "orange", isCredit: false },
    FREESHIP_SPONSOR_IN:      { color: "amber",  isCredit: true },
    FREESHIP_SPONSOR_SETTLE: { color: "amber",  isCredit: false },
    FREESHIP_SPONSOR_REFUND: { color: "orange", isCredit: false },
    PAYOUT_TO_VENDOR:         { color: "purple", isCredit: false },
    VENDOR_REFUND_IN:         { color: "blue",   isCredit: true },
    REFUND_TO_CUSTOMER:       { color: "red",    isCredit: false },
    ADJUSTMENT:               { color: "gray",   isCredit: true },
};

/* ─── badge ──────────────────────────────────────────── */
function StatusBadge({ tone, children }) {
    const map = { green: "bg-green-100 text-green-700", yellow: "bg-yellow-100 text-yellow-700", red: "bg-red-100 text-red-700", gray: "bg-gray-100 text-gray-600", blue: "bg-blue-100 text-blue-700", amber: "bg-amber-100 text-amber-700", purple: "bg-purple-100 text-purple-700", orange: "bg-orange-100 text-orange-700" };
    return <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${map[tone] || map.gray}`}>{children}</span>;
}

/* ─── main ───────────────────────────────────────────── */
const AdminCommission = () => {
    /* commission table state */
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [search, setSearch] = useState("");
    const [rateFilter, setRateFilter] = useState("");
    const [sortOrder, setSortOrder] = useState("");
    const [editModal, setEditModal] = useState({ show: false, shopId: null, shopName: "", currentRate: "", newRate: "" });
    const [toast, setToast] = useState({ show: false, type: "", message: "" });

    /* wallet state */
    const [walletBalances, setWalletBalances] = useState(null);
    const [walletLoading, setWalletLoading] = useState(true);
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(true);

    const showToast = (type, message) => {
        setToast({ show: true, type, message });
        setTimeout(() => setToast({ show: false, type: "", message: "" }), 3000);
    };

    /* fetch commission */
    const fetchCommissions = useCallback(async (currentPage = 1) => {
        setLoading(true);
        try {
            const params = { page: currentPage, limit: pagination.limit, search: search.trim() };
            if (rateFilter) params.rateQuery = rateFilter;
            if (sortOrder) params.sort = sortOrder;
            const response = await getAdminCommissionsApi(params);
            if (response?.success) {
                setShops(response.data.shops || []);
                setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
            }
        } catch (e) {
            console.error("Lỗi khi tải chiết khấu:", e);
        } finally {
            setLoading(false);
        }
    }, [search, rateFilter, sortOrder, pagination.limit]);

    /* fetch wallet + ledger */
    const fetchWallet = useCallback(async () => {
        setWalletLoading(true);
        try {
            const res = await getAdminWalletBalancesApi();
            if (res?.success) setWalletBalances(res.data);
        } catch (e) {
            console.error("Lỗi tải ví admin:", e);
        } finally {
            setWalletLoading(false);
        }
    }, []);

    useEffect(() => { fetchCommissions(pagination.page); }, []);
    useEffect(() => { fetchWallet(); }, [fetchWallet]);

    /* commission actions */
    const handleSearchKeyDown = (e) => {
        if (e.key === "Enter") { setPagination(p => ({ ...p, page: 1 })); fetchCommissions(1); }
    };
    const handleResetFilters = () => {
        setSearch(""); setRateFilter(""); setSortOrder("");
        setPagination(p => ({ ...p, page: 1 }));
        setTimeout(() => fetchCommissions(1), 0);
    };
    const toggleSort = () => {
        setPagination(p => ({ ...p, page: 1 }));
        setSortOrder(s => s === "asc" ? "desc" : s === "desc" ? "" : "asc");
    };
    const handleOpenEditModal = (shopId, shopName, currentRate) => setEditModal({ show: true, shopId, shopName, currentRate, newRate: currentRate });
    const handleExecuteUpdate = async () => {
        const rateToSubmit = Number(editModal.newRate);
        if (editModal.newRate === "" || rateToSubmit < 0 || rateToSubmit > 100) { showToast("error", "Vui lòng nhập tỉ lệ từ 0 đến 100!"); return; }
        if (rateToSubmit === editModal.currentRate) { setEditModal({ show: false, shopId: null, shopName: "", currentRate: "", newRate: "" }); return; }
        try {
            const res = await updateShopCommissionApi(editModal.shopId, { commissionRate: rateToSubmit });
            if (res?.data?.success) {
                showToast("success", `Đã cập nhật chiết khấu của ${editModal.shopName} thành ${rateToSubmit}%!`);
                setShops(prev => prev.map(s => s._id === editModal.shopId ? { ...s, commissionRate: rateToSubmit } : s));
            } else { showToast("error", res?.data?.message || "Cập nhật thất bại!"); }
        } catch (e) { showToast("error", e.response?.data?.message || "Có lỗi xảy ra!"); }
        finally { setEditModal({ show: false, shopId: null, shopName: "", currentRate: "", newRate: "" }); }
    };

    const formatDateTime = (ds) => {
        if (!ds) return "—";
        const d = new Date(ds);
        return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()} - ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    };

    /* ── render ── */
    return (
        <div className="w-full font-sans">
            {/* toast */}
            {toast.show && (
                <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-[6px] border px-4 py-3 text-[14px] font-medium shadow-lg animate-bounce ${
                    toast.type === "success" ? "border-[#e6f4ea] bg-[#e6f4ea] text-[#1e8e3e]" : "border-[#fce8e6] bg-[#fce8e6] text-[#d93025]"
                }`}>
                    {toast.type === "success"
                        ? <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.53 9.47a.75.75 0 010 1.06l-5 5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 111.06-1.06L11 13.94l4.47-4.47a.75.75 0 011.06 0z" clipRule="evenodd"/></svg>
                        : <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zm-.75 5a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0V7zm.75 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
                    }
                    {toast.message}
                </div>
            )}

            {/* ═══════════════════════════════════════════════
                SECTION 1 — VÍ ADMIN
            ═══════════════════════════════════════════════ */}
            <div className="mb-8">
                {/* section title */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-1.5 h-7 bg-[#853D12] rounded-full shrink-0" />
                    <div>
                        <h2 className="text-[18px] font-bold text-[#1C1108] leading-tight">Ví Điện Tử</h2>
                        <p className="text-[12px] text-[#9E8E7E]">Số dư các tài khoản quản lý sàn</p>
                    </div>
                </div>

                {/* 4 account cards */}
                {walletLoading ? (
                    <div className="flex items-center justify-center py-12 text-[#9E8E7E] text-[13px] gap-2">
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        Đang tải số dư ví...
                    </div>
                ) : walletBalances ? (
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                        {Object.entries(walletBalances).map(([key, acc]) => {
                            const meta = ACCOUNT_META[key];
                            return (
                                <div key={key} className={`relative overflow-hidden rounded-[14px] px-6 pt-6 pb-5 text-white bg-gradient-to-br ${meta.gradient} border-0 shadow-md`}>
                                    <div className="absolute -right-8 -top-8 w-[140px] h-[140px] rounded-full bg-white/[0.07]" />
                                    <div className="relative">
                                        <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-3">{acc.label}</div>
                                        <div className="text-[22px] font-extrabold tracking-tight mb-1">{fmtVND(acc.balance)}</div>
                                        <div className="text-[11px] opacity-70">{acc.description}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-[13px] text-red-500">Không thể tải số dư ví</div>
                )}

                {/* ledger summary table */}
                {!walletLoading && walletBalances && (
                    <div className="mt-5 bg-white rounded-[10px] border border-[#e2d8d0] shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 bg-[#faf7f5] border-b border-[#e2d8d0] flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#853D12]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                            <span className="text-[13px] font-semibold text-[#1C1108]">Tóm tắt số dư tài khoản</span>
                        </div>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[#faf7f5]">
                                    {["Tài khoản", "Mô tả", "Số dư"].map(h => (
                                        <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9E8E7E] border-b border-[#e2d8d0]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(walletBalances).map(([key, acc], idx) => {
                                    const meta = ACCOUNT_META[key];
                                    const colorMap = { blue: "text-blue-600", green: "text-green-600", amber: "text-amber-600", purple: "text-purple-600" };
                                    return (
                                        <tr key={key} className={`border-b border-[#f0ebe5] last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-[#fdfcfa]"} hover:bg-[#faf7f5] transition-colors`}>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[15px]">{meta.gradient.includes("blue") ? "💳" : meta.gradient.includes("green") ? "🏛️" : meta.gradient.includes("amber") ? "🎟️" : "💰"}</span>
                                                    <span className="text-[13px] font-semibold text-[#1C1108]">{acc.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-[12.5px] text-[#6B5C4C]">{acc.description}</td>
                                            <td className={`px-5 py-3 text-[14px] font-bold ${colorMap[meta.color]}`}>{fmtVND(acc.balance)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════
                SECTION 2 — QUẢN LÝ CHIẾT KHẤU
            ═══════════════════════════════════════════════ */}
            {/* section title */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-1.5 h-7 bg-[#853D12] rounded-full shrink-0" />
                <div>
                    <h2 className="text-[18px] font-bold text-[#1C1108] leading-tight">Quản lý Chiết khấu</h2>
                    <p className="text-[12px] text-[#9E8E7E]">Tỷ lệ phần trăm chiết khấu cho từng cửa hàng</p>
                </div>
            </div>

            {/* toolbar */}
            <div className="flex justify-between items-center mb-5 flex-wrap gap-[15px]">
                <div className="flex gap-[10px] items-center flex-wrap">
                    <div className="relative w-[350px]">
                        <span className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[#777777] flex items-center justify-center">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                        <input type="text" placeholder="Tìm kiếm theo tên cửa hàng..." value={search}
                            onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKeyDown}
                            className="w-full py-[10px] pl-[40px] pr-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] text-[#333333] outline-none focus:border-[#853D12] transition-colors bg-white" />
                    </div>
                    <div className="relative w-[250px]">
                        <span className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[#777777] font-bold text-[15px] flex items-center justify-center">%</span>
                        <input type="number" min="0" max="100" placeholder="Lọc theo tỷ lệ chiết khấu..." value={rateFilter}
                            onChange={e => setRateFilter(e.target.value)} onKeyDown={handleSearchKeyDown}
                            className="w-full py-[10px] pl-[40px] pr-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] text-[#333333] outline-none focus:border-[#853D12] transition-colors bg-white" />
                    </div>
                    <button onClick={handleResetFilters}
                        className="p-[10px] border border-[#e2d8d0] rounded-[6px] bg-white text-[#777777] cursor-pointer flex items-center justify-center h-[40px] w-[40px] hover:border-[#853D12] hover:text-[#853D12] hover:bg-[#fdfbf9] hover:rotate-[30deg] transition-all"
                        title="Xóa bộ lọc">
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                    </button>
                </div>
            </div>

            {/* table */}
            <div className="bg-white rounded-[8px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] overflow-hidden border border-[rgba(0,0,0,0.05)]">
                <table className="w-full border-collapse text-left">
                    <thead className="bg-[#faf7f5] border-b-2 border-[#e2d8d0]">
                        <tr>
                            <th className="w-[50px] text-center py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px]">STT</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px] text-left">Tên Cửa Hàng</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px] text-center">Doanh Thu (GMV)</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px] text-center cursor-pointer hover:text-[#853D12] select-none transition-colors group" onClick={toggleSort}>
                                <div className="flex items-center justify-center gap-[4px]">Tỷ Lệ Chiết Khấu
                                    <span className="text-[14px] text-[#853D12]">
                                        {sortOrder === "asc" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" /></svg>}
                                        {sortOrder === "desc" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>}
                                        {sortOrder === "" && <svg className="w-4 h-4 text-[#777777] group-hover:text-[#853D12]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>}
                                    </span>
                                </div>
                            </th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px] text-center">Phí Sàn Ước Tính</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px] text-center">Cập Nhật</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px] text-center">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2d8d0]">
                        {loading ? (
                            <tr><td colSpan="7" className="py-[15px] px-[20px] text-center text-[#777777]">Đang tải dữ liệu...</td></tr>
                        ) : shops.length === 0 ? (
                            <tr><td colSpan="7" className="py-[15px] px-[20px] text-center text-[#777777]">Không tìm thấy cửa hàng nào phù hợp.</td></tr>
                        ) : shops.map((s, index) => {
                            const estimatedFee = Math.round((s.gmv || 0) * (s.commissionRate || 0) / 100);
                            return (
                                <tr key={s._id} className="hover:bg-[#fdfbf9] transition-colors">
                                    <td className="w-[50px] text-center font-semibold text-[#777777] py-[15px] px-[20px]">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                                    <td className="py-[15px] px-[20px]"><div className="font-semibold text-[#333333] text-[15px]">{s.name}</div></td>
                                    <td className="py-[15px] px-[20px] text-center"><span className="text-[14px] font-semibold text-[#555555]">{fmtVND(s.gmv)} đ</span></td>
                                    <td className="py-[15px] px-[20px] text-center">
                                        <span className="py-[5px] px-[12px] rounded-[6px] text-[15px] font-bold inline-block bg-[#fef1e8] text-[#853D12] border border-dashed border-[#853D12]">{s.commissionRate}%</span>
                                    </td>
                                    <td className="py-[15px] px-[20px] text-center"><span className="text-[14px] font-bold text-[#1e8e3e]">{fmtVND(estimatedFee)} đ</span></td>
                                    <td className="py-[15px] px-[20px] text-center">
                                        <div className="text-[13px] text-[#777777] flex flex-col items-center justify-center gap-[2px]">
                                            <div className="flex items-center gap-[4px]">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {formatDateTime(s.updatedAt).split(" - ")[0]}
                                            </div>
                                            <span className="text-[11px] font-medium">{formatDateTime(s.updatedAt).split(" - ")[1]}</span>
                                        </div>
                                    </td>
                                    <td className="py-[15px] px-[20px]">
                                        <div className="flex justify-center">
                                            <button onClick={() => handleOpenEditModal(s._id, s.name, s.commissionRate)}
                                                className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white text-[#777777] flex items-center justify-center cursor-pointer hover:border-[#3498db] hover:text-[#3498db] hover:bg-[#ebf5fb] transition-colors shadow-xs"
                                                title="Cập nhật chiết khấu">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* pagination */}
            {pagination.pages > 1 && (
                <div className="mt-4 flex items-center justify-between font-sans px-2">
                    <div className="text-[13px] text-[#777777]">Hiển thị {(pagination.page - 1) * pagination.limit + 1} đến {Math.min(pagination.page * pagination.limit, pagination.total)} trong {pagination.total} cửa hàng</div>
                    <div className="flex items-center gap-[6px]">
                        <button disabled={pagination.page === 1} onClick={() => fetchCommissions(pagination.page - 1)} className="px-3 py-[6px] border border-[#e2d8d0] bg-white rounded-[4px] text-[13px] font-medium hover:bg-[#faf7f5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Trước</button>
                        {[...Array(pagination.pages)].map((_, pIdx) => (
                            <button key={pIdx} onClick={() => fetchCommissions(pIdx + 1)}
                                className={`px-3 py-[6px] rounded-[4px] text-[13px] font-semibold transition-all ${pagination.page === pIdx + 1 ? "bg-[#853D12] text-white" : "border border-[#e2d8d0] bg-white text-[#333333] hover:bg-[#faf7f5]"}`}>{pIdx + 1}</button>
                        ))}
                        <button disabled={pagination.page === pagination.pages} onClick={() => fetchCommissions(pagination.page + 1)} className="px-3 py-[6px] border border-[#e2d8d0] bg-white rounded-[4px] text-[13px] font-medium hover:bg-[#faf7f5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Sau</button>
                    </div>
                </div>
            )}

            {/* edit modal */}
            {editModal.show && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 font-sans backdrop-blur-xs select-none">
                    <div className="bg-white rounded-[8px] w-full max-w-[420px] p-6 shadow-2xl border border-[#e2d8d0] mx-4 animate-fade-in">
                        <h3 className="text-[18px] font-bold text-[#853D12] mb-4 flex items-center gap-2 border-b border-[#e2d8d0] pb-3">
                            <svg className="w-5 h-5 text-[#853D12]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            Cập nhật chiết khấu
                        </h3>
                        <div className="mb-4">
                            <label className="block text-[12px] font-semibold text-[#777777] uppercase tracking-wider mb-2">Tên cửa hàng</label>
                            <input type="text" value={editModal.shopName} disabled className="w-full py-[10px] px-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] bg-[#f5f5f5] text-[#777777] cursor-not-allowed outline-none" />
                        </div>
                        <div className="mb-6">
                            <label className="block text-[12px] font-semibold text-[#777777] uppercase tracking-wider mb-2">Tỷ lệ mới (%) <span className="text-[#d93025]">*</span></label>
                            <div className="relative">
                                <input type="number" min="0" max="100" placeholder="Nhập phần trăm..." value={editModal.newRate}
                                    onChange={e => setEditModal({...editModal, newRate: e.target.value})}
                                    className="w-full py-[10px] pl-[15px] pr-[40px] border border-[#e2d8d0] rounded-[6px] text-[15px] font-bold text-[#853D12] bg-white outline-none focus:border-[#853D12]" />
                                <span className="absolute right-[15px] top-1/2 -translate-y-1/2 text-[#777777] font-bold">%</span>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-[#e2d8d0]">
                            <button onClick={() => setEditModal({ show: false, shopId: null, shopName: "", currentRate: "", newRate: "" })}
                                className="px-4 py-2 border border-[#e2d8d0] bg-white rounded-[6px] text-[13px] font-medium text-[#777777] hover:bg-[#faf7f5] cursor-pointer transition-colors">Hủy bỏ</button>
                            <button onClick={handleExecuteUpdate}
                                className="px-4 py-2 bg-[#853D12] hover:bg-[#5e290a] rounded-[6px] text-[13px] font-semibold text-white cursor-pointer transition-colors shadow-sm">Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCommission;
