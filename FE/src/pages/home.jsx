import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getProductsApi, getBestSellersApi, getTrendingProductsApi, getCategoriesApi } from "../utils/api";
import ProductCard from "../components/common/productCard";

// Category Icons
const categoryIcons = {
    Chair: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
            <path d="M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4M5 11h14a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z" />
            <path d="M6 18v2M18 18v2" />
        </svg>
    ),
    Table: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
            <rect x="3" y="8" width="18" height="3" rx="1" />
            <path d="M5 11v8M19 11v8M8 19h8" />
        </svg>
    ),
    BookSelf: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
            <rect x="4" y="3" width="16" height="18" rx="1" />
            <path d="M4 8h16M4 13h16M4 18h16" />
        </svg>
    ),
    Sofa: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
            <path d="M4 12V8a2 2 0 012-2h12a2 2 0 012 2v4" />
            <rect x="2" y="12" width="20" height="5" rx="2" />
            <path d="M4 17v2M20 17v2" />
        </svg>
    ),
    Lamp: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
            <path d="M8 4h8l2 10a4 4 0 01-4 4h-2a4 4 0 01-4-4L8 4z" />
            <path d="M12 18v3M8 21h8" />
        </svg>
    )
};

// Star Rating Component
const StarRating = ({ rating = 4.5 }) => {
    return (
        <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
                <svg
                    key={i}
                    viewBox="0 0 24 24"
                    fill={i < Math.floor(rating) ? "#F59E0B" : "none"}
                    stroke={i < Math.floor(rating) ? "#F59E0B" : "#D1D5DB"}
                    strokeWidth="1.5"
                    className="w-4 h-4"
                >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ))}
        </div>
    );
};

