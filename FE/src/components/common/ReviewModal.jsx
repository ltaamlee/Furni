import { useState, useEffect } from "react";
import { createReviewApi, getPurchasableProductsApi } from "../../utils/api";

const ReviewModal = ({ isOpen, onClose, product, onReviewCreated }) => {
    const [loading, setLoading] = useState(false);
    const [purchasableProducts, setPurchasableProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchPurchasableProducts();
        }
    }, [isOpen, product?._id]);

    const fetchPurchasableProducts = async () => {
        try {
            setLoadingProducts(true);
            const res = await getPurchasableProductsApi();
            if (res.success) {
                const filtered = (res.data.products || []).filter(
                    p => p.product?._id === product?._id
                );
                setPurchasableProducts(filtered);
                // Auto-select the first purchasable order
                if (filtered.length > 0) {
                    setSelectedOrder(filtered[0].orderId);
                } else {
                    setSelectedOrder(null);
                }
            }
        } catch (error) {
            console.error("Error fetching purchasable products:", error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedOrder) {
            alert("Bạn chưa chọn đơn hàng để đánh giá!");
            return;
        }

        try {
            setLoading(true);
            const res = await createReviewApi({
                productId: product._id,
                orderId: selectedOrder,
                rating,
                comment
            });

            if (res.success) {
                alert(`Cảm ơn bạn đã đánh giá!${res.data.reward?.type === 'cashback' ? `\nBạn nhận được ${res.data.reward.value.toLocaleString('vi-VN')}đ vào ví điện tử!` : ''}`);
                onReviewCreated?.(res.data.review);
                onClose();
                setRating(5);
                setComment("");
            }
        } catch (error) {
            alert(error.response?.data?.message || error.message || "Đánh giá thất bại!");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#8B4513] to-[#A0522D] px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">Đánh giá sản phẩm</h2>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loadingProducts ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#8B4513] rounded-full animate-spin"></div>
                        </div>
                    ) : purchasableProducts.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-5xl mb-4">📦</div>
                            <p className="text-gray-600 font-medium">Bạn chưa mua sản phẩm này hoặc đơn hàng chưa được giao.</p>
                            <p className="text-sm text-gray-400 mt-2">Chỉ những đơn hàng đã giao mới có thể đánh giá.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Product Info + Order Selector */}
                            <div className="flex gap-4 p-4 bg-[#FAF8F5] rounded-xl">
                                <img
                                    src={product?.images?.[0] || "/placeholder.png"}
                                    alt={product?.name}
                                    className="w-20 h-20 object-cover rounded-lg shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800 line-clamp-2">{product?.name}</h3>
                                    {purchasableProducts.length > 0 && (
                                        <p className="text-sm text-[#B86B05] mt-1 font-medium">
                                            Đơn #{purchasableProducts.find(p => p.orderId === selectedOrder)?.orderNumber
                                                || purchasableProducts[0]?.orderNumber}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Order Selector — always show when there are purchasable orders */}
                            {purchasableProducts.length >= 1 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Đơn hàng để đánh giá
                                    </label>
                                    <select
                                        value={selectedOrder || ""}
                                        onChange={(e) => setSelectedOrder(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent text-sm"
                                    >
                                        {purchasableProducts.map((p) => (
                                            <option key={p.orderId} value={p.orderId}>
                                                Đơn #{p.orderNumber} — {p.quantity} sản phẩm
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Star Rating */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Đánh giá của bạn
                                </label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className="text-4xl transition-transform hover:scale-110"
                                        >
                                            {star <= rating ? (
                                                <span className="text-yellow-400">★</span>
                                            ) : (
                                                <span className="text-gray-300">☆</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    {rating === 5 && "Tuyệt vời!"}
                                    {rating === 4 && "Rất tốt"}
                                    {rating === 3 && "Bình thường"}
                                    {rating === 2 && "Không hài lòng"}
                                    {rating === 1 && "Rất tệ"}
                                </p>
                            </div>

                            {/* Comment */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nhận xét (tùy chọn)
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                                    maxLength={500}
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent resize-none"
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">
                                    {comment.length}/500
                                </p>
                            </div>

                            {/* Reward Info */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                                <p className="text-sm text-green-700">
                                    <span className="font-semibold">🎁 Phần thưởng:</span>{" "}
                                    {rating >= 4
                                        ? "Bạn nhận được 10.000đ hoàn trả vào ví điện tử sau khi đánh giá!"
                                        : "Đánh giá từ 4 sao trở lên để nhận thưởng!"}
                                </p>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !selectedOrder}
                                className="w-full bg-[#8B4513] text-white py-3 rounded-xl font-semibold hover:bg-[#A0522D] transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        Đang gửi...
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                            <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Gửi đánh giá
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;
