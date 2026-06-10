import { useState } from "react";
import { PageHeader, Btn, Tabs, Badge, Label, Hint, inputClass } from "../../components/vendor/ui";
import SlideOver from "../../components/vendor/SlideOver";
import { promotions, promoTabs, promoTypes } from "../../components/vendor/data";
import { IconPlus, IconZap, IconTag, IconBox, IconTruck } from "../../components/vendor/icons";

const TYPE_ICON = { flash: IconZap, coupon: IconTag, combo: IconBox, freeship: IconTruck };

/* action key -> button */
const ACTION_BTN = {
    edit: (onEdit) => <Btn key="edit" variant="outline" size="xs" onClick={onEdit}>Sửa</Btn>,
    stop: () => <Btn key="stop" variant="danger" size="xs">Dừng</Btn>,
    copy: () => <Btn key="copy" variant="ghost" size="xs">Sao chép</Btn>,
    report: () => <Btn key="report" variant="outline" size="xs">Báo cáo</Btn>,
    duplicate: () => <Btn key="dup" variant="ghost" size="xs">Nhân bản</Btn>,
};

/* ---- Create promotion drawer ---- */
const PromoModal = ({ open, onClose }) => {
    const [type, setType] = useState("flash");
    const [discountType, setDiscountType] = useState("percent");
    const [value, setValue] = useState("25");

    const unit = discountType === "percent" ? "%" : "₫";
    const isFreeship = discountType === "freeship";

    return (
        <SlideOver open={open} onClose={onClose} title={<h3 className="text-base font-bold">Tạo khuyến mãi mới</h3>}>
            {/* Type selector */}
            <Label required>Loại khuyến mãi</Label>
            <div className="grid grid-cols-2 gap-2 mb-[18px] mt-1">
                {promoTypes.map((t) => {
                    const Icon = TYPE_ICON[t.key];
                    const selected = type === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setType(t.key)}
                            className={`border-2 rounded-[10px] px-4 py-3.5 cursor-pointer transition-colors text-center ${
                                selected ? "border-[#B86B05] bg-[#fffbeb]" : "border-[#EDE8E0] hover:border-[#B86B05] hover:bg-[#fffbeb]"
                            }`}
                        >
                            <Icon size={22} strokeWidth={1.8} className={`mx-auto mb-2 ${selected ? "text-[#B86B05]" : "text-[#9E8E7E]"}`} />
                            <div className="text-[13px] font-semibold">{t.label}</div>
                            <div className="text-[11.5px] text-[#9E8E7E] mt-0.5">{t.sub}</div>
                        </button>
                    );
                })}
            </div>

            <div className="mb-3.5">
                <Label required>Tên chương trình</Label>
                <input className={inputClass} placeholder="VD: Flash Sale Sofa cuối tuần" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                    <Label>Loại giảm</Label>
                    <select className={inputClass} value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                        <option value="percent">Phần trăm (%)</option>
                        <option value="fixed">Số tiền cố định (₫)</option>
                        <option value="freeship">Free ship</option>
                    </select>
                </div>
                <div className={isFreeship ? "opacity-40" : ""}>
                    <Label required>Giá trị giảm</Label>
                    <div className="relative">
                        <input
                            type="number"
                            className={`${inputClass} pr-8`}
                            placeholder="25"
                            value={value}
                            disabled={isFreeship}
                            onChange={(e) => setValue(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#6B5C4C]">{unit}</span>
                    </div>
                </div>
            </div>

            <div className="mb-3.5">
                <Label>Áp dụng cho</Label>
                <select className={inputClass}><option>Toàn bộ sản phẩm</option><option>Danh mục cụ thể</option><option>Sản phẩm cụ thể</option></select>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                    <Label>Điều kiện đơn tối thiểu</Label>
                    <input type="number" className={inputClass} defaultValue={0} />
                    <Hint>0 = không giới hạn</Hint>
                </div>
                <div>
                    <Label>Giảm tối đa (₫)</Label>
                    <input type="number" className={inputClass} placeholder="Không giới hạn" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div><Label required>Bắt đầu</Label><input type="datetime-local" className={inputClass} defaultValue="2026-06-10T00:00" /></div>
                <div><Label required>Kết thúc</Label><input type="datetime-local" className={inputClass} defaultValue="2026-06-15T23:59" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div><Label>Số lượng mã / lượt dùng</Label><input type="number" className={inputClass} placeholder="100" /></div>
                <div><Label>Mã coupon (tuỳ chọn)</Label><input className={`${inputClass} uppercase`} placeholder="VD: SALE20" /></div>
            </div>

            {/* Preview */}
            <div className="rounded-[10px] p-[18px] text-white mt-3.5 bg-gradient-to-br from-[#3a1d06] to-[#7B440C]">
                <span className="inline-block bg-white/20 backdrop-blur border border-white/30 px-2.5 py-[3px] rounded-full text-[11px] font-bold mb-2">Preview</span>
                <div className="text-[18px] font-extrabold mb-1">
                    {promoTypes.find((t) => t.key === type)?.label} {!isFreeship && `– Giảm ${value || 0}${unit}`}
                </div>
                <div className="text-[12.5px] opacity-80">Áp dụng: Toàn bộ sản phẩm · 10/06 – 15/06/2026</div>
                {!isFreeship && (
                    <div className="mt-2.5 flex gap-2">
                        <div className="bg-white/15 rounded-md px-3 py-2 text-[12px]">
                            <div className="opacity-70 text-[10px]">Giá gốc</div>
                            <div className="font-bold line-through">6.500.000₫</div>
                        </div>
                        <div className="bg-white/25 rounded-md px-3 py-2 text-[12px]">
                            <div className="opacity-70 text-[10px]">Sau giảm</div>
                            <div className="font-extrabold text-[15px] text-[#FBC309]">
                                {discountType === "percent"
                                    ? `${Math.round(6500000 * (1 - (Number(value) || 0) / 100)).toLocaleString("vi-VN")}₫`
                                    : `${Math.max(0, 6500000 - (Number(value) || 0)).toLocaleString("vi-VN")}₫`}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-2.5 mt-5 pt-4 border-t border-[#EDE8E0]">
                <Btn variant="outline" onClick={onClose}>Hủy</Btn>
                <Btn variant="ghost">Lưu nháp</Btn>
                <Btn variant="primary" className="ml-auto">Kích hoạt ngay</Btn>
            </div>
        </SlideOver>
    );
};

const Promotions = () => {
    const [tab, setTab] = useState("all");
    const [modalOpen, setModalOpen] = useState(false);
    const openModal = () => setModalOpen(true);

    return (
        <div className="vendor-fade-in">
            <PageHeader
                title="Khuyến mãi"
                sub="4 chương trình đang hoạt động"
                actions={<Btn variant="primary" onClick={openModal}><IconPlus size={14} strokeWidth={2.5} /> Tạo khuyến mãi</Btn>}
            />

            <Tabs tabs={promoTabs} active={tab} onChange={setTab} />

            <div className="bg-white border border-[#EDE8E0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <div className="px-[18px]">
                    {promotions.map((p) => (
                        <div
                            key={p.id}
                            className={`flex items-center justify-between gap-3 py-3.5 border-b border-[#EDE8E0] last:border-b-0 ${p.ended ? "opacity-65" : ""}`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[13.5px] font-bold">{p.name}</span>
                                    <Badge tone={p.type.tone}>{p.type.label}</Badge>
                                    <Badge tone={p.status.tone}>{p.status.label}</Badge>
                                </div>
                                <div className="flex gap-4 mt-1.5 flex-wrap text-[11.5px] text-[#9E8E7E]">
                                    <span>
                                        {p.highlight ? <>Giảm <strong className={p.highlightTone}>{p.highlight}</strong> {p.desc}</> : p.desc}
                                    </span>
                                    <span>{p.period}</span>
                                    <span>{p.usage}</span>
                                </div>
                                {p.progress != null && (
                                    <div className="h-1 bg-[#EDE8E0] rounded-[2px] mt-1.5 overflow-hidden max-w-[200px]">
                                        <div className="h-full rounded-[2px] bg-gradient-to-r from-[#B86B05] to-[#DE9601]" style={{ width: `${p.progress}%` }} />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                                {p.actions.map((a) => ACTION_BTN[a](openModal))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <PromoModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </div>
    );
};

export default Promotions;
