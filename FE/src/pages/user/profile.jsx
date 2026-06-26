import React, { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../../components/context/authContext";
import { updateUserApi, uploadAvatarApi } from "../../utils/api";
import { useToast } from "../../components/context/ToastContext";

const UserProfile = () => {
    const { auth, setAuth } = useContext(AuthContext);
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const { user } = auth;
    const [profile, setProfile] = useState({
        fullName: "",
        phone: "",
        email: "",
        gender: "",
        dateOfBirth: ""
    });

    // Avatar upload state
    const fileInputRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    // Avatar upload handlers
    const handleAvatarFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            showToast("Vui lòng chọn file ảnh (JPG, PNG, WEBP)!", "error");
            return;
        }

        if (file.size > 1024 * 1024) {
            showToast("Dung lượng ảnh không được vượt quá 1MB!", "error");
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setShowAvatarModal(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleAvatarUpload = async () => {
        if (!selectedFile) return;
        try {
            setUploadingAvatar(true);
            const formData = new FormData();
            formData.append("avatar", selectedFile);

            const res = await uploadAvatarApi(formData);
            if (res.data?.success) {
                const newAvatar = res.data.data?.avatar;
                setAuth((prev) => ({
                    ...prev,
                    user: { ...prev.user, avatar: newAvatar }
                }));
                localStorage.setItem("user_avatar", newAvatar);
                window.dispatchEvent(new CustomEvent("avatar-updated", { detail: { avatar: newAvatar } }));
                showToast("Cập nhật ảnh đại diện thành công!", "success");
                setShowAvatarModal(false);
                setSelectedFile(null);
            } else {
                showToast(res.data?.message || "Cập nhật ảnh thất bại!", "error");
            }
        } catch (error) {
            showToast(error.message || "Có lỗi xảy ra!", "error");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleAvatarCancel = () => {
        setShowAvatarModal(false);
        setSelectedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, []);

    useEffect(() => {
        if (user) {
            setProfile({
                fullName: user.fullName || "",
                phone: user.phone || "",
                email: user.email || "",
                gender: user.gender || "",
                dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split("T")[0] : ""
            });
        }
    }, [user]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const res = await updateUserApi(profile);
            if (res.success) {
                showToast("Cập nhật thông tin thành công!", "success");
            }
        } catch (error) {
            showToast(error.message || "Cập nhật thất bại!", "error");
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    };

    return (
        <div className="space-y-6">
            {/* Profile Section */}
            <div className="bg-white rounded-2xl border border-[#EDE8E0]">
                {/* Header */}
                <div className="p-6 border-b border-[#EDE8E0]">
                    <h1 className="text-xl font-bold text-[#1C1108]">Thông tin cá nhân</h1>
                    <p className="text-sm text-[#A8896A] mt-1">Cập nhật thông tin tài khoản của bạn</p>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleProfileSubmit} className="p-6">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center">
                            <div className="relative mb-4">
                                {/* Current / Preview Avatar */}
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#B86B05] to-[#95520B] flex items-center justify-center text-white text-4xl font-bold shadow-md overflow-hidden">
                                    {previewUrl ? (
                                        <img
                                            src={previewUrl}
                                            alt="Avatar preview"
                                            className="w-full h-full object-cover rounded-full"
                                        />
                                    ) : user?.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt="Avatar"
                                            className="w-full h-full object-cover rounded-full"
                                        />
                                    ) : (
                                        profile.fullName?.charAt(0)?.toUpperCase() || "U"
                                    )}
                                </div>

                                {/* Camera button */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 w-10 h-10 bg-[#B86B05] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#95520B] transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            </div>
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handleAvatarFileChange}
                                className="hidden"
                            />
                            <p className="text-sm text-[#A8896A] text-center">
                                Dung lượng tối đa: 1 MB<br />
                                Định dạng: .JPG, .PNG, .WEBP
                            </p>
                        </div>

                        {/* Form Fields */}
                        <div className="flex-1 space-y-5">
                            {/* Name & DOB */}
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Họ và tên</label>
                                    <input
                                        type="text"
                                        value={profile.fullName}
                                        onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-lg focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-[#1C1108]"
                                        placeholder="Nhập họ và tên"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Ngày sinh</label>
                                    <input
                                        type="date"
                                        value={profile.dateOfBirth}
                                        onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-lg focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-[#1C1108]"
                                    />
                                </div>
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="block text-sm font-medium text-[#1C1108] mb-2">Giới tính</label>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value="male"
                                            checked={profile.gender === "male"}
                                            onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                                            className="w-4 h-4 text-[#B86B05] focus:ring-[#B86B05]"
                                        />
                                        <span className="text-sm text-[#1C1108]">Nam</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value="female"
                                            checked={profile.gender === "female"}
                                            onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                                            className="w-4 h-4 text-[#B86B05] focus:ring-[#B86B05]"
                                        />
                                        <span className="text-sm text-[#1C1108]">Nữ</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value="other"
                                            checked={profile.gender === "other"}
                                            onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                                            className="w-4 h-4 text-[#B86B05] focus:ring-[#B86B05]"
                                        />
                                        <span className="text-sm text-[#1C1108]">Khác</span>
                                    </label>
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Số điện thoại</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                                        <span className="text-lg">🇻🇳</span>
                                        <span className="text-sm text-[#A8896A]">+84</span>
                                    </div>
                                    <input
                                        type="tel"
                                        value={profile.phone}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        className="w-full pl-20 pr-4 py-2.5 border border-[#D5C9BC] rounded-lg focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-[#1C1108]"
                                        placeholder="123456789"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-[#1C1108] mb-1.5">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={profile.email}
                                    className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                                    placeholder="email@example.com"
                                    disabled
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-[#B86B05] text-white font-semibold rounded-lg hover:bg-[#95520B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Virtual Wallet Section */}
            <div className="bg-white rounded-2xl border border-[#EDE8E0] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-[#EDE8E0] bg-gradient-to-r from-[#B86B05] to-[#95520B]">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Ví điện tử</h2>
                            <p className="text-white/80 text-sm">Số dư tích lũy trên sàn</p>
                        </div>
                    </div>
                </div>

                {/* Balance Card */}
                <div className="p-6">
                        <div className="bg-gradient-to-br from-[#FAF7F4] to-[#F5EFE7] rounded-2xl p-6 border border-[#EDE8E0]">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-[#A8896A] mb-1">Số dư khả dụng</p>
                                <p className="text-3xl font-bold text-[#B86B05]">{formatCurrency(0)}</p>
                            </div>
                        </div>

                        
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <button
                            onClick={() => showToast("Tính năng đang phát triển!", "info")}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FAF7F4] border border-[#EDE8E0] rounded-xl hover:bg-[#F5EFE7] transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B86B05]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-sm font-medium text-[#1C1108]">Nạp tiền</span>
                        </button>
                        <button
                            onClick={() => showToast("Tính năng đang phát triển!", "info")}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FAF7F4] border border-[#EDE8E0] rounded-xl hover:bg-[#F5EFE7] transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B86B05]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="text-sm font-medium text-[#1C1108]">Rút tiền</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Avatar Preview / Confirmation Modal */}
            {showAvatarModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4">
                            <h3 className="text-lg font-bold text-[#1C1108]">Xác nhận ảnh đại diện</h3>
                            <p className="text-sm text-[#A8896A] mt-1">Đây là ảnh bạn sẽ sử dụng làm ảnh đại diện</p>
                        </div>

                        {/* Avatar Preview */}
                        <div className="px-6 pb-6 flex flex-col items-center">
                            <div className="w-48 h-48 rounded-full overflow-hidden shadow-lg mb-6 bg-[#FAF7F4]">
                                {previewUrl && (
                                    <img
                                        src={previewUrl}
                                        alt="Avatar preview"
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                )}
                            </div>

                            {/* Info */}
                            {selectedFile && (
                                <p className="text-xs text-[#A8896A] mb-1">
                                    {selectedFile.name} • {(selectedFile.size / 1024).toFixed(1)} KB
                                </p>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    type="button"
                                    onClick={handleAvatarCancel}
                                    disabled={uploadingAvatar}
                                    className="flex-1 px-4 py-3 border-2 border-[#EDE8E0] text-[#6B5C4C] font-semibold rounded-2xl hover:bg-[#FAF7F4] transition-all disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAvatarUpload}
                                    disabled={uploadingAvatar}
                                    className="flex-1 px-4 py-3 bg-[#B86B05] text-white font-semibold rounded-2xl hover:bg-[#9a5a04] transition-all shadow-md shadow-[#B86B05]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {uploadingAvatar ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Đang tải...
                                        </>
                                    ) : "Xác nhận"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfile;
