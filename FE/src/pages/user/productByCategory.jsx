import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductsByCategoryApi, getCategoriesApi } from "../../utils/api";
import ProductCard from "../../components/common/productCard";

const ProductByCategoryPage = () => {
    const { slug } = useParams();
    const [products, setProducts] = useState([]);
    const [category, setCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [sort, setSort] = useState("createdAt");
    const [total, setTotal] = useState(0);
    const observerRef = useRef(null);
    const loadMoreRef = useRef(null);

    useEffect(() => {
        fetchCategory();
        fetchProducts(true);
    }, [slug, sort]);

    const fetchCategory = async () => {
        try {
            const res = await getCategoriesApi();
            if (res.success) {
                const cat = res.data.categories?.find(c => c.slug === slug);
                setCategory(cat || { name: "Danh mục" });
            }
        } catch (error) {
            console.error("Error fetching category:", error);
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
            const res = await getProductsByCategoryApi(slug, {
                page: currentPage,
                limit: 12,
                sort,
                order: sort === "createdAt" ? "desc" : "asc"
            });

            if (res.success) {
                if (reset) {
                    setProducts(res.data.products);
                    setPage(2);
                } else {
                    setProducts(prev => [...prev, ...res.data.products]);
                    setPage(prev => prev + 1);
                }
                setHasMore(res.data.pagination.hasMore);
                setTotal(res.data.pagination.total);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Lazy loading with Intersection Observer
    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    fetchProducts(false);
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasMore, loadingMore, products.length]);

    const handleSortChange = (newSort) => {
        setSort(newSort);
    };

    const handleAddToCart = () => {
        // Trigger re-fetch cart count in header
        window.dispatchEvent(new Event("cart-updated"));
    };

    return (
        <div className="min-h-screen bg-[#FAF7F4] py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-[#A8896A] mb-6">
                    <Link to="/" className="hover:text-[#B86B05] transition-colors">Trang chủ</Link>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M9 5l7 7-7 7" /></svg>
                    <span className="text-[#1C1108]">{category?.name || "Danh mục"}</span>
                </div>

                {/* Header */}
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-[#1C1108]">{category?.name || "Sản phẩm"}</h1>
                        <p className="text-sm text-[#A8896A] mt-1">Có {total.toLocaleString('vi-VN')} sản phẩm</p>
                    </div>
                    <select
                        value={sort}
                        onChange={(e) => handleSortChange(e.target.value)}
                        className="px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] bg-white text-sm"
                    >
                        <option value="createdAt">Mới nhất</option>
                        <option value="price">Giá thấp đến cao</option>
                        <option value="-price">Giá cao đến thấp</option>
                        <option value="-sold">Bán chạy nhất</option>
                        <option value="-averageRating">Đánh giá cao</option>
                    </select>
                </div>

                {/* Products Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl border border-[#EDE8E0] overflow-hidden animate-pulse">
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
                        <div className="text-6xl mb-4 select-none">📦</div>
                        <h2 className="text-xl font-bold text-[#1C1108] mb-2">Không có sản phẩm nào</h2>
                        <p className="text-sm text-[#A8896A]">Danh mục này hiện chưa có sản phẩm</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {products.map((product) => (
                                <ProductCard
                                    key={product._id}
                                    product={product}
                                    onAddToCart={handleAddToCart}
                                />
                            ))}
                        </div>

                        <div ref={loadMoreRef} className="mt-10 text-center">
                            {loadingMore && (
                                <div className="flex justify-center">
                                    <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin"></div>
                                </div>
                            )}
                            {!hasMore && products.length > 0 && (
                                <p className="text-sm text-[#A8896A] py-4">Đã hiển thị tất cả sản phẩm</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductByCategoryPage;