const HomePage = () => {
    const [categories, setCategories] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categoryIndex, setCategoryIndex] = useState(0);
    const categoryScrollRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        console.log("Fetching home page data...");
        try {
            setLoading(true);
            const [categoriesRes, bestSellersRes, trendingRes] = await Promise.all([
                getCategoriesApi(),
                getBestSellersApi({ limit: 8 }),
                getTrendingProductsApi({ limit: 8 })
            ]);

            if (categoriesRes.success) {
                setCategories(categoriesRes.data.categories || []);
            }
            if (bestSellersRes.success) {
                setBestSellers(bestSellersRes.data.products || []);
            }
            if (trendingRes.success) {
                setTrending(trendingRes.data.products || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = () => {
        window.dispatchEvent(new Event("cart-updated"));
    };

    // Category carousel navigation
    const scrollLeft = () => {
        if (categoryScrollRef.current) {
            categoryScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
        }
        setCategoryIndex(prev => Math.max(0, prev - 1));
    };
    const scrollRight = () => {
        if (categoryScrollRef.current) {
            categoryScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
        }
        setCategoryIndex(prev => Math.min(categories.length - 1, prev + 1));
    };

    return (
        <div className="min-h-screen bg-[#FAF7F4]">
            {/* Hero Banner */}
            <section className="bg-gradient-to-br from-[#3a1d06] via-[#5c2e0a] to-[#8B4513] py-14 md:py-20 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-[#95520B]/20 rounded-full -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#DEB887]/10 rounded-full translate-y-1/2 -translate-x-1/4" />
                <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-[#BF4343]/10 rounded-full" />
                
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                        {/* Hero Content */}
                        <div className="flex-1 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full mb-6">
                                <span className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse" />
                                <span className="text-[#EDD9C0] text-xs font-medium">Miễn phí vận chuyển cho đơn từ 500.000đ</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
                                Thiết kế không gian<br />
                                <span className="text-[#DEB887]">hoàn hảo cho bạn</span>
                            </h1>
                            <p className="text-[#EDD9C0]/80 text-base md:text-lg mb-8 max-w-lg mx-auto lg:mx-0">
                                Furni - Giải pháp nội thất cao cấp, mang đến sự thoải mái và phong cách cho ngôi nhà của bạn.
                            </p>
                            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                                <Link to="/products" className="inline-flex items-center gap-2 px-7 py-3 bg-[#B86B05] text-white font-semibold rounded-xl hover:bg-[#95520B] transition-all shadow-lg shadow-[#B86B05]/30 active:scale-[0.98]">
                                    Mua sắm ngay
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </Link>
                                <Link to="/products?sort=-sold" className="inline-flex items-center gap-2 px-7 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/20 active:scale-[0.98]">
                                    Bán chạy nhất
                                </Link>
                            </div>
                        </div>

                        {/* Hero Image/Decoration */}
                        <div className="flex-1 relative max-w-md">
                            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-10 relative overflow-hidden border border-white/10">
                                <div className="relative z-10 text-center">
                                    <div className="text-9xl mb-4 select-none">🛋️</div>
                                    <p className="text-white font-medium text-lg">Nội thất cao cấp</p>
                                    <p className="text-[#EDD9C0]/60 text-sm mt-1">Hơn 500+ sản phẩm</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories Section */}
            <section className="py-10 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-[#1C1108]">DANH MỤC SẢN PHẨM</h2>
                            <p className="text-sm text-[#6B5C4C] mt-1">Khám phá bộ sưu tập đa dạng</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={scrollLeft}
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#FAF7F4] hover:bg-[#EDE8E0] text-[#6B5C4C] transition-colors disabled:opacity-40"
                                disabled={categoryIndex === 0}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4.5 h-4.5">
                                    <path d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={scrollRight}
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#FAF7F4] hover:bg-[#EDE8E0] text-[#6B5C4C] transition-colors disabled:opacity-40"
                                disabled={categoryIndex >= categories.length - 1}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4.5 h-4.5">
                                    <path d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Category Scroll */}
                    <div
                        ref={categoryScrollRef}
                        className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {categories.map((cat) => (
                            <Link
                                key={cat.slug}
                                to={`/category/${cat.slug}`}
                                className="shrink-0 bg-[#FAF7F4] rounded-2xl p-6 text-center hover:shadow-lg hover:shadow-[#B86B05]/10 hover:-translate-y-1 transition-all w-36 group"
                            >
                                <div className="w-14 h-14 bg-[#B86B05]/10 rounded-xl flex items-center justify-center mx-auto mb-3 text-[#B86B05] group-hover:bg-[#B86B05] group-hover:text-white transition-colors">
                                    {categoryIcons[cat.name] || (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
                                            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    )}
                                </div>
                                <p className="font-semibold text-sm text-[#1C1108]">{cat.name}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Best Sellers */}
            {bestSellers.length > 0 && (
                <section className="py-10">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold text-[#1C1108]">SẢN PHẨM BÁN CHẠY NHẤT</h2>
                                <p className="text-sm text-[#6B5C4C] mt-1">Top sản phẩm được yêu thích nhất</p>
                            </div>
                            <Link
                                to="/products?sort=-sold"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#B86B05] hover:text-[#95520B] transition-colors"
                            >
                                Xem tất cả
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {bestSellers.slice(0, 8).map((product) => (
                                <ProductCard
                                    key={product._id}
                                    product={product}
                                    onAddToCart={handleAddToCart}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Trending Products */}
            {trending.length > 0 && (
                <section className="py-10 bg-white">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold text-[#1C1108]">SẢN PHẨM NỔI BẬT</h2>
                                <p className="text-sm text-[#6B5C4C] mt-1">Xu hướng được quan tâm nhiều nhất</p>
                            </div>
                            <Link
                                to="/products?sort=-wishlistCount"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#B86B05] hover:text-[#95520B] transition-colors"
                            >
                                Xem tất cả
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {trending.slice(0, 8).map((product) => (
                                <ProductCard
                                    key={product._id}
                                    product={product}
                                    onAddToCart={handleAddToCart}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Features Section */}
            <section className="py-14 bg-[#FAF7F4]">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                        <div className="bg-white rounded-2xl p-6 text-center border border-[#EDE8E0] hover:shadow-lg hover:shadow-[#B86B05]/5 transition-shadow">
                            <div className="w-13 h-13 bg-[#B86B05]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#B86B05" strokeWidth="1.5" className="w-6 h-6">
                                    <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                    <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5-1.5L7 17v1a1 1 0 001 1h3m7-3H9l-3-3m0 0L4 16h11m5-3v3m0 0h3m-3 0l-3-3m3 3v-6m0 0l3 3m-3-3l-3 3" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-sm text-[#1C1108] mb-1">Miễn phí vận chuyển</h3>
                            <p className="text-xs text-[#A8896A]">Đơn hàng từ 500.000đ</p>
                        </div>
                        <div className="bg-white rounded-2xl p-6 text-center border border-[#EDE8E0] hover:shadow-lg hover:shadow-[#B86B05]/5 transition-shadow">
                            <div className="w-13 h-13 bg-[#B86B05]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#B86B05" strokeWidth="1.5" className="w-6 h-6">
                                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-sm text-[#1C1108] mb-1">Thanh toán an toàn</h3>
                            <p className="text-xs text-[#A8896A]">Bảo mật 100%</p>
                        </div>
                        <div className="bg-white rounded-2xl p-6 text-center border border-[#EDE8E0] hover:shadow-lg hover:shadow-[#B86B05]/5 transition-shadow">
                            <div className="w-13 h-13 bg-[#B86B05]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#B86B05" strokeWidth="1.5" className="w-6 h-6">
                                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-sm text-[#1C1108] mb-1">Đổi trả dễ dàng</h3>
                            <p className="text-xs text-[#A8896A]">Trong 30 ngày</p>
                        </div>
                        <div className="bg-white rounded-2xl p-6 text-center border border-[#EDE8E0] hover:shadow-lg hover:shadow-[#B86B05]/5 transition-shadow">
                            <div className="w-13 h-13 bg-[#B86B05]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#B86B05" strokeWidth="1.5" className="w-6 h-6">
                                    <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-sm text-[#1C1108] mb-1">Hỗ trợ 24/7</h3>
                            <p className="text-xs text-[#A8896A]">Hotline: 1900 1234</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
