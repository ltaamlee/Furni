import { useState } from "react";
import { PageHeader, Card, Btn, Badge, Stars, AlertStrip, SearchInput, selectClass } from "../../components/vendor/ui";
import { reviewSummary, reviewStats, reviews as seedReviews } from "../../components/vendor/data";
import { IconFlag, IconAlertCircle } from "../../components/vendor/icons";

const FlagBtn = () => (
    <button className="flex items-center gap-1 text-[11.5px] text-[#9E8E7E] transition-colors hover:text-[#dc2626]">
        <IconFlag size={11} /> Báo cáo vi phạm
    </button>
);

const ReviewCard = ({ review, draft, onDraft, onSubmit }) => {
    const replied = !!review.reply;
    const statusTone = replied ? "green" : review.rating <= 2 ? "red" : "yellow";
    const statusLabel = replied ? "Đã phản hồi" : "Chưa phản hồi";

    return (
        <div className={`bg-white border rounded-[10px] p-[16px_18px] mb-2.5 transition-colors hover:border-[#D5C9BC] ${review.cardBorder || "border-[#EDE8E0]"}`}>
            <div className="flex gap-3 items-start">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${review.avatar} flex items-center justify-center text-white font-bold text-[13px] shrink-0`}>
                    {review.initial}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <span className="font-bold text-[13.5px]">{review.name}</span>
                            <div className="mt-1"><Stars value={review.rating} /></div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Badge tone={statusTone}>{statusLabel}</Badge>
                            <span className="text-[11.5px] text-[#9E8E7E]">{review.date}</span>
                        </div>
                    </div>
                    <div className="text-[12.5px] text-[#9E8E7E] mt-0.5">{review.product}</div>
                    <div className="text-[13.5px] mt-2 leading-relaxed">{review.content}</div>

                    {review.alert && (
                        <AlertStrip tone="danger" icon={<IconAlertCircle size={13} className="shrink-0" />} className="mt-2.5">
                            Đánh giá 1 sao cần được phản hồi sớm để bảo vệ uy tín shop.
                        </AlertStrip>
                    )}

                    {replied ? (
                        <>
                            <div className="bg-[#FAF7F4] rounded-[6px] p-[12px_14px] mt-3 border-l-[3px] border-[#B86B05]">
                                <div className="text-[11.5px] font-bold text-[#95520B] mb-1">Phản hồi của shop · {review.reply.date}</div>
                                <div className="text-[13px] leading-normal">{review.reply.text}</div>
                            </div>
                            <div className="mt-2"><FlagBtn /></div>
                        </>
                    ) : (
                        <div className="flex gap-2 mt-3 items-end">
                            <textarea
                                value={draft || ""}
                                onChange={(e) => onDraft(review.id, e.target.value)}
                                placeholder="Phản hồi đánh giá của khách hàng..."
                                className="flex-1 px-3 py-2 border-[1.5px] border-[#EDE8E0] rounded-[6px] text-[13px] resize-none outline-none transition-colors focus:border-[#B86B05] min-h-[60px]"
                            />
                            <div className="flex flex-col gap-1">
                                <Btn variant="primary" size="sm" onClick={() => onSubmit(review.id)}>Gửi</Btn>
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
    const [list, setList] = useState(seedReviews);
    const [drafts, setDrafts] = useState({});

    const onDraft = (id, text) => setDrafts((d) => ({ ...d, [id]: text }));
    const onSubmit = (id) => {
        const text = (drafts[id] || "").trim();
        if (!text) return;
        setList((l) => l.map((r) => (r.id === id ? { ...r, reply: { date: "Vừa xong", text }, cardBorder: undefined, alert: false } : r)));
        setDrafts((d) => {
            const n = { ...d };
            delete n[id];
            return n;
        });
    };

    return (
        <div className="vendor-fade-in">
            <PageHeader title="Đánh giá & bình luận" sub={`${reviewSummary.total} đánh giá tổng cộng`} />

            {/* Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                <Card>
                    <div className="flex gap-6 items-center">
                        <div className="text-center shrink-0">
                            <div className="text-[52px] font-extrabold leading-none text-[#95520B]">{reviewSummary.avg}</div>
                            <div className="flex justify-center my-1.5"><Stars value={reviewSummary.avg} /></div>
                            <div className="text-[11.5px] text-[#9E8E7E]">{reviewSummary.total} đánh giá</div>
                        </div>
                        <div className="flex-1">
                            {reviewSummary.distribution.map((d) => (
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
                        {reviewStats.map((s, i) => (
                            <div
                                key={s.label}
                                className={`p-[14px_16px] ${i % 2 === 0 ? "border-r border-[#EDE8E0]" : ""} ${i < 2 ? "border-b border-[#EDE8E0]" : ""}`}
                            >
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
                <SearchInput placeholder="Tên khách, nội dung..." />
                <select className={selectClass}><option>Tất cả sao</option><option>5 sao</option><option>4 sao</option><option>3 sao</option><option>2 sao</option><option>1 sao</option></select>
                <select className={selectClass}><option>Tất cả trạng thái</option><option>Chưa phản hồi</option><option>Đã phản hồi</option></select>
                <select className={selectClass}><option>Tất cả sản phẩm</option><option>Sofa Góc Chữ L Nordic</option><option>Bàn Làm Việc Gỗ Sồi</option><option>Tủ Quần Áo 4 Cánh</option></select>
            </div>

            {/* Review list */}
            <div>
                {list.map((r) => (
                    <ReviewCard key={r.id} review={r} draft={drafts[r.id]} onDraft={onDraft} onSubmit={onSubmit} />
                ))}
            </div>

            <div className="text-center mt-4">
                <Btn variant="outline">Tải thêm đánh giá</Btn>
            </div>
        </div>
    );
};

export default Reviews;
