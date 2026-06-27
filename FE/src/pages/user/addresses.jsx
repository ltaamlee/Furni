import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../components/context/authContext";
import { useToast } from "../../components/context/ToastContext";
import MapPicker from "../../components/common/MapPicker";

const AddressesPage = () => {
    const { auth } = useContext(AuthContext);
    const { showToast } = useToast();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({});
    const [pendingFormData, setPendingFormData] = useState({});

    useEffect(() => {
        fetchAddresses();
    }, []);

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

    const getDefaultFormData = () => ({
        fullName: auth?.user?.fullName || "",
        phone: auth?.user?.phone || "",
        provinceCode: null,
        provinceName: "",
        wardName: "",
        street: "",
        lat: null,
        lng: null,
        formattedAddress: "",
        isDefault: false,
    });

    const handleMapChange = (data) => {
        setPendingFormData(data);
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

            const payload = {
                ...pendingFormData,
                fullName: pendingFormData.fullName || "",
                phone: pendingFormData.phone || "",
            };

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                showToast(
                    editingAddress ? "Cập nhật địa chỉ thành công!" : "Thêm địa chỉ thành công!",
                    "success"
                );
                closeModal();
                fetchAddresses();
            } else {
                showToast(data.message || "Có lỗi xảy ra!", "error");
            }
        } catch (error) {
            showToast("Có lỗi xảy ra!", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (address) => {
        setEditingAddress(address);
        const data = {
            fullName: address.fullName || "",
            phone: address.phone || "",
            provinceCode: address.provinceCode || null,
            provinceName: address.provinceName || address.province || "",
            districtName: address.districtName || address.district || "",
            wardName: address.wardName || address.ward || "",
            street: address.street || "",
            lat: address.lat || null,
            lng: address.lng || null,
            formattedAddress: address.formattedAddress || "",
            isDefault: address.isDefault || false,
        };
        setFormData(data);
        setPendingFormData(data);
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

    const openAddModal = () => {
        const defaults = getDefaultFormData();
        setFormData(defaults);
        setPendingFormData(defaults);
        setEditingAddress(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingAddress(null);
        setFormData({});
        setPendingFormData({});
    };

    const formatAddress = (address) => {
        // Try component-wise display first
        const parts = [
            address.street,
            address.wardName || address.ward,
            address.districtName || address.district,
            address.provinceName || address.province,
        ].filter(Boolean);

        if (parts.length >= 3) return parts.join(", ");

        // Fallback to formattedAddress for legacy addresses
        if (address.formattedAddress) return address.formattedAddress;

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
                    onClick={openAddModal}
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
                        <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin mx-auto" />
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
                            onClick={openAddModal}
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

            {/* Modal with MapPicker: split layout (form left, map right) */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="p-4 sm:p-6 border-b border-[#EDE8E0] flex items-center justify-between flex-shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-[#1C1108]">
                                    {editingAddress ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
                                </h2>
                                <p className="text-xs text-[#A8896A] mt-0.5 hidden sm:block">
                                    Kéo marker hoặc click trên bản đồ để chọn vị trí chính xác
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 hover:bg-[#FAF7F4] rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#6B5C4C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body: MapPicker (form + map side by side) */}
                        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto">
                            <div className="p-4 sm:p-6">
                                <MapPicker
                                    value={formData}
                                    onChange={handleMapChange}
                                    apiKey={import.meta.env.VITE_MAPVINA_KEY}
                                />
                            </div>

                            {/* Footer actions */}
                            <div className="p-4 sm:p-6 pt-0 flex gap-3 flex-shrink-0 border-t border-[#EDE8E0]">
                                <button
                                    type="button"
                                    onClick={closeModal}
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
