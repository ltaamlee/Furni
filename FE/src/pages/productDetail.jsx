import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProductByIdApi, addToCartApi } from "../utils/api";

const ProductDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);
    const [addedSuccess, setAddedSuccess] = useState(false);

    const getToken = () => localStorage.getItem("access_token");

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const res = await getProductByIdApi(id);
            if (res.success) {
                setProduct(res.data.product);
            }
        } catch (error) {
            console.error("Error fetching product:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    const handleAddToCart = async () => {
        const token = getToken();
        if (!token) {
            if (confirm("Bạn cần đăng nhập để thêm vào giỏ hàng. Đăng nhập ngay?")) {
                navigate("/login");
            }
            return;
        }

        try {
            setAdding(true);
            await addToCartApi(product._id, quantity);
            setAddedSuccess(true);
            window.dispatchEvent(new Event("cart-updated"));
            setTimeout(() => setAddedSuccess(false), 2000);
        } catch (error) {
            console.error("Add to cart error:", error);
            alert(error.message || "Thêm vào giỏ hàng thất bại!");
        } finally {
            setAdding(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800">Không tìm thấy sản phẩm</h2>
                    <Link to="/" className="text-green-600 hover:underline mt-4 inline-block">
                        Về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    const images = product.images || ["/placeholder.png"];

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link to="/" className="hover:text-green-600">Trang chủ</Link>
                    <span>/</span>
                    <Link to={`/category/${product.category?._id}`} className="hover:text-green-600">
                        {product.category?.name || "Sản phẩm"}
                    </Link>
                    <span>/</span>
                    <span className="text-gray-800 truncate">{product.name}</span>
                </nav>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Image Gallery */}
                    <div className="space-y-4">
                        <div className="aspect-square bg-white rounded-2xl overflow-hidden shadow-sm">
                            <img
                                src={images[selectedImage]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {images.map((img, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedImage(index)}
                                        className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition flex-shrink-0 ${
                                            selectedImage === index
                                                ? "border-green-600"
                                                : "border-transparent hover:border-gray-300"
                                        }`}
                                    >
                                        <img
                                            src={img}
                                            alt={`${product.name} ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="space-y-6">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">{product.category?.name}</p>
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">{product.name}</h1>
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-500">⭐</span>
                                    <span className="font-medium">{product.averageRating || 0}</span>
                                    <span className="text-gray-400">({product.reviewCount || 0} đánh giá)</span>
                                </div>
                                <span className="text-gray-400">|</span>
                                <span className="text-gray-400">Đã bán: {product.sold || 0}</span>
                                <span className="text-gray-400">|</span>
                                <span className="text-gray-400">👁️ {product.views || 0}</span>
                            </div>
                        </div>

                        {/* Price */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-bold text-green-600">
                                    {formatPrice(product.price)}
                                </span>
                                {product.originalPrice && product.originalPrice > product.price && (
                                    <>
                                        <span className="text-lg text-gray-400 line-through">
                                            {formatPrice(product.originalPrice)}
                                        </span>
                                        <span className="bg-red-100 text-red-600 text-sm px-2 py-1 rounded-full font-medium">
                                            -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        {product.description && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-3">Mô tả sản phẩm</h3>
                                <p className="text-gray-600 whitespace-pre-line">{product.description}</p>
                            </div>
                        )}

                        {/* Specifications */}
                        {product.specifications && Object.keys(product.specifications).length > 0 && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-3">Thông số kỹ thuật</h3>
                                <div className="space-y-2">
                                    {Object.entries(product.specifications).map(([key, value]) => (
                                        <div key={key} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                                            <span className="text-gray-500">{key}</span>
                                            <span className="font-medium text-gray-800">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Stock & Quantity */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-gray-600">Kho hàng:</span>
                                {product.quantity > 0 ? (
                                    <span className="text-green-600 font-medium">Còn hàng ({product.quantity})</span>
                                ) : (
                                    <span className="text-red-500 font-medium">Hết hàng</span>
                                )}
                            </div>

                            {product.quantity > 0 && (
                                <>
                                    <div className="flex items-center gap-4 mb-6">
                                        <span className="text-gray-600">Số lượng:</span>
                                        <div className="flex items-center border rounded-full">
                                            <button
                                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-100 rounded-l-full"
                                            >
                                                -
                                            </button>
                                            <span className="w-12 text-center font-semibold">{quantity}</span>
                                            <button
                                                onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                                                className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-100 rounded-r-full"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleAddToCart}
                                            disabled={adding}
                                            className={`flex-1 py-4 rounded-full font-bold text-lg transition ${
                                                addedSuccess
                                                    ? "bg-green-600 text-white"
                                                    : "bg-green-600 text-white hover:bg-green-700"
                                            } disabled:opacity-70`}
                                        >
                                            {adding ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                    Đang thêm...
                                                </span>
                                            ) : addedSuccess ? (
                                                "✓ Đã thêm vào giỏ hàng!"
                                            ) : (
                                                "🛒 Thêm vào giỏ hàng"
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleAddToCart();
                                                setTimeout(() => navigate("/cart"), 500);
                                            }}
                                            className="px-8 py-4 border-2 border-green-600 text-green-600 rounded-full font-bold hover:bg-green-50 transition"
                                        >
                                            Mua ngay
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                                <span className="text-green-500">✓</span>
                                Miễn phí vận chuyển cho đơn từ 500.000đ
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <span className="text-green-500">✓</span>
                                Đổi trả trong 7 ngày
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <span className="text-green-500">✓</span>
                                Bảo hành 12 tháng
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <span className="text-green-500">✓</span>
                                Hỗ trợ 24/7
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailPage;
