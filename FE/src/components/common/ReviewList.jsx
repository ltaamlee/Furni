import { useState, useEffect } from "react";
import { getProductReviewsApi } from "../../utils/api";

const ReviewList = ({ productId }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sort, setSort] = useState("newest");
    const [distribution, setDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

    const fetchReviews = async (pageNum = 1, sortOption = sort) => {
        try {
            setLoading(true);
            const res = await getProductReviewsApi(productId, {
                page: pageNum,
                limit: 5,
                sort: sortOption
            });
            if (res.success) {
                setReviews(res.data.reviews);
                setTotalPages(res.data.pagination.pages);
                setDistribution(res.data.distribution);
                setPage(pageNum);
            }
        } catch (error) {
            console.error("Error fetching reviews:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [productId]);

    const handleSortChange = (newSort) => {
        setSort(newSort);
        fetchReviews(1, newSort);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("vi-VN", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    };

    const totalReviews = Object.values(distribution).reduce((a, b) => a + b, 0);
    const averageRating = totalReviews > 0
        ? (Object.entries(distribution).reduce((sum, [star, count]) => sum + parseInt(star) * count, 0) / totalReviews).toFixed(1)
        : 0;

    if (loading && reviews.length === 0) {
        return (
            <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-[#8B4513] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Rating Summary */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    {/* Average Rating */}
                    <div className="text-center">
                        <div className="text-5xl font-bold text-[#8B4513]">{averageRating}</div>
                        <div className="flex mt-2 justify-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} className="text-xl">
                                    {star <= Math.round(averageRating) ? "★" : "☆"}
                                </span>
                            ))}
                        </div>
                        <p className="text-gray-500 text-sm mt-1">{totalReviews} đánh giá</p>
                    </div>

                    {/* Rating Distribution */}
                    <div className="flex-1 space-y-2">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = distribution[star] || 0;
                            const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                            return (
                                <div key={star} className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600 w-12">{star} ★</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-yellow-400 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm text-gray-500 w-12 text-right">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Sort Options */}
            <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 py-2">Sắp xếp:</span>
                {[
                    { value: "newest", label: "Mới nhất" },
                    { value: "oldest", label: "Cũ nhất" },
                    { value: "highest", label: "Cao nhất" },
                    { value: "lowest", label: "Thấp nhất" }
                ].map((option) => (
                    <button
                        key={option.value}
                        onClick={() => handleSortChange(option.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                            sort === option.value
                                ? "bg-[#8B4513] text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Review List */}
            <div className="space-y-4">
                {reviews.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl">
                        <div className="text-5xl mb-4">📝</div>
                        <p className="text-gray-500">Chưa có đánh giá nào cho sản phẩm này.</p>
                        <p className="text-gray-400 text-sm mt-2">Hãy là người đầu tiên đánh giá!</p>
                    </div>
                ) : (
                    reviews.map((review) => (
                        <div key={review._id} className="bg-white rounded-2xl shadow-sm p-6">
                            <div className="flex items-start gap-4">
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8B4513] to-[#A0522D] flex items-center justify-center text-white font-bold text-lg">
                                    {review.user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">
                                                {review.user?.fullName || "Người dùng"}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <span key={star} className={`text-sm ${star <= review.rating ? "text-yellow-400" : "text-gray-300"}`}>
                                                            ★
                                                        </span>
                                                    ))}
                                                </div>
                                                {review.isVerifiedPurchase && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                        ✓ Đã mua hàng
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-sm text-gray-400">
                                            {formatDate(review.createdAt)}
                                        </span>
                                    </div>

                                    {review.content && (
                                        <p className="text-gray-600 mt-3 whitespace-pre-line">
                                            {review.content}
                                        </p>
                                    )}

                                    {/* Review Images */}
                                    {review.images && review.images.length > 0 && (
                                        <div className="flex gap-2 mt-3">
                                            {review.images.map((img, idx) => (
                                                <img
                                                    key={idx}
                                                    src={img}
                                                    alt={`Review ${idx + 1}`}
                                                    className="w-20 h-20 object-cover rounded-lg"
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Vendor Reply */}
                                    {review.vendorReply && review.vendorReply.content && (
                                        <div className="mt-4 bg-blue-50 rounded-xl p-4 border-l-4 border-blue-400">
                                            <p className="text-sm font-medium text-blue-800 mb-1">Phản hồi từ cửa hàng:</p>
                                            <p className="text-gray-600">{review.vendorReply.content}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <button
                        onClick={() => fetchReviews(page - 1)}
                        disabled={page <= 1}
                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition"
                    >
                        ← Trước
                    </button>
                    <span className="px-4 py-2 text-gray-600">
                        Trang {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => fetchReviews(page + 1)}
                        disabled={page >= totalPages}
                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition"
                    >
                        Sau →
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReviewList;
