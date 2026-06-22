import React, { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "../../components/context/authContext";
import { 
    getAdminCategoriesApi, 
    createAdminCategoryApi, 
    updateAdminCategoryApi, 
    deleteAdminCategoryApi 
} from "../../utils/api";

const AdminCategoriesPage = () => {
    const { appLoading } = useContext(AuthContext);
    
    // Các State quản lý danh sách và phân trang
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        pages: 1
    });

    const [search, setSearch] = useState("");
    const [toast, setToast] = useState({ show: false, type: "", message: "" });

    // Các State quản lý Modal 
    const [addModal, setAddModal] = useState({ show: false, name: "", error: "" });
    const [editModal, setEditModal] = useState({ show: false, id: null, name: "", error: "" });
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: "" });
    const showToast = (type, message) => {
        setToast({ show: true, type, message });
        setTimeout(() => setToast({ show: false, type: "", message: "" }), 3000);
    };

    // Hàm gọi API lấy danh sách danh mục
    const fetchCategories = useCallback(async (currentPage = 1) => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: pagination.limit
            };

            if (search.trim() !== "") {
                params.name = search.trim();
            }

            const response = await getAdminCategoriesApi(params);
            
            if (response && response.success) {
                setCategories(response.data?.categories || []);
                setPagination(response.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
            }
        } catch (error) {
            console.error("Lỗi khi tải danh sách danh mục:", error);
            showToast("error", "Không thể kết nối với máy chủ!");
        } finally {
            setLoading(false);
        }
    }, [search, pagination.limit]);

    useEffect(() => {
        if (!appLoading) {
            fetchCategories(1);
        }
    }, [appLoading, fetchCategories]);

    const handleSearchKeyDown = (e) => {
        if (e.key === "Enter") {
            fetchCategories(1);
        }
    };

    const handleResetFilters = () => {
        setSearch("");
        setLoading(true);
        getAdminCategoriesApi({ page: 1, limit: pagination.limit })
            .then(res => {
                if(res?.success) {
                    setCategories(res.data?.categories || []);
                    setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
                }
            }).finally(() => setLoading(false));
    };

    // Thêm danh mục 
    const handleAddCategory = async () => {
        if (!addModal.name.trim()) {
            setAddModal(prev => ({ ...prev, error: "Vui lòng nhập tên danh mục!" }));
            return;
        }

        try {
            const response = await createAdminCategoryApi({ name: addModal.name.trim() });
            
            if (response && response.success) {
                showToast("success", `Đã thêm thành công danh mục: ${addModal.name}`);
                setAddModal({ show: false, name: "", error: "" });
                fetchCategories(1);
            } else {
                let errorMessage = response?.message || "Đã xảy ra lỗi!";
                if (errorMessage.includes("E11000") || errorMessage.includes("duplicate")) {
                    errorMessage = "Tên danh mục này đã tồn tại, vui lòng chọn tên khác!";
                }
                setAddModal(prev => ({ ...prev, error: errorMessage }));
            }
        } catch (error) {
            let errorMessage = error.response?.data?.message || "Đã xảy ra lỗi!";
            if (errorMessage.includes("E11000") || errorMessage.includes("duplicate")) {
                errorMessage = "Tên danh mục này đã tồn tại, vui lòng chọn tên khác!";
            }
            setAddModal(prev => ({ ...prev, error: errorMessage }));
        }
    };

    // Sửa danh mục
    const handleOpenEditModal = (id, name) => {
        setEditModal({ show: true, id, name, error: "" });
    };

    const handleUpdateCategory = async () => {
        if (!editModal.name.trim()) {
            setEditModal(prev => ({ ...prev, error: "Tên danh mục không được để trống!" }));
            return;
        }

        try {
            const response = await updateAdminCategoryApi(editModal.id, { name: editModal.name.trim() });
            
            if (response && response.success) {
                showToast("success", "Đã cập nhật danh mục thành công!");
                setEditModal({ show: false, id: null, name: "", error: "" });
                setCategories(prev => prev.map(c => c._id === editModal.id ? { ...c, name: editModal.name.trim() } : c));
            } else {
                let errorMessage = response?.message || "Đã xảy ra lỗi!";
                if (errorMessage.includes("E11000") || errorMessage.includes("duplicate")) {
                    errorMessage = "Tên danh mục này đã tồn tại, vui lòng chọn tên khác!";
                }
                setEditModal(prev => ({ ...prev, error: errorMessage }));
            }
        } catch (error) {
            let errorMessage = error.response?.data?.message || "Đã xảy ra lỗi!";
            if (errorMessage.includes("E11000") || errorMessage.includes("duplicate")) {
                errorMessage = "Tên danh mục này đã tồn tại, vui lòng chọn tên khác!";
            }
            setEditModal(prev => ({ ...prev, error: errorMessage }));
        }
    };

    // Xóa danh mục
    const handleOpenDeleteModal = (id, name) => {
        setDeleteModal({ show: true, id, name });
    };

    const handleDeleteCategory = async () => {
        try {
            const response = await deleteAdminCategoryApi(deleteModal.id);
            if (response && response.success) {
                showToast("success", "Đã xóa danh mục thành công!");
                setDeleteModal({ show: false, id: null, name: "" });
                fetchCategories(pagination.page);
            }
        } catch (error) {
            showToast("error", error.response?.data?.message || "Không thể xóa danh mục này!");
        }
    };

    return (
        <div className="w-full relative">
            
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

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-5 flex-wrap gap-[15px]">
                <div className="flex gap-[10px] items-center">
                    <div className="relative w-[350px]">
                        <span className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[#777777] flex items-center justify-center">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên danh mục..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full py-[10px] pl-[40px] pr-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] text-[#333333] outline-none focus:border-[#853D12] transition-colors bg-white font-sans"
                        />
                    </div>
                    <button 
                        onClick={handleResetFilters}
                        className="p-[10px] border border-[#e2d8d0] rounded-[6px] bg-white text-[#777777] cursor-pointer flex items-center justify-center h-[40px] w-[40px] hover:border-[#853D12] hover:text-[#853D12] hover:bg-[#fdfbf9] hover:rotate-[30deg] transition-all shadow-xs"
                        title="Xóa bộ lọc"
                    >
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                </div>

                <button 
                    onClick={() => setAddModal({ show: true, name: "", error: "" })}
                    className="bg-[#853D12] text-white py-[10px] px-[20px] rounded-[6px] text-[14px] font-semibold cursor-pointer flex items-center gap-[8px] shadow-[0_4px_10px_rgba(133,61,18,0.2)] hover:bg-[#5e290a] transition-all duration-200 active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm danh mục mới
                </button>
            </div>

            {/* DATA TABLE CONTAINER */}
            <div className="bg-white rounded-[8px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] overflow-hidden border border-[rgba(0,0,0,0.05)]">
                <table className="w-full border-collapse text-left font-sans">
                    <thead className="bg-[#faf7f5] border-b-2 border-[#e2d8d0]">
                        <tr>
                            <th className="w-[60px] text-center py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px]">STT</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px]">Tên Danh Mục</th>
                            <th className="w-[150px] text-center py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px]">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2d8d0]">
                        {loading ? (
                            <tr><td colSpan="3" className="py-[20px] px-[20px] text-center text-[#777777]">Đang tải dữ liệu danh mục...</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan="3" className="py-[20px] px-[20px] text-center text-[#777777]">Không tìm thấy danh mục nào phù hợp.</td></tr>
                        ) : (
                            categories.map((item, index) => (
                                <tr key={item._id} className="hover:bg-[#fdfbf9] transition-colors">
                                    <td className="w-[60px] text-center font-semibold text-[#777777] py-[15px] px-[20px]">
                                        {(pagination.page - 1) * pagination.limit + index + 1}
                                    </td>
                                    <td className="py-[15px] px-[20px]">
                                        <span className="font-medium text-[#111111] text-[14px]">{item.name}</span>
                                    </td>
                                    <td className="w-[150px]">
                                        <div className="flex gap-[10px] justify-center">
                                            <button 
                                                onClick={() => handleOpenEditModal(item._id, item.name)}
                                                className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white text-[#777777] flex items-center justify-center cursor-pointer text-[16px] hover:border-[#3498db] hover:text-[#3498db] hover:bg-[#ebf5fb] transition-all shadow-xs"
                                                title="Sửa danh mục"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => handleOpenDeleteModal(item._id, item.name)}
                                                className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white text-[#777777] flex items-center justify-center cursor-pointer text-[16px] hover:border-[#d93025] hover:text-[#d93025] hover:bg-[#fce8e6] transition-all shadow-xs"
                                                title="Xóa danh mục"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* THANH PHÂN TRANG */}
            {pagination.pages > 1 && (
                <div className="mt-4 flex items-center justify-between font-sans px-2">
                    <div className="text-[13px] text-[#777777]">Hiển thị từ {(pagination.page - 1) * pagination.limit + 1} đến {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total} danh mục</div>
                    <div className="flex items-center gap-[6px]">
                        <button disabled={pagination.page === 1} onClick={() => fetchCategories(pagination.page - 1)} className="px-3 py-[6px] border border-[#e2d8d0] bg-white rounded-[4px] text-[13px] text-[#333333] font-medium hover:bg-[#faf7f5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Trước</button>
                        {[...Array(pagination.pages)].map((_, pIdx) => (
                            <button key={pIdx} onClick={() => fetchCategories(pIdx + 1)} className={`px-3 py-[6px] rounded-[4px] text-[13px] font-semibold transition-all ${pagination.page === pIdx + 1 ? "bg-[#853D12] text-white" : "border border-[#e2d8d0] bg-white text-[#333333] hover:bg-[#faf7f5]"}`}>{pIdx + 1}</button>
                        ))}
                        <button disabled={pagination.page === pagination.pages} onClick={() => fetchCategories(pagination.page + 1)} className="px-3 py-[6px] border border-[#e2d8d0] bg-white rounded-[4px] text-[13px] text-[#333333] font-medium hover:bg-[#faf7f5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Sau</button>
                    </div>
                </div>
            )}

            {/* MODAL: THÊM DANH MỤC MỚI*/}
            {addModal.show && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 font-sans backdrop-blur-xs select-none">
                    <div className="bg-white rounded-[8px] w-full max-w-[450px] p-[25px] shadow-2xl border border-[#e2d8d0] mx-4 animate-fade-in">
                        <div className="text-[18px] font-bold text-[#333333] mb-5 pb-2 border-b border-[#e2d8d0] flex justify-between items-center">
                            <span>Thêm danh mục mới</span>
                            <svg onClick={() => setAddModal({ show: false, name: "", error: "" })} className="w-5 h-5 text-[#777777] cursor-pointer hover:text-red-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div className="flex flex-col gap-2 mb-6">
                            <label className="text-[12px] font-bold text-[#777777] uppercase">Tên danh mục <span className="text-[#d93025]">*</span></label>
                            <input 
                                type="text" 
                                placeholder="Ví dụ: Tủ giày thông minh, Bàn trang điểm..." 
                                value={addModal.name}
                                onChange={(e) => setAddModal(prev => ({ ...prev, name: e.target.value, error: "" }))}
                                className={`w-full p-[11px_14px] border ${addModal.error ? 'border-[#d93025] bg-[#fff5f5]' : 'border-[#e2d8d0] bg-white'} rounded-[6px] text-[14px] outline-none focus:border-[#853D12] font-sans text-[#333333] transition-colors`}
                            />
                            {addModal.error && (
                                <span className="text-[#d93025] text-[12px] font-medium flex items-center gap-1 mt-1 animate-fade-in">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    {addModal.error}
                                </span>
                            )}
                        </div>
                        <div className="flex justify-end gap-[10px] pt-[15px] border-t border-[#e2d8d0]">
                            <button onClick={() => setAddModal({ show: false, name: "", error: "" })} className="p-[9px_18px] border border-[#e2d8d0] bg-white rounded-[6px] text-[14px] font-medium text-[#333333] cursor-pointer hover:bg-[#faf7f5] transition-colors">Hủy</button>
                            <button onClick={handleAddCategory} className="p-[9px_18px] bg-[#853D12] text-white font-bold rounded-[6px] text-[14px] cursor-pointer hover:bg-[#5e290a] transition-colors shadow-xs">Lưu danh mục</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: SỬA DANH MỤC */}
            {editModal.show && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 font-sans backdrop-blur-xs select-none">
                    <div className="bg-white rounded-[8px] w-full max-w-[450px] p-[25px] shadow-2xl border border-[#e2d8d0] mx-4 animate-fade-in">
                        <div className="text-[18px] font-bold text-[#333333] mb-5 pb-2 border-b border-[#e2d8d0] flex justify-between items-center">
                            <span>Chỉnh sửa danh mục</span>
                            <svg onClick={() => setEditModal({ show: false, id: null, name: "", error: "" })} className="w-5 h-5 text-[#777777] cursor-pointer hover:text-red-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div className="flex flex-col gap-2 mb-6">
                            <label className="text-[12px] font-bold text-[#777777] uppercase">Tên danh mục <span className="text-[#d93025]">*</span></label>
                            <input 
                                type="text" 
                                value={editModal.name}
                                onChange={(e) => setEditModal(prev => ({ ...prev, name: e.target.value, error: "" }))}
                                className={`w-full p-[11px_14px] border ${editModal.error ? 'border-[#d93025] bg-[#fff5f5]' : 'border-[#e2d8d0] bg-white'} rounded-[6px] text-[14px] outline-none focus:border-[#853D12] font-sans text-[#333333] transition-colors`}
                            />
                            {editModal.error && (
                                <span className="text-[#d93025] text-[12px] font-medium flex items-center gap-1 mt-1 animate-fade-in">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    {editModal.error}
                                </span>
                            )}
                        </div>
                        <div className="flex justify-end gap-[10px] pt-[15px] border-t border-[#e2d8d0]">
                            <button onClick={() => setEditModal({ show: false, id: null, name: "", error: "" })} className="p-[9px_18px] border border-[#e2d8d0] bg-white rounded-[6px] text-[14px] font-medium text-[#333333] cursor-pointer hover:bg-[#faf7f5] transition-colors">Hủy</button>
                            <button onClick={handleUpdateCategory} className="p-[9px_18px] bg-[#853D12] text-white font-bold rounded-[6px] text-[14px] cursor-pointer hover:bg-[#5e290a] transition-colors shadow-xs">Cập nhật</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: XÓA DANH MỤC */}
            {deleteModal.show && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 font-sans backdrop-blur-xs select-none">
                    <div className="bg-white rounded-[8px] w-full max-w-[450px] p-[25px] shadow-2xl border border-[#e2d8d0] mx-4 animate-fade-in">
                        <div className="text-[18px] font-bold text-[#333333] mb-5 pb-2 border-b border-[#e2d8d0] flex justify-between items-center">
                            <span>Xác nhận xóa danh mục</span>
                            <svg onClick={() => setDeleteModal({ show: false, id: null, name: "" })} className="w-5 h-5 text-[#777777] cursor-pointer hover:text-red-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div className="mb-6 space-y-3">
                            <p className="text-[14px] text-[#333333] leading-relaxed m-0">
                                Bạn có chắc chắn muốn xóa danh mục <b className="text-[#853D12]">{deleteModal.name}</b> không?
                            </p>
                            <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-start gap-2 text-[13px] text-[#d93025] font-medium">
                                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Lưu ý: Hành động này không thể hoàn tác và có thể ảnh hưởng đến các sản phẩm thuộc danh mục này.</span>
                            </div>
                        </div>
                        <div className="flex justify-end gap-[10px] pt-[15px] border-t border-[#e2d8d0]">
                            <button onClick={() => setDeleteModal({ show: false, id: null, name: "" })} className="p-[9px_18px] border border-[#e2d8d0] bg-white rounded-[6px] text-[14px] font-medium text-[#333333] cursor-pointer hover:bg-[#faf7f5] transition-colors">Hủy</button>
                            <button onClick={handleDeleteCategory} className="p-[9px_18px] bg-[#d93025] hover:bg-[#b71c1c] text-white font-bold rounded-[6px] text-[14px] cursor-pointer transition-colors shadow-xs">Xác nhận xóa</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminCategoriesPage;