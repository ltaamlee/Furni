import React, { useState, useEffect, useCallback } from "react";
import { getAdminCommissionsApi, updateShopCommissionApi } from "../../utils/api";

const AdminCommission = () => {
    // Các State quản lý dữ liệu bảng
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        pages: 1
    });

    const [search, setSearch] = useState("");
    const [rateFilter, setRateFilter] = useState("");
    const [sortOrder, setSortOrder] = useState(""); 

    const [toast, setToast] = useState({ show: false, type: "", message: "" });

    const [editModal, setEditModal] = useState({
        show: false,
        shopId: null,
        shopName: "",
        currentRate: "",
        newRate: ""
    });

    const showToast = (type, message) => {
        setToast({ show: true, type, message });
        setTimeout(() => setToast({ show: false, type: "", message: "" }), 3000);
    };

    const fetchCommissions = useCallback(async (currentPage = 1) => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: pagination.limit,
                search: search.trim(),
            };
            if (rateFilter) params.rateQuery = rateFilter;
            if (sortOrder) params.sort = sortOrder;

            const response = await getAdminCommissionsApi(params);
            if (response && response.success) {
                setShops(response.data.shops || []);
                setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
            }
        } catch (error) {
            console.error("Lỗi khi tải danh sách chiết khấu:", error);
            showToast("error", "Lỗi tải dữ liệu. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    }, [search, rateFilter, sortOrder, pagination.limit]);

    useEffect(() => {
        fetchCommissions(pagination.page);
    }, [sortOrder]); 

    const handleSearchKeyDown = (e) => {
        if (e.key === "Enter") {
            setPagination(prev => ({ ...prev, page: 1 }));
            fetchCommissions(1);
        }
    };

    const handleResetFilters = () => {
        setSearch("");
        setRateFilter("");
        setSortOrder("");
        setPagination(prev => ({ ...prev, page: 1 }));
        setTimeout(() => {
            getAdminCommissionsApi({ page: 1, limit: pagination.limit }).then(res => {
                if (res && res.success) {
                    setShops(res.data.shops || []);
                    setPagination(res.data.pagination);
                }
            });
        }, 0);
    };

    const toggleSort = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
        if (sortOrder === "") setSortOrder("asc");
        else if (sortOrder === "asc") setSortOrder("desc");
        else setSortOrder("");
    };

    const handleOpenEditModal = (shopId, shopName, currentRate) => {
        setEditModal({ show: true, shopId, shopName, currentRate, newRate: currentRate });
    };

    const handleExecuteUpdate = async () => {
        const rateToSubmit = Number(editModal.newRate);
        if (editModal.newRate === "" || rateToSubmit < 0 || rateToSubmit > 100) {
            showToast("error", "Vui lòng nhập tỉ lệ từ 0 đến 100!");
            return;
        }

        if (rateToSubmit === editModal.currentRate) {
            setEditModal({ show: false, shopId: null, shopName: "", currentRate: "", newRate: "" });
            return;
        }

        try {
            const response = await updateShopCommissionApi(editModal.shopId, { commissionRate: rateToSubmit });
            
            if (response && response.success) {
                showToast("success", `Đã cập nhật chiết khấu của ${editModal.shopName} thành ${rateToSubmit}%!`);
                setShops(prevShops => 
                    prevShops.map(s => s._id === editModal.shopId ? { ...s, commissionRate: rateToSubmit, updatedAt: new Date().toISOString() } : s)
                );
            } else {
                showToast("error", response?.message || "Không thể cập nhật chiết khấu!");
            }
        } catch (error) {
            showToast("error", error.response?.data?.message || "Có lỗi xảy ra khi cập nhật!");
        } finally {
            setEditModal({ show: false, shopId: null, shopName: "", currentRate: "", newRate: "" });
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} - ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full relative">
            
            {/* HỆ THỐNG TOAST THÔNG BÁO NỔI  */}
            {toast.show && (
                <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-[6px] border px-4 py-3 text-[14px] font-medium shadow-lg transition-all animate-bounce ${
                    toast.type === "success" ? "border-[#e6f4ea] bg-[#e6f4ea] text-[#1e8e3e]" : "border-[#fce8e6] bg-[#fce8e6] text-[#d93025]"
                }`}>
                    {toast.type === "success" ? (
                        <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.53 9.47a.75.75 0 010 1.06l-5 5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 11 1.06-1.06L11 13.94l4.47-4.47a.75.75 0 011.06 0z" clipRule="evenodd"/></svg>
                    ) : (
                        <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zm-.75 5a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0V7zm.75 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
                    )}
                    {toast.message}
                </div>
            )}

            {/*  TOOLBAR (Search & Filter) */}
            <div className="flex justify-between items-center mb-5 flex-wrap gap-[15px]">
                <div className="flex gap-[10px] items-center flex-wrap">
                    {/* Ô TÌM KIẾM THEO TÊN */}
                    <div className="relative w-[350px]">
                        <span className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[#777777] flex items-center justify-center">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên cửa hàng..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full py-[10px] pl-[40px] pr-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] text-[#333333] outline-none focus:border-[#853D12] transition-colors bg-white font-sans"
                        />
                    </div>

                    {/* Ô LỌC THEO PHẦN TRĂM */}
                    <div className="relative w-[250px]">
                        <span className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[#777777] font-bold text-[15px] flex items-center justify-center">
                            %
                        </span>
                        <input
                            type="number"
                            min="0" max="100"
                            placeholder="Lọc theo tỷ lệ chiết khấu..."
                            value={rateFilter}
                            onChange={(e) => setRateFilter(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full py-[10px] pl-[40px] pr-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] text-[#333333] outline-none focus:border-[#853D12] transition-colors bg-white font-sans"
                        />
                    </div>
                    
                    <button 
                        onClick={handleResetFilters}
                        className="p-[10px] border border-[#e2d8d0] rounded-[6px] bg-white text-[#777777] cursor-pointer flex items-center justify-center h-[40px] w-[40px] hover:border-[#853D12] hover:text-[#853D12] hover:bg-[#fdfbf9] hover:rotate-[30deg] transition-all"
                        title="Xóa bộ lọc"
                    >
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* BẢNG DỮ LIỆU CHÍNH */}
            <div className="bg-white rounded-[8px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] overflow-hidden border border-[rgba(0,0,0,0.05)]">
                <table className="w-full border-collapse text-left font-sans">
                    <thead className="bg-[#faf7f5] border-b-2 border-[#e2d8d0]">
                        <tr>
                            <th className="w-[50px] text-center py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px]">STT</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px] text-left">Tên Cửa Hàng</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px] text-center">Doanh Thu (GMV)</th>
                            <th 
                                className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px] text-center cursor-pointer hover:text-[#853D12] select-none transition-colors group"
                                onClick={toggleSort}
                                title="Nhấn để sắp xếp"
                            >
                                <div className="flex items-center justify-center gap-[4px]">
                                    Tỷ Lệ Chiết Khấu
                                    <span className="text-[14px] text-[#853D12]">
                                        {sortOrder === "asc" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" /></svg>}
                                        {sortOrder === "desc" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>}
                                        {sortOrder === "" && <svg className="w-4 h-4 text-[#777777] group-hover:text-[#853D12]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>}
                                    </span>
                                </div>
                            </th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px] text-center">Phí Sàn Ước Tính</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px] text-center">Cập Nhật</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px] text-center">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2d8d0]">
                        {loading ? (
                            <tr><td colSpan="7" className="py-[15px] px-[20px] text-center text-[#777777]">Đang tải dữ liệu...</td></tr>
                        ) : shops.length === 0 ? (
                            <tr><td colSpan="7" className="py-[15px] px-[20px] text-center text-[#777777]">Không tìm thấy cửa hàng nào phù hợp.</td></tr>
                        ) : (
                            shops.map((s, index) => {
                                const estimatedFee = Math.round(s.gmv * (s.commissionRate / 100));

                                return (
                                    <tr key={s._id} className="hover:bg-[#fdfbf9] transition-colors">
                                        <td className="w-[50px] text-center font-semibold text-[#777777] py-[15px] px-[20px]">
                                            {(pagination.page - 1) * pagination.limit + index + 1}
                                        </td>
                                        <td className="py-[15px] px-[20px]">
                                            <div className="font-semibold text-[#333333] text-[15px]">{s.name}</div>
                                        </td>
                                        <td className="py-[15px] px-[20px] text-center">
                                            <span className="text-[14px] font-semibold text-[#555555]">{s.gmv.toLocaleString()} đ</span>
                                        </td>
                                        <td className="py-[15px] px-[20px] text-center">
                                            <span className="py-[5px] px-[12px] rounded-[6px] text-[15px] font-bold inline-block bg-[#fef1e8] text-[#853D12] border border-dashed border-[#853D12]">
                                                {s.commissionRate}%
                                            </span>
                                        </td>
                                        <td className="py-[15px] px-[20px] text-center">
                                            <span className="text-[14px] font-bold text-[#1e8e3e]">{estimatedFee.toLocaleString()} đ</span>
                                        </td>
                                        <td className="py-[15px] px-[20px] text-center">
                                            <div className="text-[13px] text-[#777777] flex flex-col items-center justify-center gap-[2px]">
                                                <div className="flex items-center gap-[4px]">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {formatDateTime(s.updatedAt).split(" - ")[0]}
                                                </div>
                                                <span className="text-[11px] font-medium">{formatDateTime(s.updatedAt).split(" - ")[1]}</span>
                                            </div>
                                        </td>
                                        <td className="py-[15px] px-[20px]">
                                            <div className="flex justify-center">
                                                <button 
                                                    onClick={() => handleOpenEditModal(s._id, s.name, s.commissionRate)}
                                                    className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white text-[#777777] flex items-center justify-center cursor-pointer text-[18px] hover:border-[#3498db] hover:text-[#3498db] hover:bg-[#ebf5fb] transition-colors shadow-xs"
                                                    title="Cập nhật chiết khấu"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* PHÂN TRANG */}
            {pagination.pages > 1 && (
                <div className="mt-4 flex items-center justify-between font-sans px-2">
                    <div className="text-[13px] text-[#777777]">
                        Hiển thị từ {(pagination.page - 1) * pagination.limit + 1} đến {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total} cửa hàng
                    </div>
                    <div className="flex items-center gap-[6px]">
                        <button disabled={pagination.page === 1} onClick={() => fetchCommissions(pagination.page - 1)} className="px-3 py-[6px] border border-[#e2d8d0] bg-white rounded-[4px] text-[13px] text-[#333333] font-medium hover:bg-[#faf7f5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Trước</button>
                        {[...Array(pagination.pages)].map((_, pIdx) => (
                            <button key={pIdx} onClick={() => fetchCommissions(pIdx + 1)} className={`px-3 py-[6px] rounded-[4px] text-[13px] font-semibold transition-all ${pagination.page === pIdx + 1 ? "bg-[#853D12] text-white" : "border border-[#e2d8d0] bg-white text-[#333333] hover:bg-[#faf7f5]"}`}>{pIdx + 1}</button>
                        ))}
                        <button disabled={pagination.page === pagination.pages} onClick={() => fetchCommissions(pagination.page + 1)} className="px-3 py-[6px] border border-[#e2d8d0] bg-white rounded-[4px] text-[13px] text-[#333333] font-medium hover:bg-[#faf7f5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Sau</button>
                    </div>
                </div>
            )}

            {/* MODAL CẬP NHẬT CHIẾT KHẤU */}
            {editModal.show && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 font-sans backdrop-blur-xs select-none">
                    <div className="bg-white rounded-[8px] w-full max-w-[420px] p-6 shadow-2xl border border-[#e2d8d0] mx-4 animate-fade-in">
                        <h3 className="text-[18px] font-bold text-[#853D12] mb-4 flex items-center gap-2 border-b border-[#e2d8d0] pb-3">
                            <svg className="w-5 h-5 text-[#853D12]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Cập nhật chiết khấu
                        </h3>
                        
                        <div className="mb-4">
                            <label className="block text-[12px] font-semibold text-[#777777] uppercase tracking-wider mb-2">Tên cửa hàng</label>
                            <input 
                                type="text" 
                                value={editModal.shopName} 
                                disabled 
                                className="w-full py-[10px] px-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] bg-[#f5f5f5] text-[#777777] cursor-not-allowed outline-none font-sans" 
                            />
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-[12px] font-semibold text-[#777777] uppercase tracking-wider mb-2">
                                Tỷ lệ mới (%) <span className="text-[#d93025]">*</span>
                            </label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    min="0" max="100" 
                                    placeholder="Nhập phần trăm..."
                                    value={editModal.newRate}
                                    onChange={(e) => setEditModal({...editModal, newRate: e.target.value})}
                                    className="w-full py-[10px] pl-[15px] pr-[40px] border border-[#e2d8d0] rounded-[6px] text-[15px] font-bold text-[#853D12] bg-white outline-none focus:border-[#853D12] font-sans" 
                                />
                                <span className="absolute right-[15px] top-1/2 -translate-y-1/2 text-[#777777] font-bold">%</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-[#e2d8d0]">
                            <button
                                onClick={() => setEditModal({ show: false, shopId: null, shopName: "", currentRate: "", newRate: "" })}
                                className="px-4 py-2 border border-[#e2d8d0] bg-white rounded-[6px] text-[13px] font-medium text-[#777777] hover:bg-[#faf7f5] cursor-pointer transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleExecuteUpdate}
                                className="px-4 py-2 bg-[#853D12] hover:bg-[#5e290a] rounded-[6px] text-[13px] font-semibold text-white cursor-pointer transition-colors shadow-sm"
                            >
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminCommission;