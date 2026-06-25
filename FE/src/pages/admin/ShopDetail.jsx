import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getAdminShopDetailApi, getAdminShopProductsApi, toggleProductVisibilityAdminApi } from "../../utils/api";

const AdminShopDetail = () => {
    const { id } = useParams();
    
    const [shop, setShop] = useState(null);
    const [products, setProducts] = useState([]);
    
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [shopCategories, setShopCategories] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

    const [detailModal, setDetailModal] = useState({ show: false, product: null });
    const [enlargedImg, setEnlargedImg] = useState(null); 

    const [hideModal, setHideModal] = useState({ show: false, productId: null, productName: "", reason: "" });

    useEffect(() => { fetchShopDetail(); }, [id]);
    
    useEffect(() => { 
        fetchShopProducts(1); 
    }, [id, search, categoryFilter, statusFilter]);

    const fetchShopDetail = async () => {
        try {
            const res = await getAdminShopDetailApi(id);
            if (res && res.success) setShop(res.data);
        } catch (error) {
            console.error("Lỗi tải chi tiết shop:", error);
        }
    };

    const fetchShopProducts = async (currentPage = 1) => {
        try {
            const params = { page: currentPage, limit: pagination.limit };
            if (search) params.search = search;
            if (categoryFilter) params.category = categoryFilter;
            if (statusFilter) params.status = statusFilter;

            const res = await getAdminShopProductsApi(id, params);
            if (res && res.success) {
                setProducts(res.data || []);
                if (res.categories) setShopCategories(res.categories);
                if (res.pagination) setPagination(res.pagination);
            }
        } catch (error) {
            console.error("Lỗi tải sản phẩm:", error);
        }
    };

    const handlePageChange = (newPage) => {
        fetchShopProducts(newPage);
    };

    // Xử lý click Ẩn/Hiện
    const handleToggleClick = (prod) => {
        if (prod.status !== 'hidden') {
            setHideModal({ show: true, productId: prod._id, productName: prod.name, reason: "" });
        } else {
            if (window.confirm(`Cho phép sản phẩm "${prod.name}" hiển thị lại trên sàn?`)) {
                executeToggleVisibility(prod._id, ""); 
            }
        }
    };

    const executeToggleVisibility = async (productId, reason) => {
        try {
            const res = await toggleProductVisibilityAdminApi(productId, { hiddenReason: reason });
            if (res && res.success) {
                alert(res.message || "Cập nhật sản phẩm thành công!");
                fetchShopProducts(pagination.page); 
                setHideModal({ show: false, productId: null, productName: "", reason: "" });
            }
        } catch (error) {
            alert(error.response?.data?.message || "Lỗi khi cập nhật sản phẩm!");
        }
    };

    const submitHideProduct = () => {
        if (!hideModal.reason.trim()) {
            alert("Vui lòng nhập lý do cụ thể để chủ Shop biết và khắc phục!");
            return;
        }
        executeToggleVisibility(hideModal.productId, hideModal.reason);
    };

    const handleResetFilters = () => {
        setSearch(""); setCategoryFilter(""); setStatusFilter("");
    };

    const renderShopBadge = (status) => {
        switch (status) {
            case 'approved': return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#e6f4ea] text-[#1e8e3e]">Đang hoạt động</span>;
            case 'pending': return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#fef7e0] text-[#b08a00]">Chờ duyệt</span>;
            case 'suspended': return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#fce8e6] text-[#d93025]">Tạm khóa</span>;
            case 'rejected': return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#f2f2f2] text-[#666666] border border-[#d9d9d9]">Đã từ chối</span>;
            default: return null;
        }
    };

    const renderProductBadge = (status) => {
        switch (status) {
            case 'selling': return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#e6f4ea] text-[#1e8e3e]">Đang bán</span>;
            case 'hidden': return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#fce8e6] text-[#d93025]">Đã bị ẩn</span>;
            case 'draft': return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#fef7e0] text-[#b08a00]">Bản nháp</span>;
            case 'outofstock': return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#f2f2f2] text-[#666666]">Hết hàng</span>;
            default: return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#f2f2f2] text-[#666666]">Chưa rõ</span>;
        }
    };

    if (!shop) return <div className="p-6 text-[#777]">Đang tải thông tin...</div>;

    return (
        <div className="w-full relative font-sans">
            <Link to="/admin/shops" className="inline-flex items-center gap-[8px] text-[#777] no-underline font-medium text-[14px] transition-colors mb-[20px] hover:text-[#853D12]">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg> 
                Quay lại danh sách
            </Link>

            {/* THÔNG TIN SHOP */}
            <div className="bg-white rounded-[12px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden border border-black/5 mb-[30px]">
                <div 
                    className="w-full h-[180px] bg-[#e2d8d0] bg-cover bg-center relative"
                    style={{ backgroundImage: `url(${shop.banner || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=1200&h=300'})` }}
                ></div>
                
                <div className="px-[30px] pb-[30px] relative">
                    <div className="flex justify-between items-end mt-[-50px] mb-[25px]">
                        <div className="flex items-end gap-[20px]">
                            <div 
                                className="w-[120px] h-[120px] rounded-full bg-white border-[4px] border-white shadow-[0_5px_15px_rgba(0,0,0,0.1)] object-cover bg-cover bg-center"
                                style={{ backgroundImage: `url(${shop.logo || `https://ui-avatars.com/api/?name=${shop.name}&background=853D12&color=fff&size=120`})` }}
                            ></div>
                            <div>
                                <h1 className="m-0 mb-[5px] font-serif text-[24px] text-[#333]">{shop.name}</h1>
                                {renderShopBadge(shop.status)}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px] bg-[#fcfbf9] p-[25px] rounded-[8px] border border-[#e2d8d0]">
                        <div className="flex flex-col gap-[6px]">
                            <label className="text-[11px] uppercase font-bold text-[#853D12] tracking-[0.5px]">Chủ cửa hàng</label>
                            <span className="text-[14px] text-[#111] leading-[1.5]">{shop.owner?.fullName || "Chưa cập nhật"}</span>
                        </div>
                        <div className="flex flex-col gap-[6px]">
                            <label className="text-[11px] uppercase font-bold text-[#853D12] tracking-[0.5px]">Số điện thoại</label>
                            <span className="text-[14px] text-[#111] leading-[1.5]">{shop.phone}</span>
                        </div>
                        <div className="flex flex-col gap-[6px]">
                            <label className="text-[11px] uppercase font-bold text-[#853D12] tracking-[0.5px]">Email liên hệ</label>
                            <span className="text-[14px] text-[#111] leading-[1.5]">{shop.email}</span>
                        </div>
                        <div className="flex flex-col gap-[6px] md:col-span-3">
                            <label className="text-[11px] uppercase font-bold text-[#853D12] tracking-[0.5px]">Địa chỉ</label>
                            <span className="text-[14px] text-[#111] leading-[1.5]">{shop.address}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* DANH SÁCH SẢN PHẨM */}
            <div>
                <div className="flex items-center gap-[12px] mb-[15px]">
                    <h3 className="m-0 font-bold text-[18px] text-[#853D12]">Danh sách sản phẩm</h3>
                    <span className="bg-[#fdf3e7] text-[#853D12] py-[2px] px-[12px] rounded-full text-[13px] font-bold border border-[#f8e5c8]">
                        Tổng: {pagination.total} SP
                    </span>
                </div>
                
                {/* Toolbar Lọc */}
                <div className="flex justify-between items-center mb-[20px] flex-wrap gap-[15px]">
                    <div className="relative w-[350px]">
                        <div className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[#777] flex items-center justify-center">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Tìm tên sản phẩm..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full py-[10px] pr-[15px] pl-[40px] border border-[#e2d8d0] rounded-[6px] text-[14px] text-[#333] bg-white outline-none transition-colors focus:border-[#853D12]"
                        />
                    </div>
                    
                    <div className="flex gap-[10px] items-center">
                        <select 
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="py-[10px] px-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] text-[#333] bg-white outline-none min-w-[150px] max-w-[200px] cursor-pointer focus:border-[#853D12] truncate"
                        >
                            <option value="">Tất cả Danh mục</option>
                            {shopCategories.map(cat => (
                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                            ))}
                        </select>

                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="py-[10px] px-[15px] border border-[#e2d8d0] rounded-[6px] text-[14px] text-[#333] bg-white outline-none min-w-[150px] cursor-pointer focus:border-[#853D12]"
                        >
                            <option value="">Tất cả Trạng thái</option>
                            <option value="selling">Đang bán</option>
                            <option value="hidden">Đã bị ẩn</option>
                            <option value="draft">Nháp</option>
                            <option value="outofstock">Hết hàng</option>
                        </select>
                        
                        <button 
                            onClick={handleResetFilters}
                            title="Xóa bộ lọc"
                            className="w-[40px] h-[40px] border border-[#e2d8d0] rounded-[6px] bg-white text-[#777] flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-[#853D12] hover:text-[#853D12] hover:bg-[#fdfbf9]"
                        >
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        </button>
                    </div>
                </div>

                {/* Bảng Dữ Liệu Sản Phẩm */}
                <div className="bg-white rounded-[8px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] overflow-hidden border border-black/5">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#faf7f5] border-b-2 border-[#e2d8d0]">
                            <tr>
                                <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777] tracking-[0.5px] w-[50px] text-center">STT</th>
                                <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777] tracking-[0.5px]">Tên Sản Phẩm</th>
                                <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777] tracking-[0.5px]">Danh mục</th>
                                <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777] tracking-[0.5px]">Giá bán</th>
                                <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777] tracking-[0.5px] text-center">Trạng thái</th>
                                <th className="py-[15px] px-[20px] text-[13px] uppercase font-semibold text-[#777] tracking-[0.5px] text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-[30px] text-center text-[#777]">Không tìm thấy sản phẩm nào!</td>
                                </tr>
                            ) : (
                                products.map((prod, index) => (
                                    <tr key={prod._id} className="hover:bg-[#fdfbf9] transition-colors border-b border-[#e2d8d0] last:border-b-0">
                                        <td className="py-[15px] px-[20px] text-[14px] font-semibold text-[#777] text-center align-middle">
                                            {(pagination.page - 1) * pagination.limit + index + 1}
                                        </td>
                                        
                                        <td className="py-[15px] px-[20px] text-[14px] align-middle">
                                            <div className="font-semibold text-[#333] line-clamp-2" title={prod.name}>{prod.name}</div>
                                        </td>

                                        <td className="py-[15px] px-[20px] text-[14px] text-[#555] align-middle">{prod.category?.name || 'Không rõ'}</td>
                                        <td className="py-[15px] px-[20px] text-[14px] text-[#853D12] font-semibold align-middle">{(prod.price || 0).toLocaleString()} ₫</td>
                                        
                                        <td className="py-[15px] px-[20px] text-[14px] text-center align-middle">
                                            {renderProductBadge(prod.status || 'selling')}
                                        </td>
                                        
                                        <td className="py-[15px] px-[20px] text-[14px] align-middle">
                                            <div className="flex gap-[10px] justify-center">
                                                <button 
                                                    onClick={() => setDetailModal({ show: true, product: prod })}
                                                    title="Xem chi tiết sản phẩm" 
                                                    className="w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white text-[#3498db] flex items-center justify-center cursor-pointer transition-all hover:border-[#3498db] hover:bg-[#ebf5fb]"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                </button>

                                                <button 
                                                    onClick={() => handleToggleClick(prod)}
                                                    title={prod.status === 'hidden' ? "Bỏ ẩn sản phẩm" : "Ẩn sản phẩm này"} 
                                                    className={`w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white flex items-center justify-center cursor-pointer transition-all duration-200 
                                                        ${prod.status === 'hidden' 
                                                            ? 'text-[#1e8e3e] hover:border-[#1e8e3e] hover:bg-[#e6f4ea]' 
                                                            : 'text-[#d93025] hover:border-[#d93025] hover:bg-[#fce8e6]'}`}
                                                >
                                                    {prod.status === 'hidden' 
                                                        ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> 
                                                        : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Thanh Phân Trang */}
                {pagination.pages > 1 && (
                    <div className="mt-4 flex items-center justify-end px-2">
                        <div className="flex items-center gap-[6px]">
                            <button 
                                disabled={pagination.page === 1} 
                                onClick={() => handlePageChange(pagination.page - 1)} 
                                className="px-3 py-[6px] border border-[#e2d8d0] bg-white rounded-[4px] text-[13px] text-[#333] font-medium hover:bg-[#faf7f5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >Trước</button>
                            
                            {[...Array(pagination.pages)].map((_, pIdx) => (
                                <button 
                                    key={pIdx} 
                                    onClick={() => handlePageChange(pIdx + 1)} 
                                    className={`px-3 py-[6px] rounded-[4px] text-[13px] font-semibold transition-all ${pagination.page === pIdx + 1 ? "bg-[#853D12] text-white" : "border border-[#e2d8d0] bg-white text-[#333] hover:bg-[#faf7f5]"}`}
                                >{pIdx + 1}</button>
                            ))}
                            
                            <button 
                                disabled={pagination.page === pagination.pages} 
                                onClick={() => handlePageChange(pagination.page + 1)} 
                                className="px-3 py-[6px] border border-[#e2d8d0] bg-white rounded-[4px] text-[13px] text-[#333] font-medium hover:bg-[#faf7f5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >Sau</button>
                        </div>
                    </div>
                )}
            </div>

            {/* XEM CHI TIẾT SẢN PHẨM */}
            {detailModal.show && detailModal.product && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none">
                    <div className="bg-white rounded-[12px] w-full max-w-[700px] max-h-[90vh] shadow-2xl border border-[#e2d8d0] flex flex-col animate-fade-in">
                        {/* Header Modal */}
                        <div className="flex justify-between items-center p-[20px] border-b border-[#e2d8d0] shrink-0">
                            <h3 className="m-0 text-[18px] font-bold text-[#853D12]">Chi tiết sản phẩm</h3>
                            <button onClick={() => setDetailModal({ show: false, product: null })} className="text-[#777] hover:text-[#d93025] transition-colors cursor-pointer">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        {/* Body Modal */}
                        <div className="p-[20px] overflow-y-auto custom-scrollbar">
                            <h2 className="text-[20px] font-bold text-[#333] mb-1 leading-snug">{detailModal.product.name}</h2>
                            
                            <div className="text-[14px] text-[#555] mb-3">
                                <span className="font-medium text-[#777]">Danh mục:</span> {detailModal.product.category?.name || "Chưa cập nhật"}
                            </div>

                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-[20px] font-bold text-[#d93025]">{(detailModal.product.price || 0).toLocaleString()} ₫</span>
                                {detailModal.product.originalPrice && (
                                    <span className="text-[15px] text-[#999] line-through">{(detailModal.product.originalPrice).toLocaleString()} ₫</span>
                                )}
                                {renderProductBadge(detailModal.product.status)}
                            </div>

                            {detailModal.product.images && detailModal.product.images.length > 0 && (
                                <div className="mb-6">
                                    <label className="block text-[12px] font-bold text-[#777] uppercase mb-2">Hình ảnh <span className="text-[11px] font-normal normal-case italic">(Click để phóng to)</span></label>
                                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                        {detailModal.product.images.map((img, i) => (
                                            <img 
                                                key={i} 
                                                src={img} 
                                                alt={`img-${i}`} 
                                                onClick={() => setEnlargedImg(img)}
                                                className="w-[120px] h-[120px] object-cover rounded-[8px] border border-[#e2d8d0] shrink-0 cursor-pointer hover:border-[#853D12] transition-colors shadow-sm" 
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mb-6">
                                <label className="block text-[12px] font-bold text-[#777] uppercase mb-2">Mô tả chi tiết</label>
                                <div className="text-[14px] text-[#444] leading-relaxed whitespace-pre-wrap bg-[#fcfbf9] p-4 rounded-[8px] border border-[#e2d8d0]">
                                    {detailModal.product.description || "Chưa có mô tả cho sản phẩm này."}
                                </div>
                            </div>

                            <div className="mb-2">
                                <label className="block text-[12px] font-bold text-[#777] uppercase mb-2">Thông số kỹ thuật</label>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-6 bg-[#faf7f5] p-4 rounded-[8px] border border-[#e2d8d0]">
                                    <div className="text-[14px]"><span className="text-[#777] inline-block w-[100px]">Thương hiệu:</span> <span className="font-medium text-[#333]">{detailModal.product.brand || "—"}</span></div>
                                    <div className="text-[14px]"><span className="text-[#777] inline-block w-[100px]">Phong cách:</span> <span className="font-medium text-[#333]">{detailModal.product.style || "—"}</span></div>
                                    <div className="text-[14px]"><span className="text-[#777] inline-block w-[100px]">Chất liệu:</span> <span className="font-medium text-[#333]">{detailModal.product.material || "—"}</span></div>
                                    <div className="text-[14px]"><span className="text-[#777] inline-block w-[100px]">Màu sắc:</span> <span className="font-medium text-[#333]">{detailModal.product.color || "—"}</span></div>
                                    <div className="text-[14px]"><span className="text-[#777] inline-block w-[100px]">Cân nặng:</span> <span className="font-medium text-[#333]">{detailModal.product.weight ? `${detailModal.product.weight} kg` : "—"}</span></div>
                                    <div className="text-[14px]">
                                        <span className="text-[#777] inline-block w-[100px]">Kích thước:</span> 
                                        <span className="font-medium text-[#333]">
                                            {detailModal.product.dimensions 
                                                ? `${detailModal.product.dimensions.length || 0} x ${detailModal.product.dimensions.width || 0} x ${detailModal.product.dimensions.height || 0} cm` 
                                                : "—"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PHÓNG TO ẢNH FULL MÀN HÌNH */}
            {enlargedImg && (
                <div 
                    className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-zoom-out" 
                    onClick={() => setEnlargedImg(null)}
                >
                    <button 
                        className="absolute top-6 right-6 z-[2010] text-white hover:text-[#d93025] bg-black/40 hover:bg-black/80 rounded-full p-2 backdrop-blur-sm transition-all cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation(); 
                            setEnlargedImg(null);
                        }}
                        title="Đóng"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>

                    <div className="relative max-w-5xl max-h-[95vh] flex items-center justify-center">
                        <img 
                            src={enlargedImg} 
                            alt="Phóng to" 
                            className="max-w-full max-h-[90vh] object-contain rounded-[8px] shadow-2xl animate-fade-in"
                            onClick={(e) => e.stopPropagation()} 
                        />
                    </div>
                </div>
            )}

            {/* MODAL NHẬP LÝ DO ẨN SẢN PHẨM */}
            {hideModal.show && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
                    <div className="bg-white rounded-[8px] w-full max-w-[420px] p-6 shadow-2xl border border-[#e2d8d0] mx-4 animate-fade-in">
                        <h3 className="text-[18px] font-bold text-[#d93025] mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#d93025]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Ẩn sản phẩm vi phạm
                        </h3>
                        <p className="text-[14px] text-[#333] mb-4 leading-relaxed">
                            Bạn đang thao tác ẩn sản phẩm <strong className="text-[#111]">{hideModal.productName}</strong>. Vui lòng cung cấp lý do để gửi thông báo cho chủ shop.
                        </p>
                        <div className="mb-6">
                            <label className="block text-[12px] font-bold text-[#777] uppercase mb-2">Lý do bị ẩn <span className="text-[#d93025]">*</span></label>
                            <textarea
                                value={hideModal.reason}
                                onChange={(e) => setHideModal({ ...hideModal, reason: e.target.value })}
                                placeholder="Ví dụ: Hình ảnh kém chất lượng, mô tả sai sự thật, hàng cấm kinh doanh..."
                                className="w-full p-3 border border-[#e2d8d0] rounded-[6px] text-[14px] outline-none focus:border-[#d93025] resize-none h-[100px] font-sans"
                            ></textarea>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-[#e2d8d0] pt-4">
                            <button onClick={() => setHideModal({ show: false, productId: null, productName: "", reason: "" })} className="px-4 py-2 border border-[#e2d8d0] bg-white rounded-[6px] text-[13px] font-medium text-[#777] hover:bg-[#faf7f5] transition-colors cursor-pointer">Hủy bỏ</button>
                            <button onClick={submitHideProduct} className="px-4 py-2 bg-[#d93025] hover:bg-[#b3271d] rounded-[6px] text-[13px] font-semibold text-white transition-colors shadow-sm cursor-pointer">Xác nhận Ẩn</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminShopDetail;