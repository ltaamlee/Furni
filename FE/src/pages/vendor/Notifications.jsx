import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Card, CardTitle, Btn, Toggle, Tabs } from "../../components/vendor/ui";
import { notifSettings as seedSettings } from "../../components/vendor/data";
import {
    IconBag, IconStar, IconAlertTriangle, IconDollar, IconAlertCircle, IconCheck, IconX,
} from "../../components/vendor/icons";
import { useToast } from "../../components/context/ToastContext";
import {
    getVendorNotificationsApi, markNotificationReadApi, markAllNotificationsReadApi, deleteNotificationApi,
} from "../../utils/api";

const NOTIF_STYLE = {
    order: { bg: "#dbeafe", color: "#2563eb", Icon: IconBag },
    review: { bg: "#fef3c7", color: "#92400e", Icon: IconStar },
    stock: { bg: "#fee2e2", color: "#dc2626", Icon: IconAlertTriangle },
    wallet: { bg: "#dcfce7", color: "#15803d", Icon: IconDollar },
    promotion: { bg: "#ede9fe", color: "#7c3aed", Icon: IconStar },
    system: { bg: "#f3f4f6", color: "#6b7280", Icon: IconAlertCircle },
};
const SUMMARY_META = [
    { key: "order", label: "Đơn hàng", color: "text-[#2563eb]" },
    { key: "review", label: "Đánh giá", color: "text-[#B86B05]" },
    { key: "stock", label: "Cảnh báo kho", color: "text-[#dc2626]" },
    { key: "system", label: "Hệ thống", color: "text-[#16a34a]" },
];
// Tab lọc theo loại thông báo (đếm động theo dữ liệu thật)
const TAB_DEFS = [
    { key: "all", label: "Tất cả" },
    { key: "order", label: "Đơn hàng" },
    { key: "review", label: "Đánh giá" },
    { key: "stock", label: "Tồn kho" },
    { key: "wallet", label: "Ví" },
    { key: "system", label: "Hệ thống" },
];

const sameDay = (a, b) => a.toDateString() === b.toDateString();
const groupOf = (d) => {
    const date = new Date(d);
    const now = new Date();
    if (sameDay(date, now)) return "Hôm nay";
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (sameDay(date, yest)) return "Hôm qua";
    return "Cũ hơn";
};
const timeOf = (d) => new Date(d).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

const NotifItem = ({ n, onOpen, onRead, onDelete }) => {
    const { bg, color, Icon } = NOTIF_STYLE[n.type] || NOTIF_STYLE.system;
    const unread = !n.isRead;
    const clickable = !!n.link;
    return (
        <div
            onClick={() => onOpen(n)}
            className={`group flex items-start gap-3 px-4 py-3 border-b border-[#EDE8E0] relative transition-colors hover:bg-[#FDFAF7] ${unread ? "bg-[#fffcf5]" : ""} ${clickable ? "cursor-pointer" : ""}`}
        >
            {unread && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#B86B05] rounded-r-[2px]" />}
            <div className="w-[38px] h-[38px] rounded-[6px] flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold mb-0.5 leading-snug">{n.title}</div>
                <div className="text-[12.5px] text-[#6B5C4C] leading-snug">{n.body}</div>
                <div className="text-[11px] text-[#9E8E7E] mt-1">{timeOf(n.createdAt)}</div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {unread && (
                    <button onClick={(e) => { e.stopPropagation(); onRead(n._id); }} title="Đánh dấu đã đọc" className="w-[26px] h-[26px] border border-[#EDE8E0] bg-white rounded-[5px] flex items-center justify-center text-[#9E8E7E] hover:border-[#B86B05] hover:text-[#B86B05]">
                        <IconCheck size={12} strokeWidth={2.5} />
                    </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); onDelete(n._id); }} title="Xóa" className="w-[26px] h-[26px] border border-[#EDE8E0] bg-white rounded-[5px] flex items-center justify-center text-[#9E8E7E] hover:border-[#B86B05] hover:text-[#B86B05]">
                    <IconX size={12} />
                </button>
            </div>
        </div>
    );
};

