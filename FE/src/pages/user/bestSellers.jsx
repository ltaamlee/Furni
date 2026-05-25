import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getBestSellersApi, getTrendingProductsApi, getCategoriesApi } from "../../utils/api";
import ProductCard from "../../components/common/ProductCard";

const BestSellersPage = () => {
    const [bestSellers, setBestSellers] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [bestSellersRes, trendingRes] = await Promise.all([
                getBestSellersApi({ limit: 20 }),
                getTrendingProductsApi({ limit: 20 })
            ]);

            if (bestSellersRes.success) {
                setBestSellers(bestSellersRes.data.products);
            }
            if (trendingRes.success) {
                setTrending(trendingRes.data.products);
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
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">SẢN PHẨM NỔI BẬT</h1>
                    <p className="text-gray-500 mt-2">Khám phá những sản phẩm được yêu thích nhất</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {/* Best Sellers Section */}
                        <section className="mb-12">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-3xl">🔥</span>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">Sản phẩm bán chạy nhất</h2>
                                    <p className="text-sm text-gray-500">Những sản phẩm được mua nhiều nhất</p>
                                </div>
                            </div>

                            {bestSellers.length === 0 ? (
                                <div className="bg-white rounded-2xl p-8 text-center">
                                    <p className="text-gray-500">Chưa có sản phẩm bán chạy</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    {/* Horizontal Scroll Container */}
                                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                        {bestSellers.map((product) => (
                                            <div key={product._id} className="flex-shrink-0 w-64">
                                                <ProductCard
                                                    product={product}
                                                    onAddToCart={handleAddToCart}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Trending Section */}
                        <section className="mb-12">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-3xl">👀</span>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">Sản phẩm xem nhiều nhất</h2>
                                    <p className="text-sm text-gray-500">Những sản phẩm được quan tâm nhiều nhất</p>
                                </div>
                            </div>

                            {trending.length === 0 ? (
                                <div className="bg-white rounded-2xl p-8 text-center">
                                    <p className="text-gray-500">Chưa có sản phẩm được xem</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    {/* Horizontal Scroll Container */}
                                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                        {trending.map((product) => (
                                            <div key={product._id} className="flex-shrink-0 w-64">
                                                <ProductCard
                                                    product={product}
                                                    onAddToCart={handleAddToCart}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Top Rated Section - Combined from both */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-3xl">⭐</span>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">Sản phẩm được đánh giá cao</h2>
                                    <p className="text-sm text-gray-500">Những sản phẩm có điểm rating cao nhất</p>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                    {[...bestSellers, ...trending]
                                        .filter(p => p.averageRating >= 4)
                                        .sort((a, b) => b.averageRating - a.averageRating)
                                        .slice(0, 10)
                                        .map((product) => (
                                            <div key={product._id} className="flex-shrink-0 w-64">
                                                <ProductCard
                                                    product={product}
                                                    onAddToCart={handleAddToCart}
                                                />
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default BestSellersPage;
