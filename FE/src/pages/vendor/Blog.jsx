import { useState, useEffect, useCallback } from "react";
import { PageHeader, Btn, Tabs, Badge, Label, Hint, SearchInput, selectClass, inputClass } from "../../components/vendor/ui";
import SlideOver from "../../components/vendor/SlideOver";
import { IconPlus, IconImage, IconEye, IconX, IconDoc } from "../../components/vendor/icons";
import { formatVND } from "../../components/vendor/data";
import { useToast } from "../../components/context/ToastContext";
import {
    getVendorBlogsApi, createVendorBlogApi, updateVendorBlogApi, deleteVendorBlogApi,
    uploadVendorImagesApi, getVendorProductsApi,
} from "../../utils/api";

const CATEGORIES = [
    { key: "inspiration", label: "Cảm hứng" },
    { key: "styling", label: "Mẹo phối đồ" },
    { key: "guide", label: "Hướng dẫn" },
    { key: "brand_story", label: "Câu chuyện thương hiệu" },
    { key: "trend", label: "Xu hướng" },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
const STATUS_META = {
    published: { label: "Đã đăng", tone: "green" },
    draft: { label: "Nháp", tone: "gray" },
    scheduled: { label: "Đã lên lịch", tone: "purple" },
};
const TAB_DEFS = [
    { key: "all", label: "Tất cả" },
    { key: "published", label: "Đã đăng" },
    { key: "draft", label: "Nháp" },
    { key: "scheduled", label: "Đã lên lịch" },
];
const SORTS = [
    { value: "-createdAt", label: "Mới nhất" },
    { value: "-views", label: "Nhiều lượt xem" },
    { value: "-likes", label: "Nhiều lượt thích" },
];
const GRADIENTS = [
    "linear-gradient(135deg,#c4956a,#8a5a32)",
    "linear-gradient(135deg,#7d8b9c,#4a5666)",
    "linear-gradient(135deg,#a8b59a,#5f6e4e)",
    "linear-gradient(135deg,#caa07a,#7a4f2c)",
    "linear-gradient(135deg,#b0a4c4,#675a82)",
    "linear-gradient(135deg,#9cb0b8,#566a72)",
];

const msgOf = (res) => (Array.isArray(res?.message) ? res.message.join(", ") : res?.message);
const num = (n) => Number(n || 0).toLocaleString("vi-VN");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");
const toLocalInput = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return new Date(dt - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const buildForm = (editing) => {
    if (!editing) return {
        title: "", category: "inspiration", status: "published", excerpt: "", content: "",
        coverImage: "", tags: [], products: [], slug: "", scheduledAt: "",
        allowComments: true, allowLikes: true, isPinned: false,
    };
    return {
        title: editing.title || "",
        category: editing.category || "inspiration",
        status: editing.status || "draft",
        excerpt: editing.excerpt || "",
        content: editing.content || "",
        coverImage: editing.coverImage || "",
        tags: editing.tags || [],
        products: (editing.products || []).map((p) => (typeof p === "string" ? p : p._id)),
        slug: editing.slug || "",
        scheduledAt: toLocalInput(editing.scheduledAt),
        allowComments: editing.allowComments !== false,
        allowLikes: editing.allowLikes !== false,
        isPinned: !!editing.isPinned,
    };
};

/* ---- Write / edit blog drawer (remounted per open via key) ---- */
const BlogModal = ({ open, onClose, editing, onSaved }) => {
    const { showToast } = useToast();
    const [form, setForm] = useState(() => buildForm(editing));
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [prodList, setProdList] = useState([]);
    const [prodSearch, setProdSearch] = useState("");

    useEffect(() => {
        getVendorProductsApi({ limit: 200 }).then((r) => r.success && setProdList(r.data.products || [])).catch(() => {});
    }, []);

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const isScheduled = form.status === "scheduled";

    const uploadCover = async (file) => {
        if (!file) return;
        try {
            setUploading(true);
            const res = await uploadVendorImagesApi([file]);
            if (res.success) set("coverImage", res.data.images[0]);
            else showToast(msgOf(res) || "Tải ảnh thất bại", "error");
        } catch { showToast("Lỗi tải ảnh", "error"); }
        finally { setUploading(false); }
    };

    const addTag = (e) => {
        if (e.key !== "Enter" && e.key !== ",") return;
        e.preventDefault();
        const t = tagInput.trim().replace(/,$/, "");
        if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
        setTagInput("");
    };
    const removeTag = (t) => set("tags", form.tags.filter((x) => x !== t));
    const toggleProduct = (id) => set("products", form.products.includes(id) ? form.products.filter((x) => x !== id) : [...form.products, id]);

    const submit = async (statusOverride) => {
        if (!form.title.trim()) return showToast("Vui lòng nhập tiêu đề bài viết", "error");
        const status = statusOverride || form.status;
        if (status === "scheduled" && !form.scheduledAt) return showToast("Vui lòng chọn thời gian lên lịch", "error");

        const payload = {
            title: form.title.trim(),
            category: form.category,
            status,
            excerpt: form.excerpt,
            content: form.content,
            coverImage: form.coverImage || null,
            tags: form.tags,
            products: form.products,
            scheduledAt: status === "scheduled" ? form.scheduledAt : null,
            allowComments: form.allowComments,
            allowLikes: form.allowLikes,
            isPinned: form.isPinned,
        };
        if (form.slug.trim()) payload.slug = form.slug.trim();

        try {
            setSaving(true);
            const res = editing ? await updateVendorBlogApi(editing._id, payload) : await createVendorBlogApi(payload);
            if (res.success) {
                showToast(editing ? "Cập nhật bài viết thành công" : "Tạo bài viết thành công", "success");
                onSaved();
                onClose();
            } else {
                showToast(msgOf(res) || "Lưu bài viết thất bại", "error");
            }
        } catch { showToast("Có lỗi xảy ra", "error"); }
        finally { setSaving(false); }
    };

    return (
        <SlideOver open={open} onClose={onClose} widthClass="sm:w-[620px]" title={<h3 className="text-base font-bold">{editing ? "Chỉnh sửa bài viết" : "Viết bài blog mới"}</h3>}>
            {/* Cover */}
            <div className="mb-3.5">
                <Label required>Ảnh bìa</Label>
                <label className="block w-full h-[140px] border-2 border-dashed border-[#D5C9BC] rounded-[10px] bg-[#FAF7F4] overflow-hidden flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors hover:border-[#B86B05] hover:bg-[#fffbeb]">
                    {form.coverImage ? <img src={form.coverImage} alt="" className="w-full h-full object-cover" /> : (
                        <>
                            <IconImage size={30} strokeWidth={1.5} className="text-[#9E8E7E]" />
                            <span className="text-[12.5px] text-[#9E8E7E]">{uploading ? "Đang tải..." : "Tải ảnh bìa (1200×630px)"}</span>
                        </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { uploadCover(e.target.files[0]); e.target.value = ""; }} />
                </label>
            </div>

            <div className="mb-3.5">
                <Label required>Tiêu đề bài viết</Label>
                <input className={`${inputClass} text-[15px] font-semibold`} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="VD: 5 cách phối sofa Nordic cho phòng khách nhỏ" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                    <Label required>Chủ đề</Label>
                    <select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)}>
                        {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                </div>
                <div>
                    <Label>Trạng thái</Label>
                    <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
                        <option value="published">Đăng ngay</option>
                        <option value="draft">Lưu nháp</option>
                        <option value="scheduled">Lên lịch đăng</option>
                    </select>
                </div>
            </div>

            {isScheduled && (
                <div className="mb-3.5">
                    <Label required>Thời gian lên lịch</Label>
                    <input type="datetime-local" className={inputClass} value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
                </div>
            )}

            <div className="mb-3.5">
                <Label>Tóm tắt ngắn</Label>
                <textarea rows={2} className={`${inputClass} resize-y`} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="Đoạn mô tả ngắn hiển thị ở thẻ bài viết và kết quả tìm kiếm..." />
            </div>

            <div className="h-px bg-[#EDE8E0] my-4" />

            <div className="mb-3.5">
                <Label required>Nội dung bài viết</Label>
                <textarea rows={8} className={`${inputClass} resize-y leading-relaxed`} value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Viết nội dung bài blog của bạn ở đây..." />
                <Hint>{(form.content.trim().split(/\s+/).filter(Boolean).length)} từ</Hint>
            </div>

            {/* Tags */}
            <div className="mb-3.5">
                <Label>Thẻ (tags)</Label>
                <div className="flex flex-wrap gap-1.5 p-2 border-[1.5px] border-[#EDE8E0] rounded-[6px] min-h-[42px] items-center">
                    {form.tags.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1.5 bg-[#fef3e2] text-[#8a4b05] text-[12px] font-semibold px-2.5 py-1 rounded-full border border-[#f0cea6]">
                            {t}
                            <button type="button" onClick={() => removeTag(t)} className="text-[#b97a3a]"><IconX size={11} /></button>
                        </span>
                    ))}
                    <input className="flex-1 min-w-[90px] outline-none text-[13px] bg-transparent" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Thêm thẻ rồi Enter…" />
                </div>
            </div>

            {/* Linked products */}
            <div className="mb-3.5">
                <Label>Gắn sản phẩm liên quan</Label>
                <div className="border border-[#EDE8E0] rounded-[8px] p-2.5">
                    <SearchInput placeholder="Tìm sản phẩm..." value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} />
                    <div className="mt-2 max-h-[170px] overflow-y-auto flex flex-col gap-1">
                        {prodList.length === 0 ? (
                            <div className="text-[12px] text-[#9E8E7E] py-2 text-center">Shop chưa có sản phẩm nào</div>
                        ) : prodList.filter((p) => p.name.toLowerCase().includes(prodSearch.toLowerCase())).map((p) => {
                            const on = form.products.includes(p._id);
                            return (
                                <button key={p._id} type="button" onClick={() => toggleProduct(p._id)}
                                    className={`flex items-center gap-2.5 p-1.5 rounded-[7px] text-left transition-colors ${on ? "bg-[#fffbeb]" : "hover:bg-[#FAF7F4]"}`}>
                                    <input type="checkbox" readOnly checked={on} className="w-3.5 h-3.5 accent-[#95520B] pointer-events-none" />
                                    <div className="w-9 h-9 rounded-[6px] border border-[#EDE8E0] bg-[#FAF7F4] overflow-hidden shrink-0 flex items-center justify-center">
                                        {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <IconImage size={15} className="text-[#C4B8A8]" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[12.5px] font-medium truncate">{p.name}</div>
                                        <div className="text-[11px] text-[#B86B05]">{formatVND(p.price)}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {form.products.length > 0 && <Hint>Đã gắn {form.products.length} sản phẩm</Hint>}
                </div>
            </div>

            <div className="h-px bg-[#EDE8E0] my-4" />

            <div className="text-[13px] font-bold mb-3">Tương tác &amp; hiển thị</div>
            <div className="flex flex-col gap-2.5 mb-3.5">
                <label className="flex items-center gap-2.5 text-[13px] cursor-pointer"><input type="checkbox" className="w-3.5 h-3.5 accent-[#95520B]" checked={form.allowLikes} onChange={(e) => set("allowLikes", e.target.checked)} /> Cho phép khách thả tim &amp; lưu yêu thích</label>
                <label className="flex items-center gap-2.5 text-[13px] cursor-pointer"><input type="checkbox" className="w-3.5 h-3.5 accent-[#95520B]" checked={form.allowComments} onChange={(e) => set("allowComments", e.target.checked)} /> Cho phép bình luận</label>
                <label className="flex items-center gap-2.5 text-[13px] cursor-pointer"><input type="checkbox" className="w-3.5 h-3.5 accent-[#95520B]" checked={form.isPinned} onChange={(e) => set("isPinned", e.target.checked)} /> Ghim bài lên đầu trang blog</label>
            </div>

            <div className="mb-3.5">
                <Label>Đường dẫn (slug)</Label>
                <input className={inputClass} value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="tự sinh từ tiêu đề nếu để trống" />
            </div>

            <div className="flex gap-2.5 mt-5 pt-4 border-t border-[#EDE8E0]">
                <Btn variant="outline" onClick={onClose}>Hủy</Btn>
                <Btn variant="ghost" onClick={() => submit("draft")} disabled={saving}>Lưu nháp</Btn>
                <Btn variant="primary" className="ml-auto" onClick={() => submit(editing ? undefined : (form.status === "draft" ? "published" : form.status))} disabled={saving}>
                    {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Đăng bài"}
                </Btn>
            </div>
        </SlideOver>
    );
};

const Blog = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState("all");
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [sort, setSort] = useState("-createdAt");
    const [page, setPage] = useState(1);

    const [blogs, setBlogs] = useState([]);
    const [counts, setCounts] = useState({});
    const [stats, setStats] = useState({ totalViews: 0, totalLikes: 0, totalComments: 0 });
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [modalKey, setModalKey] = useState(0);

    const fetchBlogs = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getVendorBlogsApi({ status: tab, category: category || undefined, search: search || undefined, sort, page, limit: 9 });
            if (res.success) {
                setBlogs(res.data.blogs || []);
                setCounts(res.data.counts || {});
                setStats(res.data.stats || { totalViews: 0, totalLikes: 0, totalComments: 0 });
                setPagination(res.data.pagination || { total: 0, pages: 1 });
            } else setBlogs([]);
        } catch { setBlogs([]); }
        finally { setLoading(false); }
    }, [tab, category, search, sort, page]);

    useEffect(() => {
        const t = setTimeout(fetchBlogs, 300);
        return () => clearTimeout(t);
    }, [fetchBlogs]);

    const tabs = TAB_DEFS.map((t) => ({ ...t, count: counts[t.key] ?? 0 }));
    const openCreate = () => { setEditing(null); setModalKey((k) => k + 1); setModalOpen(true); };
    const openEdit = (b) => { setEditing(b); setModalKey((k) => k + 1); setModalOpen(true); };
    const changeFilter = (fn) => { fn(); setPage(1); };

    const remove = async (b) => {
        if (!window.confirm(`Xoá bài viết "${b.title}"?`)) return;
        const res = await deleteVendorBlogApi(b._id);
        if (res.success) { showToast("Đã xoá bài viết", "success"); fetchBlogs(); }
        else showToast(msgOf(res) || "Xoá thất bại", "error");
    };

    const statCards = [
        { label: "Tổng bài viết", value: num(counts.all), sub: `${counts.published || 0} đã đăng · ${counts.draft || 0} nháp`, color: "text-[#1C1108]" },
        { label: "Tổng lượt xem", value: num(stats.totalViews), sub: "trên toàn bộ bài viết", color: "text-[#B86B05]" },
        { label: "Tổng lượt thích", value: num(stats.totalLikes), sub: "khách yêu thích", color: "text-[#dc2626]" },
        { label: "Bình luận", value: num(stats.totalComments), sub: "tương tác từ khách", color: "text-[#16a34a]" },
    ];

    return (
        <div className="vendor-fade-in">
            <PageHeader
                title="Blog của shop"
                sub="Chia sẻ cảm hứng nội thất, mẹo phối đồ & câu chuyện thương hiệu tới khách hàng"
                actions={<Btn variant="primary" onClick={openCreate}><IconPlus size={14} strokeWidth={2.5} /> Viết bài mới</Btn>}
            />

            {/* Stat strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
                {statCards.map((s) => (
                    <div key={s.label} className="bg-white border border-[#EDE8E0] rounded-[10px] px-[18px] py-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                        <div className="text-[12px] text-[#6B5C4C] mb-2">{s.label}</div>
                        <div className={`text-[24px] font-extrabold tracking-[-0.02em] ${s.color}`}>{s.value}</div>
                        <div className="text-[11.5px] text-[#9E8E7E] mt-1">{s.sub}</div>
                    </div>
                ))}
            </div>

            <Tabs tabs={tabs} active={tab} onChange={(k) => changeFilter(() => setTab(k))} />

            {/* Filters */}
            <div className="flex items-center gap-2 mb-3.5 flex-wrap">
                <SearchInput placeholder="Tìm tiêu đề bài viết..." value={search} onChange={(e) => changeFilter(() => setSearch(e.target.value))} />
                <select className={selectClass} value={category} onChange={(e) => changeFilter(() => setCategory(e.target.value))}>
                    <option value="">Tất cả chủ đề</option>
                    {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <select className={selectClass} value={sort} onChange={(e) => changeFilter(() => setSort(e.target.value))}>
                    {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {(search || category) && <Btn variant="ghost" size="sm" className="text-[#9E8E7E]" onClick={() => changeFilter(() => { setSearch(""); setCategory(""); })}>Xóa lọc</Btn>}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="py-16 text-center text-[#9E8E7E] text-[13px]">Đang tải...</div>
            ) : blogs.length === 0 ? (
                <div className="py-16 text-center text-[#9E8E7E]">
                    <IconDoc size={40} strokeWidth={1.5} className="mx-auto mb-3 opacity-40" />
                    <div className="text-[15px] font-semibold text-[#1C1108] mb-1">Chưa có bài viết nào</div>
                    <div className="text-[13px]">Bắt đầu chia sẻ câu chuyện của shop với khách hàng.</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {blogs.map((b, i) => {
                        const st = STATUS_META[b.status] || STATUS_META.draft;
                        return (
                            <article key={b._id} className="bg-white border border-[#EDE8E0] rounded-[10px] overflow-hidden flex flex-col transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(40,20,5,0.35)]">
                                <div className="h-[150px] relative flex items-end p-2.5 bg-cover bg-center" style={b.coverImage ? { backgroundImage: `url(${b.coverImage})` } : { background: GRADIENTS[i % GRADIENTS.length] }}>
                                    <Badge tone={st.tone}>{st.label}</Badge>
                                    {b.isPinned && <span className="ml-1.5"><Badge tone="orange">Ghim</Badge></span>}
                                </div>
                                <div className="p-[14px_15px] flex flex-col flex-1">
                                    <div className="text-[11px] font-bold text-[#B86B05] uppercase tracking-[0.04em] mb-1.5">{CAT_LABEL[b.category] || "Khác"}</div>
                                    <div className="text-[14.5px] font-bold leading-[1.35] mb-1.5 line-clamp-2">{b.title}</div>
                                    <div className="text-[12.5px] text-[#6B5C4C] leading-[1.5] flex-1 line-clamp-2">{b.excerpt}</div>
                                    <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-[#EDE8E0] text-[11.5px] text-[#9E8E7E]">
                                        {b.status === "scheduled" ? (
                                            <span>Đăng {fmtDate(b.scheduledAt)}</span>
                                        ) : b.status === "draft" ? (
                                            <span>Bản nháp</span>
                                        ) : (
                                            <>
                                                <span className="flex items-center gap-1"><IconEye size={13} /> {num(b.views)}</span>
                                                <span>· {num(b.likes)} thích</span>
                                                <span>· {num(b.commentsCount)} bình luận</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[12px] text-[#6B5C4C] mt-3 pt-2.5 border-t border-[#EDE8E0]">
                                        <span className="w-6 h-6 rounded-full bg-[#B86B05] text-white flex items-center justify-center text-[11px] font-bold">{(b.author?.fullName || "S").charAt(0).toUpperCase()}</span>
                                        {b.author?.fullName || "Shop"} · {b.status === "published" ? fmtDate(b.publishedAt || b.createdAt) : "Chưa đăng"}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-3">
                                        <Btn variant="outline" size="xs" className="flex-1" onClick={() => openEdit(b)}>{b.status === "draft" ? "Tiếp tục viết" : "Sửa"}</Btn>
                                        <Btn variant="danger" size="xs" onClick={() => remove(b)}>Xoá</Btn>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-5 flex-wrap gap-2">
                    <span className="text-[11.5px] text-[#9E8E7E]">Trang {page} / {pagination.pages} · {pagination.total} bài viết</span>
                    <div className="flex gap-1">
                        <Btn variant="outline" size="xs" onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</Btn>
                        <Btn variant="outline" size="xs" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}>›</Btn>
                    </div>
                </div>
            )}

            <BlogModal key={modalKey} open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} onSaved={fetchBlogs} />
        </div>
    );
};

export default Blog;