const Notifications = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [tab, setTab] = useState("all");
    const [list, setList] = useState([]);
    const [summary7d, setSummary7d] = useState({});
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState(seedSettings);
    const [threshold, setThreshold] = useState(5);

    const fetchNotifs = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getVendorNotificationsApi({ limit: 50 });
            if (res.success) {
                setList(res.data.notifications || []);
                setSummary7d(res.data.summary7d || {});
            }
        } catch {
            setList([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(fetchNotifs, 0);
        return () => clearTimeout(t);
    }, [fetchNotifs]);

    const unreadCount = useMemo(() => list.filter((n) => !n.isRead).length, [list]);
    const counts = useMemo(() => {
        const c = { all: list.length };
        list.forEach((n) => { c[n.type] = (c[n.type] || 0) + 1; });
        return c;
    }, [list]);
    const tabs = TAB_DEFS.map((t) => ({ ...t, count: counts[t.key] ?? 0 }));
    const filtered = tab === "all" ? list : list.filter((n) => n.type === tab);
    const groups = [...new Set(filtered.map((n) => groupOf(n.createdAt)))];

    const markRead = async (id) => {
        setList((l) => l.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
        await markNotificationReadApi(id).catch(() => {});
    };
    // Click vào thông báo: đánh dấu đã đọc rồi điều hướng tới đúng vị trí
    const openNotif = (n) => {
        if (!n.isRead) markRead(n._id);
        if (n.link) navigate(n.link);
    };
    const deleteNotif = async (id) => {
        setList((l) => l.filter((n) => n._id !== id));
        await deleteNotificationApi(id).catch(() => {});
    };
    const markAllRead = async () => {
        setList((l) => l.map((n) => ({ ...n, isRead: true })));
        await markAllNotificationsReadApi().catch(() => {});
    };
    const toggleSetting = (key) => setSettings((s) => s.map((x) => (x.key === key ? { ...x, on: !x.on } : x)));

    return (
        <div className="vendor-fade-in">
            <PageHeader
                title="Thông báo"
                sub={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Không có thông báo chưa đọc"}
                actions={<Btn variant="ghost" size="sm" className="text-[#B86B05]" onClick={markAllRead}>Đánh dấu tất cả đã đọc</Btn>}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* Notification list */}
                <div>
                    <Tabs tabs={tabs} active={tab} onChange={setTab} />
                    <div className="bg-white border border-[#EDE8E0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden -mt-[18px]">
                        {loading ? (
                            <div className="text-center py-12 text-[#9E8E7E] text-[13px]">Đang tải...</div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-12 text-[#9E8E7E] text-[13px]">Không có thông báo nào</div>
                        ) : (
                            groups.map((g) => (
                                <div key={g}>
                                    <div className="px-4"><div className="text-[11px] font-bold text-[#9E8E7E] uppercase tracking-[0.07em] pt-3.5 pb-2 border-b border-[#EDE8E0]">{g}</div></div>
                                    {filtered.filter((n) => groupOf(n.createdAt) === g).map((n) => (
                                        <NotifItem key={n._id} n={n} onOpen={openNotif} onRead={markRead} onDelete={deleteNotif} />
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Settings + summary */}
                <div className="space-y-3.5">
                    <Card>
                        <CardTitle>Cài đặt thông báo</CardTitle>
                        <div className="text-[11.5px] text-[#6B5C4C] -mt-2 mb-3.5">Chọn loại thông báo bạn muốn nhận trong ứng dụng</div>
                        {settings.map((s) => (
                            <div key={s.key} className="flex items-center justify-between py-3 border-b border-[#EDE8E0]">
                                <div>
                                    <div className="text-[13px] font-semibold">{s.label}</div>
                                    <div className="text-[11.5px] text-[#9E8E7E]">{s.sub}</div>
                                </div>
                                <Toggle on={s.on} onChange={() => toggleSetting(s.key)} />
                            </div>
                        ))}
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <div className="text-[13px] font-semibold">Ngưỡng cảnh báo tồn kho</div>
                                <div className="text-[11.5px] text-[#9E8E7E]">Cảnh báo khi dưới mức này</div>
                            </div>
                            <input
                                type="number"
                                value={threshold}
                                onChange={(e) => setThreshold(e.target.value)}
                                className="w-[70px] text-center px-2 py-1.5 border-[1.5px] border-[#EDE8E0] rounded-[6px] text-[13px] outline-none focus:border-[#B86B05]"
                            />
                        </div>
                        <Btn variant="primary" size="sm" className="w-full mt-3.5" onClick={() => showToast("Đã lưu cài đặt thông báo", "success")}>Lưu cài đặt</Btn>
                    </Card>

                    <Card>
                        <CardTitle>Tóm tắt 7 ngày</CardTitle>
                        <div className="grid grid-cols-2 gap-px bg-[#EDE8E0] rounded-[6px] overflow-hidden">
                            {SUMMARY_META.map((s) => (
                                <div key={s.key} className="bg-white p-3 text-center">
                                    <div className={`text-[22px] font-extrabold ${s.color}`}>{summary7d[s.key] || 0}</div>
                                    <div className="text-[11.5px] text-[#9E8E7E]">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Notifications;
