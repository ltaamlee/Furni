import { useState, useEffect, useCallback } from "react";
import { PageHeader, Btn, Tabs, Badge, Label, Hint, inputClass, SearchInput } from "../../components/vendor/ui";
import SlideOver from "../../components/vendor/SlideOver";
import { promoTypes, formatVND } from "../../components/vendor/data";
import { IconPlus, IconZap, IconTag, IconBox, IconTruck, IconImage } from "../../components/vendor/icons";
import { useToast } from "../../components/context/ToastContext";
import {
    getVendorPromotionsApi, createVendorPromotionApi, updateVendorPromotionApi, deleteVendorPromotionApi,
    getVendorCategoriesApi, getVendorProductsApi,
} from "../../utils/api";

const TYPE_ICON = { flash: IconZap, coupon: IconTag, combo: IconBox, freeship: IconTruck };
// map type-card key (FE) <-> model type (BE)
const CARD_TO_TYPE = { flash: "flash_sale", coupon: "coupon", combo: "bundle", freeship: "freeship" };
const TYPE_TO_CARD = { flash_sale: "flash", coupon: "coupon", bundle: "combo", gift: "combo", freeship: "freeship" };

// Loại giảm hợp lệ theo từng loại khuyến mãi (lọc cho phù hợp)
//  - freeship: chỉ có "freeship"
//  - còn lại: phần trăm / số tiền cố định (không có freeship)
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
    coupon: { label: "Voucher", tone: "purple" },
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

const idOf = (x) => (typeof x === "string" ? x : x?._id);

const buildForm = (editing) => {
    if (!editing) return {
        cardType: "flash", name: "", code: "", discountType: "percent", value: "25",
        maxDiscount: "", minOrderValue: "0", appliesTo: "all",
        startDate: "", endDate: "", maxUsage: "",
        categories: [], products: [],
    };
    return {
        cardType: TYPE_TO_CARD[editing.type] || "flash",
        name: editing.name || "",
        code: editing.couponCode && editing.couponCode !== "N/A" ? editing.couponCode : "",
        discountType: editing.discountType || "percent",
        value: editing.value ?? "",
        maxDiscount: editing.maxDiscount || "",
        minOrderValue: editing.minOrderValue ?? "0",
        appliesTo: editing.appliesTo || "all",
        startDate: toLocalInput(editing.startDate),
        endDate: toLocalInput(editing.endDate),
        maxUsage: editing.maxUsage || "",
        categories: (editing.categories || []).map(idOf).filter(Boolean),
        products: (editing.products || []).map(idOf).filter(Boolean),
    };
};

/* ---- discount text for a promotion row ---- */
const discountText = (p) => {
    if (p.discountType === "freeship" || p.type === "freeship") return "Miễn phí vận chuyển";
    const hi = p.discountType === "percent" ? `${p.value}%` : formatVND(p.value);
    const cond = p.minOrderValue ? ` cho đơn từ ${formatVND(p.minOrderValue)}` : "";
    return { hi, cond, tone: p.type === "flash_sale" ? "text-[#dc2626]" : "text-[#B86B05]" };
};

