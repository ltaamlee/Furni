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
    getSimilarProductsApi,
} from "../../utils/api";
import ProductCard from "../../components/common/productCard";
import ReviewList from "../../components/common/ReviewList";
import ReviewModal from "../../components/common/ReviewModal";
import { useToast } from "../../components/context/ToastContext";

/* ─── helpers ─────────────────────────────────────────────── */
const getToken = () => localStorage.getItem("access_token");

const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN").format(price) + " đ";

/* ─── sub-components ─────────────────────────────────────── */
function StarRating({ value = 0 }) {
    return (
        <div className="flex">
            {[...Array(5)].map((_, i) => {
                const filled = i < Math.floor(value);
                return (
                    <svg
                        key={i}
                        viewBox="0 0 24 24"
                        fill={filled ? "#F59E0B" : "none"}
                        stroke={filled ? "#F59E0B" : "#D1D5DB"}
                        strokeWidth="1.5"
                        className="w-4 h-4"
                    >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                );
            })}
        </div>
    );
}

function Spinner({ className = "w-5 h-5 border-white" }) {
    return (
        <span
            className={`border-2 border-t-transparent rounded-full animate-spin ${className}`}
        />
    );
}

function FeatureItem({ label }) {
    return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22C55E"
                strokeWidth="2"
                className="w-5 h-5 shrink-0"
            >
                <path d="M5 13l4 4L19 7" />
            </svg>
            {label}
        </div>
    );
}

