import { useState, useEffect } from "react";
import { getRecentlyViewedApi } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import ProductCard from "./productCard";

const RecentlyViewed = ({ limit = 8 }) => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentlyViewed();
    }, []);

    const fetchRecentlyViewed = async () => {
        try {
            const res = await getRecentlyViewedApi({ limit });
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
            <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-[#8B4513] rounded-full animate-spin"></div>
            </div>
        );
    }

    if (products.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span>🕐</span> Đã xem gần đây
                </h3>
                <button
                    onClick={() => navigate("/recently-viewed")}
                    className="text-[#8B4513] hover:text-[#A0522D] font-medium text-sm"
                >
                    Xem tất cả →
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {products.slice(0, limit).map((product) => (
                    <ProductCard key={product._id} product={product} />
                ))}
            </div>
        </div>
    );
};

export default RecentlyViewed;
