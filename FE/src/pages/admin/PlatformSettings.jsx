import { useState, useEffect } from "react";
import { getPlatformConfigApi, updatePlatformConfigApi } from "../../utils/api";

const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const PlatformSettings = () => {
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(null);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState('general');

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const res = await getPlatformConfigApi();
            if (res.success) {
                setConfigs(res.data.configs);
            }
        } catch (err) {
            console.error('Error fetching configs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const handleUpdate = async (key, value) => {
        try {
            setSaving(true);
            const res = await updatePlatformConfigApi(key, value);
            if (res.success) {
                setConfigs(prev => ({ ...prev, [key]: value }));
                setMessage({ type: 'success', text: 'Cập nhật thành công!' });
            } else {
                setMessage({ type: 'error', text: res.message || 'Lỗi cập nhật' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Lỗi kết nối' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleFileUpload = async (field, file) => {
        if (!file) return;
        
        try {
            setUploading(field);
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await fetch('/api/admin/platform/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            const data = await res.json();
            
            if (data.success) {
                setConfigs(prev => ({ ...prev, [field]: data.data.url }));
                setMessage({ type: 'success', text: 'Upload thành công!' });
            } else {
                setMessage({ type: 'error', text: data.message || 'Lỗi upload' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Lỗi kết nối' });
        } finally {
            setUploading(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const tabs = [
        { key: 'general', label: 'Cơ bản', icon: '🏠' },
        { key: 'appearance', label: 'Giao diện', icon: '🎨' },
        { key: 'wallet', label: 'Ví điện tử', icon: '💳' },
        { key: 'pagination', label: 'Phân trang', icon: '📄' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-t-[#853D12] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="admin-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-[20px] font-bold text-[#2a160b]">Cấu Hình Sàn</h2>
                    <p className="text-[13px] text-[#9E8E7E]">Quản lý cấu hình hiển thị và thanh toán của sàn</p>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-2 ${
                            activeTab === tab.key 
                                ? 'bg-[#853D12] text-white' 
                                : 'bg-white text-[#6B5C4C] hover:bg-[#faf7f4]'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl border border-[#e2d8d0] p-6">
                {/* Tab: Cơ bản */}
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <h3 className="text-[16px] font-semibold text-[#2a160b] border-b border-[#e2d8d0] pb-3">
                            Thông Tin Cơ Bản
                        </h3>
                        
                        <div>
                            <label className="block text-[13px] font-medium text-[#6B5C4C] mb-2">
                                Tên Sàn
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={configs.platform_name || ''}
                                    onChange={(e) => setConfigs(prev => ({ ...prev, platform_name: e.target.value }))}
                                    className="flex-1 px-4 py-2.5 rounded-lg border border-[#e2d8d0] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#853D12]/20 focus:border-[#853D12]"
                                    placeholder="VD: SORA FURNITURE"
                                />
                                <button
                                    onClick={() => handleUpdate('platform_name', configs.platform_name)}
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#853D12] text-white rounded-lg text-[13px] font-medium hover:bg-[#6d310f] disabled:opacity-50"
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                            <p className="text-[11px] text-[#9E8E7E] mt-1">Tên sàn hiển thị trên header và footer</p>
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-[#6B5C4C] mb-2">
                                Tagline (Mô tả ngắn)
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={configs.platform_tagline || ''}
                                    onChange={(e) => setConfigs(prev => ({ ...prev, platform_tagline: e.target.value }))}
                                    className="flex-1 px-4 py-2.5 rounded-lg border border-[#e2d8d0] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#853D12]/20 focus:border-[#853D12]"
                                    placeholder="VD: Đồ gỗ nội thất cao cấp"
                                />
                                <button
                                    onClick={() => handleUpdate('platform_tagline', configs.platform_tagline)}
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#853D12] text-white rounded-lg text-[13px] font-medium hover:bg-[#6d310f] disabled:opacity-50"
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-[#6B5C4C] mb-2">
                                Phí Sàn (%)
                            </label>
                            <div className="flex gap-3 items-center">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={configs.platform_fee_percent || 0}
                                    onChange={(e) => setConfigs(prev => ({ ...prev, platform_fee_percent: Number(e.target.value) }))}
                                    className="w-32 px-4 py-2.5 rounded-lg border border-[#e2d8d0] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#853D12]/20 focus:border-[#853D12]"
                                />
                                <span className="text-[13px] text-[#9E8E7E]">%</span>
                                <button
                                    onClick={() => handleUpdate('platform_fee_percent', Number(configs.platform_fee_percent))}
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#853D12] text-white rounded-lg text-[13px] font-medium hover:bg-[#6d310f] disabled:opacity-50"
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                            <p className="text-[11px] text-[#9E8E7E] mt-1">Phần trăm phí sàn thu từ mỗi đơn hàng</p>
                        </div>
                    </div>
                )}

                {/* Tab: Giao diện */}
                {activeTab === 'appearance' && (
                    <div className="space-y-6">
                        <h3 className="text-[16px] font-semibold text-[#2a160b] border-b border-[#e2d8d0] pb-3">
                            Cấu Hình Giao Diện
                        </h3>
                        
                        {/* Logo */}
                        <div>
                            <label className="block text-[13px] font-medium text-[#6B5C4C] mb-2">
                                Logo Sàn
                            </label>
                            <div className="flex items-start gap-4">
                                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-[#e2d8d0] flex items-center justify-center bg-[#faf7f4] overflow-hidden">
                                    {configs.platform_logo ? (
                                        <img 
                                            src={configs.platform_logo} 
                                            alt="Logo" 
                                            className="w-full h-full object-contain"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <span className="text-[#9E8E7E] text-3xl">🏠</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload('platform_logo', e.target.files[0])}
                                        className="hidden"
                                        id="logo-upload"
                                        disabled={uploading === 'platform_logo'}
                                    />
                                    <label 
                                        htmlFor="logo-upload"
                                        className={`inline-flex items-center gap-2 px-4 py-2 bg-[#853D12] text-white rounded-lg text-[13px] font-medium cursor-pointer hover:bg-[#6d310f] ${uploading === 'platform_logo' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {uploading === 'platform_logo' ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Đang upload...
                                            </>
                                        ) : (
                                            <>📤 Tải lên Logo</>
                                        )}
                                    </label>
                                    <p className="text-[11px] text-[#9E8E7E] mt-2">Kích thước khuyến nghị: 200x60px, định dạng PNG, JPG</p>
                                </div>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div>
                            <label className="block text-[13px] font-medium text-[#6B5C4C] mb-2">
                                Mã QR Thanh Toán Sàn (PayOS)
                            </label>
                            <p className="text-[11px] text-[#9E8E7E] mb-3">Mã QR sẽ được hiển thị khi khách hàng chọn thanh toán PayOS tại checkout</p>
                            <div className="flex items-start gap-4">
                                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-[#e2d8d0] flex items-center justify-center bg-[#faf7f4] overflow-hidden">
                                    {configs.platform_qr_image ? (
                                        <img 
                                            src={configs.platform_qr_image} 
                                            alt="QR Code" 
                                            className="w-full h-full object-contain"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <span className="text-[#9E8E7E] text-3xl">📱</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload('platform_qr_image', e.target.files[0])}
                                        className="hidden"
                                        id="qr-upload"
                                        disabled={uploading === 'platform_qr_image'}
                                    />
                                    <label 
                                        htmlFor="qr-upload"
                                        className={`inline-flex items-center gap-2 px-4 py-2 bg-[#853D12] text-white rounded-lg text-[13px] font-medium cursor-pointer hover:bg-[#6d310f] ${uploading === 'platform_qr_image' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {uploading === 'platform_qr_image' ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Đang upload...
                                            </>
                                        ) : (
                                            <>📤 Tải lên QR Code</>
                                        )}
                                    </label>
                                    <p className="text-[11px] text-[#9E8E7E] mt-2">Kích thước khuyến nghị: 300x300px, định dạng PNG</p>
                                </div>
                            </div>
                            
                            {/* Toggle QR PayOS */}
                            <div className="mt-4 flex items-center gap-3">
                                <button
                                    onClick={() => handleUpdate('payos_qr_enabled', !configs.payos_qr_enabled)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${
                                        configs.payos_qr_enabled ? 'bg-[#853D12]' : 'bg-[#e2d8d0]'
                                    }`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                        configs.payos_qr_enabled ? 'left-7' : 'left-1'
                                    }`} />
                                </button>
                                <span className="text-[13px] text-[#6B5C4C]">
                                    {configs.payos_qr_enabled ? 'Đã bật hiển thị QR PayOS' : 'Đã tắt hiển thị QR PayOS'}
                                </span>
                            </div>
                        </div>

                        {/* Favicon */}
                        <div>
                            <label className="block text-[13px] font-medium text-[#6B5C4C] mb-2">
                                Favicon
                            </label>
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-[#e2d8d0] flex items-center justify-center bg-[#faf7f4] overflow-hidden">
                                    {configs.platform_favicon ? (
                                        <img 
                                            src={configs.platform_favicon} 
                                            alt="Favicon" 
                                            className="w-full h-full object-contain"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <span className="text-[#9E8E7E] text-2xl">🔖</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload('platform_favicon', e.target.files[0])}
                                        className="hidden"
                                        id="favicon-upload"
                                        disabled={uploading === 'platform_favicon'}
                                    />
                                    <label 
                                        htmlFor="favicon-upload"
                                        className={`inline-flex items-center gap-2 px-4 py-2 bg-[#853D12] text-white rounded-lg text-[13px] font-medium cursor-pointer hover:bg-[#6d310f] ${uploading === 'platform_favicon' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {uploading === 'platform_favicon' ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Đang upload...
                                            </>
                                        ) : (
                                            <>📤 Tải lên Favicon</>
                                        )}
                                    </label>
                                    <p className="text-[11px] text-[#9E8E7E] mt-2">Kích thước khuyến nghị: 32x32px hoặc 64x64px, định dạng ICO, PNG</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Ví điện tử */}
                {activeTab === 'wallet' && (
                    <div className="space-y-6">
                        <h3 className="text-[16px] font-semibold text-[#2a160b] border-b border-[#e2d8d0] pb-3">
                            Cấu Hình Ví Điện Tử
                        </h3>
                        
                        {/* Toggle Wallet */}
                        <div className="flex items-center justify-between p-4 bg-[#faf7f4] rounded-xl">
                            <div>
                                <h4 className="text-[14px] font-medium text-[#2a160b]">Bật/Tắt Ví Điện Tử</h4>
                                <p className="text-[12px] text-[#9E8E7E]">Cho phép người dùng sử dụng ví điện tử trên sàn</p>
                            </div>
                            <button
                                onClick={() => handleUpdate('wallet_enabled', !configs.wallet_enabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                    configs.wallet_enabled ? 'bg-[#853D12]' : 'bg-[#e2d8d0]'
                                }`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                    configs.wallet_enabled ? 'left-7' : 'left-1'
                                }`} />
                            </button>
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-[#6B5C4C] mb-2">
                                Số tiền nạp tối thiểu
                            </label>
                            <div className="flex gap-3 items-center">
                                <input
                                    type="number"
                                    min="1000"
                                    value={configs.wallet_min_deposit || 10000}
                                    onChange={(e) => setConfigs(prev => ({ ...prev, wallet_min_deposit: Number(e.target.value) }))}
                                    className="w-40 px-4 py-2.5 rounded-lg border border-[#e2d8d0] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#853D12]/20 focus:border-[#853D12]"
                                />
                                <span className="text-[13px] text-[#9E8E7E]">VNĐ</span>
                                <button
                                    onClick={() => handleUpdate('wallet_min_deposit', Number(configs.wallet_min_deposit))}
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#853D12] text-white rounded-lg text-[13px] font-medium hover:bg-[#6d310f] disabled:opacity-50"
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                            <p className="text-[11px] text-[#9E8E7E] mt-1">Số tiền nạp tối thiểu mỗi lần: {formatVND(configs.wallet_min_deposit || 10000)}</p>
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-[#6B5C4C] mb-2">
                                Số tiền rút tối thiểu
                            </label>
                            <div className="flex gap-3 items-center">
                                <input
                                    type="number"
                                    min="10000"
                                    value={configs.wallet_min_withdraw || 50000}
                                    onChange={(e) => setConfigs(prev => ({ ...prev, wallet_min_withdraw: Number(e.target.value) }))}
                                    className="w-40 px-4 py-2.5 rounded-lg border border-[#e2d8d0] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#853D12]/20 focus:border-[#853D12]"
                                />
                                <span className="text-[13px] text-[#9E8E7E]">VNĐ</span>
                                <button
                                    onClick={() => handleUpdate('wallet_min_withdraw', Number(configs.wallet_min_withdraw))}
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#853D12] text-white rounded-lg text-[13px] font-medium hover:bg-[#6d310f] disabled:opacity-50"
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                            <p className="text-[11px] text-[#9E8E7E] mt-1">Số tiền rút tối thiểu mỗi lần: {formatVND(configs.wallet_min_withdraw || 50000)}</p>
                        </div>
                    </div>
                )}

                {/* Tab: Phân trang */}
                {activeTab === 'pagination' && (
                    <div className="space-y-6">
                        <h3 className="text-[16px] font-semibold text-[#2a160b] border-b border-[#e2d8d0] pb-3">
                            Cấu Hình Phân Trang
                        </h3>
                        
                        <div>
                            <label className="block text-[13px] font-medium text-[#6B5C4C] mb-2">
                                Số sản phẩm mỗi trang
                            </label>
                            <div className="flex gap-3 items-center">
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={configs.products_per_page || 12}
                                    onChange={(e) => setConfigs(prev => ({ ...prev, products_per_page: Number(e.target.value) }))}
                                    className="w-32 px-4 py-2.5 rounded-lg border border-[#e2d8d0] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#853D12]/20 focus:border-[#853D12]"
                                />
                                <span className="text-[13px] text-[#9E8E7E]">sản phẩm</span>
                                <button
                                    onClick={() => handleUpdate('products_per_page', Number(configs.products_per_page))}
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#853D12] text-white rounded-lg text-[13px] font-medium hover:bg-[#6d310f] disabled:opacity-50"
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                            <p className="text-[11px] text-[#9E8E7E] mt-1">Số sản phẩm hiển thị trên mỗi trang (FE): {configs.products_per_page || 12}</p>
                        </div>

                        <div className="p-4 bg-[#faf7f4] rounded-xl">
                            <h4 className="text-[14px] font-medium text-[#2a160b] mb-2">💡 Gợi ý</h4>
                            <ul className="text-[12px] text-[#6B5C4C] space-y-1">
                                <li>• 8-12 sản phẩm: Phù hợp cho trang danh sách sản phẩm lớn</li>
                                <li>• 16-24 sản phẩm: Hiển thị nhiều hơn, giảm số lần scroll</li>
                                <li>• 32-48 sản phẩm: Phù hợp cho website tốc độ cao</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlatformSettings;
