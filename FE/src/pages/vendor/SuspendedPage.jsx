import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyShopApi } from "../../utils/api";

const SuspendedPage = () => {
    const navigate = useNavigate();
    const [shop, setShop] = useState(null);

    useEffect(() => {
        getMyShopApi().then(res => {
            if (res.success) {
                if (res.data.shop.status !== 'suspended') {
                    navigate('/vendor/dashboard'); 
                } else {
                    setShop(res.data.shop);
                }
            }
        });
    }, [navigate]);

    if (!shop) return <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4]">Đang tải thông tin...</div>;

    return (
        <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center p-4 font-sans select-none">
            <div className="max-w-[600px] w-full bg-white rounded-[16px] shadow-[0_15px_40px_rgba(0,0,0,0.08)] border border-[#fecaca] overflow-hidden animate-[fadeIn_0.4s_ease]">
                
                {/* Header Cảnh Báo */}
                <div className="bg-[#d93025] p-6 text-center text-white">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0-8v4m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h2 className="text-[22px] font-bold m-0 uppercase tracking-wide">Cửa hàng đã bị tạm khóa</h2>
                    <p className="text-[14px] mt-1.5 opacity-80">Mọi tính năng kinh doanh hiện đang bị đình chỉ.</p>
                </div>

                <div className="p-8">
                    {/*hiển thị lý do */}
                    <div className="bg-[#fdfbf9] p-5 rounded-[8px] border border-[#ede8e0] mb-6 text-[14px] leading-relaxed">
                        <div className="mb-2 text-[#333]"><strong>Tên cửa hàng:</strong> {shop.name}</div>
                        <div className="text-[#d93025]"><strong>Lý do vi phạm từ hệ thống:</strong> {shop.statusNote || "Vi phạm quy chế sàn giao dịch."}</div>
                    </div>
                    <div className="p-4 bg-[#fef7e0] border border-[#f8e5c8] rounded-[8px] text-center text-[#b08a00] font-medium text-[14px]">
                        📞 Nếu có bất kỳ thắc mắc nào hoặc cần khiếu nại, vui lòng liên hệ tổng đài <strong className="text-[16px] text-[#853D12]">1900 8080</strong> để được bộ phận CSKH hỗ trợ giải quyết.
                    </div>
                    
                    {/* Nút thoát */}
                    <div className="mt-6 text-center">
                        <button type="button" onClick={() => navigate('/')} className="text-[14px] font-semibold text-[#853D12] hover:underline cursor-pointer transition-all">
                            &larr; Quay lại trang chủ mua sắm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuspendedPage;