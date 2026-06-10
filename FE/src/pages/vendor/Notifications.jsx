import { useMemo, useState } from "react";
import { PageHeader, Card, CardTitle, Btn, Toggle, Tabs } from "../../components/vendor/ui";
import { notifTabs, notifications as seed, notifSettings as seedSettings, notif7d } from "../../components/vendor/data";
import {
    IconBag, IconStar, IconAlertTriangle, IconDollar, IconAlertCircle, IconCheck, IconX,
} from "../../components/vendor/icons";

const NOTIF_STYLE = {
    order: { bg: "#dbeafe", color: "#2563eb", Icon: IconBag },
    review: { bg: "#fef3c7", color: "#92400e", Icon: IconStar },
    stock: { bg: "#fee2e2", color: "#dc2626", Icon: IconAlertTriangle },
    wallet: { bg: "#dcfce7", color: "#15803d", Icon: IconDollar },
    system: { bg: "#f3f4f6", color: "#6b7280", Icon: IconAlertCircle },
};

const NotifItem = ({ n, onRead, onDelete }) => {
    const { bg, color, Icon } = NOTIF_STYLE[n.type];
    return (
        <div className={`group flex items-start gap-3 px-4 py-3 border-b border-[#EDE8E0] relative cursor-pointer transition-colors hover:bg-[#FDFAF7] ${n.unread ? "bg-[#fffcf5]" : ""}`}>
            {n.unread && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#B86B05] rounded-r-[2px]" />}
            <div className="w-[38px] h-[38px] rounded-[6px] flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold mb-0.5 leading-snug">{n.title}</div>
                <div className="text-[12.5px] text-[#6B5C4C] leading-snug">{n.body}</div>
                <div className="text-[11px] text-[#9E8E7E] mt-1">{n.time}</div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {n.unread && (
                    <button onClick={() => onRead(n.id)} title="Đánh dấu đã đọc" className="w-[26px] h-[26px] border border-[#EDE8E0] bg-white rounded-[5px] flex items-center justify-center text-[#9E8E7E] hover:border-[#B86B05] hover:text-[#B86B05]">
                        <IconCheck size={12} strokeWidth={2.5} />
                    </button>
                )}
                <button onClick={() => onDelete(n.id)} title="Xóa" className="w-[26px] h-[26px] border border-[#EDE8E0] bg-white rounded-[5px] flex items-center justify-center text-[#9E8E7E] hover:border-[#B86B05] hover:text-[#B86B05]">
                    <IconX size={12} />
                </button>
            </div>
        </div>
    );
};

const Notifications = () => {
    const [tab, setTab] = useState("all");
    const [list, setList] = useState(seed);
    const [settings, setSettings] = useState(seedSettings);
    const [threshold, setThreshold] = useState(5);

    const unreadCount = useMemo(() => list.filter((n) => n.unread).length, [list]);

    const filtered = tab === "all" ? list : list.filter((n) => n.type === tab);
    const groups = [...new Set(filtered.map((n) => n.group))];

    const markRead = (id) => setList((l) => l.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    const deleteNotif = (id) => setList((l) => l.filter((n) => n.id !== id));
    const markAllRead = () => setList((l) => l.map((n) => ({ ...n, unread: false })));
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
                    <Tabs tabs={notifTabs} active={tab} onChange={setTab} />
                    <div className="bg-white border border-[#EDE8E0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden -mt-[18px]">
                        {filtered.length === 0 ? (
                            <div className="text-center py-12 text-[#9E8E7E] text-[13px]">Không có thông báo nào</div>
                        ) : (
                            <>
                                {groups.map((g) => (
                                    <div key={g}>
                                        <div className="px-4"><div className="text-[11px] font-bold text-[#9E8E7E] uppercase tracking-[0.07em] pt-3.5 pb-2 border-b border-[#EDE8E0]">{g}</div></div>
                                        {filtered.filter((n) => n.group === g).map((n) => (
                                            <NotifItem key={n.id} n={n} onRead={markRead} onDelete={deleteNotif} />
                                        ))}
                                    </div>
                                ))}
                                <div className="text-center py-3">
                                    <Btn variant="ghost" size="sm" className="text-[#B86B05]">Tải thêm thông báo →</Btn>
                                </div>
                            </>
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
                        <Btn variant="primary" size="sm" className="w-full mt-3.5">Lưu cài đặt</Btn>
                    </Card>

                    <Card>
                        <CardTitle>Tóm tắt 7 ngày</CardTitle>
                        <div className="grid grid-cols-2 gap-px bg-[#EDE8E0] rounded-[6px] overflow-hidden">
                            {notif7d.map((s) => (
                                <div key={s.label} className="bg-white p-3 text-center">
                                    <div className={`text-[22px] font-extrabold ${s.color}`}>{s.value}</div>
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
