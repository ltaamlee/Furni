import { useState, useEffect, useCallback } from "react";
import { PageHeader, Btn, Tabs, Badge, Label, SearchInput, selectClass, inputClass } from "../../components/vendor/ui";
import SlideOver from "../../components/vendor/SlideOver";
import { formatVND, productStyles } from "../../components/vendor/data";
import { IconDownload, IconPlus, IconImage, IconX } from "../../components/vendor/icons";
import { useToast } from "../../components/context/ToastContext";
import {
    getVendorProductsApi, createVendorProductApi, updateVendorProductApi,
    deleteVendorProductApi, getCategoriesApi, uploadVendorImagesApi, exportVendorProductsApi,
} from "../../utils/api";

const TAB_DEFS = [
    { key: "all", label: "Tất cả" },
    { key: "active", label: "Đang bán" },
    { key: "hidden", label: "Ẩn" },
    { key: "out_of_stock", label: "Hết hàng" },
    { key: "draft", label: "Nháp" },
];

const STATUS_META = {
    active: { label: "Đang bán", tone: "green" },
    hidden: { label: "Ẩn", tone: "gray" },
    draft: { label: "Nháp", tone: "purple" },
    out_of_stock: { label: "Hết hàng", tone: "red" },
};

const stockColor = (q) => (q === 0 ? "#dc2626" : q < 5 ? "#d97706" : "#16a34a");
const msgOf = (res) => (Array.isArray(res?.message) ? res.message.join(", ") : res?.message);

const vInput =
    "w-full px-2.5 py-1.5 border-[1.5px] border-[#EDE8E0] rounded-[6px] text-[12.5px] bg-white outline-none transition-colors focus:border-[#B86B05] placeholder:text-[#9E8E7E]";

const buildForm = (editing) => {
    if (!editing) return {
        name: "", category: "", style: productStyles[0], description: "",
        material: "", weight: "", length: "", width: "", height: "",
        slug: "", status: "active", metaDescription: "",
        requiresAssembly: false, deliveryType: "standard",
        variants: [{ name: "", price: "", stock: "" }],
        images: [],
    };
    const d = editing.dimensions || {};
    return {
        name: editing.name || "",
        category: editing.category?._id || editing.category || "",
        style: editing.style || productStyles[0],
        description: editing.description || "",
        material: editing.material || "",
        weight: editing.weight ?? "",
        length: d.length ?? "", width: d.width ?? "", height: d.height ?? "",
        slug: editing.slug || "",
        status: editing.status || "active",
        metaDescription: editing.metaDescription || "",
        requiresAssembly: !!editing.requiresAssembly,
        deliveryType: editing.deliveryType || "standard",
        variants: editing.variants?.length
            ? editing.variants.map((v) => ({ name: v.name || "", price: v.price ?? "", stock: v.stock ?? "" }))
            : [{ name: "", price: editing.price ?? "", stock: editing.quantity ?? "" }],
        images: editing.images?.filter(Boolean) || [],
    };
};

