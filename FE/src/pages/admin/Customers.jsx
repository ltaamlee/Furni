import React, { useState, useEffect, useCallback } from "react";
import { getAdminUsersApi, toggleBlockUserApi, updateAdminUserApi } from "../../utils/api";

const AdminCustomersPage = () => {
    // Các State quản lý dữ liệu bảng
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        pages: 1
    });

    const [search, setSearch] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");

    // State quản lý Toast thông báo nổi
    const [toast, setToast] = useState({ show: false, type: "", message: "" });

    // State quản lý Modal Khóa tài khoản
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        userId: null,
        userFullName: "",
        currentStatus: false
    });

    // Quản lý Modal Cấp/Đổi quyền tài khoản
    const [roleModal, setRoleModal] = useState({
        show: false,
        userId: null,
        userFullName: "",
        currentRole: ""
    });
    const [selectedRole, setSelectedRole] = useState(""); 

    const showToast = (type, message) => {
        setToast({ show: true, type, message });
        setTimeout(() => setToast({ show: false, type: "", message: "" }), 3000);
    };

    // Hàm gọi API lấy danh sách người dùng từ Backend
    const fetchUsers = useCallback(async (currentPage = 1) => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: pagination.limit,
                search: search.trim(),
                role: role,
                status: status
            };

            const response = await getAdminUsersApi(params);
            if (response && response.success) {
                setUsers(response.data.users);
                setPagination(response.data.pagination);
            }
        } catch (error) {
            console.error("Lỗi khi tải danh sách user:", error);
        } finally {
            setLoading(false);
        }
    }, [search, role, status, pagination.limit]);

    useEffect(() => {
        fetchUsers(1);
    }, [role, status]);

    const handleSearchKeyDown = (e) => {
        if (e.key === "Enter") {
            fetchUsers(1);
        }
    };

    const handleResetFilters = async () => {
        setSearch("");
        setRole("");
        setStatus("");

        setLoading(true);
        try {
            const params = {
                page: 1,
                limit: pagination.limit, 
                search: "",
                role: "",
                status: ""
            };

            const response = await getAdminUsersApi(params);
            if (response && response.success) {
                setUsers(response.data.users);
                setPagination(response.data.pagination);
            }
        } catch (error) {
            console.error("Lỗi khi tải lại danh sách user:", error);
            showToast("error", "Không thể tải lại danh sách. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenBlockModal = (userId, userFullName, currentStatus) => {
        setConfirmModal({ show: true, userId, userFullName, currentStatus });
    };

    const handleExecuteToggleBlock = async () => {
        const { userId, currentStatus } = confirmModal;
        setConfirmModal({ show: false, userId: null, userFullName: "", currentStatus: false });

        try {
            const response = await toggleBlockUserApi(userId);
            if (response && response.success) {
                showToast("success", response.message);
                setUsers(prevUsers => 
                    prevUsers.map(u => u._id === userId ? { ...u, isBlocked: !currentStatus } : u)
                );
            } else {
                showToast("error", response?.message || "Hành động không thể thực hiện!");
            }
        } catch (error) {
            showToast("error", error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!");
        }
    };

    const handleOpenRoleModal = (userId, userFullName, currentRole) => {
        setRoleModal({ show: true, userId, userFullName, currentRole });
        setSelectedRole(currentRole); 
    };

    const handleExecuteChangeRole = async () => {
        const { userId, userFullName, currentRole } = roleModal;

        if (selectedRole === currentRole) {
            setRoleModal({ show: false, userId: null, userFullName: "", currentRole: "" });
            return;
        }

        try {
            const response = await updateAdminUserApi(userId, { role: selectedRole });
            
            if (response && response.success) {
                showToast("success", `Đã chuyển đổi quyền của ${userFullName} thành công!`);
                setUsers(prevUsers => 
                    prevUsers.map(u => u._id === userId ? { ...u, role: selectedRole } : u)
                );
            } else {
                showToast("error", response?.message || "Không thể cập nhật vai trò!");
            }
        } catch (error) {
            showToast("error", error.response?.data?.message || "Có lỗi xảy ra khi đổi quyền!");
        } finally {
            setRoleModal({ show: false, userId: null, userFullName: "", currentRole: "" });
        }
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

            {/* TOOLBAR  */}
            <div className="flex justify-between items-center mb-5 flex-wrap gap-[15px]">
                <div className="relative w-[350px]">
                    <span className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[#777777] flex items-center justify-center">
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên, email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full py-[10px] pl-[40px] pr-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] text-[#333333] outline-none focus:border-[#853D12] transition-colors bg-white font-sans"
                    />
                </div>
                
                <div className="flex gap-[10px] items-center">
                    <select 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="py-[10px] px-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] outline-none cursor-pointer bg-white text-[#333333] min-w-[150px] focus:border-[#853D12] font-sans"
                    >
                        <option value="">Tất cả Vai trò</option>
                        <option value="admin">Admin</option>
                        <option value="vendor">Chủ shop (Vendor)</option>
                        <option value="customer">Người dùng (Customer)</option>
                    </select>
                    
                    <select 
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="py-[10px] px-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] outline-none cursor-pointer bg-white text-[#333333] min-w-[150px] focus:border-[#853D12] font-sans"
                    >
                        <option value="">Tất cả Trạng thái</option>
                        <option value="Hoạt động">Đang hoạt động</option>
                        <option value="Bị khóa">Đã bị khóa</option>
                    </select>
                    
                    <button 
                        onClick={handleResetFilters}
                        className="p-[10px] border border-[#e2d8d0] rounded-[6px] bg-white text-[#777777] cursor-pointer flex items-center justify-center h-[40px] w-[40px] hover:border-[#853D12] hover:text-[#853D12] hover:bg-[#fdfbf9] hover:rotate-[30deg] transition-all"
                        title="Xóa bộ lọc / Tải lại danh sách"
                    >
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                </div>
            </div>

            {/*BẢNG DỮ LIỆU CHÍNH */}
            <div className="bg-white rounded-[8px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] overflow-hidden border border-[rgba(0,0,0,0.05)]">
                <table className="w-full border-collapse text-left font-sans">
                    <thead className="bg-[#faf7f5] border-b-2 border-[#e2d8d0]">
                        <tr>
                            <th className="w-[50px] text-center py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px]">STT</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px]">Thông tin tài khoản</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px]">Vai trò</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px]">Trạng thái</th>
                            <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777777] tracking-[0.5px]">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2d8d0]">
                        {loading ? (
                            <tr><td colSpan="5" className="py-[15px] px-[20px] text-center text-[#777777]">Đang tải dữ liệu...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="5" className="py-[15px] px-[20px] text-center text-[#777777]">Không tìm thấy người dùng nào phù hợp.</td></tr>
                        ) : (
                            users.map((user, index) => (
                                <tr key={user._id} className="hover:bg-[#fdfbf9] transition-colors">
                                    <td className="w-[50px] text-center font-semibold text-[#777777] py-[15px] px-[20px]">
                                        {(pagination.page - 1) * pagination.limit + index + 1}
                                    </td>
                                    <td className="py-[15px] px-[20px]">
                                        <div className="flex flex-col">
                                            <div className="font-semibold mb-[4px] text-[#333333] text-[14px]">{user.fullName}</div>
                                            <div className="text-[12px] text-[#777777]">{user.email}</div>
                                        </div>
                                    </td>
                                    <td className="py-[15px] px-[20px]">
                                        {user.role === "admin" && <span className="py-[5px] px-[10px] rounded-[20px] text-[12px] font-semibold inline-block bg-[#853D12] text-white">Admin</span>}
                                        {user.role === "vendor" && <span className="py-[5px] px-[10px] rounded-[20px] text-[12px] font-semibold inline-block bg-[#e67e22] text-white">Vendor</span>}
                                        {user.role === "customer" && <span className="py-[5px] px-[10px] rounded-[20px] text-[12px] font-semibold inline-block bg-[#e2d8d0] text-[#333333]">Customer</span>}
                                    </td>
                                    <td className="py-[15px] px-[20px]">
                                        {user.isBlocked ? (
                                            <span className="py-[5px] px-[10px] rounded-[20px] text-[12px] font-semibold inline-block bg-[#fce8e6] text-[#d93025]">Bị khóa</span>
                                        ) : (
                                            <span className="py-[5px] px-[10px] rounded-[20px] text-[12px] font-semibold inline-block bg-[#e6f4ea] text-[#1e8e3e]">Hoạt động</span>
                                        )}
                                    </td>
                                    <td className="py-[15px] px-[20px]">
                                        <div className="flex gap-[10px]">
                                            <button 
                                                onClick={() => handleOpenRoleModal(user._id, user.fullName, user.role)}
                                                className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white text-[#777777] flex items-center justify-center cursor-pointer text-[18px] hover:border-[#853D12] hover:text-[#853D12] transition-colors shadow-xs"
                                                title="Cấp/Đổi quyền"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </button>
                                            
                                            <button 
                                                onClick={() => handleOpenBlockModal(user._id, user.fullName, user.isBlocked)}
                                                className={`w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white flex items-center justify-center cursor-pointer text-[18px] transition-all shadow-xs ${
                                                    user.isBlocked ? "text-[#777777] hover:border-[#1e8e3e] hover:text-[#1e8e3e] hover:bg-[#e6f4ea]" : "text-[#777777] hover:border-[#d93025] hover:text-[#d93025] hover:bg-[#fce8e6]"
                                                }`}
                                                title={user.isBlocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                                            >
                                                {user.isBlocked ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/*PHÂN TRANG */}
            {pagination.pages > 1 && (
                <div className="mt-4 flex items-center justify-between font-sans px-2">
                    <div className="text-[13px] text-[#777777]">Hiển thị từ {(pagination.page - 1) * pagination.limit + 1} đến {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total} dòng</div>
                    <div className="flex items-center gap-[6px]">
                        <button disabled={pagination.page === 1} onClick={() => fetchUsers(pagination.page - 1)} className="px-3 py-[6px] border border-[#e2d8d0] bg-white rounded-[4px] text-[13px] text-[#333333] font-medium hover:bg-[#faf7f5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Trước</button>
                        {[...Array(pagination.pages)].map((_, pIdx) => (
                            <button key={pIdx} onClick={() => fetchUsers(pIdx + 1)} className={`px-3 py-[6px] rounded-[4px] text-[13px] font-semibold transition-all ${pagination.page === pIdx + 1 ? "bg-[#853D12] text-white" : "border border-[#e2d8d0] bg-white text-[#333333] hover:bg-[#faf7f5]"}`}>{pIdx + 1}</button>
                        ))}
                        <button disabled={pagination.page === pagination.pages} onClick={() => fetchUsers(pagination.page + 1)} className="px-3 py-[6px] border border-[#e2d8d0] bg-white rounded-[4px] text-[13px] text-[#333333] font-medium hover:bg-[#faf7f5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Sau</button>
                    </div>
                </div>
            )}

            {/* MODAL XÁC NHẬN KHÓA TÀI KHOẢN  */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 font-sans backdrop-blur-xs select-none">
                    <div className="bg-white rounded-[8px] w-full max-w-[400px] p-6 shadow-2xl border border-[#e2d8d0] mx-4 animate-fade-in">
                        <h3 className="text-[18px] font-bold text-[#853D12] mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#853D12]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Xác nhận hành động
                        </h3>
                        <p className="text-[14px] text-[#333333] leading-relaxed mb-6">Bạn có chắc chắn muốn <b className="font-semibold text-black">{confirmModal.currentStatus ? "mở khóa" : "khóa"}</b> tài khoản của người dùng <span className="font-semibold text-[#853D12]">{confirmModal.userFullName}</span>?</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmModal({ show: false, userId: null, userFullName: "", currentStatus: false })} className="px-4 py-2 border border-[#e2d8d0] bg-white rounded-[6px] text-[13px] font-medium text-[#777777] hover:bg-[#faf7f5] cursor-pointer transition-colors">Hủy bỏ</button>
                            <button onClick={handleExecuteToggleBlock} className="px-4 py-2 bg-[#853D12] hover:bg-[#5e290a] rounded-[6px] text-[13px] font-semibold text-white cursor-pointer transition-colors shadow-sm">Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ĐỔI QUYỀN TÀI KHOẢN  */}
            {roleModal.show && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 font-sans backdrop-blur-xs select-none">
                    <div className="bg-white rounded-[8px] w-full max-w-[420px] p-6 shadow-2xl border border-[#e2d8d0] mx-4 animate-fade-in">
                        <h3 className="text-[18px] font-bold text-[#853D12] mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#853D12]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Cấp / Đổi quyền tài khoản
                        </h3>
                        <p className="text-[14px] text-[#333333] leading-relaxed mb-4">
                            Chọn vai trò mới cho người dùng <span className="font-semibold text-[#853D12]">{roleModal.userFullName}</span>:
                        </p>
                        
                        <div className="mb-6">
                            <label className="block text-[12px] font-semibold text-[#777777] uppercase tracking-wider mb-2">Vai trò hệ thống</label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-full py-[10px] px-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] bg-white text-[#333333] outline-none focus:border-[#853D12] cursor-pointer font-sans"
                            >
                                <option value="customer">Người dùng (Customer)</option>
                                <option value="vendor">Chủ shop (Vendor)</option>
                                <option value="admin">Quản trị viên (Admin)</option>
                            </select>
                        </div>
                        
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setRoleModal({ show: false, userId: null, userFullName: "", currentRole: "" })}
                                className="px-4 py-2 border border-[#e2d8d0] bg-white rounded-[6px] text-[13px] font-medium text-[#777777] hover:bg-[#faf7f5] cursor-pointer transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleExecuteChangeRole}
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

export default AdminCustomersPage;