import React, { useState, useEffect, useCallback } from "react";
import SlideOver from "../../components/vendor/SlideOver";
import { promoTypes, formatVND } from "../../components/vendor/data";
import { IconPlus, IconZap, IconTag, IconBox, IconTruck, IconImage, IconEdit, IconTrash, IconCheck } from "../../components/vendor/icons";
import { useToast } from "../../components/context/ToastContext";
import {
    getAdminPromotionsSiteApi,
    createAdminPromotionSiteApi,
    updateAdminPromotionSiteApi,
    deleteAdminPromotionSiteApi,
} from "../../utils/api";

const TYPE_ICON = { flash: IconZap, coupon: IconTag, combo: IconBox, freeship: IconTruck };
const CARD_TO_TYPE = { flash: "flash_sale", coupon: "coupon", combo: "bundle", freeship: "freeship" };
const TYPE_TO_CARD = { flash_sale: "flash", coupon: "coupon", bundle: "combo", gift: "combo", freeship: "freeship" };

const DISCOUNT_OPTIONS = {
    percent: { value: "percent", label: "Phần trăm (%)" },
    fixed: { value: "fixed", label: "Số tiền cố định (₫)" },
    freeship: { value: "freeship", label: "Miễn phí vận chuyển" },
};
const DISCOUNTS_BY_CARD = {
    flash: ["percent", "fixed"],
    coupon: ["percent", "fixed"],
    combo: ["percent", "fixed"],
    freeship: ["freeship"],
};

const TYPE_META = {
    flash_sale: { label: "Flash Sale", tone: "red" },
    coupon: { label: "Coupon", tone: "purple" },
    bundle: { label: "Mua bộ", tone: "orange" },
    gift: { label: "Quà tặng", tone: "blue" },
    freeship: { label: "Free ship", tone: "blue" },
};
const STATUS_META = {
    running: { label: "Đang chạy", tone: "green" },
    scheduled: { label: "Sắp diễn ra", tone: "blue" },
    ended: { label: "Đã kết thúc", tone: "gray" },
    paused: { label: "Tạm dừng", tone: "yellow" },
    draft: { label: "Nháp", tone: "gray" },
};
const TAB_DEFS = [
    { key: "all", label: "Tất cả" },
    { key: "running", label: "Đang chạy" },
    { key: "scheduled", label: "Sắp diễn ra" },
    { key: "ended", label: "Đã kết thúc" },
];

const msgOf = (res) => (Array.isArray(res?.message) ? res.message.join(", ") : res?.message);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");
const toLocalInput = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    const off = dt.getTimezoneOffset() * 60000;
    return new Date(dt - off).toISOString().slice(0, 16);
};

const buildForm = (editing) => {
    if (!editing) return {
        cardType: "flash", name: "", code: "", discountType: "percent", value: "25",
        maxDiscount: "", minOrderValue: "0", startDate: "", endDate: "", maxUsage: "",
    };
    return {
        cardType: TYPE_TO_CARD[editing.type] || "flash",
        name: editing.name || "",
        code: editing.couponCode && editing.couponCode !== 'N/A' ? editing.couponCode : "",
        discountType: editing.discountType || "percent",
        value: editing.value ?? "",
        maxDiscount: editing.maxDiscount || "",
        minOrderValue: editing.minOrderValue ?? "0",
        startDate: toLocalInput(editing.startDate),
        endDate: toLocalInput(editing.endDate),
        maxUsage: editing.maxUsage || "",
    };
};

const discountText = (p) => {
    if (p.discountType === "freeship" || p.type === "freeship") return "Miễn phí vận chuyển";
    const hi = p.discountType === "percent" ? `${p.value}%` : formatVND(p.value);
    const cond = p.minOrderValue ? ` cho đơn từ ${formatVND(p.minOrderValue)}` : "";
    return { hi, cond, tone: p.type === "flash_sale" ? "text-red-600" : "text-[#B86B05]" };
};

