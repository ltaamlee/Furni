import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getProductsApi, getBestSellersApi, getTrendingProductsApi, getCategoriesApi } from "../utils/api";
import ProductCard from "../components/common/productCard";

const HomePage = () => {
    const [categories, setCategories] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Banner */}
            <section className="bg-gradient-to-r from-amber-900 to-orange-800 text-white py-16">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="text-center md:text-left">
                            <h1 className="text-4xl md:text-5xl font-bold mb-4">
                                Nội Thất Cao Cấp
                            </h1>
                            <p className="text-lg text-amber-200 mb-6">
                                Thiết kế hiện đại - Chất lượng vượt trội
                            </p>
                            <Link
                                to="/best-sellers"
                                className="inline-block bg-white text-amber-900 px-8 py-3 rounded-full font-bold hover:bg-amber-100 transition"
                            >
                                Khám phá ngay →
                            </Link>
                        </div>
                        <div className="text-8xl">🛋️</div>
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section className="py-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">DANH MỤC SẢN PHẨM</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {loading ? (
                            [...Array(6)].map((_, i) => (
                                <div key={i} className="bg-white rounded-xl p-6 text-center animate-pulse">
                                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3"></div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                                </div>
                            ))
                        ) : (
                            categories.map((category) => (
                                <Link
                                    key={category._id}
                                    to={`/category/${category._id}`}
                                    className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition hover:-translate-y-1"
                                >
                                    <div className="text-4xl mb-3">
                                        {category.name?.includes("Bàn") ? "🪑" :
                                         category.name?.includes("Ghế") ? "🪑" :
                                         category.name?.includes("Giường") ? "🛏️" :
                                         category.name?.includes("Tủ") ? "🗄️" :
                                         category.name?.includes("Đèn") ? "💡" :
                                         category.name?.includes("Kệ") ? "📚" : "🏠"}
                                    </div>
                                    <p className="font-medium text-gray-800 line-clamp-1">{category.name}</p>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Best Sellers */}
            {bestSellers.length > 0 && (
                <section className="py-8 bg-white">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🔥</span>
                                <h2 className="text-2xl font-bold text-gray-800">Sản phẩm bán chạy</h2>
                            </div>
                            <Link
                                to="/best-sellers"
                                className="text-green-600 hover:text-green-700 font-medium"
                            >
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                <section className="py-8">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">👀</span>
                                <h2 className="text-2xl font-bold text-gray-800">Sản phẩm được xem nhiều</h2>
                            </div>
                            <Link
                                to="/best-sellers"
                                className="text-green-600 hover:text-green-700 font-medium"
                            >
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

            {/* Features */}
            <section className="py-12 bg-white mt-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="text-center p-6">
                            <div className="text-4xl mb-3">🚚</div>
                            <h3 className="font-bold text-gray-800 mb-1">Miễn phí vận chuyển</h3>
                            <p className="text-sm text-gray-500">Đơn hàng từ 500.000đ</p>
                        </div>
                        <div className="text-center p-6">
                            <div className="text-4xl mb-3">🔒</div>
                            <h3 className="font-bold text-gray-800 mb-1">Thanh toán an toàn</h3>
                            <p className="text-sm text-gray-500">100% secure payment</p>
                        </div>
                        <div className="text-center p-6">
                            <div className="text-4xl mb-3">↩️</div>
                            <h3 className="font-bold text-gray-800 mb-1">Đổi trả dễ dàng</h3>
                            <p className="text-sm text-gray-500">Trong 7 ngày</p>
                        </div>
                        <div className="text-center p-6">
                            <div className="text-4xl mb-3">💬</div>
                            <h3 className="font-bold text-gray-800 mb-1">Hỗ trợ 24/7</h3>
                            <p className="text-sm text-gray-500">Hotline: 1900 1234</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12 mt-12">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-amber-700 rounded-lg flex items-center justify-center font-bold">
                                    FU
                                </div>
                                <span className="font-bold text-xl">Furni</span>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Nội thất cao cấp cho không gian sống hoàn hảo của bạn.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Liên kết</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><Link to="/" className="hover:text-white">Trang chủ</Link></li>
                                <li><Link to="/best-sellers" className="hover:text-white">Sản phẩm nổi bật</Link></li>
                                <li><Link to="/orders" className="hover:text-white">Đơn hàng</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Hỗ trợ</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li>Hotline: 1900 1234</li>
                                <li>Email: support@furni.com</li>
                                <li>Địa chỉ: 123 Đường ABC, TP.HCM</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Theo dõi</h4>
                            <div className="flex gap-3">
                                <span className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer">📘</span>
                                <span className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer">📸</span>
                                <span className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer">📺</span>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
                        © {new Date().getFullYear()} Furni. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