/* ---- Add / Edit product drawer (remounted per open via key) ---- */
const ProductModal = ({ open, onClose, categories, editing, onSaved }) => {
    const { showToast } = useToast();
    const [form, setForm] = useState(() => buildForm(editing));
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const setVariant = (i, k, v) => setForm((f) => ({ ...f, variants: f.variants.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)) }));
    const addVariant = () => setForm((f) => ({ ...f, variants: [...f.variants, { name: "", price: "", stock: "" }] }));
    const removeVariant = (i) => setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));

    const handleFiles = async (fileList) => {
        const files = [...fileList];
        if (!files.length) return;
        if (form.images.length + files.length > 6) return showToast("Tối đa 6 ảnh mỗi sản phẩm", "error");
        try {
            setUploading(true);
            const res = await uploadVendorImagesApi(files);
            if (res.success) {
                setForm((f) => ({ ...f, images: [...f.images, ...(res.data.images || [])] }));
                showToast("Tải ảnh lên thành công", "success");
            } else {
                showToast(msgOf(res) || "Tải ảnh thất bại", "error");
            }
        } catch {
            showToast("Có lỗi khi tải ảnh", "error");
        } finally {
            setUploading(false);
        }
    };
    const removeImage = (i) => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

    const submit = async (statusOverride) => {
        if (!form.name.trim()) return showToast("Vui lòng nhập tên sản phẩm", "error");
        if (!form.category) return showToast("Vui lòng chọn danh mục", "error");

        const variants = form.variants
            .filter((v) => v.name || v.price || v.stock)
            .map((v) => ({ name: v.name, price: Number(v.price) || 0, stock: Number(v.stock) || 0 }));
        const basePrice = variants.length ? variants[0].price : 0;
        const totalStock = variants.reduce((s, v) => s + v.stock, 0);

        const payload = {
            name: form.name.trim(),
            category: form.category,
            style: form.style,
            description: form.description,
            material: form.material,
            weight: form.weight === "" ? undefined : Number(form.weight),
            dimensions: {
                length: form.length === "" ? undefined : Number(form.length),
                width: form.width === "" ? undefined : Number(form.width),
                height: form.height === "" ? undefined : Number(form.height),
            },
            requiresAssembly: form.requiresAssembly,
            deliveryType: form.deliveryType,
            variants,
            price: basePrice,
            quantity: totalStock,
            status: statusOverride || form.status,
            metaDescription: form.metaDescription,
            images: form.images,
        };

        try {
            setSaving(true);
            const res = editing
                ? await updateVendorProductApi(editing._id, payload)
                : await createVendorProductApi(payload);
            if (res.success) {
                showToast(editing ? "Cập nhật sản phẩm thành công" : "Tạo sản phẩm thành công", "success");
                onSaved();
                onClose();
            } else {
                showToast(msgOf(res) || "Lưu sản phẩm thất bại", "error");
            }
        } catch {
            showToast("Có lỗi xảy ra", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <SlideOver open={open} onClose={onClose} title={<h3 className="text-base font-bold">{editing ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h3>}>
            <div className="mb-3.5">
                <Label>Ảnh sản phẩm</Label>
                {form.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-2">
                        {form.images.map((src, i) => (
                            <div key={src + i} className="relative aspect-square rounded-[8px] overflow-hidden border border-[#EDE8E0] group">
                                <img src={src} alt="" className="w-full h-full object-cover" />
                                {i === 0 && (
                                    <span className="absolute bottom-0 inset-x-0 bg-[#95520B] text-white text-[9.5px] text-center py-0.5">Ảnh bìa</span>
                                )}
                                <button
                                    type="button" onClick={() => removeImage(i)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Xoá ảnh"
                                >
                                    <IconX size={11} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <label className="block border-2 border-dashed border-[#D5C9BC] rounded-[10px] p-7 text-center cursor-pointer bg-[#FAF7F4] transition-colors hover:border-[#B86B05] hover:bg-[#fffbeb]">
                    <input type="file" accept="image/*" multiple className="hidden" disabled={uploading}
                        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
                    <IconImage size={32} strokeWidth={1.5} className="text-[#9E8E7E] mx-auto mb-2" />
                    <div className="text-[13px] font-semibold mb-0.5">{uploading ? "Đang tải ảnh lên..." : "Click để tải ảnh lên"}</div>
                    <div className="text-[11.5px] text-[#9E8E7E]">PNG, JPG, WEBP — Tối đa 6 ảnh, mỗi ảnh ≤ 5MB</div>
                </label>
            </div>

            <div className="mb-3.5">
                <Label required>Tên sản phẩm</Label>
                <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ví dụ: Sofa Góc Chữ L Nordic Cao Cấp" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                    <Label required>Danh mục</Label>
                    <select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)}>
                        <option value="">Chọn danh mục</option>
                        {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <Label>Phong cách</Label>
                    <select className={inputClass} value={form.style} onChange={(e) => set("style", e.target.value)}>
                        {productStyles.map((s) => <option key={s}>{s}</option>)}
                    </select>
                </div>
            </div>
            <div className="mb-3.5">
                <Label>Mô tả sản phẩm</Label>
                <textarea rows={4} className={`${inputClass} resize-y`} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Mô tả chi tiết về sản phẩm..." />
            </div>

            <div className="h-px bg-[#EDE8E0] my-4" />

            <div className="text-[13px] font-bold mb-3">Thông số nội thất</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div><Label>Chất liệu</Label><input className={inputClass} value={form.material} onChange={(e) => set("material", e.target.value)} placeholder="Gỗ sồi tự nhiên" /></div>
                <div><Label>Cân nặng (kg)</Label><input type="number" className={inputClass} value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="25" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div><Label>Dài (cm)</Label><input type="number" className={inputClass} value={form.length} onChange={(e) => set("length", e.target.value)} placeholder="200" /></div>
                <div><Label>Rộng (cm)</Label><input type="number" className={inputClass} value={form.width} onChange={(e) => set("width", e.target.value)} placeholder="90" /></div>
                <div><Label>Cao (cm)</Label><input type="number" className={inputClass} value={form.height} onChange={(e) => set("height", e.target.value)} placeholder="80" /></div>
            </div>

            <div className="h-px bg-[#EDE8E0] my-4" />

            <div className="text-[13px] font-bold mb-1">Biến thể sản phẩm</div>
            <div className="text-[11.5px] text-[#9E8E7E] mb-3">Màu sắc / hoàn thiện bề mặt và giá – tồn kho tương ứng</div>
            <div className="grid grid-cols-[1.5fr_1fr_1fr_32px] gap-2 mb-1.5">
                {["Màu / Hoàn thiện", "Giá (₫)", "Tồn kho", ""].map((h, i) => (
                    <span key={i} className="text-[11px] font-semibold text-[#6B5C4C] uppercase">{h}</span>
                ))}
            </div>
            <div>
                {form.variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-[1.5fr_1fr_1fr_32px] gap-2 items-center py-2 border-b border-[#EDE8E0] last:border-b-0">
                        <input className={vInput} value={v.name} onChange={(e) => setVariant(i, "name", e.target.value)} placeholder="Nâu gỗ tự nhiên" />
                        <input type="number" className={vInput} value={v.price} onChange={(e) => setVariant(i, "price", e.target.value)} placeholder="6500000" />
                        <input type="number" className={vInput} value={v.stock} onChange={(e) => setVariant(i, "stock", e.target.value)} placeholder="20" />
                        <button onClick={() => removeVariant(i)} className="text-[#9E8E7E] p-1 hover:text-[#dc2626]" aria-label="Xoá biến thể"><IconX size={14} /></button>
                    </div>
                ))}
            </div>
            <Btn variant="ghost" size="sm" onClick={addVariant} className="mt-2 text-[#B86B05]"><IconPlus size={13} strokeWidth={2.5} /> Thêm biến thể</Btn>

            <div className="h-px bg-[#EDE8E0] my-4" />

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div><Label>Slug (URL)</Label><input className={inputClass} value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="tự sinh từ tên nếu để trống" /></div>
                <div>
                    <Label>Trạng thái</Label>
                    <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
                        <option value="active">Công khai</option>
                        <option value="hidden">Ẩn</option>
                        <option value="draft">Nháp</option>
                        <option value="out_of_stock">Hết hàng</option>
                    </select>
                </div>
            </div>
            <div className="mb-3">
                <Label>Meta description (SEO)</Label>
                <textarea rows={2} className={`${inputClass} resize-y`} value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} placeholder="Mô tả ngắn hiển thị trên Google..." />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-[#95520B]" checked={form.requiresAssembly} onChange={(e) => set("requiresAssembly", e.target.checked)} /> Cần lắp ráp
                </label>
                <select className={`${selectClass} max-w-[200px] ml-2`} value={form.deliveryType} onChange={(e) => set("deliveryType", e.target.value)}>
                    <option value="standard">Giao hàng thường</option>
                    <option value="with_installation">Giao hàng + lắp đặt</option>
                </select>
            </div>

            <div className="flex gap-2.5 mt-5 pt-4 border-t border-[#EDE8E0]">
                <Btn variant="outline" onClick={onClose}>Hủy</Btn>
                <Btn variant="ghost" onClick={() => submit("draft")} disabled={saving}>Lưu nháp</Btn>
                <Btn variant="primary" className="ml-auto" onClick={() => submit(editing ? undefined : "active")} disabled={saving}>
                    {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Đăng bán"}
                </Btn>
            </div>
        </SlideOver>
    );
};

const Products = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState("all");
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [page, setPage] = useState(1);

    const [products, setProducts] = useState([]);
    const [counts, setCounts] = useState({});
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [modalKey, setModalKey] = useState(0);
    const [selected, setSelected] = useState(() => new Set());

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getVendorProductsApi({ status: tab, category: category || undefined, search: search || undefined, page, limit: 10 });
            if (res.success) {
                setProducts(res.data.products || []);
                setCounts(res.data.counts || {});
                setPagination(res.data.pagination || { total: 0, pages: 1 });
                setSelected(new Set());
            } else {
                setProducts([]);
            }
        } catch {
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [tab, category, search, page]);

    useEffect(() => {
        getCategoriesApi().then((res) => res.success && setCategories(res.data.categories || [])).catch(() => {});
    }, []);

    useEffect(() => {
        const t = setTimeout(fetchProducts, 300);
        return () => clearTimeout(t);
    }, [fetchProducts]);

    const tabs = TAB_DEFS.map((t) => ({ ...t, count: counts[t.key] ?? 0 }));

    const allChecked = selected.size === products.length && products.length > 0;
    const toggleAll = () => setSelected(allChecked ? new Set() : new Set(products.map((p) => p._id)));
    const toggleRow = (id) => setSelected((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const openCreate = () => { setEditing(null); setModalKey((k) => k + 1); setModalOpen(true); };
    const openEdit = (p) => { setEditing(p); setModalKey((k) => k + 1); setModalOpen(true); };

    const toggleStatus = async (p) => {
        const next = p.status === "active" ? "hidden" : "active";
        const res = await updateVendorProductApi(p._id, { status: next });
        if (res.success) { showToast(next === "active" ? "Đã hiển thị sản phẩm" : "Đã ẩn sản phẩm", "success"); fetchProducts(); }
        else showToast(msgOf(res) || "Thao tác thất bại", "error");
    };

    const deleteSelected = async () => {
        if (!window.confirm(`Xóa ${selected.size} sản phẩm đã chọn?`)) return;
        await Promise.all([...selected].map((id) => deleteVendorProductApi(id)));
        showToast("Đã xóa sản phẩm", "success");
        fetchProducts();
    };

    const changeFilter = (fn) => { fn(); setPage(1); };

    const [exporting, setExporting] = useState(false);
    const exportExcel = async () => {
        try {
            setExporting(true);
            const blob = await exportVendorProductsApi({ status: tab, category: category || undefined, search: search || undefined });
            if (!(blob instanceof Blob)) return showToast("Xuất Excel thất bại", "error");
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `san-pham-${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            showToast("Đã xuất file Excel", "success");
        } catch {
            showToast("Có lỗi khi xuất Excel", "error");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="vendor-fade-in">
            <PageHeader
                title="Quản lý sản phẩm"
                sub={`${counts.active ?? 0} sản phẩm đang hoạt động`}
                actions={
                    <>
                        <Btn variant="outline" size="sm" onClick={exportExcel} disabled={exporting}>
                            <IconDownload size={13} /> {exporting ? "Đang xuất..." : "Xuất Excel"}
                        </Btn>
                        <Btn variant="primary" size="sm" onClick={openCreate}><IconPlus size={13} strokeWidth={2.5} /> Thêm sản phẩm</Btn>
                    </>
                }
            />

            <Tabs tabs={tabs} active={tab} onChange={(k) => changeFilter(() => setTab(k))} />

            <div className="flex items-center gap-2 mb-3.5 flex-wrap">
                <SearchInput placeholder="Tìm tên, slug sản phẩm..." value={search} onChange={(e) => changeFilter(() => setSearch(e.target.value))} />
                <select className={selectClass} value={category} onChange={(e) => changeFilter(() => setCategory(e.target.value))}>
                    <option value="">Tất cả danh mục</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                {(search || category) && <Btn variant="ghost" size="sm" className="text-[#9E8E7E]" onClick={() => changeFilter(() => { setSearch(""); setCategory(""); })}>Xóa lọc</Btn>}
            </div>

            {selected.size > 0 && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-[6px] mb-3 text-[13px] text-[#78350f]">
                    <span><strong>{selected.size}</strong> sản phẩm đã chọn</span>
                    <div className="ml-auto flex gap-1.5">
                        <Btn variant="danger" size="xs" onClick={deleteSelected}>Xóa</Btn>
                    </div>
                </div>
            )}

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
                        {loading ? (
                            <tr><td colSpan={8} className="px-3.5 py-10 text-center text-[#9E8E7E] text-[13px]">Đang tải...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={8} className="px-3.5 py-10 text-center text-[#9E8E7E] text-[13px]">Chưa có sản phẩm nào</td></tr>
                        ) : products.map((p) => {
                            const meta = STATUS_META[p.status] || STATUS_META.active;
                            return (
                                <tr key={p._id} className="border-b border-[#EDE8E0] last:border-0 hover:bg-[#FDFAF7]">
                                    <td className="px-3.5 py-3">
                                        <input type="checkbox" checked={selected.has(p._id)} onChange={() => toggleRow(p._id)} className="w-3.5 h-3.5 accent-[#95520B]" />
                                    </td>
                                    <td className="px-3.5 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-[42px] h-[42px] rounded-[7px] border border-[#EDE8E0] shrink-0 bg-[#FAF7F4] overflow-hidden">
                                                {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-[13px]">{p.name}</div>
                                                <div className="text-[11.5px] text-[#9E8E7E]">{p.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3.5 py-3"><Badge tone="gray">{p.category?.name || "—"}</Badge></td>
                                    <td className="px-3.5 py-3 font-semibold text-[#B86B05] whitespace-nowrap">{formatVND(p.price)}</td>
                                    <td className="px-3.5 py-3">
                                        <span className="text-[13px] font-semibold" style={{ color: stockColor(p.quantity) }}>{p.quantity}</span>
                                    </td>
                                    <td className="px-3.5 py-3 text-[13px]">{p.sold || 0}</td>
                                    <td className="px-3.5 py-3"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                                    <td className="px-3.5 py-3">
                                        <div className="flex gap-1">
                                            <Btn variant="outline" size="xs" onClick={() => openEdit(p)}>Sửa</Btn>
                                            <Btn variant="ghost" size="xs" className={p.status !== "active" ? "text-[#16a34a]" : ""} onClick={() => toggleStatus(p)}>
                                                {p.status === "active" ? "Ẩn" : "Hiện"}
                                            </Btn>
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
                    <span className="text-[11.5px] text-[#9E8E7E]">Trang {page} / {pagination.pages} · {pagination.total} sản phẩm</span>
                    <div className="flex gap-1">
                        <Btn variant="outline" size="xs" onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</Btn>
                        <Btn variant="outline" size="xs" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}>›</Btn>
                    </div>
                </div>
            )}

            <ProductModal key={modalKey} open={modalOpen} onClose={() => setModalOpen(false)} categories={categories} editing={editing} onSaved={fetchProducts} />
        </div>
    );
};

export default Products;
