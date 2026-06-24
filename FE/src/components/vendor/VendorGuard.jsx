import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getMyShopApi } from '../../utils/api'; // Đường dẫn đến API của bạn

const VendorGuard = () => {
    const [shop, setShop] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        
        getMyShopApi()
            .then(res => {
                if (active && res && res.success) {
                    setShop(res.data?.shop || res.data);
                }
                setLoading(false);
            })
            .catch(() => {
                if (active) setLoading(false);
            });
            
        return () => { active = false; };
    }, []);

    // Hiển thị màn hình chờ mượt mà
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F4] font-sans">
                <div className="w-8 h-8 border-4 border-[#e2d8d0] border-t-[#853D12] rounded-full animate-spin mb-3"></div>
                <div className="text-[14px] text-[#777] font-medium">Đang kiểm tra trạng thái cửa hàng...</div>
            </div>
        );
    }

    // CHỐT CHẶN: Nếu shop đang bị khóa -> Đá sang trang màn hình cách ly
    if (shop && shop.status === 'suspended') {
        return <Navigate to="/vendor/suspended" replace />;
    }

    // Nếu shop bình thường -> Mở cổng cho phép đi tiếp vào giao diện VendorLayout
    return <Outlet />;
};

export default VendorGuard;