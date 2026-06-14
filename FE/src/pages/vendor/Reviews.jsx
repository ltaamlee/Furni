import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, Btn, Badge, Stars, AlertStrip, SearchInput, selectClass } from "../../components/vendor/ui";
import { IconFlag, IconAlertCircle } from "../../components/vendor/icons";
import { useToast } from "../../components/context/ToastContext";
import { getVendorReviewsApi, replyVendorReviewApi } from "../../utils/api";

const AVATARS = ["from-[#B86B05] to-[#DE9601]", "from-[#6366f1] to-[#8b5cf6]", "from-[#0891b2] to-[#06b6d4]", "from-[#dc2626] to-[#b91c1c]"];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");

const ReviewCard = ({ review, draft, onDraft, onSubmit, sending }) => {
    const replied = !!review.vendorReply?.repliedAt;
    const statusTone = replied ? "green" : review.rating <= 2 ? "red" : "yellow";
    const statusLabel = replied ? "Đã phản hồi" : "Chưa phản hồi";
    const name = review.user?.fullName || "Khách hàng";
    const initial = name.charAt(0).toUpperCase();
    const avatar = AVATARS[(review.rating + name.length) % AVATARS.length];
    const cardBorder = !replied && review.rating <= 2 ? "border-[#fecaca]" : "border-[#EDE8E0]";

    return (
        <div className={`bg-white border rounded-[10px] p-[16px_18px] mb-2.5 transition-colors hover:border-[#D5C9BC] ${cardBorder}`}>
            <div className="flex gap-3 items-start">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatar} flex items-center justify-center text-white font-bold text-[13px] shrink-0`}>
                    {initial}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <span className="font-bold text-[13.5px]">{name}</span>
                            <div className="mt-1"><Stars value={review.rating} /></div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Badge tone={statusTone}>{statusLabel}</Badge>
                            <span className="text-[11.5px] text-[#9E8E7E]">{fmtDate(review.createdAt)}</span>
                        </div>
                    </div>
                    <div className="text-[12.5px] text-[#9E8E7E] mt-0.5">{review.product?.name || "Sản phẩm"}</div>
                    <div className="text-[13.5px] mt-2 leading-relaxed">{review.content}</div>

                    {!replied && review.rating <= 1 && (
                        <AlertStrip tone="danger" icon={<IconAlertCircle size={13} className="shrink-0" />} className="mt-2.5">
                            Đánh giá 1 sao cần được phản hồi sớm để bảo vệ uy tín shop.
                        </AlertStrip>
                    )}

                    {replied ? (
                        <div className="bg-[#FAF7F4] rounded-[6px] p-[12px_14px] mt-3 border-l-[3px] border-[#B86B05]">
                            <div className="text-[11.5px] font-bold text-[#95520B] mb-1">Phản hồi của shop · {fmtDate(review.vendorReply.repliedAt)}</div>
                            <div className="text-[13px] leading-normal">{review.vendorReply.content}</div>
                        </div>
                    ) : (
                        <div className="flex gap-2 mt-3 items-end">
                            <textarea
                                value={draft || ""}
                                onChange={(e) => onDraft(review._id, e.target.value)}
                                placeholder="Phản hồi đánh giá của khách hàng..."
                                className="flex-1 px-3 py-2 border-[1.5px] border-[#EDE8E0] rounded-[6px] text-[13px] resize-none outline-none transition-colors focus:border-[#B86B05] min-h-[60px]"
                            />
                            <div className="flex flex-col gap-1">
                                <Btn variant="primary" size="sm" disabled={sending} onClick={() => onSubmit(review._id)}>Gửi</Btn>
                                <button className="flex items-center justify-center text-[#9E8E7E] hover:text-[#dc2626]"><IconFlag size={11} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Reviews = () => {
    const { showToast } = useToast();
    const [reviews, setReviews] = useState([]);
    const [summary, setSummary] = useState({ avg: 0, total: 0, distribution: [] });
    const [stats, setStats] = useState({ unreplied: 0, replied: 0, thisMonth: 0, reported: 0 });
    const [loading, setLoading] = useState(true);
    const [drafts, setDrafts] = useState({});
    const [sending, setSending] = useState(false);

    const [search, setSearch] = useState("");
    const [rating, setRating] = useState("");
    const [replied, setReplied] = useState("");

    const fetchReviews = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getVendorReviewsApi({ search: search || undefined, rating: rating || undefined, replied: replied || undefined, limit: 50 });
            if (res.success) {
                setReviews(res.data.reviews || []);
                setSummary(res.data.summary || { avg: 0, total: 0, distribution: [] });
                setStats(res.data.stats || {});
            }
        } catch {
            setReviews([]);
        } finally {
            setLoading(false);
        }
    }, [search, rating, replied]);

    useEffect(() => {
        const t = setTimeout(fetchReviews, 300);
        return () => clearTimeout(t);
    }, [fetchReviews]);

    const onDraft = (id, text) => setDrafts((d) => ({ ...d, [id]: text }));
    const onSubmit = async (id) => {
        const text = (drafts[id] || "").trim();
        if (!text) return;
        try {
            setSending(true);
            const res = await replyVendorReviewApi(id, text);
            if (res.success) {
                showToast("Đã gửi phản hồi", "success");
                setDrafts((d) => { const n = { ...d }; delete n[id]; return n; });
                fetchReviews();
            } else {
                showToast(res.message || "Gửi phản hồi thất bại", "error");
            }
        } catch {
            showToast("Có lỗi xảy ra", "error");
        } finally {
            setSending(false);
        }
    };

    const repliedRate = stats.replied + stats.unreplied ? Math.round((stats.replied / (stats.replied + stats.unreplied)) * 1000) / 10 : 0;
    const statCards = [
        { label: "Chưa phản hồi", value: stats.unreplied || 0, color: "text-[#dc2626]", sub: "cần xử lý" },
        { label: "Đã phản hồi", value: stats.replied || 0, color: "text-[#16a34a]", sub: `tỉ lệ ${repliedRate}%` },
        { label: "Đánh giá tháng này", value: stats.thisMonth || 0, color: "text-[#B86B05]", sub: "" },
        { label: "Vi phạm bị báo cáo", value: stats.reported || 0, color: "text-[#d97706]", sub: "đang xem xét" },
    ];

    return (
        <div className="vendor-fade-in">
            <PageHeader title="Đánh giá & bình luận" sub={`${summary.total} đánh giá tổng cộng`} />

            {/* Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                <Card>
                    <div className="flex gap-6 items-center">
                        <div className="text-center shrink-0">
                            <div className="text-[52px] font-extrabold leading-none text-[#95520B]">{summary.avg}</div>
                            <div className="flex justify-center my-1.5"><Stars value={summary.avg} /></div>
                            <div className="text-[11.5px] text-[#9E8E7E]">{summary.total} đánh giá</div>
                        </div>
                        <div className="flex-1">
                            {summary.distribution.map((d) => (
                                <div key={d.star} className="flex items-center gap-2.5 mb-1.5 last:mb-0">
                                    <span className="text-[12px] w-3.5 text-right">{d.star}</span>
                                    <div className="flex-1 h-[7px] bg-[#EDE8E0] rounded overflow-hidden">
                                        <div className="h-full rounded bg-gradient-to-r from-[#FBC309] to-[#B86B05]" style={{ width: `${d.pct}%` }} />
                                    </div>
                                    <span className="text-[12px] text-[#6B5C4C] w-7">{d.pct}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <div className="bg-white border border-[#EDE8E0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
                    <div className="grid grid-cols-2">
                        {statCards.map((s, i) => (
                            <div key={s.label} className={`p-[14px_16px] ${i % 2 === 0 ? "border-r border-[#EDE8E0]" : ""} ${i < 2 ? "border-b border-[#EDE8E0]" : ""}`}>
                                <div className="text-[11.5px] text-[#9E8E7E] mb-1">{s.label}</div>
                                <div className={`text-[22px] font-extrabold ${s.color}`}>{s.value}</div>
                                <div className="text-[11.5px] text-[#9E8E7E] mt-0.5">{s.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-3.5 flex-wrap">
                <SearchInput placeholder="Nội dung đánh giá..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className={selectClass} value={rating} onChange={(e) => setRating(e.target.value)}>
                    <option value="">Tất cả sao</option>
                    {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s} sao</option>)}
                </select>
                <select className={selectClass} value={replied} onChange={(e) => setReplied(e.target.value)}>
                    <option value="">Tất cả trạng thái</option>
                    <option value="false">Chưa phản hồi</option>
                    <option value="true">Đã phản hồi</option>
                </select>
            </div>

            {/* Review list */}
            <div>
                {loading ? (
                    <div className="text-center py-12 text-[#9E8E7E] text-[13px]">Đang tải...</div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-12 text-[#9E8E7E] text-[13px]">Chưa có đánh giá nào</div>
                ) : (
                    reviews.map((r) => (
                        <ReviewCard key={r._id} review={r} draft={drafts[r._id]} onDraft={onDraft} onSubmit={onSubmit} sending={sending} />
                    ))
                )}
            </div>
        </div>
    );
};

export default Reviews;
