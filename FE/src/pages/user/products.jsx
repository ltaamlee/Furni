import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getProductsApi, getCategoriesApi, getBestSellersApi, getWishlistApi } from "../../utils/api";
import ProductCard from "../../components/common/productCard";

// Price range options
const priceRanges = [
    { value: "all", label: "Tất cả giá" },
    { value: "0-500000", label: "Dưới 500.000đ" },
    { value: "500000-1000000", label: "500.000đ - 1.000.000đ" },
    { value: "1000000-5000000", label: "1.000.000đ - 5.000.000đ" },
    { value: "5000000-10000000", label: "5.000.000đ - 10.000.000đ" },
    { value: "10000000-999999999", label: "Trên 10.000.000đ" }
];

// Sort options
const sortOptions = [
    { value: "-createdAt", label: "Mới nhất" },
    { value: "price", label: "Giá: Thấp → Cao" },
    { value: "-price", label: "Giá: Cao → Thấp" },
    { value: "-sold", label: "Bán chạy nhất" },
    { value: "-averageRating", label: "Đánh giá cao" }
];

const ITEMS_PER_PAGE = 12;

const ProductsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [showFilters, setShowFilters] = useState(false);

    // Filter states from URL params
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "all";
    const priceRange = searchParams.get("price") || "all";
    const sort = searchParams.get("sort") || "-createdAt";
    const currentPage = parseInt(searchParams.get("page") || "1");

    useEffect(() => {
        fetchCategories();
        fetchBestSellers();
        fetchWishlist();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [search, category, priceRange, sort, currentPage]);

    useEffect(() => {
        const handleWishlistUpdate = (e) => {
            const { productId, action } = e.detail;
            if (action === "add") {
                setWishlist(prev => [...prev, productId]);
            } else {
                setWishlist(prev => prev.filter(id => id !== productId));
            }
        };
        window.addEventListener("wishlist-updated", handleWishlistUpdate);
        return () => window.removeEventListener("wishlist-updated", handleWishlistUpdate);
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await getCategoriesApi();
            if (res.success) {
                setCategories(res.data.categories || []);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    const fetchBestSellers = async () => {
        try {
            const res = await getBestSellersApi({ limit: 4 });
            if (res.success) {
                setBestSellers(res.data.products || []);
            }
        } catch (error) {
            console.error("Error fetching best sellers:", error);
        }
    };

    const fetchWishlist = async () => {
        try {
            const token = localStorage.getItem("access_token");
            if (!token) return;
            const res = await getWishlistApi({ limit: 100 });
            if (res.success) {
                const wishlistIds = (res.data.wishlist || []).map(item => item.product?._id || item.product);
                setWishlist(wishlistIds);
            }
        } catch (error) {
            console.error("Error fetching wishlist:", error);
        }
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                sort: sort,
                order: sort === "createdAt" || sort === "-createdAt" ? "desc" : sort.includes("-") ? "desc" : "asc"
            };

            if (search) params.search = search;
            if (category && category !== "all") params.category = category;
            if (priceRange && priceRange !== "all") {
                const [min, max] = priceRange.split("-");
                params.minPrice = min;
                params.maxPrice = max;
            }

            const res = await getProductsApi(params);

            if (res.success) {
                setProducts(res.data.products || []);
                const pagination = res.data.pagination || {};
                setTotal(pagination.total || res.data.products?.length || 0);
                setTotalPages(pagination.totalPages || 1);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    const goToPage = (pageNum) => {
        if (pageNum < 1 || pageNum > totalPages) return;
        const newParams = new URLSearchParams(searchParams);
        newParams.set("page", pageNum.toString());
        setSearchParams(newParams);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const updateFilter = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (value && value !== "all" && value !== "-createdAt") {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        newParams.delete("page");
        setSearchParams(newParams);
    };

    const clearFilters = () => {
        setSearchParams({});
    };

    const handleAddToCart = () => {
        window.dispatchEvent(new Event("cart-updated"));
    };

    const hasActiveFilters = search || (category && category !== "all") || (priceRange && priceRange !== "all");

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="min-h-screen bg-[#FAF7F4]">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-[#A8896A] mb-8">
                    <Link to="/" className="hover:text-[#B86B05] transition-colors">Trang chủ</Link>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M9 5l7 7-7 7" /></svg>
                    <span className="text-[#1C1108]">Sản phẩm</span>
                    {search && (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M9 5l7 7-7 7" /></svg>
                            <span className="text-[#B86B05]">"{search}"</span>
                        </>
                    )}
                </div>

                {/* Page Header */}
                <div className="bg-white rounded-2xl border border-[#EDE8E0] p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-[#1C1108]">Danh sách sản phẩm</h1>
                            <p className="text-sm text-[#A8896A] mt-1">
                                {loading ? "Đang tải..." : `Có ${total.toLocaleString('vi-VN')} sản phẩm`}
                            </p>
                        </div>
                        <select
                            value={sort}
                            onChange={(e) => updateFilter("sort", e.target.value)}
                            className="px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] bg-white text-sm min-w-[180px]"
                        >
                            {sortOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filter Pills */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[#EDE8E0]">
                            <span className="text-xs text-[#6B5C4C] font-medium">Lọc:</span>
                            {search && (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#B86B05]/10 text-[#B86B05] rounded-full text-xs font-medium">
                                    "{search}"
                                    <button onClick={() => updateFilter("search", "")} className="hover:text-[#95520B]">×</button>
                                </span>
                            )}
                            {category && category !== "all" && (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#B86B05]/10 text-[#B86B05] rounded-full text-xs font-medium">
                                    {categories.find(c => c.slug === category)?.name || category}
                                    <button onClick={() => updateFilter("category", "all")} className="hover:text-[#95520B]">×</button>
                                </span>
                            )}
                            {priceRange && priceRange !== "all" && (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#B86B05]/10 text-[#B86B05] rounded-full text-xs font-medium">
                                    {priceRanges.find(p => p.value === priceRange)?.label}
                                    <button onClick={() => updateFilter("price", "all")} className="hover:text-[#95520B]">×</button>
                                </span>
                            )}
                            <button onClick={clearFilters} className="text-xs text-[#BF4343] hover:text-red-700 font-medium transition-colors">
                                Xóa tất cả
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex gap-6">
                    {/* Sidebar Filters - Desktop */}
                    <aside className="hidden lg:block w-64 flex-shrink-0">
                        <div className="bg-white rounded-2xl border border-[#EDE8E0] p-5 sticky top-24">
                            {/* Categories */}
                            <div className="mb-6">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-[#6B5C4C] mb-3">Danh mục</h3>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => updateFilter("category", "all")}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                            category === "all"
                                                ? "bg-[#B86B05] text-white"
                                                : "text-[#6B5C4C] hover:bg-[#FAF7F4]"
                                        }`}
                                    >
                                        Tất cả sản phẩm
                                    </button>
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.slug}
                                            onClick={() => updateFilter("category", cat.slug)}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                                category === cat.slug
                                                    ? "bg-[#B86B05] text-white"
                                                    : "text-[#6B5C4C] hover:bg-[#FAF7F4]"
                                            }`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range */}
                            <div className="mb-6">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-[#6B5C4C] mb-3">Khoảng giá</h3>
                                <div className="space-y-1">
                                    {priceRanges.map((range) => (
                                        <button
                                            key={range.value}
                                            onClick={() => updateFilter("price", range.value)}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                                                priceRange === range.value
                                                    ? "bg-[#B86B05] text-white"
                                                    : "text-[#6B5C4C] hover:bg-[#FAF7F4]"
                                            }`}
                                        >
                                            {range.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Best Sellers Quick View */}
                            {bestSellers.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#6B5C4C] mb-3">Bán chạy</h3>
                                    <div className="space-y-3">
                                        {bestSellers.slice(0, 3).map((product) => (
                                            <Link
                                                key={product._id}
                                                to={`/product/${product.slug || product._id}`}
                                                className="flex gap-3 p-2 rounded-xl hover:bg-[#FAF7F4] transition-colors"
                                            >
                                                <img
                                                    src={product.images?.[0] || "/placeholder.png"}
                                                    alt={product.name}
                                                    className="w-16 h-16 object-cover rounded-lg"
                                                    onError={(e) => { e.target.src = "/placeholder.png"; }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-[#1C1108] line-clamp-2 leading-snug">{product.name}</p>
                                                    <p className="text-[#B86B05] font-bold text-sm mt-1">
                                                        {new Intl.NumberFormat("vi-VN").format(product.price)}đ
                                                    </p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Mobile Filters Panel */}
                    {showFilters && (
                        <div className="fixed inset-0 bg-black/40 z-50 lg:hidden">
                            <div className="absolute right-0 top-0 bottom-0 w-80 bg-white p-5 overflow-y-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-[#1C1108]">Bộ lọc</h3>
                                    <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-[#FAF7F4] rounded-lg transition-colors">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                {/* Categories */}
                                <div className="mb-6">
                                    <h4 className="font-semibold text-xs uppercase tracking-wider text-[#6B5C4C] mb-3">Danh mục</h4>
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => { updateFilter("category", "all"); setShowFilters(false); }}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${category === "all" ? "bg-[#B86B05] text-white" : "hover:bg-[#FAF7F4]"}`}
                                        >
                                            Tất cả sản phẩm
                                        </button>
                                        {categories.map((cat) => (
                                            <button
                                                key={cat.slug}
                                                onClick={() => { updateFilter("category", cat.slug); setShowFilters(false); }}
                                                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${category === cat.slug ? "bg-[#B86B05] text-white" : "hover:bg-[#FAF7F4]"}`}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Price Range */}
                                <div>
                                    <h4 className="font-semibold text-xs uppercase tracking-wider text-[#6B5C4C] mb-3">Khoảng giá</h4>
                                    <div className="space-y-1">
                                        {priceRanges.map((range) => (
                                            <button
                                                key={range.value}
                                                onClick={() => { updateFilter("price", range.value); setShowFilters(false); }}
                                                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${priceRange === range.value ? "bg-[#B86B05] text-white" : "hover:bg-[#FAF7F4]"}`}
                                            >
                                                {range.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Products Grid */}
                    <main className="flex-1">
                        {/* Mobile Filter Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#D5C9BC] rounded-xl mb-4 w-full text-sm font-medium text-[#6B5C4C]"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4.5 h-4.5">
                                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            Bộ lọc & Phân loại
                        </button>

                        {/* Products */}
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-xl overflow-hidden border border-[#EDE8E0] animate-pulse">
                                        <div className="aspect-square bg-[#EDE8E0]"></div>
                                        <div className="p-4 space-y-2">
                                            <div className="h-4 bg-[#EDE8E0] rounded w-3/4"></div>
                                            <div className="h-4 bg-[#EDE8E0] rounded w-1/2"></div>
                                            <div className="h-6 bg-[#EDE8E0] rounded w-1/3"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : products.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-[#EDE8E0] p-16 text-center">
                                <div className="text-6xl mb-4 select-none">🔍</div>
                                <h2 className="text-xl font-bold text-[#1C1108] mb-2">Không tìm thấy sản phẩm</h2>
                                <p className="text-sm text-[#A8896A] mb-6">Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                                <button
                                    onClick={clearFilters}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#B86B05] text-white font-semibold rounded-xl hover:bg-[#95520B] transition-colors"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {products.map((product) => (
                                        <ProductCard
                                            key={product._id}
                                            product={product}
                                            onAddToCart={handleAddToCart}
                                            wishlist={wishlist}
                                        />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="mt-10 flex flex-col items-center gap-4">
                                        <p className="text-sm text-[#A8896A]">
                                            Trang {currentPage} / {totalPages}
                                        </p>

                                        <div className="flex items-center gap-2">
                                            {/* Previous */}
                                            <button
                                                onClick={() => goToPage(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#D5C9BC] text-[#6B5C4C] hover:bg-[#FAF7F4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                    <path d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </button>

                                            {/* Page Numbers */}
                                            {getPageNumbers().map((pageNum) => (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => goToPage(pageNum)}
                                                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                                                        currentPage === pageNum
                                                            ? "bg-[#B86B05] text-white"
                                                            : "border border-[#D5C9BC] text-[#6B5C4C] hover:bg-[#FAF7F4]"
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            ))}

                                            {/* Next */}
                                            <button
                                                onClick={() => goToPage(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#D5C9BC] text-[#6B5C4C] hover:bg-[#FAF7F4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                    <path d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>

                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default ProductsPage;