const Badge = ({ tone, children }) => {
    const tones = {
        red: "bg-red-50 text-red-600",
        purple: "bg-purple-50 text-purple-600",
        orange: "bg-orange-50 text-orange-600",
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        yellow: "bg-yellow-50 text-yellow-700",
        gray: "bg-gray-100 text-gray-500",
    };
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${tones[tone] || tones.gray}`}>{children}</span>;
};

/* ---- Create / Edit promotion SlideOver ---- */
const PromoModal = ({ open, onClose, editing, onSaved }) => {
    const { showToast } = useToast();
    const [form, setForm] = useState(() => buildForm(editing));
    const [saving, setSaving] = useState(false);

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const setCardType = (cardType) => setForm((f) => {
        const allowed = DISCOUNTS_BY_CARD[cardType] || ["percent", "fixed"];
        const discountType = allowed.includes(f.discountType) ? f.discountType : allowed[0];
        return { ...f, cardType, discountType };
    });

    const discountChoices = DISCOUNTS_BY_CARD[form.cardType] || ["percent", "fixed"];
    const unit = form.discountType === "percent" ? "%" : "₫";
    const isFreeship = form.discountType === "freeship";
    const isCombo = form.cardType === "combo";

    const submit = async (status) => {
        if (!form.name.trim()) return showToast("Vui lòng nhập tên chương trình", "error");
        if (!form.code.trim()) return showToast("Vui lòng nhập mã giảm giá", "error");
        if (!form.startDate || !form.endDate) return showToast("Vui lòng chọn thời gian bắt đầu/kết thúc", "error");
        if (isCombo) return showToast("Mua bộ là khuyến mãi theo shop, không áp dụng cho toàn sàn", "error");

        const payload = {
            name: form.name.trim(),
            code: form.code.trim().toUpperCase(),
            type: CARD_TO_TYPE[form.cardType],
            discountType: form.discountType,
            value: isFreeship ? 0 : Number(form.value) || 0,
            maxDiscount: Number(form.maxDiscount) || 0,
            minOrderValue: Number(form.minOrderValue) || 0,
            appliesTo: "all",
            startDate: form.startDate,
            endDate: form.endDate,
            maxUsage: Number(form.maxUsage) || 0,
            status,
            shop: null,
        };

        try {
            setSaving(true);
            const res = editing
                ? await updateAdminPromotionSiteApi(editing._id, payload)
                : await createAdminPromotionSiteApi(payload);
            if (res.success) {
                showToast(editing ? "Cập nhật khuyến mãi thành công" : "Tạo khuyến mãi thành công", "success");
                onSaved();
                onClose();
            } else {
                showToast(msgOf(res) || "Lưu khuyến mãi thất bại", "error");
            }
        } catch {
            showToast("Có lỗi xảy ra", "error");
        } finally {
            setSaving(false);
        }
    };

    const previewAfter = form.discountType === "percent"
        ? Math.round(6500000 * (1 - (Number(form.value) || 0) / 100))
        : Math.max(0, 6500000 - (Number(form.value) || 0));

    return (
        <SlideOver open={open} onClose={onClose} title={<h3 className="text-base font-bold">{editing ? "Chỉnh sửa khuyến mãi" : "Tạo khuyến mãi toàn sàn"}</h3>}>
            <div className="mb-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Áp dụng cho toàn sàn
                </span>
            </div>

            <Label required>Loại khuyến mãi</Label>
            <div className="grid grid-cols-2 gap-2 mb-[18px] mt-1">
                {promoTypes.map((t) => {
                    if (t.key === "combo") return null;
                    const Icon = TYPE_ICON[t.key];
                    const selected = form.cardType === t.key;
                    return (
                        <button key={t.key} onClick={() => setCardType(t.key)}
                            className={`border-2 rounded-[10px] px-4 py-3.5 cursor-pointer transition-colors text-center ${selected ? "border-[#B86B05] bg-[#fffbeb]" : "border-[#EDE8E0] hover:border-[#B86B05] hover:bg-[#fffbeb]"}`}>
                            <Icon size={22} strokeWidth={1.8} className={`mx-auto mb-2 ${selected ? "text-[#B86B05]" : "text-[#9E8E7E]"}`} />
                            <div className="text-[13px] font-semibold">{t.label}</div>
                            <div className="text-[11.5px] text-[#9E8E7E] mt-0.5">{t.sub}</div>
                        </button>
                    );
                })}
            </div>

            <div className="mb-3.5">
                <Label required>Tên chương trình</Label>
                <input className="w-full px-4 py-2.5 border border-[#EDE8E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] text-[14px]"
                    value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="VD: Flash Sale Furni cuối tuần" />
            </div>

            <div className="mb-3.5">
                <Label required>Mã giảm giá</Label>
                <input className="w-full px-4 py-2.5 border border-[#EDE8E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] text-[14px] uppercase"
                    value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="VD: SUMMER2025" maxLength={30} />
                <div className="text-[11px] text-[#9E8E7E] mt-1">Tối đa 30 ký tự, chỉ chữ in hoa và số</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                    <Label>Loại giảm</Label>
                    <select className="w-full px-4 py-2.5 border border-[#EDE8E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] text-[14px]"
                        value={form.discountType} disabled={isFreeship} onChange={(e) => set("discountType", e.target.value)}>
                        {discountChoices.map((d) => (
                            <option key={d} value={DISCOUNT_OPTIONS[d].value}>{DISCOUNT_OPTIONS[d].label}</option>
                        ))}
                    </select>
                    {isFreeship && <div className="text-[11px] text-[#9E8E7E] mt-1">Free ship không cần giá trị giảm</div>}
                </div>
                <div className={isFreeship ? "opacity-40" : ""}>
                    <Label required>Giá trị giảm</Label>
                    <div className="relative">
                        <input type="number" className="w-full px-4 py-2.5 pr-8 border border-[#EDE8E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] text-[14px]"
                            value={form.value} disabled={isFreeship} onChange={(e) => set("value", e.target.value)} placeholder="25" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#6B5C4C]">{unit}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                    <Label>Điều kiện đơn tối thiểu</Label>
                    <input type="number" className="w-full px-4 py-2.5 border border-[#EDE8E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] text-[14px]"
                        value={form.minOrderValue} onChange={(e) => set("minOrderValue", e.target.value)} />
                    <div className="text-[11px] text-[#9E8E7E] mt-1">0 = không giới hạn</div>
                </div>
                <div>
                    <Label>Giảm tối đa (₫)</Label>
                    <input type="number" className="w-full px-4 py-2.5 border border-[#EDE8E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] text-[14px]"
                        value={form.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} placeholder="Không giới hạn" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                    <Label required>Bắt đầu</Label>
                    <input type="datetime-local" className="w-full px-4 py-2.5 border border-[#EDE8E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] text-[14px]"
                        value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
                </div>
                <div>
                    <Label required>Kết thúc</Label>
                    <input type="datetime-local" className="w-full px-4 py-2.5 border border-[#EDE8E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] text-[14px]"
                        value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
                </div>
            </div>

            <div className="mb-4">
                <Label>Số lượt dùng tối đa</Label>
                <input type="number" className="w-full px-4 py-2.5 border border-[#EDE8E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] text-[14px]"
                    value={form.maxUsage} onChange={(e) => set("maxUsage", e.target.value)} placeholder="0 = không giới hạn" />
            </div>

            {/* Preview */}
            <div className="rounded-[10px] p-[18px] text-white mt-1 bg-gradient-to-br from-[#1a3a6b] to-[#2563eb]">
                <span className="inline-block bg-white/20 backdrop-blur border border-white/30 px-2.5 py-[3px] rounded-full text-[11px] font-bold mb-2">Preview</span>
                <div className="text-[18px] font-extrabold mb-1">
                    {promoTypes.find((t) => t.key === form.cardType)?.label} {!isFreeship && `– Giảm ${form.value || 0}${unit}`}
                </div>
                <div className="text-[12.5px] opacity-80">Áp dụng: Toàn sàn Furni</div>
                {!isFreeship && (
                    <div className="mt-2.5 flex gap-2">
                        <div className="bg-white/15 rounded-md px-3 py-2 text-[12px]"><div className="opacity-70 text-[10px]">Giá gốc</div><div className="font-bold line-through">6.500.000₫</div></div>
                        <div className="bg-white/25 rounded-md px-3 py-2 text-[12px]"><div className="opacity-70 text-[10px]">Sau giảm</div><div className="font-extrabold text-[15px] text-yellow-300">{previewAfter.toLocaleString("vi-VN")}₫</div></div>
                    </div>
                )}
            </div>

            <div className="flex gap-2.5 mt-5 pt-4 border-t border-[#EDE8E0]">
                <button onClick={onClose} className="px-5 py-2.5 border border-[#EDE8E0] rounded-lg text-[14px] font-medium hover:bg-[#FAF7F4] transition-colors">Hủy</button>
                <button onClick={() => submit("draft")} disabled={saving} className="px-5 py-2.5 text-[14px] font-medium text-[#6B5C4C] hover:bg-[#FAF7F4] rounded-lg transition-colors disabled:opacity-50">Lưu nháp</button>
                <button onClick={() => submit(editing ? (editing.status || "running") : "running")} disabled={saving}
                    className="ml-auto px-5 py-2.5 bg-[#B86B05] text-white rounded-lg text-[14px] font-semibold hover:bg-[#95520B] shadow-sm shadow-[#B86B05]/20 transition-colors disabled:opacity-50">
                    {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Kích hoạt ngay"}
                </button>
            </div>
        </SlideOver>
    );
};

const Label = ({ children, required }) => (
    <label className="block text-[12px] font-semibold text-[#6B5C4C] uppercase mb-1.5 tracking-wide">
        {children} {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);

const AdminPromotions = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState("all");
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [modalKey, setModalKey] = useState(0);
    const [deleteId, setDeleteId] = useState(null);

    const fetchPromotions = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getAdminPromotionsSiteApi({ scope: "platform", limit: 100 });
            if (res.success) setList(res.data.promotions || []);
            else setList([]);
        } catch {
            setList([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPromotions();
    }, [fetchPromotions]);

    const counts = {
        all: list.length,
        running: list.filter((p) => p.status === "running").length,
        scheduled: list.filter((p) => p.status === "scheduled").length,
        ended: list.filter((p) => p.status === "ended").length,
    };
    const tabs = TAB_DEFS.map((t) => ({ ...t, count: counts[t.key] ?? 0 }));
    const filtered = tab === "all" ? list : list.filter((p) => p.status === tab);

    const openCreate = () => { setEditing(null); setModalKey((k) => k + 1); setModalOpen(true); };
    const openEdit = (p) => { setEditing(p); setModalKey((k) => k + 1); setModalOpen(true); };
    const handleDelete = async () => {
        if (!deleteId) return;
        const res = await deleteAdminPromotionSiteApi(deleteId);
        if (res.success) {
            showToast("Đã xóa khuyến mãi", "success");
            fetchPromotions();
        } else {
            showToast(msgOf(res) || "Xóa thất bại", "error");
        }
        setDeleteId(null);
    };

    return (
        <div className="w-full">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6 gap-4">
                <div>
                    <p className="text-xl font-bold text-[#1C1108]">Khuyến mãi toàn sàn</p>
                    <p className="text-sm text-[#A8896A] mt-0.5">{counts.running} chương trình đang hoạt động</p>
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#B86B05] text-white rounded-lg text-[14px] font-semibold hover:bg-[#95520B] shadow-sm shadow-[#B86B05]/20 transition-colors">
                    <IconPlus size={14} /> Tạo khuyến mãi
                </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-5">
                {tabs.map((t) => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all border ${
                            tab === t.key
                                ? "bg-[#B86B05] text-white border-[#B86B05] shadow-md shadow-[#B86B05]/20"
                                : "bg-white border-[#EDE8E0] text-[#6B5C4C] hover:border-[#B86B05] hover:text-[#B86B05]"
                        }`}>
                        {t.label}
                        {t.count > 0 && (
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                tab === t.key ? "bg-white/20 text-white" : "bg-[#FAF7F4] text-[#A8896A]"
                            }`}>{t.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-[#EDE8E0] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-12 text-center text-[#9E8E7E] text-[13px]">Đang tải...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-14 text-center">
                        <div className="text-4xl mb-3 select-none">🎟️</div>
                        <p className="text-[#9E8E7E] text-[14px]">Chưa có khuyến mãi nào cho toàn sàn</p>
                        <button onClick={openCreate} className="mt-4 px-5 py-2.5 bg-[#B86B05] text-white rounded-lg text-[13px] font-semibold hover:bg-[#95520B] transition-colors">
                            Tạo khuyến mãi đầu tiên
                        </button>
                    </div>
                ) : (
                    <div>
                        {filtered.map((p) => {
                            const type = TYPE_META[p.type] || TYPE_META.coupon;
                            const status = STATUS_META[p.status] || STATUS_META.draft;
                            const d = discountText(p);
                            const progress = p.maxUsage ? Math.min(100, Math.round(((p.usedCount || 0) / p.maxUsage) * 100)) : null;
                            return (
                                <div key={p._id}
                                    className={`flex items-center justify-between gap-4 px-6 py-4 border-b border-[#EDE8E0] last:border-b-0 transition-colors ${
                                        p.status === "ended" ? "opacity-60" : "hover:bg-[#FAF7F4]"
                                    }`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                            <span className="text-[14px] font-bold text-[#1C1108]">{p.name}</span>
                                            <Badge tone={type.tone}>{type.label}</Badge>
                                            <Badge tone={status.tone}>{status.label}</Badge>
                                        </div>
                                        <div className="flex gap-4 flex-wrap text-[12px] text-[#9E8E7E]">
                                            <span>{typeof d === "string" ? d : <>Giảm <strong className={d.tone}>{d.hi}</strong>{d.cond}</>}</span>
                                            <span>{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</span>
                                            <span>{p.maxUsage ? `Đã dùng: ${p.usedCount || 0} / ${p.maxUsage} lượt` : "Không giới hạn lượt"}</span>
                                        </div>
                                        {progress != null && (
                                            <div className="h-1 bg-[#EDE8E0] rounded-full mt-2 max-w-[200px] overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-[#B86B05] to-[#DE9601]" style={{ width: `${progress}%` }} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => openEdit(p)}
                                            className="px-3 py-1.5 border border-[#EDE8E0] rounded-lg text-[12px] font-medium text-[#6B5C4C] hover:border-[#B86B05] hover:text-[#B86B05] hover:bg-[#fffbeb] transition-all">
                                            Sửa
                                        </button>
                                        <button onClick={() => setDeleteId(p._id)}
                                            className="px-3 py-1.5 border border-red-200 rounded-lg text-[12px] font-medium text-red-500 hover:bg-red-50 transition-all">
                                            Xóa
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <PromoModal key={modalKey} open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} onSaved={fetchPromotions} />

            {/* Delete Confirm Modal */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <p className="text-lg font-bold text-[#1C1108]">Xác nhận xóa</p>
                            <p className="text-sm text-[#6B5C4C] mt-1">Bạn có chắc chắn muốn xóa khuyến mãi này? Hành động này không thể hoàn tác.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)}
                                className="flex-1 px-4 py-2.5 border border-[#EDE8E0] rounded-xl text-[14px] font-medium text-[#6B5C4C] hover:bg-[#FAF7F4] transition-colors">
                                Hủy
                            </button>
                            <button onClick={handleDelete}
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-[14px] font-semibold hover:bg-red-600 transition-colors shadow-sm">
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPromotions;
