import { useState, useEffect } from "react";
import { getRecentlyViewedApi } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import ProductCard from "./productCard";

const RecentlyViewedPage = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentlyViewed();
    }, []);

    const fetchRecentlyViewed = async () => {
        try {
            setLoading(true);
            const res = await getRecentlyViewedApi({ limit: 50 });
            if (res.success) {
                setProducts(res.data.products);
            }
        } catch (error) {
            console.error("Error fetching recently viewed:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-[#8B4513] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F0]">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">SẢN PHẨM ĐÃ XEM</h1>
                    <p className="text-gray-500">Những sản phẩm bạn đã xem gần đây</p>
                </div>

                {products.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <div className="text-6xl mb-4">🕐</div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Chưa có sản phẩm nào</h2>
                        <p className="text-gray-500 mb-6">Hãy khám phá và xem các sản phẩm!</p>
                        <button
                            onClick={() => navigate("/products")}
                            className="bg-[#8B4513] text-white px-6 py-3 rounded-full hover:bg-[#A0522D] transition"
                        >
                            Khám phá sản phẩm
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {products.map((product) => (
                                <ProductCard key={product._id} product={product} />
                            ))}
                        </div>
                        
                        <div className="text-center mt-8">
                            <p className="text-gray-500 text-sm">
                                Hiển thị {products.length} sản phẩm đã xem gần đây
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default RecentlyViewedPage;
