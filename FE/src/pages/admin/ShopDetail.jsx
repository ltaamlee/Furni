import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getAdminShopDetailApi, getAdminShopProductsApi, toggleProductVisibilityAdminApi, getAdminCategoriesApi } from "../../utils/api";

const AdminShopDetail = () => {
    const { id } = useParams();
    
    const [shop, setShop] = useState(null);
    const [products, setProducts] = useState([]);
    
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [categories, setCategories] = useState([]);

    // Modal nhập lý do
    const [hideModal, setHideModal] = useState({
        show: false,
        productId: null,
        productName: "",
        reason: ""
    });

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await getAdminCategoriesApi({ limit: 100 });
                if (res && res.success) setCategories(res.data?.categories || []);
            } catch (error) {
                console.error("Lỗi tải danh mục:", error);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => { fetchShopDetail(); }, [id]);
    useEffect(() => { fetchShopProducts(); }, [id, search, categoryFilter, statusFilter]);

    const fetchShopDetail = async () => {
        try {
            const res = await getAdminShopDetailApi(id);
            if (res && res.success) setShop(res.data);
        } catch (error) {
            console.error("Lỗi tải chi tiết shop:", error);
        }
    };

    const fetchShopProducts = async () => {
        try {
            const params = {};
            if (search) params.search = search;
            if (categoryFilter) params.category = categoryFilter;
            if (statusFilter) params.status = statusFilter;

            const res = await getAdminShopProductsApi(id, params);
            if (res && res.success) setProducts(res.data || []);
        } catch (error) {
            console.error("Lỗi tải sản phẩm:", error);
        }
    };

    // LOGIC: Xử lý click
    const handleToggleClick = (prod) => {
        if (prod.status !== 'hidden') {
            setHideModal({ show: true, productId: prod._id, productName: prod.name, reason: "" });
        } else {
            if (window.confirm(`Cho phép sản phẩm "${prod.name}" hiển thị lại trên sàn?`)) {
                executeToggleVisibility(prod._id, ""); 
            }
        }
    };

    // Hàm gọi API
    const executeToggleVisibility = async (productId, reason) => {
        try {
            const res = await toggleProductVisibilityAdminApi(productId, { hiddenReason: reason });
            if (res && res.success) {
                alert(res.message || "Cập nhật sản phẩm thành công!");
                fetchShopProducts(); 
                setHideModal({ show: false, productId: null, productName: "", reason: "" });
            }
        } catch (error) {
            alert(error.response?.data?.message || "Lỗi khi cập nhật sản phẩm!");
        }
    };

    // Submit lưu lý do
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

    // Render Badge
    const renderShopBadge = (status) => {
        switch (status) {
            case 'approved': return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#e6f4ea] text-[#1e8e3e]">Đang hoạt động</span>;
            case 'pending': return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#fef7e0] text-[#b08a00]">Chờ duyệt</span>;
            case 'suspended': return <span className="inline-block px-[10px] py-[5px] rounded-[20px] text-[12px] font-semibold bg-[#fce8e6] text-[#d93025]">Tạm ngưng</span>;
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
                <h3 className="m-0 mb-[15px] font-bold text-[18px] text-[#853D12]">Danh sách sản phẩm</h3>
                
                {/* Toolbar */}
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

                {/* Bảng Dữ Liệu Sản Phẩm (ĐÃ XOÁ ĐOẠN HIỂN THỊ LÝ DO TRONG BẢNG) */}
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
                                        <td className="py-[15px] px-[20px] text-[14px] font-semibold text-[#777] text-center align-middle">{index + 1}</td>
                                        
                                        <td className="py-[15px] px-[20px] text-[14px] align-middle">
                                            <div className="font-semibold text-[#333]">{prod.name}</div>
                                        </td>

                                        <td className="py-[15px] px-[20px] text-[14px] text-[#555] align-middle">{prod.category?.name || 'Không rõ'}</td>
                                        <td className="py-[15px] px-[20px] text-[14px] text-[#853D12] font-semibold align-middle">{(prod.price || 0).toLocaleString()} ₫</td>
                                        
                                        <td className="py-[15px] px-[20px] text-[14px] text-center align-middle">
                                            {renderProductBadge(prod.status || 'selling')}
                                        </td>
                                        
                                        <td className="py-[15px] px-[20px] text-[14px] align-middle">
                                            <div className="flex gap-[10px] justify-center">
                                                <button 
                                                    onClick={() => handleToggleClick(prod)}
                                                    title={prod.status === 'hidden' ? "Bỏ ẩn sản phẩm" : "Ẩn sản phẩm này"} 
                                                    className={`w-[32px] h-[32px] rounded-[6px] border border-[#e2d8d0] bg-white flex items-center justify-center cursor-pointer transition-all duration-200 
                                                        ${prod.status === 'hidden' 
                                                            ? 'text-[#1e8e3e] hover:border-[#1e8e3e] hover:bg-[#e6f4ea]' 
                                                            : 'text-[#d93025] hover:border-[#d93025] hover:bg-[#fce8e6]'}`}
                                                >
                                                    {prod.status === 'hidden' 
                                                        ? <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg> 
                                                        : <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL NHẬP LÝ DO ẨN SẢN PHẨM */}
            {hideModal.show && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
                    <div className="bg-white rounded-[8px] w-full max-w-[420px] p-6 shadow-2xl border border-[#e2d8d0] mx-4 animate-fade-in">
                        <h3 className="text-[18px] font-bold text-[#d93025] mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#d93025]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
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
                            <button
                                onClick={() => setHideModal({ show: false, productId: null, productName: "", reason: "" })}
                                className="px-4 py-2 border border-[#e2d8d0] bg-white rounded-[6px] text-[13px] font-medium text-[#777] hover:bg-[#faf7f5] transition-colors cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={submitHideProduct}
                                className="px-4 py-2 bg-[#d93025] hover:bg-[#b3271d] rounded-[6px] text-[13px] font-semibold text-white transition-colors shadow-sm cursor-pointer"
                            >
                                Xác nhận Ẩn
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminShopDetail;