import { useState, useEffect } from "react";
import { getMyReviewsApi, deleteReviewApi } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/context/ToastContext";

const MyReviewsPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        fetchReviews();
    }, [page]);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const res = await getMyReviewsApi({ page, limit: 10 });
            if (res.success) {
                setReviews(res.data.reviews);
                setTotalPages(res.data.pagination?.pages || 1);
            }
        } catch (error) {
            console.error("Error fetching reviews:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reviewId) => {
        if (!confirm("Bạn có chắc muốn xóa đánh giá này?")) return;

        try {
            setDeleting(reviewId);
            await deleteReviewApi(reviewId);
            setReviews(reviews.filter(r => r._id !== reviewId));
            showToast("Xóa đánh giá thành công!", "success");
        } catch (error) {
            showToast("Xóa thất bại!", "error");
        } finally {
            setDeleting(null);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("vi-VN", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    };

    return (
        <div className="bg-white rounded-2xl border border-[#EDE8E0]">
                {/* Header */}
                <div className="p-6 border-b border-[#EDE8E0]">
                    <h1 className="text-xl font-bold text-[#1C1108]">Đánh giá của tôi</h1>
                    <p className="text-sm text-[#A8896A] mt-1">Quản lý các đánh giá sản phẩm của bạn</p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin"></div>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-6xl mb-4 select-none">📝</div>
                            <h2 className="text-xl font-bold text-[#1C1108] mb-2">Chưa có đánh giá nào</h2>
                            <p className="text-sm text-[#A8896A] mb-8">Mua hàng và để lại đánh giá cho sản phẩm bạn đã nhận được!</p>
                            <button
                                onClick={() => navigate("/products")}
                                className="inline-flex items-center gap-2 bg-[#B86B05] text-white px-8 py-3 rounded-xl hover:bg-[#95520B] transition-colors font-semibold active:scale-[0.98]"
                            >
                                Khám phá sản phẩm
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((review) => (
                                <div key={review._id} className="rounded-xl border border-[#EDE8E0] p-5">
                                    <div className="flex gap-4">
                                        {/* Product Image */}
                                        <img
                                            src={review.product?.images?.[0] || "/placeholder.png"}
                                            alt={review.product?.name}
                                            className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                                            onClick={() => navigate(`/product/${review.product?._id}`)}
                                        />

                                        {/* Review Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3
                                                        className="font-semibold text-[#1C1108] cursor-pointer hover:text-[#B86B05] transition-colors text-sm line-clamp-1"
                                                        onClick={() => navigate(`/product/${review.product?._id}`)}
                                                    >
                                                        {review.product?.name || "Sản phẩm đã xóa"}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <span key={star} className={`text-sm ${star <= review.rating ? "text-[#F59E0B]" : "text-[#D5C9BC]"}`}>★</span>
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-[#A8896A]">{formatDate(review.createdAt)}</span>
                                                    </div>
                                                    {review.order?.orderNumber && (
                                                        <p className="text-[10px] text-[#A8896A] mt-1">Đơn hàng: {review.order.orderNumber}</p>
                                                    )}
                                                </div>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDelete(review._id)}
                                                    disabled={deleting === review._id}
                                                    className="text-[#BF4343] hover:bg-red-50 p-2 rounded-lg transition-colors shrink-0"
                                                >
                                                    {deleting === review._id ? (
                                                        <span className="w-4 h-4 border-2 border-[#BF4343] border-t-transparent rounded-full animate-spin"></span>
                                                    ) : (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                                                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>

                                            {review.comment && (
                                                <p className="text-sm text-[#6B5C4C] mt-3 leading-relaxed">{review.comment}</p>
                                            )}

                                            {review.images && review.images.length > 0 && (
                                                <div className="flex gap-2 mt-3">
                                                    {review.images.map((img, idx) => (
                                                        <img key={idx} src={img} alt={`Review ${idx + 1}`} className="w-14 h-14 object-cover rounded-lg" />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center gap-2 mt-6">
                                    <button 
                                        onClick={() => setPage(page - 1)} 
                                        disabled={page <= 1}
                                        className="px-4 py-2 rounded-xl bg-[#FAF7F4] text-[#6B5C4C] text-sm font-medium disabled:opacity-40 hover:bg-[#EDE8E0] transition-colors"
                                    >
                                        ← Trước
                                    </button>
                                    <span className="px-4 py-2 rounded-xl text-[#6B5C4C] text-sm font-medium">
                                        Trang {page} / {totalPages}
                                    </span>
                                    <button 
                                        onClick={() => setPage(page + 1)} 
                                        disabled={page >= totalPages}
                                        className="px-4 py-2 rounded-xl bg-[#FAF7F4] text-[#6B5C4C] text-sm font-medium disabled:opacity-40 hover:bg-[#EDE8E0] transition-colors"
                                    >
                                        Sau →
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
    );
};

export default MyReviewsPage;
