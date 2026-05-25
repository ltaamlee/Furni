import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductsByCategoryApi, getCategoriesApi } from "../../utils/api";
import ProductCard from "../../components/common/productCard";

const ProductByCategoryPage = () => {
    const { categoryId } = useParams();
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
    }, [categoryId, sort]);

    const fetchCategory = async () => {
        try {
            const res = await getCategoriesApi();
            if (res.success) {
                const cat = res.data.categories?.find(c => c._id === categoryId);
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
            const res = await getProductsByCategoryApi(categoryId, {
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
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Breadcrumb */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Link to="/" className="hover:text-green-600">Trang chủ</Link>
                        <span>/</span>
                        <span className="text-gray-700">{category?.name || "Danh mục"}</span>
                    </div>
                </div>

                {/* Header */}
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {category?.name || "Sản phẩm"}
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Có {total} sản phẩm
                        </p>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">Sắp xếp:</span>
                        <select
                            value={sort}
                            onChange={(e) => handleSortChange(e.target.value)}
                            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                        >
                            <option value="createdAt">Mới nhất</option>
                            <option value="price">Giá thấp đến cao</option>
                            <option value="-price">Giá cao đến thấp</option>
                            <option value="-sold">Bán chạy nhất</option>
                            <option value="-averageRating">Đánh giá cao</option>
                        </select>
                    </div>
                </div>

                {/* Products Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
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
                        <div className="text-6xl mb-4">📦</div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">
                            Không có sản phẩm nào
                        </h2>
                        <p className="text-gray-500">Danh mục này hiện chưa có sản phẩm</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.map((product) => (
                                <ProductCard
                                    key={product._id}
                                    product={product}
                                    onAddToCart={handleAddToCart}
                                />
                            ))}
                        </div>

                        {/* Load More Trigger */}
                        <div ref={loadMoreRef} className="mt-8 text-center">
                            {loadingMore && (
                                <div className="flex justify-center">
                                    <div className="w-10 h-10 border-4 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
                                </div>
                            )}
                            {!hasMore && products.length > 0 && (
                                <p className="text-gray-500">Đã hiển thị tất cả sản phẩm</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductByCategoryPage;
