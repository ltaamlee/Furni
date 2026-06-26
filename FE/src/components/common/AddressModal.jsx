import { useState, useEffect } from "react";
import MapPicker from "../common/MapPicker";

const emptyFormData = {
  fullName: "",
  phone: "",
  provinceCode: null,
  provinceName: "",
  wardName: "",
  districtName: "",
  street: "",
  lat: null,
  lng: null,
  formattedAddress: "",
  isDefault: false,
};

const AddressModal = ({ isOpen, onClose, onSave, address = null }) => {
  const [formData, setFormData] = useState(emptyFormData);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[AddressModal] Modal opened, address:', address);
      if (address && address._id) {
        // Editing existing address - use its data
        console.log('[AddressModal] Editing existing address:', address.provinceCode);
        setFormData({
          fullName: address.fullName || "",
          phone: address.phone || "",
          provinceCode: address.provinceCode || null,
          provinceName: address.provinceName || "",
          wardName: address.wardName || "",
          street: address.street || "",
          lat: address.lat || null,
          lng: address.lng || null,
          formattedAddress: address.formattedAddress || "",
          isDefault: address.isDefault || false,
        });
      } else {
        // New address - reset to empty
        console.log('[AddressModal] Creating NEW address');
        setFormData(emptyFormData);
      }
    }
  }, [isOpen, address?._id]);

  const handleSave = (data) => {
    console.log('[AddressModal] Saving data:', {
      provinceCode: data.provinceCode,
      provinceName: data.provinceName,
      wardName: data.wardName
    });
    onSave(data);
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      alert("Vui lòng nhập họ tên và số điện thoại");
      return;
    }
    if (!formData.provinceCode) {
      alert("Vui lòng chọn Tỉnh/Thành phố");
      return;
    }
    if (!formData.street) {
      alert("Vui lòng nhập địa chỉ chi tiết");
      return;
    }
    handleSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE8E0]">
          <h2 className="text-lg font-bold text-[#1C1108]">
            {address && address._id ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#FAF7F4] rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#6B5C4C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit}>
            <MapPicker
              value={formData}
              onChange={(newData) => {
                console.log('[AddressModal] onChange from MapPicker:', {
                  provinceCode: newData.provinceCode,
                  wardName: newData.wardName
                });
                setFormData(newData);
              }}
              apiKey={import.meta.env.VITE_MAPVINA_KEY || "YOUR_GOOGLE_MAPS_KEY_HERE"}
            />

            {/* Submit */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#EDE8E0]">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-[#D5C9BC] rounded-xl text-sm font-medium text-[#6B5C4C] hover:bg-[#FAF7F4] transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#B86B05] text-white rounded-xl text-sm font-semibold hover:bg-[#9a5a04] transition-colors"
              >
                {address && address._id ? "Lưu thay đổi" : "Thêm địa chỉ"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddressModal;