/* ---- Create / Edit promotion drawer ---- */
const PromoModal = ({ open, onClose, editing, onSaved }) => {
    const { showToast } = useToast();
    const [form, setForm] = useState(() => buildForm(editing));
    const [saving, setSaving] = useState(false);

    // Danh mục & sản phẩm của shop (cho phạm vi áp dụng)
    const [catList, setCatList] = useState([]);
    const [prodList, setProdList] = useState([]);
    const [prodSearch, setProdSearch] = useState("");

    useEffect(() => {
        getVendorCategoriesApi().then((r) => r.success && setCatList(r.data.categories || [])).catch(() => {});
        getVendorProductsApi({ limit: 200 }).then((r) => r.success && setProdList(r.data.products || [])).catch(() => {});
    }, []);

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    // Đổi loại khuyến mãi -> lọc lại loại giảm cho phù hợp.
    // Mua bộ (combo): luôn áp dụng cho các sản phẩm cụ thể trong combo.
    const setCardType = (cardType) => setForm((f) => {
        const allowed = DISCOUNTS_BY_CARD[cardType] || ["percent", "fixed"];
        const discountType = allowed.includes(f.discountType) ? f.discountType : allowed[0];
        const appliesTo = cardType === "combo" ? "product" : f.appliesTo;
        return { ...f, cardType, discountType, appliesTo };
    });

    const toggleId = (key, id) => setForm((f) => {
        const has = f[key].includes(id);
        return { ...f, [key]: has ? f[key].filter((x) => x !== id) : [...f[key], id] };
    });

    const discountChoices = DISCOUNTS_BY_CARD[form.cardType] || ["percent", "fixed"];
    const unit = form.discountType === "percent" ? "%" : "₫";
    const isFreeship = form.discountType === "freeship";
    const isCombo = form.cardType === "combo";
    const isVoucher = form.cardType === "coupon";

    const submit = async (status) => {
        if (!form.name.trim()) return showToast("Vui lòng nhập tên chương trình", "error");
        if (isVoucher && !form.code.trim()) return showToast("Vui lòng nhập mã voucher", "error");
        if (!form.startDate || !form.endDate) return showToast("Vui lòng chọn thời gian bắt đầu/kết thúc", "error");
        if (isCombo && form.products.length < 2)
            return showToast("Mua bộ cần chọn ít nhất 2 sản phẩm trong combo", "error");
        if (!isCombo && form.appliesTo === "category" && form.categories.length === 0)
            return showToast("Vui lòng chọn ít nhất một danh mục áp dụng", "error");
        if (!isCombo && form.appliesTo === "product" && form.products.length === 0)
            return showToast("Vui lòng chọn ít nhất một sản phẩm áp dụng", "error");

        const payload = {
            name: form.name.trim(),
            code: isVoucher ? form.code.trim().toUpperCase() : undefined,
            type: CARD_TO_TYPE[form.cardType],
            discountType: form.discountType,
            value: isFreeship ? 0 : Number(form.value) || 0,
            maxDiscount: Number(form.maxDiscount) || 0,
            minOrderValue: Number(form.minOrderValue) || 0,
            appliesTo: form.appliesTo,
            categories: form.appliesTo === "category" ? form.categories : [],
            products: form.appliesTo === "product" ? form.products : [],
            startDate: form.startDate,
            endDate: form.endDate,
            maxUsage: Number(form.maxUsage) || 0,
            status,
        };

        try {
            setSaving(true);
            const res = editing ? await updateVendorPromotionApi(editing._id, payload) : await createVendorPromotionApi(payload);
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

    // Bộ chọn sản phẩm (kèm ảnh nhỏ) — dùng cho "Sản phẩm cụ thể" và "Mua bộ"
    const productPicker = (
        <div className="mt-2 border border-[#EDE8E0] rounded-[8px] p-2.5">
            <SearchInput placeholder="Tìm sản phẩm..." value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} />
            <div className="mt-2 max-h-[230px] overflow-y-auto flex flex-col gap-1">
                {prodList.length === 0 ? (
                    <div className="text-[12px] text-[#9E8E7E] py-2 text-center">Shop chưa có sản phẩm nào</div>
                ) : (
                    prodList
                        .filter((p) => p.name.toLowerCase().includes(prodSearch.toLowerCase()))
                        .map((p) => {
                            const on = form.products.includes(p._id);
                            return (
                                <button key={p._id} type="button" onClick={() => toggleId("products", p._id)}
                                    className={`flex items-center gap-2.5 p-1.5 rounded-[7px] text-left transition-colors ${on ? "bg-[#fffbeb]" : "hover:bg-[#FAF7F4]"}`}>
                                    <input type="checkbox" readOnly checked={on} className="w-3.5 h-3.5 accent-[#95520B] pointer-events-none" />
                                    <div className="w-9 h-9 rounded-[6px] border border-[#EDE8E0] bg-[#FAF7F4] overflow-hidden shrink-0 flex items-center justify-center">
                                        {p.images?.[0]
                                            ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                                            : <IconImage size={15} className="text-[#C4B8A8]" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[12.5px] font-medium truncate">{p.name}</div>
                                        <div className="text-[11px] text-[#B86B05]">{formatVND(p.price)}</div>
                                    </div>
                                </button>
                            );
                        })
                )}
            </div>
            {form.products.length > 0 && <Hint>Đã chọn {form.products.length} sản phẩm</Hint>}
        </div>
    );

    return (
        <SlideOver open={open} onClose={onClose} title={<h3 className="text-base font-bold">{editing ? "Chỉnh sửa khuyến mãi" : "Tạo khuyến mãi mới"}</h3>}>
            <Label required>Loại khuyến mãi</Label>
            <div className="grid grid-cols-2 gap-2 mb-[18px] mt-1">
                {promoTypes.map((t) => {
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
                <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="VD: Flash Sale Sofa cuối tuần" />
            </div>

            {isVoucher && (
                <div className="mb-3.5">
                    <Label required>Mã voucher</Label>
                    <input
                        className={`${inputClass} uppercase`}
                        value={form.code}
                        onChange={(e) => set("code", e.target.value.toUpperCase())}
                        placeholder="VD: SHOPSALE20"
                        maxLength={30}
                    />
                    <Hint>Tối đa 30 ký tự, gồm chữ in hoa, số, gạch ngang hoặc gạch dưới</Hint>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                    <Label>Loại giảm</Label>
                    <select className={inputClass} value={form.discountType} disabled={isFreeship} onChange={(e) => set("discountType", e.target.value)}>
                        {discountChoices.map((d) => (
                            <option key={d} value={DISCOUNT_OPTIONS[d].value}>{DISCOUNT_OPTIONS[d].label}</option>
                        ))}
                    </select>
                    {isFreeship && <Hint>Free ship không cần giá trị giảm</Hint>}
                </div>
                <div className={isFreeship ? "opacity-40" : ""}>
                    <Label required>Giá trị giảm</Label>
                    <div className="relative">
                        <input type="number" className={`${inputClass} pr-8`} value={form.value} disabled={isFreeship} onChange={(e) => set("value", e.target.value)} placeholder="25" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#6B5C4C]">{unit}</span>
                    </div>
                </div>
            </div>

            {isCombo ? (
                /* Mua bộ: chọn các sản phẩm trong combo, giảm theo % hoặc số tiền đã cấu hình ở trên */
                <div className="mb-3.5">
                    <Label required>Sản phẩm trong combo</Label>
                    <Hint>Chọn ít nhất 2 sản phẩm — khách mua đủ bộ sẽ được giảm {isFreeship ? "" : `${form.value || 0}${unit}`}</Hint>
                    {productPicker}
                </div>
            ) : (
                <div className="mb-3.5">
                    <Label>Áp dụng cho</Label>
                    <select className={inputClass} value={form.appliesTo} onChange={(e) => set("appliesTo", e.target.value)}>
                        <option value="all">Toàn bộ sản phẩm</option>
                        <option value="category">Danh mục cụ thể</option>
                        <option value="product">Sản phẩm cụ thể</option>
                    </select>

                    {/* Chọn danh mục cụ thể */}
                    {form.appliesTo === "category" && (
                        <div className="mt-2 border border-[#EDE8E0] rounded-[8px] p-2.5 max-h-[180px] overflow-y-auto">
                            {catList.length === 0 ? (
                                <div className="text-[12px] text-[#9E8E7E] py-2 text-center">Shop chưa có danh mục sản phẩm nào</div>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {catList.map((c) => {
                                        const on = form.categories.includes(c._id);
                                        return (
                                            <button key={c._id} type="button" onClick={() => toggleId("categories", c._id)}
                                                className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${on ? "border-[#B86B05] bg-[#fffbeb] text-[#95520B]" : "border-[#EDE8E0] text-[#6B5C4C] hover:border-[#B86B05]"}`}>
                                                {c.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {form.categories.length > 0 && <Hint>Đã chọn {form.categories.length} danh mục</Hint>}
                        </div>
                    )}

                    {/* Chọn sản phẩm cụ thể (kèm ảnh nhỏ) */}
                    {form.appliesTo === "product" && productPicker}
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                    <Label>Điều kiện đơn tối thiểu</Label>
                    <input type="number" className={inputClass} value={form.minOrderValue} onChange={(e) => set("minOrderValue", e.target.value)} />
                    <Hint>0 = không giới hạn</Hint>
                </div>
                <div>
                    <Label>Giảm tối đa (₫)</Label>
                    <input type="number" className={inputClass} value={form.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} placeholder="Không giới hạn" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div><Label required>Bắt đầu</Label><input type="datetime-local" className={inputClass} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
                <div><Label required>Kết thúc</Label><input type="datetime-local" className={inputClass} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></div>
            </div>

            <div className="mb-4">
                <Label>Số lượng mã / lượt dùng tối đa</Label>
                <input type="number" className={inputClass} value={form.maxUsage} onChange={(e) => set("maxUsage", e.target.value)} placeholder="0 = không giới hạn" />
            </div>

            {/* Preview */}
            <div className="rounded-[10px] p-[18px] text-white mt-1 bg-gradient-to-br from-[#3a1d06] to-[#7B440C]">
                <span className="inline-block bg-white/20 backdrop-blur border border-white/30 px-2.5 py-[3px] rounded-full text-[11px] font-bold mb-2">Preview</span>
                <div className="text-[18px] font-extrabold mb-1">
                    {promoTypes.find((t) => t.key === form.cardType)?.label} {!isFreeship && `– Giảm ${form.value || 0}${unit}`}
                </div>
                <div className="text-[12.5px] opacity-80">Áp dụng: {form.appliesTo === "all" ? "Toàn bộ sản phẩm" : form.appliesTo === "category" ? "Danh mục cụ thể" : "Sản phẩm cụ thể"}</div>
                {!isFreeship && (
                    <div className="mt-2.5 flex gap-2">
                        <div className="bg-white/15 rounded-md px-3 py-2 text-[12px]"><div className="opacity-70 text-[10px]">Giá gốc</div><div className="font-bold line-through">6.500.000₫</div></div>
                        <div className="bg-white/25 rounded-md px-3 py-2 text-[12px]"><div className="opacity-70 text-[10px]">Sau giảm</div><div className="font-extrabold text-[15px] text-[#FBC309]">{previewAfter.toLocaleString("vi-VN")}₫</div></div>
                    </div>
                )}
            </div>

            <div className="flex gap-2.5 mt-5 pt-4 border-t border-[#EDE8E0]">
                <Btn variant="outline" onClick={onClose}>Hủy</Btn>
                <Btn variant="ghost" onClick={() => submit("draft")} disabled={saving}>Lưu nháp</Btn>
                <Btn variant="primary" className="ml-auto" onClick={() => submit(editing ? (editing.status || "running") : "running")} disabled={saving}>
                    {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Kích hoạt ngay"}
                </Btn>
            </div>
        </SlideOver>
    );
};

const Promotions = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState("all");
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [modalKey, setModalKey] = useState(0);

    const fetchPromotions = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getVendorPromotionsApi({ limit: 100 });
            if (res.success) setList(res.data.promotions || []);
            else setList([]);
        } catch {
            setList([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(fetchPromotions, 0);
        return () => clearTimeout(t);
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
    const remove = async (p) => {
        if (!window.confirm(`Xóa khuyến mãi "${p.name}"?`)) return;
        const res = await deleteVendorPromotionApi(p._id);
        if (res.success) { showToast("Đã xóa khuyến mãi", "success"); fetchPromotions(); }
        else showToast(msgOf(res) || "Xóa thất bại", "error");
    };

    return (
        <div className="vendor-fade-in">
            <PageHeader
                title="Khuyến mãi"
                sub={`${counts.running} chương trình đang hoạt động`}
                actions={<Btn variant="primary" onClick={openCreate}><IconPlus size={14} strokeWidth={2.5} /> Tạo khuyến mãi</Btn>}
            />

            <Tabs tabs={tabs} active={tab} onChange={setTab} />

            <div className="bg-white border border-[#EDE8E0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <div className="px-[18px]">
                    {loading ? (
                        <div className="py-10 text-center text-[#9E8E7E] text-[13px]">Đang tải...</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-12 text-center text-[#9E8E7E] text-[13px]">Chưa có chương trình khuyến mãi nào</div>
                    ) : filtered.map((p) => {
                        const type = TYPE_META[p.type] || TYPE_META.coupon;
                        const status = STATUS_META[p.status] || STATUS_META.draft;
                        const d = discountText(p);
                        const progress = p.maxUsage ? Math.min(100, Math.round((p.usedCount / p.maxUsage) * 100)) : null;
                        return (
                            <div key={p._id} className={`flex items-center justify-between gap-3 py-3.5 border-b border-[#EDE8E0] last:border-b-0 ${p.status === "ended" ? "opacity-65" : ""}`}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[13.5px] font-bold">{p.name}</span>
                                        <Badge tone={type.tone}>{type.label}</Badge>
                                        <Badge tone={status.tone}>{status.label}</Badge>
                                    </div>
                                    <div className="flex gap-4 mt-1.5 flex-wrap text-[11.5px] text-[#9E8E7E]">
                                        <span>{typeof d === "string" ? d : <>Giảm <strong className={d.tone}>{d.hi}</strong>{d.cond}</>}</span>
                                        <span>{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</span>
                                        <span>{p.maxUsage ? `Đã dùng: ${p.usedCount || 0} / ${p.maxUsage} lượt` : "Không giới hạn lượt"}</span>
                                    </div>
                                    {progress != null && (
                                        <div className="h-1 bg-[#EDE8E0] rounded-[2px] mt-1.5 overflow-hidden max-w-[200px]">
                                            <div className="h-full rounded-[2px] bg-gradient-to-r from-[#B86B05] to-[#DE9601]" style={{ width: `${progress}%` }} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                    <Btn variant="outline" size="xs" onClick={() => openEdit(p)}>Sửa</Btn>
                                    <Btn variant="danger" size="xs" onClick={() => remove(p)}>Xóa</Btn>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <PromoModal key={modalKey} open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} onSaved={fetchPromotions} />
        </div>
    );
};

export default Promotions;
