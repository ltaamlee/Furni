import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../components/context/authContext";
import { useToast } from "../../components/context/ToastContext";
import AddressAutocomplete from "../../components/common/AddressAutocomplete";

const AddressesPage = () => {
    const { auth } = useContext(AuthContext);
    const { showToast } = useToast();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        province: "",
        district: "",
        ward: "",
        street: "",
        isDefault: false
    });

    useEffect(() => {
        fetchAddresses();
    }, []);

    // Load user info into form when user is available
    useEffect(() => {
        if (auth?.user) {
            setFormData(prev => ({
                ...prev,
                fullName: auth.user.fullName || "",
                phone: auth.user.phone || ""
            }));
        }
    }, [auth]);

    const fetchAddresses = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/addresses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAddresses(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching addresses:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const token = localStorage.getItem("access_token");
            const url = editingAddress 
                ? `${import.meta.env.VITE_API_URL}/api/user/addresses/${editingAddress._id}`
                : `${import.meta.env.VITE_API_URL}/api/user/addresses`;
            
            const method = editingAddress ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            
            const data = await res.json();
            if (data.success) {
                showToast(editingAddress ? "Cập nhật địa chỉ thành công!" : "Thêm địa chỉ thành công!", "success");
                setShowModal(false);
                setEditingAddress(null);
                resetForm();
                fetchAddresses();
            }
        } catch (error) {
            showToast("Có lỗi xảy ra!", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (address) => {
        setEditingAddress(address);
        setFormData({
            fullName: address.fullName || "",
            phone: address.phone || "",
            province: address.province || "",
            district: address.district || "",
            ward: address.ward || "",
            street: address.street || "",
            isDefault: address.isDefault || false
        });
        setShowModal(true);
    };

    const handleDelete = async (addressId) => {
        if (!confirm("Bạn có chắc muốn xóa địa chỉ này?")) return;
        
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/addresses/${addressId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                showToast("Xóa địa chỉ thành công!", "success");
                fetchAddresses();
            }
        } catch (error) {
            showToast("Có lỗi xảy ra!", "error");
        }
    };

    const handleSetDefault = async (addressId) => {
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/addresses/${addressId}/default`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                showToast("Đặt làm địa chỉ mặc định!", "success");
                fetchAddresses();
            }
        } catch (error) {
            showToast("Có lỗi xảy ra!", "error");
        }
    };

    const resetForm = () => {
        setFormData({
            fullName: auth?.user?.fullName || "",
            phone: auth?.user?.phone || "",
            province: "",
            district: "",
            ward: "",
            street: "",
            isDefault: false
        });
    };

    const handlePlaceSelect = (addressData) => {
        setFormData(prev => ({
            ...prev,
            province: addressData.province || prev.province,
            district: addressData.district || prev.district,
            ward: addressData.ward || prev.ward,
            street: addressData.street || prev.street
        }));
    };

    const formatAddress = (address) => {
        const parts = [
            address.street,
            address.ward,
            address.district,
            address.province
        ].filter(Boolean);
        return parts.join(", ");
    };

    return (
        <div className="bg-white rounded-2xl border border-[#EDE8E0]">
                {/* Header */}
                <div className="p-6 border-b border-[#EDE8E0] flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-[#1C1108]">Địa chỉ giao hàng</h1>
                        <p className="text-sm text-[#A8896A] mt-1">Quản lý danh sách địa chỉ giao hàng của bạn</p>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setEditingAddress(null);
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#B86B05] text-white font-medium rounded-xl hover:bg-[#95520B] transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Thêm địa chỉ
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin mx-auto"></div>
                        </div>
                    ) : addresses.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-[#FAF7F4] rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#A8896A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-[#1C1108] mb-2">Chưa có địa chỉ nào</h3>
                            <p className="text-sm text-[#A8896A] mb-6">Thêm địa chỉ giao hàng để mua sắm thuận tiện hơn</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[#B86B05] text-white font-medium rounded-xl hover:bg-[#95520B] transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Thêm địa chỉ mới
                            </button>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                            {addresses.map((address) => (
                                <div
                                    key={address._id}
                                    className={`p-5 rounded-xl border-2 transition-all ${
                                        address.isDefault
                                            ? "border-[#B86B05] bg-[#B86B05]/5"
                                            : "border-[#EDE8E0] hover:border-[#D5C9BC]"
                                    }`}
                                >
                                    {address.isDefault && (
                                        <span className="inline-block px-2 py-0.5 bg-[#B86B05] text-white text-xs font-semibold rounded-full mb-2">
                                            Mặc định
                                        </span>
                                    )}
                                    
                                    <div className="space-y-1 mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-[#1C1108]">{address.fullName}</span>
                                            <span className="text-[#A8896A]">|</span>
                                            <span className="text-[#6B5C4C]">{address.phone}</span>
                                        </div>
                                        <p className="text-sm text-[#6B5C4C] leading-relaxed">
                                            {formatAddress(address)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 pt-4 border-t border-[#EDE8E0]">
                                        {!address.isDefault && (
                                            <button
                                                onClick={() => handleSetDefault(address._id)}
                                                className="text-sm text-[#B86B05] hover:text-[#95520B] font-medium transition-colors"
                                            >
                                                Đặt làm mặc định
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleEdit(address)}
                                            className="text-sm text-[#6B5C4C] hover:text-[#B86B05] font-medium transition-colors"
                                        >
                                            Sửa
                                        </button>
                                        <button
                                            onClick={() => handleDelete(address._id)}
                                            className="text-sm text-[#BF4343] hover:text-red-700 font-medium transition-colors"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal */}
                {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-[#EDE8E0] flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[#1C1108]">
                                {editingAddress ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingAddress(null);
                                    resetForm();
                                }}
                                className="p-2 hover:bg-[#FAF7F4] rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#6B5C4C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Full Name & Phone */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Họ và tên</label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all"
                                        placeholder="Nguyễn Văn A"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Số điện thoại</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all"
                                        placeholder="0123456789"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Province */}
                            <div>
                                <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Tỉnh/Thành phố</label>
                                <input
                                    type="text"
                                    value={formData.province}
                                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all"
                                    placeholder="TP. Hồ Chí Minh"
                                    required
                                />
                            </div>

                            {/* District */}
                            <div>
                                <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Quận/Huyện</label>
                                <input
                                    type="text"
                                    value={formData.district}
                                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all"
                                    placeholder="Quận 1"
                                    required
                                />
                            </div>

                            {/* Ward */}
                            <div>
                                <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Phường/Xã</label>
                                <input
                                    type="text"
                                    value={formData.ward}
                                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all"
                                    placeholder="Phường Bến Nghé"
                                    required
                                />
                            </div>

                            {/* Street */}
                            <div>
                                <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Địa chỉ cụ thể</label>
                                <AddressAutocomplete
                                    value={formData.street}
                                    onChange={(street) => setFormData({ ...formData, street })}
                                    onPlaceSelect={handlePlaceSelect}
                                    placeholder="123 Đường ABC, Chung cư XYZ"
                                    className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all"
                                    required
                                />
                            </div>

                            {/* Set as default */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isDefault}
                                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                    className="w-5 h-5 text-[#B86B05] rounded focus:ring-[#B86B05]"
                                />
                                <span className="text-sm text-[#1C1108]">Đặt làm địa chỉ mặc định</span>
                            </label>

                            {/* Submit */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingAddress(null);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-2.5 border border-[#D5C9BC] text-[#6B5C4C] font-medium rounded-xl hover:bg-[#FAF7F4] transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2.5 bg-[#B86B05] text-white font-medium rounded-xl hover:bg-[#95520B] transition-colors disabled:opacity-50"
                                >
                                    {saving ? "Đang lưu..." : editingAddress ? "Cập nhật" : "Thêm mới"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddressesPage;
