import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addToCartApi, addToWishlistApi, removeFromWishlistApi, checkWishlistApi } from "../../utils/api";
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

const ProductCard = ({ product, onAddToCart, wishlist = [] }) => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [adding, setAdding] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);

    const getToken = () => localStorage.getItem("access_token");

    const formatPrice = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    // Check if product is in wishlist
    const isInWishlist = wishlist.includes(product._id);

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
            window.dispatchEvent(new Event("cart-updated"));
        } catch (error) {
            console.error("Add to cart error:", error);
            showToast(error.message || "Thêm vào giỏ hàng thất bại!", "error");
        } finally {
            setAdding(false);
        }
    };

    const handleToggleWishlist = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const token = getToken();
        if (!token) {
            if (confirm("Bạn cần đăng nhập để thêm vào yêu thích. Đăng nhập ngay?")) {
                navigate("/login");
            }
            return;
        }

        try {
            setWishlistLoading(true);
            if (isInWishlist) {
                await removeFromWishlistApi(product._id);
                showToast("Đã xóa khỏi danh sách yêu thích!", "success");
                window.dispatchEvent(new CustomEvent("wishlist-updated", { detail: { productId: product._id, action: "remove" } }));
            } else {
                await addToWishlistApi(product._id);
                showToast("Đã thêm vào danh sách yêu thích!", "success");
                window.dispatchEvent(new CustomEvent("wishlist-updated", { detail: { productId: product._id, action: "add" } }));
            }
        } catch (error) {
            console.error("Wishlist error:", error);
            showToast(error.message || "Có lỗi xảy ra!", "error");
        } finally {
            setWishlistLoading(false);
        }
    };

    return (
        <Link
            to={`/product/${product.slug || product._id}`}
            className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-[#FAF8F5]">
                <img
                    src={product.images?.[0] || "/placeholder.png"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.src = "/placeholder.png"; }}
                />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {product.salePrice != null && product.salePrice < product.price && (
                        <span className="bg-[#B86B05] text-white text-xs px-2 py-1 rounded-full font-semibold">
                            -{Math.round((1 - product.salePrice / product.price) * 100)}%
                        </span>
                    )}
                    {product.sold > 10 && (
                        <span className="bg-[#BF4343] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Bán chạy
                        </span>
                    )}
                </div>

                {/* Wishlist Button */}
                <div className="absolute top-2.5 right-2.5">
                    <button
                        onClick={handleToggleWishlist}
                        disabled={wishlistLoading}
                        className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-all ${
                            isInWishlist
                                ? "bg-[#BF4343] text-white"
                                : "bg-white/90 text-[#A8896A] hover:text-[#BF4343] hover:bg-white"
                        }`}
                    >
                        {wishlistLoading ? (
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <svg
                                viewBox="0 0 24 24"
                                fill={isInWishlist ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="2"
                                className="w-3.5 h-3.5"
                            >
                                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Add to cart button - Bottom */}
                <button
                    onClick={handleAddToCart}
                    disabled={adding || product.quantity <= 0}
                    className="absolute bottom-2.5 left-2.5 right-2.5 py-2 bg-[#B86B05] text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#95520B] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                    {adding ? (
                        <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            Đang thêm...
                        </>
                    ) : product.quantity <= 0 ? (
                        "Hết hàng"
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
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
                <div className="flex items-center gap-1.5 mb-2">
                    <StarRating rating={product.averageRating || 5} />
                    <span className="text-[10px] text-[#A8896A]">({product.reviewCount || 0})</span>
                </div>

                {/* Name */}
                <h3 className="font-semibold text-[#1C1108] line-clamp-2 mb-2 min-h-[44px] text-sm leading-snug">
                    {product.name}
                </h3>

                {/* Price */}
                <div className="flex items-center justify-between">
                    <span className="text-base font-extrabold text-[#B86B05]">
                        {formatPrice(product.price)}
                    </span>

                    <div className="flex flex-col">
                        {product.salePrice != null && product.salePrice < product.price ? (
                            <>
                                <span className="text-lg font-bold text-[#E53E3E]">{formatPrice(product.salePrice)}</span>
                                <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>
                            </>
                        ) : (
                            <span className="text-lg font-bold text-[#8B4513]">{formatPrice(product.price)}</span>
                        )}
                    </div>
                    {product.quantity > 0 ? (
                        <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-semibold">
                            Còn hàng
                        </span>
                    ) : (
                        <span className="text-[10px] text-[#BF4343] bg-red-50 px-2 py-0.5 rounded-full font-semibold">
                            Hết hàng
                        </span>
                    )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-[10px] text-[#A8896A] mt-3 pt-3 border-t border-[#EDE8E0]">
                    <span className="flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
