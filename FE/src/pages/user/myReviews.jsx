import { useState, useEffect } from "react";
import { getMyReviewsApi, deleteReviewApi } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";

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
                setTotalPages(res.data.pagination.pages);
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
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">ĐÁNH GIÁ CỦA TÔI</h1>
                    <p className="text-gray-500">Quản lý các đánh giá sản phẩm của bạn</p>
                </div>

                {reviews.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <div className="text-6xl mb-4">📝</div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Chưa có đánh giá nào</h2>
                        <p className="text-gray-500 mb-6">Mua hàng và để lại đánh giá cho sản phẩm bạn đã nhận được!</p>
                        <button
                            onClick={() => navigate("/products")}
                            className="bg-[#8B4513] text-white px-6 py-3 rounded-full hover:bg-[#A0522D] transition"
                        >
                            Khám phá sản phẩm
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <div key={review._id} className="bg-white rounded-2xl shadow-sm p-6">
                                <div className="flex gap-4">
                                    {/* Product Image */}
                                    <img
                                        src={review.product?.images?.[0] || "/placeholder.png"}
                                        alt={review.product?.name}
                                        className="w-24 h-24 object-cover rounded-xl cursor-pointer"
                                        onClick={() => navigate(`/product/${review.product?._id}`)}
                                    />

                                    {/* Review Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3
                                                    className="font-semibold text-gray-800 cursor-pointer hover:text-[#8B4513]"
                                                    onClick={() => navigate(`/product/${review.product?._id}`)}
                                                >
                                                    {review.product?.name || "Sản phẩm đã xóa"}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <span
                                                                key={star}
                                                                className={`text-sm ${star <= review.rating ? "text-yellow-400" : "text-gray-300"}`}
                                                            >
                                                                ★
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                        {formatDate(review.createdAt)}
                                                    </span>
                                                </div>
                                                {review.order?.orderNumber && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Đơn hàng: {review.order.orderNumber}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => handleDelete(review._id)}
                                                disabled={deleting === review._id}
                                                className="text-red-500 hover:text-red-700 p-2 transition"
                                            >
                                                {deleting === review._id ? (
                                                    <span className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></span>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>

                                        {review.comment && (
                                            <p className="text-gray-600 mt-3">{review.comment}</p>
                                        )}

                                        {review.images && review.images.length > 0 && (
                                            <div className="flex gap-2 mt-3">
                                                {review.images.map((img, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={img}
                                                        alt={`Review ${idx + 1}`}
                                                        className="w-16 h-16 object-cover rounded-lg"
                                                    />
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyReviewsPage;
