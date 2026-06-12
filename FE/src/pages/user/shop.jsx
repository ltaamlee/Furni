import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getShopApi, getShopProductsApi } from "../../utils/api";
import ProductCard from "../../components/common/productCard";

const sortOptions = [
    { value: "-createdAt", label: "Mới nhất" },
    { value: "price", label: "Giá: Thấp → Cao" },
    { value: "-price", label: "Giá: Cao → Thấp" },
    { value: "-sold", label: "Bán chạy nhất" },
    { value: "-averageRating", label: "Đánh giá cao" },
];

const ShopPage = () => {
    const { id } = useParams();
    const [shop, setShop] = useState(null);
    const [stats, setStats] = useState({ productCount: 0, totalSold: 0 });
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [sort, setSort] = useState("-createdAt");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        let active = true;
        const fetchShop = async () => {
            try {
                setLoading(true);
                const res = await getShopApi(id);
                if (active && res.success) {
                    setShop(res.data.shop);
                    setStats(res.data.stats || { productCount: 0, totalSold: 0 });
                }
            } catch {
                if (active) setShop(null);
            } finally {
                if (active) setLoading(false);
            }
        };
        fetchShop();
        return () => { active = false; };
    }, [id]);

    // Tải sản phẩm theo _id thật của shop (hỗ trợ URL là slug hoặc id)
    const shopId = shop?._id;
    useEffect(() => {
        if (!shopId) return;
        let active = true;
        const fetchProducts = async () => {
            try {
                setLoadingProducts(true);
                const res = await getShopProductsApi(shopId, { page, limit: 12, sort });
                if (active && res.success) {
                    setProducts(res.data.products || []);
                    setPages(res.data.pagination?.pages || 1);
                    setTotal(res.data.pagination?.total || 0);
                }
            } catch {
                if (active) setProducts([]);
            } finally {
                if (active) setLoadingProducts(false);
            }
        };
        fetchProducts();
        return () => { active = false; };
    }, [shopId, page, sort]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-[#8B4513] rounded-full animate-spin" />
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
                <div className="text-center">
                    <div className="text-6xl mb-4">🏬</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Không tìm thấy cửa hàng</h2>
                    <Link to="/" className="text-[#8B4513] hover:underline mt-4 inline-block">Về trang chủ</Link>
                </div>
            </div>
        );
    }

    const shopInitial = shop.name?.charAt(0)?.toUpperCase() || "S";

    return (
        <div className="min-h-screen bg-[#F5F5F0]">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Link to="/" className="hover:text-[#8B4513]">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-gray-800">{shop.name}</span>
                </nav>

                {/* Shop header / banner */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
                    {/* Banner — avatar nằm đè lên trang bìa (góc dưới trái) */}
                    <div className="h-44 sm:h-60 w-full relative bg-gradient-to-r from-[#8B4513] to-[#A0522D]">
                        {shop.banner && (
                            <img src={shop.banner} alt={`${shop.name} banner`} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute left-6 bottom-4">
                            {shop.logo ? (
                                <img src={shop.logo} alt={shop.name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white shadow-lg bg-white" />
                            ) : (
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#8B4513] border-4 border-white shadow-lg flex items-center justify-center text-white text-4xl font-bold">
                                    {shopInitial}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info bar */}
                    <div className="px-6 pb-6 pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-2xl font-bold text-gray-800">{shop.name}</h1>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    {shop.isActive === false ? "Tạm nghỉ" : "Đang hoạt động"}
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <div className="text-center">
                                    <div className="text-xl font-bold text-[#8B4513]">{stats.productCount}</div>
                                    <div className="text-xs text-gray-500">Sản phẩm</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl font-bold text-[#8B4513]">{stats.totalSold}</div>
                                    <div className="text-xs text-gray-500">Đã bán</div>
                                </div>
                            </div>
                        </div>

                        {/* Contact / description */}
                        {(shop.description || shop.address || shop.phone) && (
                            <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
                                {shop.description && <p className="sm:col-span-2 leading-relaxed">{shop.description}</p>}
                                {shop.address && (
                                    <div className="flex items-center gap-2">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-[#8B4513] flex-shrink-0">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                                        </svg>
                                        {shop.address}
                                    </div>
                                )}
                                {shop.phone && (
                                    <div className="flex items-center gap-2">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-[#8B4513] flex-shrink-0">
                                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                                        </svg>
                                        {shop.phone}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Products */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                        <h2 className="text-lg font-bold text-gray-800">
                            Sản phẩm của shop {total > 0 && <span className="text-gray-400 font-normal">({total})</span>}
                        </h2>
                        <select
                            value={sort}
                            onChange={(e) => { setSort(e.target.value); setPage(1); }}
                            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B4513] bg-white"
                        >
                            {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {loadingProducts ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="bg-gray-100 rounded-xl aspect-[3/4] animate-pulse" />
                            ))}
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <div className="text-5xl mb-3">📦</div>
                            Cửa hàng chưa có sản phẩm nào.
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {products.map((p) => (
                                    <ProductCard key={p._id} product={p} onAddToCart={() => window.dispatchEvent(new Event("cart-updated"))} />
                                ))}
                            </div>

                            {pages > 1 && (
                                <div className="flex items-center justify-center gap-3 mt-8">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                        className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-[#8B4513]"
                                    >
                                        ‹ Trước
                                    </button>
                                    <span className="text-sm text-gray-600">Trang {page} / {pages}</span>
                                    <button
                                        onClick={() => setPage((p) => Math.min(pages, p + 1))}
                                        disabled={page >= pages}
                                        className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-[#8B4513]"
                                    >
                                        Sau ›
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShopPage;
