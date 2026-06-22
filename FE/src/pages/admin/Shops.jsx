import React, { useEffect, useState } from "react";
import { getAdminShopsApi, updateShopStatusApi } from "../../utils/api";
import { Link } from "react-router-dom";

const AdminShops = () => {
    const [shops, setShops] = useState([]);
    
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [selectedShopId, setSelectedShopId] = useState(null);
    const [rejectNote, setRejectNote] = useState("");

    useEffect(() => {
        fetchShops();
    }, [search, statusFilter]); 

    const fetchShops = async () => {
        try {
            const params = {};
            if (search.trim() !== "") params.search = search.trim();
            if (statusFilter !== "") params.status = statusFilter;

            const res = await getAdminShopsApi(params);
    
            if (res && res.success) {
                setShops(res.data?.shops || []);
            }
        } catch (error) {
            console.error("Lỗi khi tải danh sách shop:", error);
        }
    };

    const handleUpdateStatus = async (id, status, note = "") => {
        try {
            const res = await updateShopStatusApi(id, status, note);
            if (res && res.success) {
                fetchShops(); 
                if (status === 'rejected') closeRejectModal();
            } else {
                alert(res?.message || "Cập nhật thất bại!");
            }
        } catch (error) {
            alert("Đã xảy ra lỗi: " + (error.response?.data?.message || error.message));
        }
    };

    const openRejectModal = (id) => {
        setSelectedShopId(id);
        setIsRejectModalOpen(true);
    };

    const closeRejectModal = () => {
        setIsRejectModalOpen(false);
        setSelectedShopId(null);
        setRejectNote("");
    };

    const handleResetFilters = () => {
        setSearch("");
        setStatusFilter("");
    };

    const renderBadge = (status) => {
        switch (status) {
            case 'approved':
                return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#e6f4ea] text-[#1e8e3e]">Đã duyệt</span>;
            case 'pending':
                return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#fef7e0] text-[#b08a00]">Chờ duyệt</span>;
            case 'suspended':
                return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#fce8e6] text-[#d93025]">Tạm ngưng</span>;
            case 'rejected':
                return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#f2f2f2] text-[#666666] border border-[#d9d9d9]">Đã từ chối</span>;
            default:
                return null;
        }
    };

    const IconSearch = () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;
    const IconReset = () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>;
    const IconUser = () => <svg className="w-[16px] h-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>;
    const IconCheck = () => <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>;
    const IconX = () => <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>;
    const IconEye = () => <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>;
    const IconPause = () => <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
    const IconPlay = () => <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;

    return (
        <div className="w-full relative">
            
            {/* Toolbar: Tìm kiếm & Lọc */}
            <div className="flex justify-between items-center mb-[20px] flex-wrap gap-[15px]">
                <div className="relative w-[350px]">
                    <div className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[#777] flex items-center justify-center">
                        <IconSearch />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm tên cửa hàng, chủ cửa hàng..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full py-[10px] pr-[15px] pl-[40px] border border-[#e2d8d0] rounded-[6px] text-[14px] text-[#333333] bg-white outline-none transition-colors focus:border-[#853D12]"
                    />
                </div>
                
                <div className="flex gap-[10px] items-center">
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="py-[10px] px-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] text-[#333333] bg-white outline-none min-w-[150px] cursor-pointer focus:border-[#853D12]"
                    >
                        <option value="">Tất cả Trạng thái</option>
                        <option value="pending">Chờ duyệt</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="suspended">Tạm ngưng</option>
                        <option value="rejected">Đã từ chối</option>
                    </select>
                    
                    <button 
                        onClick={handleResetFilters}
                        title="Xóa bộ lọc / Tải lại danh sách"
                        className="w-[40px] h-[40px] border border-[#e2d8d0] rounded-[6px] bg-white text-[#777] flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-[#853D12] hover:text-[#853D12] hover:bg-[#fdfbf9] hover:rotate-[30deg]"
                    >
                        <IconReset />
                    </button>
                </div>
            </div>

            {/* Bảng danh sách cửa hàng */}
            <div className="bg-white rounded-[8px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.05)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#faf7f5] border-b-2 border-[#e2d8d0]">
                        <tr>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777] tracking-[0.5px] w-[50px] text-center">STT</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777] tracking-[0.5px]">Tên Cửa Hàng</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777] tracking-[0.5px]">Chủ Cửa Hàng</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777] tracking-[0.5px]">Trạng thái</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777] tracking-[0.5px] text-center">Phê Duyệt</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777] tracking-[0.5px] text-center">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shops.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="py-[30px] text-center text-[#777]">Không tìm thấy cửa hàng nào!</td>
                            </tr>
                        ) : (
                            shops.map((shop, index) => (
                                <tr key={shop._id} className="hover:bg-[#fdfbf9] transition-colors border-b border-[#e2d8d0] last:border-b-0">
                                    <td className="py-[15px] px-[20px] text-[14px] font-semibold text-[#777] text-center">{index + 1}</td>
                                    <td className="py-[15px] px-[20px] text-[14px]">
                                        <div className="font-semibold text-[#333] text-[15px]">{shop.name}</div>
                                    </td>
                                    <td className="py-[15px] px-[20px] text-[14px]">
                                        <div className="text-[#777] flex items-center gap-[5px]">
                                            <IconUser />
                                            {shop.owner?.fullName}
                                        </div>
                                    </td>
                                    <td className="py-[15px] px-[20px] text-[14px]">
                                        {renderBadge(shop.status)}
                                    </td>
                                    
                                    <td className="py-[15px] px-[20px] text-[14px]">
                                        {shop.status === 'pending' ? (
                                            <div className="flex gap-[10px] justify-center">
                                                <button onClick={() => handleUpdateStatus(shop._id, 'approved')} title="Duyệt đơn" className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white text-[#777] flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-[#1e8e3e] hover:text-[#1e8e3e] hover:bg-[#e6f4ea]">
                                                    <IconCheck />
                                                </button>
                                                <button onClick={() => openRejectModal(shop._id)} title="Từ chối đơn" className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white text-[#777] flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-[#d93025] hover:text-[#d93025] hover:bg-[#fce8e6]">
                                                    <IconX />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center text-[#ccc]">-</div>
                                        )}
                                    </td>

                                    <td className="py-[15px] px-[20px] text-[14px]">
                                        <div className="flex gap-[10px] justify-center">
                                            <Link 
                                                to={`/admin/shops/${shop._id}`}
                                                title="Xem chi tiết" 
                                                className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white text-[#777] flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-[#3498db] hover:text-[#3498db] hover:bg-[#ebf5fb]"
                                            >
                                                <IconEye />
                                            </Link>

                                            {shop.status === 'approved' && (
                                                <button onClick={() => handleUpdateStatus(shop._id, 'suspended', 'Tạm ngưng do vi phạm nội quy')} title="Tạm ngưng shop" className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white text-[#777] flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-[#d93025] hover:text-[#d93025] hover:bg-[#fce8e6]">
                                                    <IconPause />
                                                </button>
                                            )}

                                            {shop.status === 'suspended' && (
                                                <button onClick={() => handleUpdateStatus(shop._id, 'approved')} title="Mở lại shop" className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white text-[#777] flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-[#1e8e3e] hover:text-[#1e8e3e] hover:bg-[#e6f4ea]">
                                                    <IconPlay />
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

            {/* MODAL TỪ CHỐI */}
            {isRejectModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] animate-[fadeIn_0.3s_ease]">
                    <div className="bg-white w-[400px] rounded-[8px] p-[25px] shadow-[0_15px_30px_rgba(0,0,0,0.2)]">
                        <div className="text-[18px] font-semibold text-[#333] mb-[15px] flex justify-between items-center">
                            <span>Từ chối đăng ký cửa hàng</span>
                            <div className="cursor-pointer text-[#777] hover:text-[#d93025]" onClick={closeRejectModal}>
                                <IconX />
                            </div>
                        </div>
                        <div className="mb-[20px]">
                            <p className="text-[13px] text-[#555] mt-0 mb-[10px]">Vui lòng nhập lý do từ chối để thông báo đến chủ shop:</p>
                            <textarea 
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                placeholder="Ví dụ: Giấy phép kinh doanh không hợp lệ..."
                                className="w-full h-[100px] p-[10px] border border-[#e2d8d0] bg-white rounded-[6px] text-[14px] text-[#333333] resize-none outline-none focus:border-[#853D12]"
                            ></textarea>
                        </div>
                        <div className="flex justify-end gap-[10px]">
                            <button onClick={closeRejectModal} className="px-[15px] py-[8px] border border-[#e2d8d0] bg-white rounded-[6px] text-[#333333] font-medium cursor-pointer hover:bg-[#faf7f5]">Hủy</button>
                            <button onClick={() => handleUpdateStatus(selectedShopId, 'rejected', rejectNote)} className="px-[15px] py-[8px] border-none bg-[#d93025] text-white rounded-[6px] font-medium cursor-pointer hover:bg-[#b71c1c]">Xác nhận từ chối</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminShops;