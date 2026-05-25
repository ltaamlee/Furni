import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../components/context/authContext";
import { getUserApi, updateUserApi, updatePasswordApi } from "../../utils/api";
import { useToast } from "../../components/context/ToastContext";

const ProfilePage = () => {
    const { auth, setAuth } = useContext(AuthContext);
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState("info");
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const [profile, setProfile] = useState({
        fullName: "",
        email: "",
        phone: "",
        address: ""
    });

    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await getUserApi();
            if (res.success) {
                const user = res.data.user;
                setProfile({
                    fullName: user.fullName || "",
                    email: user.email || "",
                    phone: user.phone || "",
                    address: user.address || ""
                });
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            showToast("Không thể tải thông tin profile", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        try {
            setUpdating(true);
            const res = await updateUserApi(profile);
            if (res.success) {
                showToast("Cập nhật thông tin thành công!", "success");
                // Update auth context
                setAuth({
                    ...auth,
                    user: { ...auth.user, ...res.data.user }
                });
            }
        } catch (error) {
            showToast(error.message || "Cập nhật thất bại!", "error");
        } finally {
            setUpdating(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            showToast("Mật khẩu mới không khớp!", "error");
            return;
        }
        if (passwords.newPassword.length < 6) {
            showToast("Mật khẩu mới phải có ít nhất 6 ký tự!", "error");
            return;
        }
        try {
            setUpdating(true);
            const res = await updatePasswordApi(passwords.currentPassword, passwords.newPassword);
            if (res.success) {
                showToast("Đổi mật khẩu thành công!", "success");
                setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
            }
        } catch (error) {
            showToast(error.message || "Đổi mật khẩu thất bại!", "error");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-[#8B4513] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">TÀI KHOẢN CỦA TÔI</h1>
                    <p className="text-gray-500 mt-2">Quản lý thông tin cá nhân của bạn</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab("info")}
                            className={`flex-1 py-4 px-6 font-medium text-center transition ${
                                activeTab === "info"
                                    ? "text-[#8B4513] border-b-2 border-[#8B4513] bg-orange-50/50"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Thông tin cá nhân
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab("password")}
                            className={`flex-1 py-4 px-6 font-medium text-center transition ${
                                activeTab === "password"
                                    ? "text-[#8B4513] border-b-2 border-[#8B4513] bg-orange-50/50"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Đổi mật khẩu
                            </div>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Profile Info Tab */}
                        {activeTab === "info" && (
                            <form onSubmit={handleProfileSubmit} className="space-y-6">
                                {/* Avatar */}
                                <div className="flex items-center gap-6 pb-6 border-b">
                                    <div className="w-20 h-20 bg-[#8B4513] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                        {profile.fullName?.charAt(0)?.toUpperCase() || "U"}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{profile.fullName}</p>
                                        <p className="text-sm text-gray-500">{auth.user?.role === "admin" ? "Quản trị viên" : "Khách hàng"}</p>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Họ và tên *
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.fullName}
                                            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                                            placeholder="Nhập họ và tên"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email *
                                        </label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50"
                                            disabled
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Số điện thoại
                                        </label>
                                        <input
                                            type="tel"
                                            value={profile.phone}
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                                            placeholder="Nhập số điện thoại"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Địa chỉ
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.address}
                                            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                                            placeholder="Nhập địa chỉ"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        disabled={updating}
                                        className="px-8 py-3 bg-[#8B4513] text-white font-semibold rounded-xl hover:bg-[#A0522D] transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {updating && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                                        {updating ? "Đang lưu..." : "Lưu thay đổi"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Password Tab */}
                        {activeTab === "password" && (
                            <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-lg">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Mật khẩu hiện tại *
                                    </label>
                                    <input
                                        type="password"
                                        value={passwords.currentPassword}
                                        onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                                        placeholder="Nhập mật khẩu hiện tại"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Mật khẩu mới *
                                    </label>
                                    <input
                                        type="password"
                                        value={passwords.newPassword}
                                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                                        placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Xác nhận mật khẩu mới *
                                    </label>
                                    <input
                                        type="password"
                                        value={passwords.confirmPassword}
                                        onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                                        placeholder="Nhập lại mật khẩu mới"
                                        required
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={updating}
                                        className="px-8 py-3 bg-[#8B4513] text-white font-semibold rounded-xl hover:bg-[#A0522D] transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {updating && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                                        {updating ? "Đang xử lý..." : "Đổi mật khẩu"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
