import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPublicBlogsApi, getPublicBlogApi } from "../../utils/api";

const CATEGORIES = [
    { key: "", label: "Tất cả" },
    { key: "inspiration", label: "Cảm hứng" },
    { key: "styling", label: "Mẹo phối đồ" },
    { key: "guide", label: "Hướng dẫn" },
    { key: "brand_story", label: "Câu chuyện thương hiệu" },
    { key: "trend", label: "Xu hướng" },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

const SORTS = [
    { value: "-publishedAt", label: "Mới nhất" },
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

const num = (n) => Number(n || 0).toLocaleString("vi-VN");
const fmtDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

/* ─── Blog Detail View ─────────────────────────────────────── */
const BlogDetail = ({ blog }) => {
    const navigate = useNavigate();
    const gradient = GRADIENTS[0];

    return (
        <div className="min-h-screen bg-[#FAF7F4]">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-[#EDE8E0]">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <nav className="flex items-center gap-2 text-sm text-[#A8896A]">
                        <Link to="/" className="hover:text-[#B86B05] transition-colors">Trang chủ</Link>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M9 5l7 7-7 7" /></svg>
                        <Link to="/blog" className="hover:text-[#B86B05] transition-colors">Blog</Link>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M9 5l7 7-7 7" /></svg>
                        <span className="text-[#1C1108] truncate max-w-[200px]">{blog.title}</span>
                    </nav>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
                {/* Article card */}
                <article className="bg-white rounded-2xl border border-[#EDE8E0] overflow-hidden shadow-sm">
                    {/* Cover */}
                    {blog.coverImage ? (
                        <div className="aspect-[21/9] bg-cover bg-center" style={{ backgroundImage: `url(${blog.coverImage})` }} />
                    ) : (
                        <div className="h-48 sm:h-64" style={{ background: gradient }} />
                    )}

                    <div className="p-6 sm:p-10">
                        {/* Category */}
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-[#B86B05]/10 text-[#B86B05] text-xs font-bold px-3 py-1 rounded-full">
                                {CAT_LABEL[blog.category] || "Khác"}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1108] leading-snug mb-4">
                            {blog.title}
                        </h1>

                        {/* Author + date + stats */}
                        <div className="flex flex-wrap items-center gap-4 pb-6 mb-6 border-b border-[#EDE8E0]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#B86B05] to-[#95520B] flex items-center justify-center text-white text-sm font-bold">
                                    {(blog.author?.fullName || blog.shop?.name || "S").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-[#1C1108]">
                                        {blog.author?.fullName || blog.shop?.name || "Shop"}
                                    </div>
                                    {blog.shop && (
                                        <Link to={`/shop/${blog.shop.slug || blog.shop._id}`} className="text-xs text-[#B86B05] hover:underline">
                                            {blog.shop.name}
                                        </Link>
                                    )}
                                </div>
                            </div>
                            <div className="h-8 w-px bg-[#EDE8E0] hidden sm:block" />
                            <span className="text-sm text-[#A8896A]">
                                {fmtDate(blog.publishedAt || blog.createdAt)}
                            </span>
                            <div className="h-8 w-px bg-[#EDE8E0] hidden sm:block" />
                            <div className="flex items-center gap-3 text-sm text-[#A8896A]">
                                <span className="flex items-center gap-1">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                    {num(blog.views)} lượt xem
                                </span>
                                <span className="flex items-center gap-1">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                    {num(blog.likes)} thích
                                </span>
                                <span className="flex items-center gap-1">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                    {num(blog.commentsCount)} bình luận
                                </span>
                            </div>
                        </div>

                        {/* Excerpt */}
                        {blog.excerpt && (
                            <blockquote className="bg-[#FAF7F4] border-l-4 border-[#B86B05] rounded-r-xl px-5 py-4 mb-8 text-[#6B5C4C] italic text-base leading-relaxed">
                                {blog.excerpt}
                            </blockquote>
                        )}

                        {/* Content */}
                        <div
                            className="prose prose-stone max-w-none text-[#3D2B1F] leading-relaxed text-[15px] sm:text-[16px]"
                            dangerouslySetInnerHTML={{ __html: blog.content || "" }}
                        />

                        {/* Tags */}
                        {blog.tags && blog.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-[#EDE8E0]">
                                <span className="text-sm text-[#A8896A] font-medium">Tags:</span>
                                {blog.tags.map((tag) => (
                                    <span key={tag} className="text-sm text-[#B86B05] bg-[#FEF3E2] px-3 py-1 rounded-full border border-[#F0CEA6]">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Related Products */}
                        {blog.products && blog.products.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-[#EDE8E0]">
                                <h3 className="font-bold text-[#1C1108] text-lg mb-4">Sản phẩm liên quan</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {blog.products.map((product) => (
                                        <Link
                                            key={product._id}
                                            to={`/product/${product.slug || product._id}`}
                                            className="flex items-center gap-3 p-3 bg-[#FAF7F4] rounded-xl border border-[#EDE8E0] hover:border-[#B86B05] hover:shadow-sm transition-all"
                                        >
                                            <div className="w-14 h-14 rounded-lg bg-white overflow-hidden border border-[#EDE8E0] shrink-0 flex items-center justify-center">
                                                {product.images?.[0] ? (
                                                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="#D5C9BC" strokeWidth="1.5" className="w-6 h-6">
                                                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-semibold text-[#1C1108] truncate">{product.name}</div>
                                                <div className="text-sm text-[#B86B05] font-bold">{num(product.price)} đ</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Back button */}
                        <div className="mt-10 pt-6 border-t border-[#EDE8E0]">
                            <button
                                onClick={() => navigate("/blog")}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B86B05] text-white font-medium rounded-xl hover:bg-[#95520B] transition-colors text-sm"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                    <path d="M15 19l-7-7 7-7" />
                                </svg>
                                Quay lại danh sách blog
                            </button>
                        </div>
                    </div>
                </article>
            </div>
        </div>
    );
};

/* ─── Blog Listing View ────────────────────────────────────── */
const BlogList = () => {
    const navigate = useNavigate();
    const [blogs, setBlogs] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [sort, setSort] = useState("-publishedAt");
    const [page, setPage] = useState(1);

    const fetchBlogs = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page, limit: 9, sort };
            if (category) params.category = category;
            if (search.trim()) params.search = search.trim();
            const res = await getPublicBlogsApi(params);
            if (res.success) {
                setBlogs(res.data.blogs || []);
                setPagination(res.data.pagination || { total: 0, page: 1, pages: 1 });
            } else {
                setBlogs([]);
            }
        } catch {
            setBlogs([]);
        } finally {
            setLoading(false);
        }
    }, [category, search, sort, page]);

    useEffect(() => {
        const t = setTimeout(fetchBlogs, 300);
        return () => clearTimeout(t);
    }, [fetchBlogs]);

    const handleFilterChange = (setter) => (val) => {
        setter(val);
        setPage(1);
    };

    const renderBlogCard = (blog, index) => {
        const gradient = GRADIENTS[index % GRADIENTS.length];
        return (
            <article
                key={blog._id}
                onClick={() => navigate(`/blog/${blog.slug || blog._id}`)}
                className="bg-white rounded-2xl border border-[#EDE8E0] overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-[0_12px_32px_-8px_rgba(40,20,5,0.25)] hover:-translate-y-1 flex flex-col"
            >
                <div
                    className="h-[180px] sm:h-[200px] relative bg-cover bg-center flex items-end p-3"
                    style={blog.coverImage ? { backgroundImage: `url(${blog.coverImage})` } : { background: gradient }}
                >
                    <span className="bg-white/95 backdrop-blur-sm text-[#B86B05] text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                        {CAT_LABEL[blog.category] || "Khác"}
                    </span>
                </div>

                <div className="p-4 sm:p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-[#1C1108] text-[15px] sm:text-[16px] leading-snug mb-2 line-clamp-2 group-hover:text-[#B86B05] transition-colors">
                        {blog.title}
                    </h3>
                    <p className="text-[13px] sm:text-[14px] text-[#6B5C4C] leading-relaxed flex-1 line-clamp-3 mb-3">
                        {blog.excerpt || "Không có mô tả"}
                    </p>

                    {blog.tags && blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {blog.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[11px] text-[#A8896A] bg-[#FAF7F4] px-2 py-0.5 rounded-full border border-[#EDE8E0]">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-[#EDE8E0] mt-auto">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#B86B05] to-[#95520B] flex items-center justify-center text-white text-[11px] font-bold">
                                {(blog.author?.fullName || blog.shop?.name || "S").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[12px] text-[#6B5C4C] truncate max-w-[100px]">
                                {blog.author?.fullName || blog.shop?.name || "Shop"}
                            </span>
                        </div>
                        <span className="text-[11px] text-[#A8896A]">
                            {fmtDate(blog.publishedAt || blog.createdAt)}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-[11.5px] text-[#A8896A]">
                        <span className="flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            {num(blog.views)}
                        </span>
                        <span className="flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            {num(blog.likes)}
                        </span>
                        <span className="flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            {num(blog.commentsCount)}
                        </span>
                    </div>
                </div>
            </article>
        );
    };

    return (
        <>
            {/* Hero Banner */}
            <div
                className="relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, #B86B05 0%, #8B4513 50%, #6B3410 100%)",
                    minHeight: "220px",
                }}
            >
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
                <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-4 py-1.5 rounded-full mb-4">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        Blog nội thất Furni
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
                        Khám phá & Cảm hứng
                    </h1>
                    <p className="text-white/80 text-base sm:text-lg max-w-2xl leading-relaxed">
                        Cập nhật xu hướng nội thất, mẹo phối đồ & câu chuyện thương hiệu từ các chuyên gia của Furni
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
                {/* Filters */}
                <div className="bg-white rounded-2xl border border-[#EDE8E0] p-4 sm:p-5 mb-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                        <div className="flex-1 min-w-[200px] relative">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#A8896A" strokeWidth="2"
                                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                <circle cx="11" cy="11" r="8" />
                                <path d="M21 21l-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Tìm bài viết..."
                                value={search}
                                onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-[#D5C9BC] rounded-xl text-sm text-[#1C1108] bg-[#FAF7F4] focus:outline-none focus:border-[#B86B05] focus:ring-1 focus:ring-[#B86B05] transition-colors placeholder:text-[#A8896A]"
                            />
                        </div>

                        <div className="relative min-w-[160px]">
                            <select
                                value={category}
                                onChange={(e) => handleFilterChange(setCategory)(e.target.value)}
                                className="w-full appearance-none pl-4 pr-10 py-2.5 border border-[#D5C9BC] rounded-xl text-sm text-[#1C1108] bg-[#FAF7F4] focus:outline-none focus:border-[#B86B05] focus:ring-1 focus:ring-[#B86B05] transition-colors cursor-pointer"
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c.key} value={c.key}>{c.label}</option>
                                ))}
                            </select>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#A8896A" strokeWidth="2"
                                className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </div>

                        <div className="relative min-w-[160px]">
                            <select
                                value={sort}
                                onChange={(e) => handleFilterChange(setSort)(e.target.value)}
                                className="w-full appearance-none pl-4 pr-10 py-2.5 border border-[#D5C9BC] rounded-xl text-sm text-[#1C1108] bg-[#FAF7F4] focus:outline-none focus:border-[#B86B05] focus:ring-1 focus:ring-[#B86B05] transition-colors cursor-pointer"
                            >
                                {SORTS.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#A8896A" strokeWidth="2"
                                className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </div>

                        {(search || category) && (
                            <button
                                onClick={() => { setSearch(""); setCategory(""); setPage(1); }}
                                className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-[#B86B05] hover:text-[#95520B] font-medium transition-colors border border-[#D5C9BC] rounded-xl bg-[#FAF7F4] hover:bg-[#F5EFE8]"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                                Xóa lọc
                            </button>
                        )}
                    </div>
                </div>

                {/* Results info */}
                {!loading && (
                    <div className="flex items-center justify-between mb-5">
                        <p className="text-sm text-[#6B5C4C]">
                            <span className="font-semibold text-[#1C1108]">{pagination.total}</span> bài viết
                            {category && <span> · <span className="font-medium text-[#B86B05]">{CAT_LABEL[category]}</span></span>}
                            {search && <span> · từ khóa "<span className="font-medium text-[#B86B05]">{search}</span>"</span>}
                        </p>
                    </div>
                )}

                {/* Loading */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-[#EDE8E0] overflow-hidden animate-pulse">
                                <div className="h-[180px] sm:h-[200px] bg-[#F0EBE3]" />
                                <div className="p-5 space-y-3">
                                    <div className="h-4 bg-[#F0EBE3] rounded w-3/4" />
                                    <div className="h-3 bg-[#F0EBE3] rounded w-full" />
                                    <div className="h-3 bg-[#F0EBE3] rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : blogs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#EDE8E0] p-16 text-center shadow-sm">
                        <div className="w-20 h-20 mx-auto mb-5 bg-[#FAF7F4] rounded-full flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#D5C9BC" strokeWidth="1.5" className="w-10 h-10">
                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-[#1C1108] mb-2">Không tìm thấy bài viết</h3>
                        <p className="text-sm text-[#A8896A] mb-5">
                            {search || category
                                ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                                : "Hiện chưa có bài viết nào được đăng tải"}
                        </p>
                        {(search || category) && (
                            <button
                                onClick={() => { setSearch(""); setCategory(""); }}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B86B05] text-white font-medium rounded-xl hover:bg-[#95520B] transition-colors text-sm"
                            >
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {blogs.map((blog, i) => renderBlogCard(blog, i))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-10">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#D5C9BC] text-[#6B5C4C] hover:bg-[#FAF7F4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                <path d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        {(() => {
                            const pages = [];
                            for (let p = 1; p <= pagination.pages; p++) {
                                if (p === 1 || p === pagination.pages || Math.abs(p - page) <= 1) {
                                    pages.push(p);
                                } else if (pages[pages.length - 1] !== "...") {
                                    pages.push("...");
                                }
                            }
                            return pages.map((p, i) =>
                                p === "..." ? (
                                    <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-[#A8896A]">
                                        ...
                                    </span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-10 h-10 flex items-center justify-center rounded-xl font-medium text-sm transition-colors ${
                                            p === page
                                                ? "bg-[#B86B05] text-white shadow-sm"
                                                : "border border-[#D5C9BC] text-[#6B5C4C] hover:bg-[#FAF7F4]"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            );
                        })()}

                        <button
                            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#D5C9BC] text-[#6B5C4C] hover:bg-[#FAF7F4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                <path d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

/* ─── Main BlogPage ────────────────────────────────────────── */
const BlogPage = () => {
    const { idOrSlug } = useParams();

    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(!!idOrSlug);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!idOrSlug) {
            setBlog(null);
            setNotFound(false);
            return;
        }

        const fetchBlog = async () => {
            try {
                setLoading(true);
                setNotFound(false);
                const res = await getPublicBlogApi(idOrSlug);
                if (res.success) {
                    setBlog(res.data.blog);
                } else {
                    setNotFound(true);
                }
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };

        fetchBlog();
    }, [idOrSlug]);

    if (idOrSlug) {
        if (loading) {
            return (
                <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-[#EDE8E0] border-t-[#B86B05] rounded-full animate-spin" />
                        <span className="text-[#A8896A] text-sm">Đang tải bài viết...</span>
                    </div>
                </div>
            );
        }
        if (notFound) {
            return (
                <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4">📄</div>
                        <h2 className="text-2xl font-bold text-[#1C1108] mb-2">Không tìm thấy bài viết</h2>
                        <p className="text-[#A8896A] mb-6">Bài viết này có thể đã bị xóa hoặc không tồn tại.</p>
                        <Link to="/blog" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B86B05] text-white font-medium rounded-xl hover:bg-[#95520B] transition-colors text-sm">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                <path d="M15 19l-7-7 7-7" />
                            </svg>
                            Quay lại danh sách blog
                        </Link>
                    </div>
                </div>
            );
        }
        return blog ? <BlogDetail blog={blog} /> : null;
    }

    return <BlogList />;
};

export default BlogPage;
