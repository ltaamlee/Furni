import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    getProductByIdApi,
    getProductsByCategoryApi,
    addToCartApi,
    getProductStatsApi,
    addToWishlistApi,
    removeFromWishlistApi,
    checkWishlistApi,
    addToRecentlyViewedApi,
    getSimilarProductsApi
} from "../../utils/api";
import ProductCard from "../../components/common/productCard";
import ReviewList from "../../components/common/ReviewList";
import ReviewModal from "../../components/common/ReviewModal";
import { useToast } from "../../components/context/ToastContext";

const ProductDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [similarProducts, setSimilarProducts] = useState([]);
    const [productStats, setProductStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);
    const [addedSuccess, setAddedSuccess] = useState(false);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("description");

    const getToken = () => localStorage.getItem("access_token");

    useEffect(() => {
        fetchProduct();
    }, [id]);

    useEffect(() => {
        if (product && getToken()) {
            checkWishlistStatus();
            trackRecentlyViewed();
        }
    }, [product]);

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const res = await getProductByIdApi(id);
            if (res.success) {
                setProduct(res.data.product);
                
                // Fetch related products
                if (res.data.product.category?._id) {
                    fetchRelatedProducts(res.data.product.category._id, id);
                }
                
                // Fetch similar products
                fetchSimilarProducts(id);
                
                // Fetch product stats
                fetchProductStats(id);
            }
        } catch (error) {
            console.error("Error fetching product:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRelatedProducts = async (categoryId, excludeId) => {
        try {
            const res = await getProductsByCategoryApi(categoryId, { limit: 8 });
            if (res.success) {
                const related = (res.data.products || []).filter(p => p._id !== excludeId);
                setRelatedProducts(related.slice(0, 4));
            }
        } catch (error) {
            console.error("Error fetching related products:", error);
        }
    };

    const fetchSimilarProducts = async (productId) => {
        try {
            const res = await getSimilarProductsApi(productId, { limit: 4 });
            if (res.success) {
                setSimilarProducts(res.data.products);
            }
        } catch (error) {
            console.error("Error fetching similar products:", error);
        }
    };

    const fetchProductStats = async (productId) => {
        try {
            const res = await getProductStatsApi(productId);
            if (res.success) {
                setProductStats(res.data);
            }
        } catch (error) {
            console.error("Error fetching product stats:", error);
        }
    };

    const checkWishlistStatus = async () => {
        try {
            const res = await checkWishlistApi(id);
            if (res.success) {
                setIsInWishlist(res.data.isInWishlist);
            }
        } catch (error) {
            console.error("Error checking wishlist:", error);
        }
    };

    const trackRecentlyViewed = async () => {
        try {
            await addToRecentlyViewedApi(id);
        } catch (error) {
            console.error("Error tracking recently viewed:", error);
        }
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
            showToast(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`, "success");
            window.dispatchEvent(new Event("cart-updated"));
            setTimeout(() => setAddedSuccess(false), 2000);
        } catch (error) {
            console.error("Add to cart error:", error);
            showToast(error.message || "Thêm vào giỏ hàng thất bại!", "error");
        } finally {
            setAdding(false);
        }
    };

    const handleToggleWishlist = async () => {
        const token = getToken();
        if (!token) {
            if (confirm("Bạn cần đăng nhập để thêm vào wishlist. Đăng nhập ngay?")) {
                navigate("/login");
            }
            return;
        }

        try {
            setWishlistLoading(true);
            if (isInWishlist) {
                await removeFromWishlistApi(id);
                setIsInWishlist(false);
                showToast("Đã xóa khỏi danh sách yêu thích!", "success");
            } else {
                await addToWishlistApi(id);
                setIsInWishlist(true);
                showToast("Đã thêm vào danh sách yêu thích!", "success");
            }
        } catch (error) {
            showToast(error.message || "Có lỗi xảy ra!", "error");
        } finally {
            setWishlistLoading(false);
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

    if (!product) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Không tìm thấy sản phẩm</h2>
                    <Link to="/" className="text-[#8B4513] hover:underline mt-4 inline-block">
                        Về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    const images = product.images?.length > 0 ? product.images : ["/placeholder.png"];

    return (
        <div className="min-h-screen bg-[#F5F5F0]">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link to="/" className="hover:text-[#8B4513]">Trang chủ</Link>
                    <span>/</span>
                    <Link to="/products" className="hover:text-[#8B4513]">Sản phẩm</Link>
                    <span>/</span>
                    <Link to={`/category/${product.category?._id}`} className="hover:text-[#8B4513]">
                        {product.category?.name || "Danh mục"}
                    </Link>
                    <span>/</span>
                    <span className="text-gray-800 truncate max-w-[200px]">{product.name}</span>
                </nav>

                {/* Product Section */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Image Gallery */}
                        <div className="space-y-4">
                            <div className="aspect-square bg-[#FAF8F5] rounded-2xl overflow-hidden relative">
                                <img
                                    src={images[selectedImage]}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                                {/* Wishlist Button */}
                                <button
                                    onClick={handleToggleWishlist}
                                    disabled={wishlistLoading}
                                    className={`absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition ${
                                        isInWishlist
                                            ? "bg-red-500 text-white"
                                            : "bg-white/90 text-gray-400 hover:text-red-500"
                                    }`}
                                >
                                    {wishlistLoading ? (
                                        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill={isInWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            
                            {images.length > 1 && (
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {images.map((img, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedImage(index)}
                                            className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition flex-shrink-0 ${
                                                selectedImage === index
                                                    ? "border-[#8B4513]"
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
                            {/* Category & Rating */}
                            <div>
                                {product.category && (
                                    <Link 
                                        to={`/category/${product.category._id}`}
                                        className="inline-block text-sm text-[#8B4513] hover:text-[#A0522D] mb-2"
                                    >
                                        {product.category.name}
                                    </Link>
                                )}
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">{product.name}</h1>
                                
                                {/* Rating & Stats */}
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <svg
                                                    key={i}
                                                    viewBox="0 0 24 24"
                                                    fill={i < Math.floor(product.averageRating || 0) ? "#F59E0B" : "none"}
                                                    stroke={i < Math.floor(product.averageRating || 0) ? "#F59E0B" : "#D1D5DB"}
                                                    strokeWidth="1.5"
                                                    className="w-4 h-4"
                                                >
                                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                </svg>
                                            ))}
                                        </div>
                                        <span className="font-medium text-gray-700">{product.averageRating || 0}</span>
                                        <span className="text-gray-400">({productStats?.reviewerCount || product.totalRatings || 0} đánh giá)</span>
                                    </div>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-gray-500">👤 {productStats?.buyerCount || 0} khách mua</span>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-gray-500">👁️ {product.views || 0} lượt xem</span>
                                </div>
                            </div>

                            {/* Price */}
                            <div className="bg-[#FAF8F5] rounded-xl p-4">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-3xl font-bold text-[#8B4513]">
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
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">Mô tả sản phẩm</h3>
                                    <p className="text-gray-600 whitespace-pre-line leading-relaxed">{product.description}</p>
                                </div>
                            )}

                            {/* Specifications */}
                            {product.dimensions && Object.values(product.dimensions).some(v => v) && (
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-3">Thông số kỹ thuật</h3>
                                    <div className="space-y-2 bg-[#FAF8F5] rounded-xl p-4">
                                        {product.brand && (
                                            <div className="flex justify-between py-2 border-b border-gray-200">
                                                <span className="text-gray-500">Thương hiệu</span>
                                                <span className="font-medium text-gray-800">{product.brand}</span>
                                            </div>
                                        )}
                                        {product.material && (
                                            <div className="flex justify-between py-2 border-b border-gray-200">
                                                <span className="text-gray-500">Chất liệu</span>
                                                <span className="font-medium text-gray-800">{product.material}</span>
                                            </div>
                                        )}
                                        {product.color && (
                                            <div className="flex justify-between py-2 border-b border-gray-200">
                                                <span className="text-gray-500">Màu sắc</span>
                                                <span className="font-medium text-gray-800">{product.color}</span>
                                            </div>
                                        )}
                                        {product.dimensions && (
                                            <div className="flex justify-between py-2 border-b border-gray-200">
                                                <span className="text-gray-500">Kích thước</span>
                                                <span className="font-medium text-gray-800">
                                                    {product.dimensions.width} x {product.dimensions.depth} x {product.dimensions.height} cm
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Stock & Quantity */}
                            <div className="bg-[#FAF8F5] rounded-xl p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-gray-600">Kho hàng:</span>
                                    {product.quantity > 0 ? (
                                        <span className="text-green-600 font-medium flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            Còn hàng ({product.quantity})
                                        </span>
                                    ) : (
                                        <span className="text-red-500 font-medium">Hết hàng</span>
                                    )}
                                </div>

                                {product.quantity > 0 && (
                                    <>
                                        <div className="flex items-center gap-4 mb-4">
                                            <span className="text-gray-600">Số lượng:</span>
                                            <div className="flex items-center border border-gray-300 rounded-full bg-white">
                                                <button
                                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                    className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-100 rounded-l-full"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                                        <path d="M5 12h14" />
                                                    </svg>
                                                </button>
                                                <span className="w-12 text-center font-semibold">{quantity}</span>
                                                <button
                                                    onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                                                    className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-100 rounded-r-full"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                                        <path d="M12 5v14M5 12h14" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button
                                                onClick={handleAddToCart}
                                                disabled={adding}
                                                className={`flex-1 py-4 rounded-full font-bold text-lg transition flex items-center justify-center gap-2 ${
                                                    addedSuccess
                                                        ? "bg-green-600 text-white"
                                                        : "bg-[#8B4513] text-white hover:bg-[#A0522D]"
                                                } disabled:opacity-70`}
                                            >
                                                {adding ? (
                                                    <>
                                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                        Đang thêm...
                                                    </>
                                                ) : addedSuccess ? (
                                                    <>
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                                            <path d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Đã thêm vào giỏ hàng!
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                                            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        Thêm vào giỏ hàng
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleAddToCart();
                                                    setTimeout(() => navigate("/cart"), 500);
                                                }}
                                                className="px-8 py-4 border-2 border-[#8B4513] text-[#8B4513] rounded-full font-bold hover:bg-[#8B4513] hover:text-white transition"
                                            >
                                                Mua ngay
                                            </button>
                                            <button
                                                onClick={handleToggleWishlist}
                                                disabled={wishlistLoading}
                                                className={`px-6 py-4 border-2 rounded-full font-bold transition ${
                                                    isInWishlist
                                                        ? "border-red-500 text-red-500 bg-red-50"
                                                        : "border-gray-300 text-gray-600 hover:border-red-500 hover:text-red-500"
                                                }`}
                                            >
                                                {isInWishlist ? "❤️ Yêu thích" : "🤍 Yêu thích"}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" className="w-5 h-5">
                                        <path d="M5 13l4 4L19 7" />
                                    </svg>
                                    Miễn phí vận chuyển cho đơn từ 500.000đ
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" className="w-5 h-5">
                                        <path d="M5 13l4 4L19 7" />
                                    </svg>
                                    Đổi trả trong 30 ngày
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" className="w-5 h-5">
                                        <path d="M5 13l4 4L19 7" />
                                    </svg>
                                    Bảo hành 12 tháng
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" className="w-5 h-5">
                                        <path d="M5 13l4 4L19 7" />
                                    </svg>
                                    Hỗ trợ 24/7
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-800">ĐÁNH GIÁ SẢN PHẨM</h2>
                        <button
                            onClick={() => setReviewModalOpen(true)}
                            className="bg-[#8B4513] text-white px-6 py-2.5 rounded-full font-medium hover:bg-[#A0522D] transition flex items-center gap-2"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Viết đánh giá
                        </button>
                    </div>
                    <ReviewList productId={id} />
                </div>

                {/* Similar Products */}
                {(similarProducts.length > 0 || relatedProducts.length > 0) && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800">SẢN PHẨM TƯƠNG TỰ</h2>
                            <Link 
                                to={`/category/${product.category?._id}`}
                                className="text-[#8B4513] hover:text-[#A0522D] font-medium"
                            >
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(similarProducts.length > 0 ? similarProducts : relatedProducts).map((relatedProduct) => (
                                <ProductCard
                                    key={relatedProduct._id}
                                    product={relatedProduct}
                                    onAddToCart={() => window.dispatchEvent(new Event("cart-updated"))}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            <ReviewModal
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                product={product}
                onReviewCreated={() => fetchProductStats(id)}
            />
        </div>
    );
};

export default ProductDetailPage;
