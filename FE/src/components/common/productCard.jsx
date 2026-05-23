import { Link, useNavigate } from "react-router-dom";
import { addToCartApi } from "../../utils/api";

const ProductCard = ({ product, onAddToCart }) => {
    const navigate = useNavigate();

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
            await addToCartApi(product._id, 1);
            if (onAddToCart) onAddToCart(product._id);
        } catch (error) {
            console.error("Add to cart error:", error);
            alert(error.message || "Thêm vào giỏ hàng thất bại!");
        }
    };

    return (
        <Link
            to={`/product/${product._id}`}
            className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
        >
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-gray-100">
                <img
                    src={product.images?.[0] || "/placeholder.png"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {product.sold > 10 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            Bán chạy
                        </span>
                    )}
                    {product.averageRating >= 4 && (
                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                            ⭐ {product.averageRating}
                        </span>
                    )}
                </div>
                {/* Add to cart button */}
                <button
                    onClick={handleAddToCart}
                    className="absolute bottom-3 right-3 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-600 hover:text-white"
                >
                    🛒
                </button>
            </div>

            {/* Info */}
            <div className="p-4">
                <p className="text-xs text-gray-500 mb-1">{product.category?.name}</p>
                <h3 className="font-semibold text-gray-800 line-clamp-2 mb-2 min-h-[48px]">
                    {product.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-green-600">
                        {formatPrice(product.price)}
                    </span>
                    {product.quantity > 0 ? (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            Còn hàng
                        </span>
                    ) : (
                        <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                            Hết hàng
                        </span>
                    )}
                </div>
                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>👁️ {product.views || 0}</span>
                    <span>📦 Đã bán: {product.sold || 0}</span>
                </div>
            </div>
        </Link>
    );
};

export default ProductCard;
