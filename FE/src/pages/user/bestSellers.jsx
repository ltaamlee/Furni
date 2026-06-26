import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getBestSellersApi, getTrendingProductsApi } from "../../utils/api";
import ProductCard from "../../components/common/productCard";

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
        <div className="min-h-screen bg-[#FAF7F4] py-10">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#1C1108]">SẢN PHẨM NỔI BẬT</h1>
                    <p className="text-sm text-[#A8896A] mt-1">Khám phá những sản phẩm được yêu thích nhất</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {/* Best Sellers Section */}
                        <section className="mb-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                                    <span className="text-xl">🔥</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#1C1108]">Sản phẩm bán chạy nhất</h2>
                                    <p className="text-xs text-[#A8896A] mt-0.5">Những sản phẩm được mua nhiều nhất</p>
                                </div>
                            </div>

                            {bestSellers.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-[#EDE8E0] p-8 text-center">
                                    <p className="text-sm text-[#A8896A]">Chưa có sản phẩm bán chạy</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
                                        {bestSellers.slice(0, 8).map((product) => (
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
                        <section className="mb-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                                    <span className="text-xl">👀</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#1C1108]">Sản phẩm xem nhiều nhất</h2>
                                    <p className="text-xs text-[#A8896A] mt-0.5">Những sản phẩm được quan tâm nhiều nhất</p>
                                </div>
                            </div>

                            {trending.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-[#EDE8E0] p-8 text-center">
                                    <p className="text-sm text-[#A8896A]">Chưa có sản phẩm được xem</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
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

                        {/* Top Rated Section */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                                    <span className="text-xl">⭐</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#1C1108]">Sản phẩm được đánh giá cao</h2>
                                    <p className="text-xs text-[#A8896A] mt-0.5">Những sản phẩm có điểm rating cao nhất</p>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
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
