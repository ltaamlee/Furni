import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    getWishlistApi,
    removeFromWishlistApi,
    addToCartApi
} from "../../utils/api";
import { useToast } from "../context/ToastContext";

const WishlistPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [removing, setRemoving] = useState(null);

    useEffect(() => {
        fetchWishlist();
    }, [page]);

    const fetchWishlist = async () => {
        try {
            setLoading(true);
            const res = await getWishlistApi({ page, limit: 12 });
            if (res.success) {
                setWishlist(res.data.wishlist);
                setTotalPages(res.data.pagination.pages);
            }
        } catch (error) {
            console.error("Error fetching wishlist:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (productId) => {
        if (!confirm("Xóa sản phẩm khỏi danh sách yêu thích?")) return;
        
        try {
            setRemoving(productId);
            await removeFromWishlistApi(productId);
            setWishlist(wishlist.filter(p => p._id !== productId));
            showToast("Đã xóa khỏi danh sách yêu thích!", "success");
        } catch (error) {
            showToast("Xóa thất bại!", "error");
        } finally {
            setRemoving(null);
        }
    };

    const handleAddToCart = async (product) => {
        try {
            await addToCartApi(product._id, 1);
            showToast(`Đã thêm "${product.name}" vào giỏ hàng!`, "success");
            window.dispatchEvent(new Event("cart-updated"));
        } catch (error) {
            showToast(error.message || "Thêm vào giỏ hàng thất bại!", "error");
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
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
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">DANH SÁCH YÊU THÍCH</h1>
                    <p className="text-gray-500">Những sản phẩm bạn đã lưu lại</p>
                </div>

                {wishlist.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <div className="text-6xl mb-4">❤️</div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Chưa có sản phẩm yêu thích</h2>
                        <p className="text-gray-500 mb-6">Hãy thêm những sản phẩm bạn thích vào đây!</p>
                        <button
                            onClick={() => navigate("/products")}
                            className="bg-[#8B4513] text-white px-6 py-3 rounded-full hover:bg-[#A0522D] transition"
                        >
                            Khám phá sản phẩm
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {wishlist.map((product) => (
                                <div key={product._id} className="bg-white rounded-2xl shadow-sm overflow-hidden group">
                                    {/* Image */}
                                    <div className="relative aspect-square bg-[#FAF8F5]">
                                        <img
                                            src={product.images?.[0] || "/placeholder.png"}
                                            alt={product.name}
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => navigate(`/product/${product._id}`)}
                                        />
                                        <button
                                            onClick={() => handleRemove(product._id)}
                                            disabled={removing === product._id}
                                            className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition shadow-sm"
                                        >
                                            {removing === product._id ? (
                                                <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></span>
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                                </svg>
                                            )}
                                        </button>
                                        {product.quantity <= 0 && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <span className="bg-white text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                                                    Hết hàng
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-4">
                                        <h3
                                            className="font-semibold text-gray-800 line-clamp-2 mb-2 cursor-pointer hover:text-[#8B4513] transition"
                                            onClick={() => navigate(`/product/${product._id}`)}
                                        >
                                            {product.name}
                                        </h3>

                                        {/* Rating */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <span key={star} className={`text-sm ${star <= Math.round(product.averageRating || 0) ? "text-yellow-400" : "text-gray-300"}`}>
                                                        ★
                                                    </span>
                                                ))}
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                ({product.sold || 0} đã bán)
                                            </span>
                                        </div>

                                        {/* Price */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-bold text-[#8B4513]">
                                                {formatPrice(product.price)}
                                            </span>
                                        </div>

                                        {/* Add to Cart Button */}
                                        <button
                                            onClick={() => handleAddToCart(product)}
                                            disabled={product.quantity <= 0}
                                            className="w-full mt-3 bg-[#8B4513] text-white py-2.5 rounded-xl font-medium hover:bg-[#A0522D] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            Thêm vào giỏ
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-8">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page <= 1}
                                    className="px-4 py-2 rounded-lg bg-white shadow-sm text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition"
                                >
                                    ← Trước
                                </button>
                                <span className="px-4 py-2 bg-white shadow-sm rounded-lg text-gray-600">
                                    Trang {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= totalPages}
                                    className="px-4 py-2 rounded-lg bg-white shadow-sm text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition"
                                >
                                    Sau →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default WishlistPage;
