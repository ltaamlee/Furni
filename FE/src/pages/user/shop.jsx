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
        <div className="min-h-screen bg-[#FAF7F4] py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-[#A8896A] mb-4">
                    <Link to="/" className="hover:text-[#B86B05] transition-colors">Trang chủ</Link>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M9 5l7 7-7 7" /></svg>
                    <span className="text-[#1C1108]">{shop.name}</span>
                </nav>

                {/* Shop header / banner */}
                <div className="bg-white rounded-2xl border border-[#EDE8E0] overflow-hidden mb-6">
                    <div className="h-44 sm:h-56 w-full relative bg-gradient-to-br from-[#3a1d06] via-[#5c2e0a] to-[#8B4513]">
                        {shop.banner && (
                            <img src={shop.banner} alt={`${shop.name} banner`} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute left-6 bottom-4">
                            {shop.logo ? (
                                <img src={shop.logo} alt={shop.name} className="w-22 h-22 sm:w-26 sm:h-26 rounded-2xl object-cover border-4 border-white shadow-xl bg-white" />
                            ) : (
                                <div className="w-22 h-22 sm:w-26 sm:h-26 rounded-2xl bg-[#B86B05] border-4 border-white shadow-xl flex items-center justify-center text-white text-4xl font-bold">
                                    {shopInitial}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="px-6 pb-6 pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-2xl font-bold text-[#1C1108]">{shop.name}</h1>
                                <div className="flex items-center gap-2 text-sm text-[#6B5C4C] mt-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    {shop.isActive === false ? "Tạm nghỉ" : "Đang hoạt động"}
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <div className="text-center">
                                    <div className="text-xl font-extrabold text-[#B86B05]">{stats.productCount}</div>
                                    <div className="text-xs text-[#A8896A]">Sản phẩm</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl font-extrabold text-[#B86B05]">{stats.totalSold}</div>
                                    <div className="text-xs text-[#A8896A]">Đã bán</div>
                                </div>
                            </div>
                        </div>

                        {(shop.description || shop.address || shop.phone) && (
                            <div className="mt-4 pt-4 border-t border-[#EDE8E0] grid sm:grid-cols-2 gap-3 text-sm text-[#6B5C4C]">
                                {shop.description && <p className="sm:col-span-2 leading-relaxed">{shop.description}</p>}
                                {shop.address && (
                                    <div className="flex items-center gap-2">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="#B86B05" strokeWidth="2" className="w-4 h-4 shrink-0">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                                        </svg>
                                        {shop.address}
                                    </div>
                                )}
                                {shop.phone && (
                                    <div className="flex items-center gap-2">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="#B86B05" strokeWidth="2" className="w-4 h-4 shrink-0">
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
                <div className="bg-white rounded-2xl border border-[#EDE8E0] p-6">
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                        <h2 className="text-base font-bold text-[#1C1108]">
                            Sản phẩm của shop {total > 0 && <span className="text-[#A8896A] font-normal">({total.toLocaleString('vi-VN')})</span>}
                        </h2>
                        <select
                            value={sort}
                            onChange={(e) => { setSort(e.target.value); setPage(1); }}
                            className="px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] bg-white text-sm"
                        >
                            {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {loadingProducts ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="bg-[#EDE8E0] rounded-xl aspect-[3/4] animate-pulse" />
                            ))}
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-16 text-[#A8896A]">
                            <div className="text-5xl mb-3 select-none">📦</div>
                            Cửa hàng chưa có sản phẩm nào.
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                {products.map((p) => (
                                    <ProductCard key={p._id} product={p} onAddToCart={() => window.dispatchEvent(new Event("cart-updated"))} />
                                ))}
                            </div>

                            {pages > 1 && (
                                <div className="flex items-center justify-center gap-3 mt-8">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                        className="px-4 py-2 border border-[#D5C9BC] text-[#6B5C4C] rounded-xl disabled:opacity-40 hover:border-[#B86B05] hover:text-[#B86B05] transition-colors text-sm"
                                    >
                                        ‹ Trước
                                    </button>
                                    <span className="text-sm text-[#A8896A]">Trang {page} / {pages}</span>
                                    <button
                                        onClick={() => setPage((p) => Math.min(pages, p + 1))}
                                        disabled={page >= pages}
                                        className="px-4 py-2 border border-[#D5C9BC] text-[#6B5C4C] rounded-xl disabled:opacity-40 hover:border-[#B86B05] hover:text-[#B86B05] transition-colors text-sm"
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
