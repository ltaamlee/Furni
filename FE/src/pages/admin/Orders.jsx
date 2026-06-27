import React, { useState, useEffect, useCallback } from "react";
import { getAdminOrdersApi, adminForceCancelOrderApi, getAdminShopsApi, getAdminOrderByIdApi } from "../../utils/api";

const AdminOrdersPage = () => {
    // State quản lý dữ liệu danh sách
    const [orders, setOrders] = useState([]);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

    // State bộ lọc
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [shopId, setShopId] = useState("");

    const [toast, setToast] = useState({ show: false, type: "", message: "" });

    // State quản lý các Modal
    const [cancelModal, setCancelModal] = useState({ show: false, orderId: null, orderNumber: "", reason: "" });
    // MỚI: State quản lý Modal Xem chi tiết
    const [detailModal, setDetailModal] = useState({ show: false, loading: false, data: null });

    const showToast = (type, message) => {
        setToast({ show: true, type, message });
        setTimeout(() => setToast({ show: false, type: "", message: "" }), 3000);
    };

    // Lấy danh sách Shop để cho vào Dropdown lọc
    useEffect(() => {
        const fetchShops = async () => {
            try {
                const res = await getAdminShopsApi({ limit: 100 });
                if (res && res.success) setShops(res.data.shops || []);
            } catch (error) {
                console.error("Lỗi lấy danh sách shop:", error);
            }
        };
        fetchShops();
    }, []);

    // Lấy danh sách Đơn hàng
    const fetchOrders = useCallback(async (currentPage = 1) => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: pagination.limit,
                search: search.trim(),
                status,
                shopId
            };
            const response = await getAdminOrdersApi(params);
            if (response && response.success) {
                setOrders(response.data.orders);
                setPagination(response.data.pagination);
            }
        } catch (error) {
            console.error("Lỗi khi tải đơn hàng:", error);
        } finally {
            setLoading(false);
        }
    }, [search, status, shopId, pagination.limit]);

    useEffect(() => {
        fetchOrders(1);
    }, [status, shopId]);

    const handleSearchKeyDown = (e) => {
        if (e.key === "Enter") fetchOrders(1);
    };

    const handleResetFilters = async () => {
        setSearch("");
        setStatus("");
        setShopId("");
        
        setLoading(true);
        try {
            const params = { page: 1, limit: pagination.limit, search: "", status: "", shopId: "" };
            const response = await getAdminOrdersApi(params);
            if (response && response.success) {
                setOrders(response.data.orders);
                setPagination(response.data.pagination);
            }
        } catch (error) {
            console.error("Lỗi khi tải lại:", error);
        } finally {
            setLoading(false);
        }
    };

    // MỚI: Hàm xử lý mở Modal Xem chi tiết đơn
    const handleOpenDetailModal = async (orderId) => {
        setDetailModal({ show: true, loading: true, data: null });
        try {
            const res = await getAdminOrderByIdApi(orderId);
            if (res && res.success) {
                setDetailModal({ show: true, loading: false, data: res.data });
            } else {
                showToast("error", "Không thể lấy thông tin chi tiết đơn hàng!");
                setDetailModal(prev => ({ ...prev, show: false }));
            }
        } catch (error) {
            showToast("error", "Có lỗi xảy ra khi kết nối hệ thống!");
            setDetailModal(prev => ({ ...prev, show: false }));
        }
    };

    const handleExecuteForceCancel = async () => {
        if (!cancelModal.reason.trim()) {
            showToast("error", "Vui lòng nhập lý do hủy đơn!");
            return;
        }

        try {
            const response = await adminForceCancelOrderApi(cancelModal.orderId, cancelModal.reason);
            if (response && response.success) {
                showToast("success", "Đã hủy đơn hàng khẩn cấp thành công!");
                setOrders(prev => prev.map(o => o._id === cancelModal.orderId ? { ...o, status: 'cancelled' } : o));
                // Nếu đang mở modal chi tiết của chính đơn đó thì cập nhật trạng thái luôn
                if (detailModal.data && detailModal.data._id === cancelModal.orderId) {
                    setDetailModal(prev => ({
                        ...prev,
                        data: { ...prev.data, status: 'cancelled' }
                    }));
                }
            } else {
                showToast("error", response?.message || "Hành động thất bại!");
            }
        } catch (error) {
            showToast("error", error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!");
        } finally {
            setCancelModal({ show: false, orderId: null, orderNumber: "", reason: "" });
        }
    };

    // Helper: Map màu cho trạng thái đơn hàng
    const getStatusStyle = (statusStr) => {
        switch (statusStr) {
            case 'pending': return 'bg-[#fef3c7] text-[#d97706] border border-[#fde68a]'; 
            case 'confirmed': return 'bg-[#e0e7ff] text-[#4f46e5] border border-[#c7d2fe]'; 
            case 'preparing': return 'bg-[#f3e8ff] text-[#9333ea] border border-[#e9d5ff]'; 
            case 'shipping': return 'bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd]'; 
            case 'delivered': return 'bg-[#e6f4ea] text-[#1e8e3e] border border-[#bbf7d0]'; 
            case 'cancelled': return 'bg-[#fce8e6] text-[#d93025] border border-[#fecaca]'; 
            case 'cancel_requested': return 'bg-[#ffedd5] text-[#ea580c] border border-[#fed7aa]'; 
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusText = (statusStr) => {
        const labels = {
            pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', preparing: 'Đang chuẩn bị',
            shipping: 'Đang giao', delivered: 'Đã giao thành công', cancelled: 'Đã hủy đơn', cancel_requested: 'Yêu cầu hủy'
        };
        return labels[statusStr] || statusStr;
    };

    return (
        <div className="w-full relative">
            {/* TOAST THÔNG BÁO */}
            {toast.show && (
                <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-[6px] border px-4 py-3 text-[14px] font-medium shadow-lg transition-all animate-bounce ${
                    toast.type === "success" ? "border-[#e6f4ea] bg-[#e6f4ea] text-[#1e8e3e]" : "border-[#fce8e6] bg-[#fce8e6] text-[#d93025]"
                }`}>
                    {toast.message}
                </div>
            )}

            {/* TOOLBAR LỌC */}
            <div className="flex justify-between items-center mb-5 flex-wrap gap-[15px]">
                <div className="relative w-[350px]">
                    <span className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[#777777] flex items-center justify-center">
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Tìm mã đơn, tên khách..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full py-[10px] pl-[40px] pr-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] text-[#333333] outline-none focus:border-[#853D12] transition-colors bg-white font-sans"
                    />
                </div>
                
                <div className="flex gap-[10px] items-center">
                    <select 
                        value={shopId}
                        onChange={(e) => setShopId(e.target.value)}
                        className="py-[10px] px-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] outline-none cursor-pointer bg-white text-[#333333] min-w-[150px] focus:border-[#853D12] font-sans"
                    >
                        <option value="">Tất cả Cửa hàng</option>
                        {shops.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>

                    <select 
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="py-[10px] px-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] outline-none cursor-pointer bg-white text-[#333333] min-w-[150px] focus:border-[#853D12] font-sans"
                    >
                        <option value="">Tất cả Trạng thái</option>
                        <option value="pending">Chờ xác nhận</option>
                        <option value="confirmed">Đã xác nhận</option>
                        <option value="preparing">Đang chuẩn bị</option>
                        <option value="shipping">Đang giao hàng</option>
                        <option value="delivered">Đã giao thành công</option>
                        <option value="cancel_requested">Yêu cầu hủy</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                    
                    <button 
                        onClick={handleResetFilters}
                        className="p-[10px] border border-[#e2d8d0] rounded-[6px] bg-white text-[#777777] cursor-pointer flex items-center justify-center h-[40px] w-[40px] hover:border-[#853D12] hover:text-[#853D12] hover:bg-[#fdfbf9] hover:rotate-[30deg] transition-all"
                        title="Xóa bộ lọc / Tải lại danh sách"
                    >
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                    </button>
                </div>
            </div>

            {/* BẢNG DỮ LIỆU */}
            <div className="bg-white rounded-[8px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] overflow-hidden border border-[rgba(0,0,0,0.05)]">
                <table className="w-full border-collapse text-left font-sans">
                    <thead className="bg-[#faf7f5] border-b-2 border-[#e2d8d0]">
                        <tr>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777]">Mã Đơn</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777]">Cửa hàng</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777]">Khách hàng</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777]">Tổng tiền</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777]">Trạng thái</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] text-center">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2d8d0]">
                        {loading ? (
                            <tr><td colSpan="6" className="py-[15px] px-[20px] text-center text-[#777777]">Đang tải dữ liệu...</td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan="6" className="py-[15px] px-[20px] text-center text-[#777777]">Không tìm thấy đơn hàng nào.</td></tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order._id} className="hover:bg-[#fdfbf9] transition-colors">
                                    <td className="py-[15px] px-[20px] font-semibold text-[#333] text-[14px]">
                                        {order.orderNumber}
                                        <div className="text-[11px] text-[#777] font-normal mt-1">
                                            {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                                        </div>
                                    </td>
                                    <td className="py-[15px] px-[20px]">
                                        <span className="text-[13px] font-medium text-[#853D12] bg-[#f8e5c8] px-2 py-1 rounded-[4px]">{order.shopName || order.shop?.name || 'N/A'}</span>
                                    </td>
                                    <td className="py-[15px] px-[20px]">
                                        <div className="font-semibold text-[#333333] text-[13px]">{order.shippingAddress?.fullName}</div>
                                        <div className="text-[12px] text-[#777777]">{order.shippingAddress?.phone}</div>
                                    </td>
                                    <td className="py-[15px] px-[20px] font-semibold text-[14px] text-[#d93025]">
                                        {order.totalPrice?.toLocaleString('vi-VN')}₫
                                    </td>
                                    <td className="py-[15px] px-[20px]">
                                        <span className={`py-[5px] px-[10px] rounded-[20px] text-[11px] font-semibold inline-block ${getStatusStyle(order.status)}`}>
                                            {getStatusText(order.status)}
                                        </span>
                                    </td>
                                    <td className="py-[15px] px-[20px]">
                                        {/* MỚI: Nhóm nút hành động giống màn hình quản lý user */}
                                        <div className="flex justify-center gap-[10px]">
                                            <button 
                                                onClick={() => handleOpenDetailModal(order._id)}
                                                className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white text-[#777777] flex items-center justify-center cursor-pointer text-[18px] hover:border-[#853D12] hover:text-[#853D12] transition-colors shadow-xs"
                                                title="Xem chi tiết đơn"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>

                                            {['delivered', 'cancelled'].includes(order.status) ? (
                                                <div className="w-[32px] h-[32px] flex items-center justify-center text-[#bbb]">—</div>
                                            ) : (
                                                <button 
                                                    onClick={() => setCancelModal({ show: true, orderId: order._id, orderNumber: order.orderNumber, reason: "" })}
                                                    className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white text-[#d93025] flex items-center justify-center cursor-pointer text-[18px] hover:border-[#d93025] hover:bg-[#fce8e6] transition-colors shadow-xs"
                                                    title="Hủy khẩn cấp đơn này"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* PHÂN TRANG */}
            {pagination.pages > 1 && (
                <div className="mt-4 flex items-center justify-between font-sans px-2">
                    <div className="text-[13px] text-[#777777]">Hiển thị trang {pagination.page} / {pagination.pages}</div>
                    <div className="flex items-center gap-[6px]">
                        <button disabled={pagination.page === 1} onClick={() => fetchOrders(pagination.page - 1)} className="px-3 py-[6px] border border-[#e2d8d0] bg-white rounded-[4px] text-[13px] text-[#333333] hover:bg-[#faf7f5] disabled:opacity-40">Trước</button>
                        <button disabled={pagination.page === pagination.pages} onClick={() => fetchOrders(pagination.page + 1)} className="px-3 py-[6px] border border-[#e2d8d0] bg-white rounded-[4px] text-[13px] text-[#333333] hover:bg-[#faf7f5] disabled:opacity-40">Sau</button>
                    </div>
                </div>
            )}

            {/* MODAL HỦY KHẨN CẤP */}
            {cancelModal.show && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 font-sans backdrop-blur-xs select-none">
                    <div className="bg-white rounded-[8px] w-full max-w-[420px] p-6 shadow-2xl border border-[#e2d8d0] mx-4">
                        <h3 className="text-[18px] font-bold text-[#d93025] mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#d93025]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Hủy khẩn cấp đơn hàng
                        </h3>
                        <p className="text-[13px] text-[#555] mb-4">
                            Đơn hàng <b className="text-black">{cancelModal.orderNumber}</b> sẽ bị hủy ngay lập tức bởi hệ thống Sàn. Vui lòng nhập lý do (Bắt buộc).
                        </p>
                        <textarea
                            rows="3"
                            placeholder="Ví dụ: Khách hàng gian lận, Shop có dấu hiệu lừa đảo..."
                            value={cancelModal.reason}
                            onChange={(e) => setCancelModal(prev => ({...prev, reason: e.target.value}))}
                            className="w-full py-[10px] px-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] bg-white text-[#333333] outline-none focus:border-[#d93025] resize-none mb-5"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setCancelModal({ show: false, orderId: null, orderNumber: "", reason: "" })} className="px-4 py-2 border border-[#e2d8d0] bg-white rounded-[6px] text-[13px] font-medium text-[#777777] hover:bg-[#faf7f5]">Hủy bỏ</button>
                            <button onClick={handleExecuteForceCancel} className="px-4 py-2 bg-[#d93025] hover:bg-[#b91c1c] rounded-[6px] text-[13px] font-semibold text-white shadow-sm">Xác nhận Hủy</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MỚI: MODAL CHI TIẾT ĐƠN HÀNG TOÀN DIỆN */}
            {detailModal.show && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 font-sans backdrop-blur-xs select-none">
                    <div className="bg-white rounded-[12px] w-full max-w-[750px] max-h-[85vh] shadow-2xl border border-[#e2d8d0] flex flex-col mx-4 overflow-hidden animate-fade-in">
                        
                        {/* Header Modal */}
                        <div className="p-5 border-b border-[#e2d8d0] bg-[#faf7f5] flex justify-between items-center">
                            <div>
                                <h3 className="text-[18px] font-bold text-[#853D12] m-0">Chi Tiết Đơn Hàng</h3>
                                {detailModal.data && (
                                    <p className="m-0 mt-1 text-[12px] text-[#777]">
                                        Mã đơn: <b className="text-black text-[13px]">{detailModal.data.orderNumber}</b> · Ngày đặt: {new Date(detailModal.data.createdAt).toLocaleString('vi-VN')}
                                    </p>
                                )}
                            </div>
                            <button 
                                onClick={() => setDetailModal({ show: false, loading: false, data: null })}
                                className="w-8 h-8 rounded-full border border-[#e2d8d0] bg-white text-[#777] hover:text-black hover:bg-stone-100 flex items-center justify-center cursor-pointer transition-colors outline-none"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body Modal (Có cuộn dọc tự động) */}
                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            {detailModal.loading ? (
                                <div className="py-10 text-center text-[#777]">
                                    <div className="w-8 h-8 border-4 border-stone-200 border-t-[#853D12] rounded-full animate-spin mx-auto mb-2"></div>
                                    Đang tải dữ liệu chi tiết...
                                </div>
                            ) : !detailModal.data ? (
                                <div className="py-10 text-center text-red-500">Không tìm thấy dữ liệu đơn hàng.</div>
                            ) : (
                                <>
                                    {/* Khối 1: Thông tin chéo 2 bên (Khách và Cửa hàng) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-[8px] bg-stone-50 border border-[#e2d8d0]">
                                            <h4 className="text-[13px] uppercase font-bold text-[#853D12] mb-2 tracking-wide">👤 Khách hàng nhận sản phẩm</h4>
                                            <div className="text-[14px] font-semibold text-stone-800">{detailModal.data.shippingAddress?.fullName}</div>
                                            <div className="text-[13px] text-stone-600 mt-1">📞 {detailModal.data.shippingAddress?.phone}</div>
                                            <div className="text-[13px] text-stone-600 mt-1 leading-relaxed">📍 {detailModal.data.shippingAddress?.address}</div>
                                            {detailModal.data.shippingAddress?.note && (
                                                <div className="text-[12px] text-amber-700 bg-amber-50 p-2 rounded mt-2 border border-amber-200/50">📝 Ghi chú khách: "{detailModal.data.shippingAddress.note}"</div>
                                            )}
                                        </div>

                                        <div className="p-4 rounded-[8px] bg-stone-50 border border-[#e2d8d0]">
                                            <h4 className="text-[13px] uppercase font-bold text-[#853D12] mb-2 tracking-wide">🏬 Cửa hàng bán hàng (Vendor)</h4>
                                            <div className="text-[14px] font-bold text-stone-800">{detailModal.data.shopName || detailModal.data.shop?.name}</div>
                                            <div className="text-[12px] text-stone-600 mt-1">Mã shop: <span className="font-mono bg-stone-200 px-1 rounded text-black">{detailModal.data.shopCode || detailModal.data.shop?.code || 'N/A'}</span></div>
                                            <div className="text-[13px] text-stone-600 mt-1">📧 Email: {detailModal.data.shop?.email || 'N/A'}</div>
                                            <div className="text-[13px] text-stone-600 mt-1">📞 Hotline: {detailModal.data.shop?.phone || 'N/A'}</div>
                                        </div>
                                    </div>

                                    {/* Khối 2: Trạng thái & Thanh toán */}
                                    <div className="p-4 rounded-[8px] border border-[#e2d8d0] bg-[#faf7f5] grid grid-cols-2 sm:grid-cols-3 gap-4 text-[13px]">
                                        <div>
                                            <div className="text-[#777] mb-1">Trạng thái đơn:</div>
                                            <span className={`py-1 px-2.5 rounded-[12px] text-[11px] font-bold inline-block ${getStatusStyle(detailModal.data.status)}`}>
                                                {getStatusText(detailModal.data.status)}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="text-[#777] mb-1">Phương thức mua:</div>
                                            <b className="text-stone-800 font-semibold">{detailModal.data.paymentMethod}</b>
                                        </div>
                                        <div>
                                            <div className="text-[#777] mb-1">Cổng thanh toán:</div>
                                            <span className={`font-semibold ${detailModal.data.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                                                {detailModal.data.paymentStatus === 'paid' ? '🟢 Đã thanh toán' : '🟡 Chưa thanh toán'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Khối 3: Danh sách sản phẩm trong Đơn */}
                                    <div>
                                        <h4 className="text-[14px] font-bold text-stone-800 mb-2">📦 Sản phẩm đặt mua</h4>
                                        <div className="border border-[#e2d8d0] rounded-[8px] overflow-hidden divide-y divide-[#e2d8d0]">
                                            {detailModal.data.products?.map((item, idx) => (
                                                <div key={idx} className="p-3 flex justify-between items-center gap-4 bg-white hover:bg-stone-50/50">
                                                    <div className="flex items-center gap-3">
                                                        <img 
                                                            src={item.image || "https://placehold.co/50x50?text=No+Image"} 
                                                            alt={item.name}
                                                            className="w-[45px] h-[45px] rounded-[4px] object-cover border border-stone-200"
                                                        />
                                                        <div>
                                                            <div className="text-[13px] font-semibold text-stone-800 leading-tight">{item.name}</div>
                                                            <div className="text-[11px] text-stone-500 mt-0.5">Số lượng: <b className="text-stone-700">{item.quantity}</b></div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[13px] font-bold text-stone-800">{item.price?.toLocaleString('vi-VN')}₫</div>
                                                        {item.discount > 0 && (
                                                            <div className="text-[10px] text-red-500 line-through">{(item.originalPrice || item.price)?.toLocaleString('vi-VN')}₫</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Khối 4: Tổng hợp tài chính (Dòng tiền) */}
                                    <div className="flex justify-end">
                                        <div className="w-full sm:w-[280px] space-y-2 text-[13px] text-stone-600 border-t pt-3 border-stone-200">
                                            <div className="flex justify-between">
                                                <span>Tiền hàng:</span>
                                                <span className="font-medium text-stone-800">{detailModal.data.subtotal?.toLocaleString('vi-VN')}₫</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Phí giao hàng ({detailModal.data.shippingTier === 'express' ? 'Hỏa tốc' : 'Tiết kiệm'}):</span>
                                                <span className="font-medium text-stone-800">+{detailModal.data.shippingFee?.toLocaleString('vi-VN')}₫</span>
                                            </div>
                                            {detailModal.data.couponDiscount > 0 && (
                                                <div className="flex justify-between text-green-600">
                                                    <span>Mã giảm giá {detailModal.data.couponCode ? `(${detailModal.data.couponCode})` : ''}:</span>
                                                    <span>-{detailModal.data.couponDiscount?.toLocaleString('vi-VN')}₫</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-[15px] font-bold text-stone-900 border-t pt-2 border-stone-200">
                                                <span className="text-[#853D12]">Tổng thu hộ:</span>
                                                <span className="text-[#d93025]">{detailModal.data.totalPrice?.toLocaleString('vi-VN')}₫</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Khối 5: Nhật ký Lịch sử luồng trạng thái */}
                                    {detailModal.data.statusHistory && detailModal.data.statusHistory.length > 0 && (
                                        <div className="border-t pt-4 border-stone-200">
                                            <h4 className="text-[13px] uppercase font-bold text-stone-400 mb-3 tracking-wider">⏱️ Nhật ký cập nhật đơn hàng</h4>
                                            <div className="relative pl-4 border-l border-stone-300 space-y-4">
                                                {detailModal.data.statusHistory.map((history, hIdx) => (
                                                    <div key={hIdx} className="relative text-[12px]">
                                                        {/* Khuyên tròn mốc thời gian */}
                                                        <div className="absolute -left-[21px] top-[3px] w-[9px] h-[9px] rounded-full bg-[#853D12] border-2 border-white"></div>
                                                        <div className="flex justify-between text-[#333]">
                                                            <span className="font-bold">{getStatusText(history.status)}</span>
                                                            <span className="text-[#777]">{new Date(history.timestamp).toLocaleString('vi-VN')}</span>
                                                        </div>
                                                        {history.note && (
                                                            <p className="m-0 mt-0.5 text-[#666] bg-stone-100 p-1 rounded italic">"{history.note}"</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer Modal */}
                        <div className="p-4 border-t border-[#e2d8d0] bg-[#faf7f5] flex justify-end gap-2">
                            <button 
                                onClick={() => setDetailModal({ show: false, loading: false, data: null })}
                                className="px-4 py-2 border border-[#e2d8d0] bg-white rounded-[6px] text-[13px] font-medium text-[#777] hover:bg-stone-100"
                            >
                                Đóng lại
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrdersPage;