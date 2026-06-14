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
        <div className="min-h-screen bg-[#F5F5F0]">
            {/* Hero Banner */}
            <section className="bg-linear-to-r from-[#8B4513] via-[#A0522D] to-[#CD853F] py-12 md:py-16">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col lg:flex-row items-center gap-8">
                        {/* Hero Content */}
                        <div className="flex-1 text-center lg:text-left">
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                                Transform Your Home<br />with Sorature
                            </h1>
                            <p className="text-lg text-white/80 mb-6">
                                Sora - Giải pháp hoàn hảo cho không gian sống của bạn
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                                <button className="bg-white text-[#8B4513] px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition shadow-lg">
                                    Mua sắm ngay
                                </button>
                                <button className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-bold hover:bg-white/10 transition">
                                    Khám phá
                                </button>
                            </div>
                        </div>

                        {/* Hero Image/Decoration */}
                        <div className="flex-1 relative">
                            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D2691E] rounded-full opacity-50 -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#DEB887] rounded-full opacity-50 translate-y-1/2 -translate-x-1/2" />
                                <div className="relative z-10 text-center">
                                    <div className="text-8xl mb-4">🛋️</div>
                                    <p className="text-white font-medium">Nội thất cao cấp</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories Section */}
            <section className="py-8 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">DANH MỤC</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={scrollLeft}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
                                disabled={categoryIndex === 0}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                    <path d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={scrollRight}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
                                disabled={categoryIndex >= categories.length - 1}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                    <path d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Category Scroll */}
                    <div
                        ref={categoryScrollRef}
                        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {categories.map((cat) => (
                            <Link
                                key={cat.slug}
                                to={`/category/${cat.slug}`}
                                className="shrink-0 bg-[#FAF8F5] rounded-xl p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1 w-32"
                            >
                                <div className="text-[#8B4513] mb-3 flex justify-center">
                                    {categoryIcons[cat.name] || (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
                                            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    )}
                                </div>
                                <p className="font-semibold text-gray-800">{cat.name}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Best Sellers */}
            {bestSellers.length > 0 && (
                <section className="py-8">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">SẢN PHẨM BÁN CHẠY NHẤT</h2>
                            <Link
                                to="/best-sellers"
                                className="text-[#8B4513] hover:text-[#A0522D] font-medium transition"
                            >
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                <section className="py-8 bg-white">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">SẢN PHẨM NỔI BẬT</h2>
                            <Link
                                to="/products"
                                className="text-[#8B4513] hover:text-[#A0522D] font-medium transition"
                            >
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
            <section className="py-12 bg-[#FAF8F5]">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                            <div className="w-14 h-14 bg-[#8B4513]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#8B4513" strokeWidth="1.5" className="w-7 h-7">
                                    <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                    <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5-1.5L7 17v1a1 1 0 001 1h3m7-3H9l-3-3m0 0L4 16h11m5-3v3m0 0h3m-3 0l-3-3m3 3v-6m0 0l3 3m-3-3l-3 3" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-gray-800 mb-1">Miễn phí vận chuyển</h3>
                            <p className="text-sm text-gray-500">Đơn hàng từ 500.000đ</p>
                        </div>
                        <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                            <div className="w-14 h-14 bg-[#8B4513]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#8B4513" strokeWidth="1.5" className="w-7 h-7">
                                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-gray-800 mb-1">Thanh toán an toàn</h3>
                            <p className="text-sm text-gray-500">100% secure payment</p>
                        </div>
                        <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                            <div className="w-14 h-14 bg-[#8B4513]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#8B4513" strokeWidth="1.5" className="w-7 h-7">
                                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-gray-800 mb-1">Đổi trả dễ dàng</h3>
                            <p className="text-sm text-gray-500">Trong 30 ngày</p>
                        </div>
                        <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                            <div className="w-14 h-14 bg-[#8B4513]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#8B4513" strokeWidth="1.5" className="w-7 h-7">
                                    <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-gray-800 mb-1">Hỗ trợ 24/7</h3>
                            <p className="text-sm text-gray-500">Hotline: 1900 1234</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
