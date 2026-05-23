import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getProductsApi, getCategoriesApi, getBestSellersApi } from "../utils/api";
import ProductCard from "../components/common/productCard";

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

const ProductsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const loadMoreRef = useRef(null);
    const observerRef = useRef(null);

    // Filter states from URL params
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "all";
    const priceRange = searchParams.get("price") || "all";
    const sort = searchParams.get("sort") || "-createdAt";

    useEffect(() => {
        fetchCategories();
        fetchBestSellers();
    }, []);

    useEffect(() => {
        fetchProducts(true);
    }, [search, category, priceRange, sort]);

    useEffect(() => {
        setupIntersectionObserver();
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasMore, loadingMore, products.length]);

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

    const fetchProducts = async (reset = false) => {
        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const currentPage = reset ? 1 : page;
            const params = {
                page: currentPage,
                limit: 12,
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
                if (reset) {
                    setProducts(res.data.products || []);
                    setPage(2);
                } else {
                    setProducts(prev => [...prev, ...(res.data.products || [])]);
                    setPage(prev => prev + 1);
                }
                setHasMore(res.data.pagination?.hasMore ?? false);
                setTotal(res.data.pagination?.total ?? res.data.products?.length ?? 0);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const setupIntersectionObserver = () => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                    fetchProducts(false);
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }
    };

    const updateFilter = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (value && value !== "all" && value !== "-createdAt") {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams);
    };

    const clearFilters = () => {
        setSearchParams({});
    };

    const handleAddToCart = () => {
        window.dispatchEvent(new Event("cart-updated"));
    };

    const hasActiveFilters = search || (category && category !== "all") || (priceRange && priceRange !== "all");

    return (
        <div className="min-h-screen bg-[#F5F5F0]">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Breadcrumb */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Link to="/" className="hover:text-[#8B4513]">Trang chủ</Link>
                        <span>/</span>
                        <span className="text-gray-700">Sản phẩm</span>
                        {search && (
                            <>
                                <span>/</span>
                                <span className="text-[#8B4513]">"{search}"</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-gray-600">
                            {loading ? "Đang tải..." : `Có ${total} sản phẩm`}
                        </p>

                        {/* Sort Select */}
                        <select
                            value={sort}
                            onChange={(e) => updateFilter("sort", e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B4513] bg-white min-w-[180px]"
                        >
                            {sortOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        {/* Filter Toggle (Mobile) */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="md:hidden flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            Bộ lọc
                        </button>
                    </div>

                    {/* Filter Pills */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
                            <span className="text-sm text-gray-500">Lọc:</span>
                            {search && (
                                <span className="flex items-center gap-1 px-3 py-1 bg-[#8B4513]/10 text-[#8B4513] rounded-full text-sm">
                                    "{search}"
                                    <button onClick={() => updateFilter("search", "")} className="ml-1">×</button>
                                </span>
                            )}
                            {category && category !== "all" && (
                                <span className="flex items-center gap-1 px-3 py-1 bg-[#8B4513]/10 text-[#8B4513] rounded-full text-sm">
                                    {categories.find(c => c._id === category)?.name || category}
                                    <button onClick={() => updateFilter("category", "all")} className="ml-1">×</button>
                                </span>
                            )}
                            {priceRange && priceRange !== "all" && (
                                <span className="flex items-center gap-1 px-3 py-1 bg-[#8B4513]/10 text-[#8B4513] rounded-full text-sm">
                                    {priceRanges.find(p => p.value === priceRange)?.label}
                                    <button onClick={() => updateFilter("price", "all")} className="ml-1">×</button>
                                </span>
                            )}
                            <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-600">
                                Xóa tất cả
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex gap-6">
                    {/* Sidebar Filters - Desktop */}
                    <aside className="hidden md:block w-64 flex-shrink-0">
                        <div className="bg-white rounded-2xl shadow-sm p-4 sticky top-24">
                            {/* Categories */}
                            <div className="mb-6">
                                <h3 className="font-bold text-gray-800 mb-3">DANH MỤC</h3>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => updateFilter("category", "all")}
                                        className={`w-full text-left px-3 py-2 rounded-lg transition ${
                                            category === "all" 
                                                ? "bg-[#8B4513] text-white" 
                                                : "hover:bg-gray-100 text-gray-600"
                                        }`}
                                    >
                                        Tất cả sản phẩm
                                    </button>
                                    {categories.map((cat) => (
                                        <button
                                            key={cat._id}
                                            onClick={() => updateFilter("category", cat._id)}
                                            className={`w-full text-left px-3 py-2 rounded-lg transition ${
                                                category === cat._id 
                                                    ? "bg-[#8B4513] text-white" 
                                                    : "hover:bg-gray-100 text-gray-600"
                                            }`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range */}
                            <div className="mb-6">
                                <h3 className="font-bold text-gray-800 mb-3">KHOẢNG GIÁ</h3>
                                <div className="space-y-1">
                                    {priceRanges.map((range) => (
                                        <button
                                            key={range.value}
                                            onClick={() => updateFilter("price", range.value)}
                                            className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
                                                priceRange === range.value 
                                                    ? "bg-[#8B4513] text-white" 
                                                    : "hover:bg-gray-100 text-gray-600"
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
                                    <h3 className="font-bold text-gray-800 mb-3">BÁN CHẠY</h3>
                                    <div className="space-y-3">
                                        {bestSellers.slice(0, 3).map((product) => (
                                            <Link
                                                key={product._id}
                                                to={`/product/${product._id}`}
                                                className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
                                            >
                                                <img
                                                    src={product.images?.[0] || "/placeholder.png"}
                                                    alt={product.name}
                                                    className="w-16 h-16 object-cover rounded-lg"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 line-clamp-2">{product.name}</p>
                                                    <p className="text-[#8B4513] font-bold text-sm mt-1">
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
                        <div className="fixed inset-0 bg-black/50 z-50 md:hidden">
                            <div className="absolute right-0 top-0 bottom-0 w-80 bg-white p-4 overflow-y-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-lg">Bộ lọc</h3>
                                    <button onClick={() => setShowFilters(false)} className="p-2">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                                            <path d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Categories */}
                                <div className="mb-6">
                                    <h4 className="font-semibold text-gray-800 mb-3">DANH MỤC</h4>
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => { updateFilter("category", "all"); setShowFilters(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-lg ${category === "all" ? "bg-[#8B4513] text-white" : "hover:bg-gray-100"}`}
                                        >
                                            Tất cả sản phẩm
                                        </button>
                                        {categories.map((cat) => (
                                            <button
                                                key={cat._id}
                                                onClick={() => { updateFilter("category", cat._id); setShowFilters(false); }}
                                                className={`w-full text-left px-3 py-2 rounded-lg ${category === cat._id ? "bg-[#8B4513] text-white" : "hover:bg-gray-100"}`}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Price Range */}
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-3">KHOẢNG GIÁ</h4>
                                    <div className="space-y-1">
                                        {priceRanges.map((range) => (
                                            <button
                                                key={range.value}
                                                onClick={() => { updateFilter("price", range.value); setShowFilters(false); }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${priceRange === range.value ? "bg-[#8B4513] text-white" : "hover:bg-gray-100"}`}
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
                        {/* Results Header */}
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-gray-600">
                                {loading ? "Đang tải..." : `Có ${total} sản phẩm`}
                            </p>
                        </div>

                        {/* Products */}
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse">
                                        <div className="aspect-square bg-gray-200"></div>
                                        <div className="p-4 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : products.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 text-center">
                                <div className="text-6xl mb-4">🔍</div>
                                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                                    Không tìm thấy sản phẩm
                                </h2>
                                <p className="text-gray-500 mb-6">
                                    Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
                                </p>
                                <button
                                    onClick={clearFilters}
                                    className="bg-[#8B4513] text-white px-6 py-3 rounded-full hover:bg-[#A0522D] transition"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {products.map((product) => (
                                        <ProductCard
                                            key={product._id}
                                            product={product}
                                            onAddToCart={handleAddToCart}
                                        />
                                    ))}
                                </div>

                                {/* Load More */}
                                <div ref={loadMoreRef} className="mt-8 text-center">
                                    {loadingMore && (
                                        <div className="flex justify-center">
                                            <div className="w-10 h-10 border-4 border-gray-300 border-t-[#8B4513] rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    {!hasMore && products.length > 0 && (
                                        <p className="text-gray-500 py-4">Đã hiển thị tất cả sản phẩm</p>
                                    )}
                                </div>
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default ProductsPage;
