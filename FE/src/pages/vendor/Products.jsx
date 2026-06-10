import { useState } from "react";
import { PageHeader, Btn, Tabs, Badge, Label, SearchInput, selectClass, inputClass } from "../../components/vendor/ui";
import SlideOver from "../../components/vendor/SlideOver";
import {
    products, productTabs, productCategories, productStyles, productMaterials, formatVND,
} from "../../components/vendor/data";
import { IconDownload, IconPlus, IconImage, IconX } from "../../components/vendor/icons";

const stockColor = (cur, total) => (cur === 0 ? "#dc2626" : cur / total < 0.2 ? "#d97706" : "#16a34a");
const stockPct = (cur, total) => Math.min(100, Math.round((cur / total) * 100));

/* compact input used inside the variant rows */
const vInput =
    "w-full px-2.5 py-1.5 border-[1.5px] border-[#EDE8E0] rounded-[6px] text-[12.5px] bg-white outline-none transition-colors focus:border-[#B86B05] placeholder:text-[#9E8E7E]";

/* ---- Add / Edit product drawer ---- */
const ProductModal = ({ open, onClose }) => {
    const [variants, setVariants] = useState([{ color: "", price: "", stock: "" }]);
    const addVariant = () => setVariants((v) => [...v, { color: "", price: "", stock: "" }]);
    const removeVariant = (i) => setVariants((v) => v.filter((_, idx) => idx !== i));

    return (
        <SlideOver open={open} onClose={onClose} title={<h3 className="text-base font-bold">Thêm sản phẩm mới</h3>}>
            {/* Images */}
            <div className="mb-3.5">
                <Label required>Ảnh sản phẩm</Label>
                <div className="border-2 border-dashed border-[#D5C9BC] rounded-[10px] p-7 text-center cursor-pointer bg-[#FAF7F4] transition-colors hover:border-[#B86B05] hover:bg-[#fffbeb]">
                    <IconImage size={32} strokeWidth={1.5} className="text-[#9E8E7E] mx-auto mb-2" />
                    <div className="text-[13px] font-semibold mb-0.5">Kéo thả hoặc click để tải ảnh</div>
                    <div className="text-[11.5px] text-[#9E8E7E]">PNG, JPG, WEBP — Tối đa 5 ảnh, mỗi ảnh ≤ 5MB</div>
                </div>
            </div>

            {/* Basic info */}
            <div className="mb-3.5">
                <Label required>Tên sản phẩm</Label>
                <input className={inputClass} placeholder="Ví dụ: Sofa Góc Chữ L Nordic Cao Cấp" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                    <Label required>Danh mục</Label>
                    <select className={inputClass} defaultValue="">
                        <option value="">Chọn danh mục</option>
                        {productCategories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <Label>Phong cách</Label>
                    <select className={inputClass}>{productStyles.map((s) => <option key={s}>{s}</option>)}</select>
                </div>
            </div>
            <div className="mb-3.5">
                <Label>Mô tả sản phẩm</Label>
                <textarea rows={4} className={`${inputClass} resize-y`} placeholder="Mô tả chi tiết về sản phẩm..." />
            </div>

            <div className="h-px bg-[#EDE8E0] my-4" />

            {/* Specs */}
            <div className="text-[13px] font-bold mb-3">Thông số nội thất</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div><Label>Chất liệu</Label><input className={inputClass} placeholder="Gỗ sồi tự nhiên" /></div>
                <div><Label>Cân nặng (kg)</Label><input type="number" className={inputClass} placeholder="25" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div><Label>Dài (cm)</Label><input type="number" className={inputClass} placeholder="200" /></div>
                <div><Label>Rộng (cm)</Label><input type="number" className={inputClass} placeholder="90" /></div>
                <div><Label>Cao (cm)</Label><input type="number" className={inputClass} placeholder="80" /></div>
            </div>

            <div className="h-px bg-[#EDE8E0] my-4" />

            {/* Variants */}
            <div className="text-[13px] font-bold mb-1">Biến thể sản phẩm</div>
            <div className="text-[11.5px] text-[#9E8E7E] mb-3">Màu sắc / hoàn thiện bề mặt và giá – tồn kho tương ứng</div>
            <div className="grid grid-cols-[1.5fr_1fr_1fr_32px] gap-2 mb-1.5">
                {["Màu / Hoàn thiện", "Giá (₫)", "Tồn kho", ""].map((h, i) => (
                    <span key={i} className="text-[11px] font-semibold text-[#6B5C4C] uppercase">{h}</span>
                ))}
            </div>
            <div>
                {variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-[1.5fr_1fr_1fr_32px] gap-2 items-center py-2 border-b border-[#EDE8E0] last:border-b-0">
                        <input className={vInput} placeholder="Nâu gỗ tự nhiên" />
                        <input type="number" className={vInput} placeholder="6.500.000" />
                        <input type="number" className={vInput} placeholder="20" />
                        <button onClick={() => removeVariant(i)} className="text-[#9E8E7E] p-1 hover:text-[#dc2626]" aria-label="Xoá biến thể">
                            <IconX size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <Btn variant="ghost" size="sm" onClick={addVariant} className="mt-2 text-[#B86B05]">
                <IconPlus size={13} strokeWidth={2.5} /> Thêm biến thể
            </Btn>

            <div className="h-px bg-[#EDE8E0] my-4" />

            {/* SEO + status */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div><Label>Slug (URL)</Label><input className={inputClass} placeholder="sofa-goc-chu-l-nordic" /></div>
                <div>
                    <Label>Trạng thái</Label>
                    <select className={inputClass}><option>Công khai</option><option>Ẩn</option><option>Nháp</option></select>
                </div>
            </div>
            <div className="mb-3">
                <Label>Meta description (SEO)</Label>
                <textarea rows={2} className={`${inputClass} resize-y`} placeholder="Mô tả ngắn hiển thị trên Google..." />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-[#95520B]" /> Cần lắp ráp
                </label>
                <select className={`${selectClass} max-w-[200px] ml-2`}><option>Giao hàng thường</option><option>Giao hàng + lắp đặt</option></select>
            </div>

            {/* Footer */}
            <div className="flex gap-2.5 mt-5 pt-4 border-t border-[#EDE8E0]">
                <Btn variant="outline" onClick={onClose}>Hủy</Btn>
                <Btn variant="ghost">Lưu nháp</Btn>
                <Btn variant="primary" className="ml-auto">Đăng bán</Btn>
            </div>
        </SlideOver>
    );
};

const Products = () => {
    const [tab, setTab] = useState("all");
    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState(() => new Set());

    const allChecked = selected.size === products.length && products.length > 0;
    const toggleAll = () => setSelected(allChecked ? new Set() : new Set(products.map((p) => p.id)));
    const toggleRow = (id) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    return (
        <div className="vendor-fade-in">
            <PageHeader
                title="Quản lý sản phẩm"
                sub="138 sản phẩm đang hoạt động"
                actions={
                    <>
                        <Btn variant="outline" size="sm"><IconDownload size={13} /> Xuất Excel</Btn>
                        <Btn variant="primary" size="sm" onClick={() => setModalOpen(true)}><IconPlus size={13} strokeWidth={2.5} /> Thêm sản phẩm</Btn>
                    </>
                }
            />

            <Tabs tabs={productTabs} active={tab} onChange={setTab} />

            {/* Filters */}
            <div className="flex items-center gap-2 mb-3.5 flex-wrap">
                <SearchInput placeholder="Tìm tên, slug sản phẩm..." />
                <select className={selectClass}><option>Tất cả danh mục</option>{productCategories.map((c) => <option key={c}>{c}</option>)}</select>
                <select className={selectClass}><option>Tất cả phong cách</option>{productStyles.map((s) => <option key={s}>{s}</option>)}</select>
                <select className={selectClass}><option>Tất cả chất liệu</option>{productMaterials.map((m) => <option key={m}>{m}</option>)}</select>
                <Btn variant="ghost" size="sm" className="text-[#9E8E7E]">Xóa lọc</Btn>
            </div>

            {/* Bulk bar */}
            {selected.size > 0 && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-[6px] mb-3 text-[13px] text-[#78350f]">
                    <span><strong>{selected.size}</strong> sản phẩm đã chọn</span>
                    <div className="ml-auto flex gap-1.5">
                        <Btn variant="outline" size="xs">Hiện</Btn>
                        <Btn variant="outline" size="xs">Ẩn</Btn>
                        <Btn variant="danger" size="xs">Xóa</Btn>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="rounded-[10px] overflow-x-auto border border-[#EDE8E0]">
                <table className="w-full border-collapse min-w-[760px]">
                    <thead>
                        <tr>
                            <th className="bg-[#FAF7F4] px-3.5 py-2.5 w-9 border-b border-[#EDE8E0]">
                                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-3.5 h-3.5 accent-[#95520B]" />
                            </th>
                            {["Sản phẩm", "Danh mục", "Giá bán", "Tồn kho", "Lượt bán", "Trạng thái", "Thao tác"].map((h) => (
                                <th key={h} className="bg-[#FAF7F4] px-3.5 py-2.5 text-left text-[11.5px] font-semibold text-[#6B5C4C] uppercase tracking-[0.04em] border-b border-[#EDE8E0] whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p) => (
                            <tr key={p.id} className="border-b border-[#EDE8E0] last:border-0 hover:bg-[#FDFAF7]">
                                <td className="px-3.5 py-3">
                                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleRow(p.id)} className="w-3.5 h-3.5 accent-[#95520B]" />
                                </td>
                                <td className="px-3.5 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-[42px] h-[42px] rounded-[7px] border border-[#EDE8E0] shrink-0" style={{ background: p.thumb }} />
                                        <div>
                                            <div className="font-semibold text-[13px]">{p.name}</div>
                                            <div className="text-[11.5px] text-[#9E8E7E]">{p.slug}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3.5 py-3"><Badge tone="gray">{p.category}</Badge></td>
                                <td className="px-3.5 py-3 font-semibold text-[#B86B05] whitespace-nowrap">{formatVND(p.price)}</td>
                                <td className="px-3.5 py-3 min-w-[110px]">
                                    <div className="text-[13px]">{p.stock.current} / {p.stock.total}</div>
                                    <div className="h-[5px] rounded-[3px] bg-[#EDE8E0] mt-1 overflow-hidden">
                                        <div className="h-full rounded-[3px]" style={{ width: `${stockPct(p.stock.current, p.stock.total)}%`, background: stockColor(p.stock.current, p.stock.total) }} />
                                    </div>
                                </td>
                                <td className="px-3.5 py-3 text-[13px]">{p.sold}</td>
                                <td className="px-3.5 py-3"><Badge tone={p.status.tone}>{p.status.label}</Badge></td>
                                <td className="px-3.5 py-3">
                                    <div className="flex gap-1">
                                        <Btn variant="outline" size="xs" onClick={() => setModalOpen(true)}>Sửa</Btn>
                                        <Btn variant="ghost" size="xs" className={p.hideAction === "Hiện" ? "text-[#16a34a]" : ""}>{p.hideAction}</Btn>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                <span className="text-[11.5px] text-[#9E8E7E]">Hiển thị 1–6 / 156 sản phẩm</span>
                <div className="flex gap-1">
                    <Btn variant="outline" size="xs">‹</Btn>
                    <Btn variant="primary" size="xs">1</Btn>
                    <Btn variant="outline" size="xs">2</Btn>
                    <Btn variant="outline" size="xs">3</Btn>
                    <span className="px-1.5 py-[3px] text-[12px] text-[#9E8E7E]">...</span>
                    <Btn variant="outline" size="xs">26</Btn>
                    <Btn variant="outline" size="xs">›</Btn>
                </div>
            </div>

            <ProductModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </div>
    );
};

export default Products;
