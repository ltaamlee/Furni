import React, { useState, useEffect } from "react";
import { getAdminPromotionsSiteApi, createAdminPromotionSiteApi, updateAdminPromotionSiteApi, deleteAdminPromotionSiteApi } from "../../utils/api";

const AdminPromotions = () => {
    const [promotions, setPromotions] = useState([]);
    
    // States Lọc & Tìm kiếm
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // States Modal
    const [addModal, setAddModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ show: false, data: null, isEditing: false });
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: "" });

    // Forms & Error handling
    const [formData, setFormData] = useState({
        name: "", code: "", discountType: "percent", value: "", maxDiscount: "", minOrderValue: "", startDate: "", endDate: ""
    });
    const [formError, setFormError] = useState("");
    const [toast, setToast] = useState({ show: false, type: "", message: "" });

    const showToast = (type, message) => {
        setToast({ show: true, type, message });
        setTimeout(() => setToast({ show: false, type: "", message: "" }), 3000);
    };

    useEffect(() => {
        fetchPromotions();
    }, [search, typeFilter, statusFilter]);

    const fetchPromotions = async () => {
        try {
            const res = await getAdminPromotionsSiteApi({ search, type: typeFilter, status: statusFilter });
            if (res && res.success) setPromotions(res.data.promotions || []);
        } catch (error) {
            console.error("Lỗi tải khuyến mãi:", error);
            showToast("error", "Lỗi tải dữ liệu!");
        }
    };

    const validateDates = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        if (endDate <= startDate) {
            return "Thời gian kết thúc phải lớn hơn thời gian bắt đầu!";
        }
        return "";
    };

    const handleAddSubmit = async () => {
        setFormError("");
        if (!formData.name || !formData.code || !formData.value || !formData.startDate || !formData.endDate) {
            setFormError("Vui lòng điền đầy đủ các trường bắt buộc (*)"); return;
        }

        const dateError = validateDates(formData.startDate, formData.endDate);
        if (dateError) { setFormError(dateError); return; }

        try {
            const res = await createAdminPromotionSiteApi(formData);
            if (res && res.success) {
                showToast("success", "Thêm khuyến mãi thành công!");
                setAddModal(false);
                fetchPromotions();
                setFormData({ name: "", code: "", discountType: "percent", value: "", maxDiscount: "", minOrderValue: "", startDate: "", endDate: "" });
            }
        } catch (error) {
            setFormError(error.response?.data?.message || "Có lỗi xảy ra!");
        }
    };

    const handleEditSubmit = async () => {
        setFormError("");
        if (!formData.value || !formData.startDate || !formData.endDate) {
            setFormError("Vui lòng điền đầy đủ các trường bắt buộc (*)"); return;
        }

        const dateError = validateDates(formData.startDate, formData.endDate);
        if (dateError) { setFormError(dateError); return; }

        try {
            const res = await updateAdminPromotionSiteApi(detailModal.data._id, formData);
            if (res && res.success) {
                showToast("success", "Cập nhật khuyến mãi thành công!");
                setDetailModal({ show: false, data: null, isEditing: false });
                fetchPromotions();
            }
        } catch (error) {
            setFormError(error.response?.data?.message || "Có lỗi xảy ra!");
        }
    };

    const handleDelete = async () => {
        try {
            const res = await deleteAdminPromotionSiteApi(deleteModal.id);
            if (res && res.success) {
                showToast("success", "Đã xóa khuyến mãi thành công!");
                setDeleteModal({ show: false, id: null, name: "" });
                fetchPromotions();
            }
        } catch (error) {
            showToast("error", "Lỗi khi xóa khuyến mãi!");
        }
    };

    const formatForDatetimeLocal = (isoString) => {
        if (!isoString) return "";
        const d = new Date(isoString);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const date = d.getDate().toString().padStart(2, '0');
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${date}T${hours}:${minutes}`;
    };

    const openEditMode = () => {
        const d = detailModal.data;
        setFormData({
            name: d.name, code: d.couponCode, discountType: d.discountType,
            value: d.value, maxDiscount: d.maxDiscount, minOrderValue: d.minOrderValue,
            startDate: formatForDatetimeLocal(d.startDate), 
            endDate: formatForDatetimeLocal(d.endDate)
        });
        setFormError("");
        setDetailModal({ ...detailModal, isEditing: true });
    };

    const handleResetFilters = () => {
        setSearch(""); 
        setTypeFilter(""); 
        setStatusFilter("");
    };

    const formatDateTimeDisplay = (dateString) => {
        if (!dateString) return "N/A";
        const d = new Date(dateString);
        const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        return `${time} - ${date}`;
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'running': return <span className="px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#e6f4ea] text-[#1e8e3e]">Đang diễn ra</span>;
            case 'scheduled': return <span className="px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#ebf5fb] text-[#3498db]">Sắp diễn ra</span>;
            case 'ended': return <span className="px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#fce8e6] text-[#d93025]">Đã kết thúc</span>;
            default: return <span className="px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#f2f2f2] text-[#666]">Bản nháp</span>;
        }
    };

    // Icons SVG
    const IconEye = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
    const IconTrash = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
    const IconPlus = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>;
    const IconX = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
    const IconEdit = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
    const IconCalendarPlus = () => <svg className="w-[18px] h-[18px] text-[#1e8e3e]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="16" rx="2" ry="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 3v4M8 3v4M12 11v6M9 14h6" /></svg>;
    const IconCalendarMinus = () => <svg className="w-[18px] h-[18px] text-[#d93025]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="16" rx="2" ry="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 3v4M8 3v4M9 14h6" /></svg>;

    return (
        <div className="w-full relative">
            {/* HỆ THỐNG TOAST THÔNG BÁO */}
            {toast.show && (
                <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-[6px] border px-4 py-3 text-[14px] font-medium shadow-lg transition-all animate-bounce ${
                    toast.type === "success" ? "border-[#e6f4ea] bg-[#e6f4ea] text-[#1e8e3e]" : "border-[#fce8e6] bg-[#fce8e6] text-[#d93025]"
                }`}>
                    {toast.message}
                </div>
            )}

            {/* TOOLBAR */}
            <div className="flex justify-between items-center mb-5 gap-[15px] flex-wrap">
                <div className="flex gap-[10px] items-center flex-wrap">
                    <div className="relative w-[280px]">
                        <div className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[#777]">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input 
                            type="text" placeholder="Tìm kiếm tên chiến dịch..." 
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            className="w-full py-[10px] pl-[40px] pr-[15px] border border-[#e2d8d0] bg-white rounded-[6px] text-[14px] outline-none focus:border-[#853D12]"
                        />
                    </div>
                    
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="py-[10px] px-[15px] min-w-[180px] border border-[#e2d8d0] bg-white rounded-[6px] text-[14px] outline-none cursor-pointer focus:border-[#853D12]">
                        <option value="">Tất cả loại khuyến mãi</option>
                        <option value="percent">Giảm theo % (PERCENT)</option>
                        <option value="fixed">Giảm cố định (FIXED)</option>
                    </select>

                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="py-[10px] px-[15px] border border-[#e2d8d0] bg-white rounded-[6px] text-[14px] outline-none cursor-pointer focus:border-[#853D12]">
                        <option value="">Tất cả trạng thái</option>
                        <option value="running">Đang diễn ra</option>
                        <option value="scheduled">Sắp diễn ra</option>
                        <option value="ended">Đã kết thúc</option>
                    </select>

                    <button onClick={handleResetFilters} title="Tải lại" className="w-[40px] h-[40px] flex items-center justify-center border border-[#e2d8d0] rounded-[6px] bg-white text-[#777] hover:border-[#853D12] hover:text-[#853D12] hover:rotate-[30deg] transition-all">
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>

                <button onClick={() => { setFormData({ name: "", code: "", discountType: "percent", value: "", maxDiscount: "", minOrderValue: "", startDate: "", endDate: "" }); setFormError(""); setAddModal(true); }} className="ml-auto flex items-center gap-[8px] px-[20px] py-[10px] bg-[#853D12] text-white rounded-[6px] font-semibold text-[14px] shadow-[0_4px_10px_rgba(133,61,18,0.2)] hover:bg-[#5e290a] transition-colors">
                    <IconPlus /> Thêm khuyến mãi
                </button>
            </div>

{/* BẢNG DỮ LIỆU CHÍNH */}
            <div className="bg-white rounded-[8px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.05)] overflow-hidden">
                <table className="w-full text-center border-collapse table-fixed">
                    <thead className="bg-[#faf7f5] border-b-2 border-[#e2d8d0]">
                        <tr>
                            <th className="w-[5%] py-[15px] px-[10px] text-[13px] uppercase font-semibold text-[#777]">STT</th>
                            <th className="w-[25%] py-[15px] px-[10px] text-[13px] uppercase font-semibold text-[#777] text-left">Tên Chiến Dịch</th>
                            <th className="w-[20%] py-[15px] px-[10px] text-[13px] uppercase font-semibold text-[#777]">Loại Khuyến Mãi</th>
                            <th className="w-[25%] py-[15px] px-[10px] text-[13px] uppercase font-semibold text-[#777] text-left pl-[40px]">Thời Gian Áp Dụng</th>
                            <th className="w-[15%] py-[15px] px-[10px] text-[13px] uppercase font-semibold text-[#777]">Trạng Thái</th>
                            <th className="w-[10%] py-[15px] px-[10px] text-[13px] uppercase font-semibold text-[#777]">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {promotions.length === 0 ? (
                            <tr><td colSpan="6" className="py-[30px] text-[#777]">Không có khuyến mãi nào!</td></tr>
                        ) : (
                            promotions.map((p, index) => (
                                <tr key={p._id} className="hover:bg-[#fdfbf9] border-b border-[#e2d8d0] last:border-0 transition-colors">
                                    <td className="py-[15px] px-[10px] text-[14px] font-semibold text-[#777] align-top">{index + 1}</td>

                                    <td className="py-[15px] px-[10px] text-left pr-4 align-top">
                                        <div className="font-bold text-[#853D12] text-[15px] mb-2 break-words whitespace-normal leading-snug">
                                            {p.name}
                                        </div>
                                        <span className="text-[12px] font-semibold text-[#777] bg-[#f2f2f2] px-[6px] py-[2px] rounded border border-[#e2d8d0] inline-block">
                                            Mã: {p.couponCode}
                                        </span>
                                    </td>
                                    
                                    <td className="py-[15px] px-[10px] text-[13px] font-medium text-[#333] align-top">
                                        {p.discountType === 'percent' ? 'PERCENTAGE (%)' : 'FIXED AMOUNT'}
                                    </td>
                                    <td className="py-[15px] px-[10px] text-[13px] text-[#555] text-left pl-[40px] align-top">
                                        <div className="flex flex-col gap-[6px]">
                                            <div className="flex items-center gap-[8px]"><IconCalendarPlus /> <span>{formatDateTimeDisplay(p.startDate)}</span></div>
                                            <div className="flex items-center gap-[8px]"><IconCalendarMinus /> <span>{formatDateTimeDisplay(p.endDate)}</span></div>
                                        </div>
                                    </td>
                                    <td className="py-[15px] px-[10px] align-top">{renderStatusBadge(p.status)}</td>
                                    <td className="py-[15px] px-[10px] align-top">
                                        <div className="flex gap-[8px] justify-center">
                                            <button onClick={() => setDetailModal({ show: true, data: p, isEditing: false })} title="Xem chi tiết" className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] flex items-center justify-center text-[#777] hover:border-[#3498db] hover:text-[#3498db] hover:bg-[#ebf5fb] transition-all shadow-sm">
                                                <IconEye />
                                            </button>
                                            <button onClick={() => setDeleteModal({ show: true, id: p._id, name: p.name })} title="Xóa" className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] flex items-center justify-center text-[#777] hover:border-[#d93025] hover:text-[#d93025] hover:bg-[#fce8e6] transition-all shadow-sm">
                                                <IconTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL XEM CHI TIẾT VÀ CHỈNH SỬA */}
            {detailModal.show && detailModal.data && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] animate-[fadeIn_0.3s_ease]">
                    <div className="bg-white w-[520px] rounded-[8px] p-[25px] shadow-[0_15px_30px_rgba(0,0,0,0.2)]">
                        <div className="flex justify-between items-center border-b border-[#e2d8d0] pb-[15px] mb-[20px]">
                            <span className="font-semibold text-[18px] text-[#333]">
                                {detailModal.isEditing ? "Cập nhật khuyến mãi" : "Chi tiết chiến dịch"}
                            </span>
                            <button onClick={() => setDetailModal({ show: false, data: null, isEditing: false })} className="text-[#777] hover:text-[#d93025]"><IconX /></button>
                        </div>
                        
                        {formError && detailModal.isEditing && (
                            <div className="mb-4 p-3 bg-[#fce8e6] border border-[#fca5a5] text-[#d93025] text-[13px] font-medium rounded-[6px] flex items-center gap-2 animate-[fadeIn_0.2s_ease]">
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                {formError}
                            </div>
                        )}

                        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {!detailModal.isEditing ? (
                                // GIAO DIỆN XEM CHI TIẾT
                                <div className="grid grid-cols-2 gap-[15px] text-[14px]">
                                    <div className="col-span-2">
                                        <label className="text-[12px] font-bold text-[#853D12] uppercase block mb-1">Tên chiến dịch</label>
                                        <div className="font-bold text-[16px] text-[#333]">{detailModal.data.name}</div>
                                    </div>
                                    <div>
                                        <label className="text-[12px] font-bold text-[#777] uppercase block mb-1">Mã giảm giá</label>
                                        <span className="font-bold text-[#853D12] bg-[#fef1e8] border border-dashed border-[#853D12] px-[8px] py-[4px] rounded-[4px]">{detailModal.data.couponCode}</span>
                                    </div>
                                    <div>
                                        <label className="text-[12px] font-bold text-[#777] uppercase block mb-1">Trạng thái</label>
                                        {renderStatusBadge(detailModal.data.status)}
                                    </div>
                                    <div>
                                        <label className="text-[12px] font-bold text-[#777] uppercase block mb-1">Loại & Giá trị giảm</label>
                                        <div className="font-medium text-[#333]">
                                            {detailModal.data.discountType === 'percent' ? `Giảm ${detailModal.data.value}%` : `Giảm ${detailModal.data.value.toLocaleString()}đ`}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[12px] font-bold text-[#777] uppercase block mb-1">Giảm tối đa (Nếu theo %)</label>
                                        <div className="font-medium text-[#333]">{detailModal.data.maxDiscount > 0 ? `${detailModal.data.maxDiscount.toLocaleString()}đ` : 'Không giới hạn'}</div>
                                    </div>
                                    <div className="col-span-2 bg-[#faf7f5] p-3 rounded-[6px] border border-[#e2d8d0]">
                                        <label className="text-[12px] font-bold text-[#777] uppercase block mb-1">Giá trị đơn hàng tối thiểu</label>
                                        <div className="font-bold text-[#1e8e3e]">{detailModal.data.minOrderValue > 0 ? `Áp dụng cho đơn từ ${detailModal.data.minOrderValue.toLocaleString()} VNĐ` : 'Áp dụng cho mọi đơn hàng'}</div>
                                    </div>
                                    <div className="bg-[#fef1e8] p-3 rounded-[6px]">
                                        <label className="text-[12px] font-bold text-[#853D12] uppercase block mb-1 flex items-center gap-1"><IconCalendarPlus/> Bắt đầu lúc</label>
                                        <div className="font-medium text-[#333]">{formatDateTimeDisplay(detailModal.data.startDate)}</div>
                                    </div>
                                    <div className="bg-[#fce8e6] p-3 rounded-[6px]">
                                        <label className="text-[12px] font-bold text-[#d93025] uppercase block mb-1 flex items-center gap-1"><IconCalendarMinus/> Kết thúc lúc</label>
                                        <div className="font-medium text-[#333]">{formatDateTimeDisplay(detailModal.data.endDate)}</div>
                                    </div>
                                </div>
                            ) : (
                                // GIAO DIỆN CHỈNH SỬA
                                <div className="grid grid-cols-2 gap-[15px]">
                                    <div className="col-span-2 flex flex-col gap-1">
                                        <label className="text-[12px] font-semibold text-[#777] uppercase">Tên chiến dịch <span className="text-[#d93025]">*</span></label>
                                        <input type="text" value={formData.name} disabled className="w-full p-[10px] border border-[#e2d8d0] rounded-[6px] bg-[#f2f2f2] text-[#666] cursor-not-allowed" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[12px] font-semibold text-[#777] uppercase">Mã giảm giá <span className="text-[#d93025]">*</span></label>
                                        <input type="text" value={formData.code} disabled className="w-full p-[10px] border border-[#e2d8d0] rounded-[6px] bg-[#f2f2f2] text-[#666] cursor-not-allowed font-bold" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[12px] font-semibold text-[#777] uppercase">Loại KM <span className="text-[#d93025]">*</span></label>
                                        <select value={formData.discountType} onChange={e => setFormData({...formData, discountType: e.target.value})} className="w-full p-[10px] border border-[#e2d8d0] rounded-[6px] outline-none focus:border-[#853D12]">
                                            <option value="percent">Giảm theo %</option>
                                            <option value="fixed">Giảm số tiền</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[12px] font-semibold text-[#777] uppercase">Giá trị giảm <span className="text-[#d93025]">*</span></label>
                                        <input type="number" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full p-[10px] border border-[#e2d8d0] rounded-[6px] outline-none focus:border-[#853D12]" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[12px] font-semibold text-[#777] uppercase">Giảm tối đa (VNĐ)</label>
                                        <input type="number" value={formData.maxDiscount} onChange={e => setFormData({...formData, maxDiscount: e.target.value})} disabled={formData.discountType !== 'percent'} className={`w-full p-[10px] border border-[#e2d8d0] rounded-[6px] outline-none ${formData.discountType !== 'percent' ? 'bg-[#f2f2f2] cursor-not-allowed' : 'focus:border-[#853D12]'}`} />
                                    </div>
                                    <div className="col-span-2 flex flex-col gap-1">
                                        <label className="text-[12px] font-semibold text-[#777] uppercase">Đơn tối thiểu (VNĐ)</label>
                                        <input type="number" value={formData.minOrderValue} onChange={e => setFormData({...formData, minOrderValue: e.target.value})} className="w-full p-[10px] border border-[#e2d8d0] rounded-[6px] outline-none focus:border-[#853D12]" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[12px] font-semibold text-[#777] uppercase">Bắt đầu <span className="text-[#d93025]">*</span></label>
                                        <input type="datetime-local" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full p-[10px] border border-[#e2d8d0] rounded-[6px] outline-none focus:border-[#853D12]" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[12px] font-semibold text-[#777] uppercase">Kết thúc <span className="text-[#d93025]">*</span></label>
                                        <input type="datetime-local" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className={`w-full p-[10px] border rounded-[6px] outline-none transition-colors ${formError.includes("thời gian bắt đầu") ? 'border-[#d93025] bg-[#fff5f5]' : 'border-[#e2d8d0] focus:border-[#853D12]'}`} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-[20px] pt-[15px] border-t border-[#e2d8d0] flex justify-end gap-2">
                            {detailModal.isEditing ? (
                                <>
                                    <button onClick={() => setDetailModal({ ...detailModal, isEditing: false })} className="px-[18px] py-[9px] bg-[#f2f2f2] text-[#333] rounded-[6px] font-medium hover:bg-[#e2d8d0]">Hủy</button>
                                    <button onClick={handleEditSubmit} className="px-[18px] py-[9px] bg-[#853D12] text-white rounded-[6px] font-bold hover:bg-[#5e290a] shadow-md">Lưu cập nhật</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setDetailModal({ show: false, data: null, isEditing: false })} className="px-[18px] py-[9px] border border-[#e2d8d0] text-[#333] rounded-[6px] font-medium hover:bg-[#faf7f5]">Đóng</button>
                                    <button onClick={openEditMode} className="px-[18px] py-[9px] bg-[#ebf5fb] text-[#3498db] border border-[#3498db] rounded-[6px] font-bold hover:bg-[#3498db] hover:text-white flex items-center gap-1 transition-colors">
                                        <IconEdit /> Chỉnh sửa
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL THÊM MỚI */}
            {addModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] animate-[fadeIn_0.3s_ease]">
                    <div className="bg-white w-[520px] rounded-[8px] p-[25px] shadow-[0_15px_30px_rgba(0,0,0,0.2)]">
                        <div className="flex justify-between items-center border-b border-[#e2d8d0] pb-[10px] mb-[20px]">
                            <span className="font-semibold text-[18px] text-[#333]">Thêm khuyến mãi mới</span>
                            <button onClick={() => setAddModal(false)} className="text-[#777] hover:text-[#d93025]"><IconX /></button>
                        </div>
                        
                        {formError && (
                            <div className="mb-4 p-3 bg-[#fce8e6] border border-[#fca5a5] text-[#d93025] text-[13px] font-medium rounded-[6px] flex items-center gap-2 animate-[fadeIn_0.2s_ease]">
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                {formError}
                            </div>
                        )}

                        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-[15px]">
                                <div className="col-span-2 flex flex-col gap-1">
                                    <label className="text-[12px] font-semibold text-[#777] uppercase">Tên chiến dịch <span className="text-[#d93025]">*</span></label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-[10px] border border-[#e2d8d0] rounded-[6px] outline-none focus:border-[#853D12]" placeholder="VD: Khai xuân 2026..." />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[12px] font-semibold text-[#777] uppercase">Mã giảm giá <span className="text-[#d93025]">*</span></label>
                                    <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full p-[10px] border border-[#e2d8d0] rounded-[6px] outline-none focus:border-[#853D12]" placeholder="VD: XUAN26" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[12px] font-semibold text-[#777] uppercase">Loại KM <span className="text-[#d93025]">*</span></label>
                                    <select value={formData.discountType} onChange={e => setFormData({...formData, discountType: e.target.value})} className="w-full p-[10px] border border-[#e2d8d0] rounded-[6px] outline-none focus:border-[#853D12]">
                                        <option value="percent">Giảm theo %</option>
                                        <option value="fixed">Giảm số tiền</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[12px] font-semibold text-[#777] uppercase">Giá trị giảm <span className="text-[#d93025]">*</span></label>
                                    <input type="number" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full p-[10px] border border-[#e2d8d0] rounded-[6px] outline-none focus:border-[#853D12]" placeholder="Nhập số..." />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[12px] font-semibold text-[#777] uppercase">Giảm tối đa (VNĐ)</label>
                                    <input type="number" value={formData.maxDiscount} onChange={e => setFormData({...formData, maxDiscount: e.target.value})} disabled={formData.discountType !== 'percent'} className={`w-full p-[10px] border border-[#e2d8d0] rounded-[6px] outline-none ${formData.discountType !== 'percent' ? 'bg-[#f2f2f2] cursor-not-allowed' : 'focus:border-[#853D12]'}`} placeholder="" />
                                </div>
                                <div className="col-span-2 flex flex-col gap-1">
                                    <label className="text-[12px] font-semibold text-[#777] uppercase">Đơn tối thiểu (VNĐ)</label>
                                    <input type="number" value={formData.minOrderValue} onChange={e => setFormData({...formData, minOrderValue: e.target.value})} className="w-full p-[10px] border border-[#e2d8d0] rounded-[6px] outline-none focus:border-[#853D12]" placeholder="" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[12px] font-semibold text-[#777] uppercase">Bắt đầu <span className="text-[#d93025]">*</span></label>
                                    <input type="datetime-local" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full p-[10px] border border-[#e2d8d0] rounded-[6px] outline-none focus:border-[#853D12]" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[12px] font-semibold text-[#777] uppercase">Kết thúc <span className="text-[#d93025]">*</span></label>
                                    <input type="datetime-local" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className={`w-full p-[10px] border rounded-[6px] outline-none transition-colors ${formError.includes("thời gian bắt đầu") ? 'border-[#d93025] bg-[#fff5f5]' : 'border-[#e2d8d0] focus:border-[#853D12]'}`} />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#e2d8d0]">
                            <button onClick={() => setAddModal(false)} className="px-[18px] py-[9px] border border-[#e2d8d0] rounded-[6px] font-medium hover:bg-[#faf7f5]">Hủy</button>
                            <button onClick={handleAddSubmit} className="px-[18px] py-[9px] bg-[#853D12] text-white rounded-[6px] font-bold hover:bg-[#5e290a]">Lưu khuyến mãi</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL XÓA */}
            {deleteModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] animate-[fadeIn_0.3s_ease]">
                    <div className="bg-white w-[400px] rounded-[8px] p-[25px] shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-bold text-[18px]">Xác nhận xóa</span>
                            <button onClick={() => setDeleteModal({ show: false })} className="text-[#777] hover:text-[#d93025]"><IconX /></button>
                        </div>
                        <p className="text-[14px] text-[#333] mb-2">Bạn có chắc chắn muốn xóa khuyến mãi <strong className="text-[#853D12]">{deleteModal.name}</strong> không?</p>
                        <p className="text-[13px] text-[#d93025] font-medium mb-5 flex items-center gap-1">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> 
                            Hành động này sẽ gỡ mã giảm giá khỏi hệ thống.
                        </p>
                        <div className="flex justify-end gap-2 border-t border-[#e2d8d0] pt-4">
                            <button onClick={() => setDeleteModal({ show: false })} className="px-4 py-2 border border-[#e2d8d0] rounded-[6px] hover:bg-gray-50 font-medium">Hủy</button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-[#d93025] text-white rounded-[6px] hover:bg-red-700 font-bold shadow-md">Xác nhận xóa</button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2d8d0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #853D12; }
            `}</style>
        </div>
    );
};

export default AdminPromotions;