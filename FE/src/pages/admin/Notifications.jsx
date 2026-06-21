import React, { useState, useEffect, useCallback } from "react";
import { getAdminNotificationsApi, markAdminNotificationReadApi, markAllAdminNotificationsReadApi, deleteAdminNotificationApi } from "../../utils/api";

const AdminNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, pages: 1 });

    // STATE QUẢN LÝ MODAL XÁC NHẬN
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
    const [readAllModal, setReadAllModal] = useState(false);

    const fetchNotifs = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await getAdminNotificationsApi({ page: p, limit: 10 });
            if (res && res.success) {
                setNotifications(res.data.notifications);
                setPagination(res.data.pagination);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

    const handleReadOne = async (id) => {
        const res = await markAdminNotificationReadApi(id);
        if (res.success) {
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        }
    };
    const executeReadAll = async () => {
        try {
            const res = await markAllAdminNotificationsReadApi();
            if (res.success) {
                fetchNotifs(pagination.page);
                setReadAllModal(false); 
            }
        } catch (error) {
            console.error("Lỗi đọc tất cả thông báo:", error);
        }
    };

    //Xử lý xóa 1 thông báo
    const executeDelete = async () => {
        try {
            const res = await deleteAdminNotificationApi(deleteModal.id);
            if (res.success) {
                fetchNotifs(pagination.page);
                setDeleteModal({ show: false, id: null }); 
            }
        } catch (error) {
            console.error("Lỗi xóa thông báo:", error);
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${hours}:${minutes} - ${day}/${month}/${year}`;
    };

    return (
        <div className="w-full font-sans relative">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-[18px] font-bold text-[#853D12]">Hộp thư thông báo</h2>
                <button 
                    onClick={() => setReadAllModal(true)} 
                    className="text-[13px] text-[#853D12] font-semibold hover:underline cursor-pointer transition-colors"
                >
                    Đánh dấu tất cả đã đọc
                </button>
            </div>

            <div className="bg-white rounded-[8px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-[#e2d8d0] overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-[#777] font-medium">Đang tải thông báo...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-10 text-center text-[#777] font-medium">Không có thông báo nào.</div>
                ) : (
                    <div className="divide-y divide-[#e2d8d0]">
                        {notifications.map(n => (
                            <div 
                                key={n._id} 
                                className={`p-5 flex justify-between items-start transition-colors ${!n.isRead ? 'bg-[#fef1e8]/60' : 'hover:bg-[#faf7f5]'}`}
                            >
                                <div className="flex gap-4 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!n.isRead ? 'bg-[#853D12] text-white shadow-sm' : 'bg-[#e2d8d0] text-[#777]'}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col gap-[6px] cursor-pointer w-full" onClick={() => !n.isRead && handleReadOne(n._id)}>
                                        <h4 className={`m-0 text-[15px] ${!n.isRead ? 'font-bold text-[#333]' : 'font-medium text-[#777]'}`}>
                                            {n.title}
                                        </h4>
                                        <p className={`m-0 text-[14px] leading-relaxed ${!n.isRead ? 'text-[#444]' : 'text-[#666]'}`}>
                                            {n.body || n.content}
                                        </p>
                                        <span className="text-[12px] text-[#888] mt-[4px] font-medium tracking-[0.2px]">
                                            {formatDateTime(n.createdAt)}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setDeleteModal({ show: true, id: n._id })} 
                                    className="text-[#aaa] hover:text-[#d93025] p-2 cursor-pointer transition-colors rounded-full hover:bg-white"
                                    title="Xoá thông báo này"
                                >
                                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL: XÓA 1 THÔNG BÁO */}
            {deleteModal.show && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 font-sans backdrop-blur-xs select-none">
                    <div className="bg-white rounded-[8px] w-full max-w-[450px] p-[25px] shadow-2xl border border-[#e2d8d0] mx-4 animate-fade-in">
                        <div className="text-[18px] font-bold text-[#333333] mb-5 pb-2 border-b border-[#e2d8d0] flex justify-between items-center">
                            <span>Xác nhận xóa thông báo</span>
                            <svg onClick={() => setDeleteModal({ show: false, id: null })} className="w-5 h-5 text-[#777777] cursor-pointer hover:text-red-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div className="mb-6 space-y-3">
                            <p className="text-[14px] text-[#333333] leading-relaxed m-0">
                                Bạn có chắc chắn muốn xóa thông báo này không?
                            </p>
                            <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-start gap-2 text-[13px] text-[#d93025] font-medium">
                                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Lưu ý: Hành động này không thể hoàn tác.</span>
                            </div>
                        </div>
                        <div className="flex justify-end gap-[10px] pt-[15px] border-t border-[#e2d8d0]">
                            <button onClick={() => setDeleteModal({ show: false, id: null })} className="p-[9px_18px] border border-[#e2d8d0] bg-white rounded-[6px] text-[14px] font-medium text-[#333333] cursor-pointer hover:bg-[#faf7f5] transition-colors">Hủy</button>
                            <button onClick={executeDelete} className="p-[9px_18px] bg-[#d93025] hover:bg-[#b71c1c] text-white font-bold rounded-[6px] text-[14px] cursor-pointer transition-colors shadow-xs">Xác nhận xóa</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: ĐÁNH DẤU ĐÃ ĐỌC TẤT CẢ */}
            {readAllModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 font-sans backdrop-blur-xs select-none">
                    <div className="bg-white rounded-[8px] w-full max-w-[450px] p-[25px] shadow-2xl border border-[#e2d8d0] mx-4 animate-fade-in">
                        <div className="text-[18px] font-bold text-[#333333] mb-5 pb-2 border-b border-[#e2d8d0] flex justify-between items-center">
                            <span>Xác nhận thao tác</span>
                            <svg onClick={() => setReadAllModal(false)} className="w-5 h-5 text-[#777777] cursor-pointer hover:text-red-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div className="mb-6 space-y-3">
                            <p className="text-[14px] text-[#333333] leading-relaxed m-0">
                                Bạn có muốn đánh dấu toàn bộ hộp thư thông báo này là <b className="text-[#853D12]">Đã đọc</b> không?
                            </p>
                        </div>
                        <div className="flex justify-end gap-[10px] pt-[15px] border-t border-[#e2d8d0]">
                            <button onClick={() => setReadAllModal(false)} className="p-[9px_18px] border border-[#e2d8d0] bg-white rounded-[6px] text-[14px] font-medium text-[#333333] cursor-pointer hover:bg-[#faf7f5] transition-colors">Hủy</button>
                            <button onClick={executeReadAll} className="p-[9px_18px] bg-[#853D12] hover:bg-[#5e290a] text-white font-bold rounded-[6px] text-[14px] cursor-pointer transition-colors shadow-xs">Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminNotifications;