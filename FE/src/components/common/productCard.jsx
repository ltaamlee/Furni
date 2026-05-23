import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addToCartApi } from "../../utils/api";
import { useToast } from "../../components/context/ToastContext";

const StarRating = ({ rating = 5 }) => {
    return (
        <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
                <svg
                    key={i}
                    viewBox="0 0 24 24"
                    fill={i < Math.floor(rating) ? "#F59E0B" : "none"}
                    stroke={i < Math.floor(rating) ? "#F59E0B" : "#D1D5DB"}
                    strokeWidth="1.5"
                    className="w-3 h-3"
                >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ))}
        </div>
    );
};

const ProductCard = ({ product, onAddToCart }) => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [adding, setAdding] = useState(false);

    const getToken = () => localStorage.getItem("access_token");

    const formatPrice = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    const handleAddToCart = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const token = getToken();
        if (!token) {
            if (confirm("Bạn cần đăng nhập để thêm vào giỏ hàng. Đăng nhập ngay?")) {
                navigate("/login");
            }
            return;
        }

        try {
            setAdding(true);
            await addToCartApi(product._id, 1);
            showToast(`Đã thêm "${product.name}" vào giỏ hàng!`, "success");
            if (onAddToCart) onAddToCart(product._id);
        } catch (error) {
            console.error("Add to cart error:", error);
            showToast(error.message || "Thêm vào giỏ hàng thất bại!", "error");
        } finally {
            setAdding(false);
        }
    };

    return (
        <Link
            to={`/product/${product._id}`}
            className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-[#FAF8F5]">
                <img
                    src={product.images?.[0] || "/placeholder.png"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {product.sold > 10 && (
                        <span className="bg-[#E53E3E] text-white text-xs px-2 py-1 rounded-full font-semibold">
                            Bán chạy
                        </span>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-[#8B4513] hover:text-white transition"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                </div>

                {/* Add to cart button - Bottom */}
                <button
                    onClick={handleAddToCart}
                    disabled={adding || product.quantity <= 0}
                    className="absolute bottom-3 left-3 right-3 py-2 bg-[#8B4513] text-white text-sm font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#A0522D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {adding ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            Đang thêm...
                        </>
                    ) : product.quantity <= 0 ? (
                        "Hết hàng"
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Thêm vào giỏ
                        </>
                    )}
                </button>
            </div>

            {/* Info */}
            <div className="p-4">
                {/* Rating */}
                <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={product.averageRating || 5} />
                    <span className="text-xs text-gray-500">({product.reviewCount || 0})</span>
                </div>

                {/* Name */}
                <h3 className="font-semibold text-gray-800 line-clamp-2 mb-2 min-h-[48px] text-sm leading-tight">
                    {product.name}
                </h3>

                {/* Price */}
                <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[#8B4513]">
                        {formatPrice(product.price)}
                    </span>
                    {product.quantity > 0 ? (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            Còn hàng
                        </span>
                    ) : (
                        <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">
                            Hết hàng
                        </span>
                    )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {product.views || 0}
                    </span>
                    <span>Đã bán: {product.sold || 0}</span>
                </div>
            </div>
        </Link>
    );
};

export default ProductCard;