/* ─── main component ─────────────────────────────────────── */
const ProductDetailPage = () => {
    const { slug } = useParams();
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

    const [selectedVariant, setSelectedVariant] = useState(null);

    /* ── data fetching ────────────────────────────────────── */
    useEffect(() => {
        fetchProduct();
    }, [slug]);

    useEffect(() => {
        if (product && getToken()) {
            checkWishlistStatus();
            trackRecentlyViewed();
        }
    }, [product]);

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const res = await getProductByIdApi(slug);
            if (res.success) {
                setProduct(res.data.product);
                if (res.data.product.category?._id) {
                    fetchRelatedProducts(
                        res.data.product.category._id,
                        res.data.product._id
                    );
                }
                fetchSimilarProducts(res.data.product._id);
                fetchProductStats(res.data.product._id);
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
                const filtered = (res.data.products || [])
                    .filter((p) => p._id !== excludeId)
                    .slice(0, 4);
                setRelatedProducts(filtered);
            }
        } catch (error) {
            console.error("Error fetching related products:", error);
        }
    };

    // const fetchSimilarProducts = async (productId) => {
    //     try {
    //         const res = await getSimilarProductsApi(productId, { limit: 4 });
    //         if (res.success) setSimilarProducts(res.data.products);
    //     } catch (error) {
    //         console.error("Error fetching similar products:", error);
    //     }
    // };

    const fetchProductStats = async (productId) => {
        try {
            const res = await getProductStatsApi(productId);
            if (res.success) setProductStats(res.data);
        } catch (error) {
            console.error("Error fetching product stats:", error);
        }
    };

    const checkWishlistStatus = async () => {
        try {
            const res = await checkWishlistApi(product._id);
            if (res.success) setIsInWishlist(res.data.isInWishlist);
        } catch (error) {
            console.error("Error checking wishlist:", error);
        }
    };

    const trackRecentlyViewed = async () => {
        try {
            await addToRecentlyViewedApi(product._id);
        } catch (error) {
            console.error("Error tracking recently viewed:", error);
        }
    };

    /* ── actions ──────────────────────────────────────────── */
    const requireLogin = (msg) => {
        if (confirm(msg)) navigate("/login");
    };

    const handleAddToCart = async () => {
        if (!getToken()) {
            requireLogin("Bạn cần đăng nhập để thêm vào giỏ hàng. Đăng nhập ngay?");
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

    // FIX: navigate to cart only if add-to-cart succeeded
    const handleBuyNow = async () => {
        if (!getToken()) {
            requireLogin("Bạn cần đăng nhập để mua hàng. Đăng nhập ngay?");
            return;
        }
        try {
            setAdding(true);
            await addToCartApi(product._id, quantity);
            window.dispatchEvent(new Event("cart-updated"));
            navigate("/cart");
        } catch (error) {
            showToast(error.message || "Thêm vào giỏ hàng thất bại!", "error");
        } finally {
            setAdding(false);
        }
    };

    const handleToggleWishlist = async () => {
        if (!getToken()) {
            requireLogin("Bạn cần đăng nhập để thêm vào wishlist. Đăng nhập ngay?");
            return;
        }
        try {
            setWishlistLoading(true);
            if (isInWishlist) {
                await removeFromWishlistApi(product._id);
                setIsInWishlist(false);
                showToast("Đã xóa khỏi danh sách yêu thích!", "success");
            } else {
                await addToWishlistApi(product._id);
                setIsInWishlist(true);
                showToast("Đã thêm vào danh sách yêu thích!", "success");
            }
        } catch (error) {
            showToast(error.message || "Có lỗi xảy ra!", "error");
        } finally {
            setWishlistLoading(false);
        }
    };

    /* ── loading / not-found ──────────────────────────────── */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
                <Spinner className="w-12 h-12 border-gray-300 border-t-[#8B4513]" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        Không tìm thấy sản phẩm
                    </h2>
                    <Link to="/" className="text-[#8B4513] hover:underline mt-4 inline-block">
                        Về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    /* ── derived display values ───────────────────────────── */
    const images = product.images?.length > 0 ? product.images : ["/placeholder.png"];
    const variants = product.variants || [];
    const activeVariant = selectedVariant !== null ? variants[selectedVariant] : null;
    const displayPrice = activeVariant?.price ?? product.price;
    const displayStock = activeVariant?.stock ?? product.quantity;
    const discountPct =
        product.originalPrice && product.originalPrice > displayPrice
            ? Math.round((1 - displayPrice / product.originalPrice) * 100)
            : null;

    const deliveryLabel =
        product.deliveryType === "with_installation"
            ? "Giao + lắp đặt"
            : "Giao hàng thường";

    const dim = product.dimensions || {};
    const hasDimensions = dim.length || dim.width || dim.height;
    const specs = [
        ["Thương hiệu", product.brand],
        ["Chất liệu", product.material],
        ["Màu sắc", product.color],
        ["Phong cách", product.style],
        hasDimensions && [
            "Kích thước (D×R×C)",
            `${dim.length || "-"} × ${dim.width || "-"} × ${dim.height || "-"} cm`,
        ],
        product.weight && ["Cân nặng", `${product.weight} kg`],
        ["Cần lắp ráp", product.requiresAssembly ? "Có" : "Không"],
        ["Hình thức giao", deliveryLabel],
    ]
        .filter(Boolean)
        .filter(([, v]) => v);

    const shop = product.shop;
    const shopInitial = shop?.name?.charAt(0)?.toUpperCase() || "S";
    const displayProducts = similarProducts.length > 0 ? similarProducts : relatedProducts;

    /* ── render ───────────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-[#F5F5F0]">
            <div className="max-w-7xl mx-auto px-4 py-6">

                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link to="/" className="hover:text-[#8B4513]">Trang chủ</Link>
                    <span>/</span>
                    <Link to="/products" className="hover:text-[#8B4513]">Sản phẩm</Link>
                    <span>/</span>
                    <Link to={`/category/${product.category?.slug}`} className="hover:text-[#8B4513]">
                        {product.category?.name || "Danh mục"}
                    </Link>
                    <span>/</span>
                    <span className="text-gray-800 truncate max-w-50">{product.name}</span>
                </nav>

                {/* ── Product card ── */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
                    <div className="grid lg:grid-cols-2 gap-8">

                        {/* Image gallery */}
                        <div className="space-y-4">
                            <div className="aspect-square bg-[#FAF8F5] rounded-2xl overflow-hidden relative">
                                <img
                                    src={images[selectedImage]}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
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
                                        <Spinner />
                                    ) : (
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill={isInWishlist ? "currentColor" : "none"}
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="w-6 h-6"
                                        >
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
                                            className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition shrink-0 ${
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

                        {/* Product info */}
                        <div className="space-y-6">

                            {/* Category + title + stats */}
                            <div>
                                {product.category && (
                                    <Link
                                        to={`/category/${product.category.slug}`}
                                        className="inline-block text-sm text-[#8B4513] hover:text-[#A0522D] mb-2"
                                    >
                                        {product.category.name}
                                    </Link>
                                )}
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
                                    {product.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                        <StarRating value={product.averageRating} />
                                        <span className="font-medium text-gray-700">
                                            {product.averageRating || 0}
                                        </span>
                                        <span className="text-gray-400">
                                            ({productStats?.reviewerCount || product.totalRatings || 0} đánh giá)
                                        </span>
                                    </div>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-gray-500">
                                        👤 {productStats?.buyerCount || 0} khách mua
                                    </span>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-gray-500">
                                        👁️ {product.views || 0} lượt xem
                                    </span>
                                </div>
                            </div>

                            {/* Price */}
                            <div className="bg-[#FAF8F5] rounded-xl p-4">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-3xl font-bold text-[#8B4513]">
                                        {formatPrice(displayPrice)}
                                    </span>
                                    {discountPct !== null && (
                                        <>
                                            <span className="text-lg text-gray-400 line-through">
                                                {formatPrice(product.originalPrice)}
                                            </span>
                                            <span className="bg-red-100 text-red-600 text-sm px-2 py-1 rounded-full font-medium">
                                                -{discountPct}%
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Variants */}
                            {variants.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">Phân loại</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {variants.map((v, i) => (
                                            <button
                                                key={v._id || i}
                                                onClick={() => {
                                                    setSelectedVariant(i === selectedVariant ? null : i);
                                                    setQuantity(1);
                                                }}
                                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                                                    selectedVariant === i
                                                        ? "border-[#8B4513] bg-[#8B4513]/10 text-[#8B4513]"
                                                        : "border-gray-200 text-gray-600 hover:border-[#8B4513]"
                                                }`}
                                            >
                                                {v.name}{v.size ? ` · ${v.size}` : ""}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            {product.description && (
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">Mô tả sản phẩm</h3>
                                    <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                                        {product.description}
                                    </p>
                                </div>
                            )}

                            {/* Specifications */}
                            {specs.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-3">Thông số sản phẩm</h3>
                                    <div>
                                        {specs.map(([key, value]) => (
                                            <div
                                                key={key}
                                                className="flex justify-between py-2 border-b border-gray-200 last:border-0"
                                            >
                                                <span className="text-gray-500">{key}</span>
                                                <span className="font-medium text-gray-800">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Stock + quantity + actions */}
                            <div className="bg-[#FAF8F5] rounded-xl p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-gray-600">Kho hàng:</span>
                                    {displayStock > 0 ? (
                                        <span className="text-green-600 font-medium flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                                            Còn hàng ({displayStock})
                                        </span>
                                    ) : (
                                        <span className="text-red-500 font-medium">Hết hàng</span>
                                    )}
                                </div>

                                {displayStock > 0 && (
                                    <>
                                        {/* Quantity picker */}
                                        <div className="flex items-center gap-4 mb-4">
                                            <span className="text-gray-600">Số lượng:</span>
                                            <div className="flex items-center border border-gray-300 rounded-full bg-white">
                                                <button
                                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-l-full"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                                        <path d="M5 12h14" />
                                                    </svg>
                                                </button>
                                                <span className="w-12 text-center font-semibold">{quantity}</span>
                                                <button
                                                    onClick={() => setQuantity(Math.min(displayStock, quantity + 1))}
                                                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-r-full"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                                        <path d="M12 5v14M5 12h14" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            {/* Add to cart */}
                                            <button
                                                onClick={handleAddToCart}
                                                disabled={adding}
                                                className={`flex-1 py-4 rounded-full font-bold text-lg transition flex items-center justify-center gap-2 disabled:opacity-70 ${
                                                    addedSuccess
                                                        ? "bg-green-600 text-white"
                                                        : "bg-[#8B4513] text-white hover:bg-[#A0522D]"
                                                }`}
                                            >
                                                {adding ? (
                                                    <>
                                                        <Spinner />
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

                                            {/* Buy now — FIX: uses dedicated handler */}
                                            <button
                                                onClick={handleBuyNow}
                                                disabled={adding}
                                                className="px-8 py-4 border-2 border-[#8B4513] text-[#8B4513] rounded-full font-bold hover:bg-[#8B4513] hover:text-white transition disabled:opacity-70"
                                            >
                                                Mua ngay
                                            </button>

                                            {/* Wishlist */}
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

                            {/* Feature badges */}
                            <div className="grid grid-cols-2 gap-3">
                                <FeatureItem label="Miễn phí vận chuyển cho đơn từ 500.000đ" />
                                <FeatureItem label="Đổi trả trong 30 ngày" />
                                <FeatureItem label="Bảo hành 12 tháng" />
                                <FeatureItem label="Hỗ trợ 24/7" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Reviews ── */}
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
                    {/* FIX: was `id` (undefined), now `product._id` */}
                    <ReviewList productId={product._id} />
                </div>

                {/* ── Shop info ── */}
                {shop && (
                    <div className="bg-white rounded-2xl shadow-sm p-5 mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                {shop.logo ? (
                                    <img
                                        src={shop.logo}
                                        alt={shop.name}
                                        className="w-16 h-16 rounded-full object-cover border border-gray-200"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-[#8B4513] flex items-center justify-center text-white text-2xl font-bold shrink-0">
                                        {shopInitial}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <div className="font-bold text-lg text-gray-800 truncate">{shop.name}</div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                                        Đang hoạt động
                                    </div>
                                    {shop.address && (
                                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1 truncate">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            {shop.address}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="shrink-0">
                                <Link
                                    to={`/shop/${shop.slug || shop._id}`}
                                    className="px-5 py-2.5 border border-[#8B4513] text-[#8B4513] rounded-lg font-medium hover:bg-[#8B4513] hover:text-white transition flex items-center gap-2"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                        <path d="M3 9l1-5h16l1 5M4 9v11a1 1 0 001 1h14a1 1 0 001-1V9M9 21v-6h6v6" />
                                    </svg>
                                    Xem Shop
                                </Link>
                            </div>
                        </div>
                        {shop.description && (
                            <p className="text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100 line-clamp-2">
                                {shop.description}
                            </p>
                        )}
                    </div>
                )}

                {/* ── Related / similar products ── */}
                {/* FIX: was incorrectly nested inside a non-closed similar-products div */}
                {displayProducts.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800">SẢN PHẨM TƯƠNG TỰ</h2>
                            <Link
                                to={`/category/${product.category?.slug}`}
                                className="text-[#8B4513] hover:text-[#A0522D] font-medium"
                            >
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {displayProducts.map((p) => (
                                <ProductCard
                                    key={p._id}
                                    product={p}
                                    onAddToCart={() => window.dispatchEvent(new Event("cart-updated"))}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Review modal ── */}
            <ReviewModal
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                product={product}
                onReviewCreated={() => fetchProductStats(product._id)}
            />
        </div>
    );
};

export default ProductDetailPage;
