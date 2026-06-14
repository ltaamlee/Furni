import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../components/context/authContext";
import { getUserApi, updateUserApi, updatePasswordApi } from "../../utils/api";
import { useToast } from "../../components/context/ToastContext";

const UserProfile = () => {
    const { auth, logout } = useContext(AuthContext);
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState("profile");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        fullName: "",
        phone: "",
        email: ""
    });
    const [password, setPassword] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const res = await getUserApi();
            if (res.success) {
                setProfile({
                    fullName: res.data.user.fullName,
                    phone: res.data.user.phone,
                    email: res.data.user.email
                });
            }
        } catch (error) {
            console.error("Error fetching user:", error);
        } finally {
            setLoading(false);
        }
    };

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

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (password.newPassword !== password.confirmPassword) {
            showToast("Mật khẩu xác nhận không khớp!", "error");
            return;
        }
        if (password.newPassword.length < 6) {
            showToast("Mật khẩu mới phải có ít nhất 6 ký tự!", "error");
            return;
        }
        try {
            setSaving(true);
            const res = await updatePasswordApi(password.currentPassword, password.newPassword);
            if (res.success) {
                showToast("Đổi mật khẩu thành công!", "success");
                setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Đổi mật khẩu thất bại!", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        if (confirm("Bạn có chắc muốn đăng xuất?")) {
            logout();
            window.location.href = "/login";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-[#8B4513] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F0] py-8">
            <div className="max-w-5xl mx-auto px-4">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#8B4513] to-[#A0522D] rounded-2xl p-6 text-white mb-8">
                    <h1 className="text-2xl font-bold">Xin chào, {auth?.user?.fullName}!</h1>
                    <p className="opacity-80 mt-1">Quản lý tài khoản của bạn</p>
                </div>

                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm p-4">
                            <nav className="space-y-2">
                                {[
                                    { id: "profile", label: "Hồ sơ", icon: "👤" },
                                    { id: "password", label: "Đổi mật khẩu", icon: "🔒" },
                                    { id: "orders", label: "Đơn hàng", icon: "📦", link: "/order-history" },
                                    { id: "wishlist", label: "Yêu thích", icon: "❤️", link: "/wishlist" },
                                    { id: "reviews", label: "Đánh giá", icon: "⭐", link: "/my-reviews" },
                                    { id: "loyalty", label: "Tích điểm", icon: "💎", link: "/loyalty" },
                                    { id: "coupons", label: "Mã giảm giá", icon: "🎟️", link: "/coupons" }
                                ].map((item) => (
                                    item.link ? (
                                        <a
                                            key={item.id}
                                            href={item.link}
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-[#FAF8F5] transition"
                                        >
                                            <span>{item.icon}</span>
                                            <span className="font-medium">{item.label}</span>
                                        </a>
                                    ) : (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                                                activeTab === item.id
                                                    ? "bg-[#8B4513] text-white"
                                                    : "text-gray-700 hover:bg-[#FAF8F5]"
                                            }`}
                                        >
                                            <span>{item.icon}</span>
                                            <span className="font-medium">{item.label}</span>
                                        </button>
                                    )
                                ))}
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition mt-4"
                                >
                                    <span>🚪</span>
                                    <span className="font-medium">Đăng xuất</span>
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-3">
                        {/* Profile Tab */}
                        {activeTab === "profile" && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-6">Thông tin tài khoản</h2>
                                <form onSubmit={handleProfileSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                                        <input
                                            type="text"
                                            value={profile.fullName}
                                            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                                        <input
                                            type="tel"
                                            value={profile.phone}
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full bg-[#8B4513] text-white py-3 rounded-xl font-semibold hover:bg-[#A0522D] transition disabled:opacity-50"
                                    >
                                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Password Tab */}
                        {activeTab === "password" && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-6">Đổi mật khẩu</h2>
                                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
                                        <input
                                            type="password"
                                            value={password.currentPassword}
                                            onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                                        <input
                                            type="password"
                                            value={password.newPassword}
                                            onChange={(e) => setPassword({ ...password, newPassword: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                                        <input
                                            type="password"
                                            value={password.confirmPassword}
                                            onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full bg-[#8B4513] text-white py-3 rounded-xl font-semibold hover:bg-[#A0522D] transition disabled:opacity-50"
                                    >
                                        {saving ? "Đang lưu..." : "Đổi mật khẩu"}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
