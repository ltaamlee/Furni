import { useState, useContext } from "react";
import { AuthContext } from "../../components/context/authContext";
import { updatePasswordApi } from "../../utils/api";
import { useToast } from "../../components/context/ToastContext";

const ChangePasswordPage = () => {
    const { auth } = useContext(AuthContext);
    const { showToast } = useToast();
    const { user } = auth;
    const [saving, setSaving] = useState(false);
    const [password, setPassword] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false,
        confirm: false
    });

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

    return (
        <div className="bg-white rounded-2xl border border-[#EDE8E0]">
                {/* Header */}
                <div className="p-6 border-b border-[#EDE8E0]">
                    <h1 className="text-xl font-bold text-[#1C1108]">Đổi mật khẩu</h1>
                    <p className="text-sm text-[#A8896A] mt-1">Cập nhật mật khẩu để bảo vệ tài khoản của bạn</p>
                </div>

                {/* Password Form */}
                <form onSubmit={handlePasswordSubmit} className="p-6">
                    <div className="max-w-xl space-y-5">
                        {/* Current Password */}
                        <div>
                            <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Mật khẩu hiện tại</label>
                            <div className="relative">
                                <input
                                    type={showPassword.current ? "text" : "password"}
                                    value={password.currentPassword}
                                    onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })}
                                    className="w-full px-4 py-2.5 pr-11 border border-[#D5C9BC] rounded-lg focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-[#1C1108]"
                                    placeholder="Nhập mật khẩu hiện tại"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8896A] hover:text-[#B86B05] transition-colors"
                                >
                                    {showPassword.current ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Mật khẩu mới</label>
                            <div className="relative">
                                <input
                                    type={showPassword.new ? "text" : "password"}
                                    value={password.newPassword}
                                    onChange={(e) => setPassword({ ...password, newPassword: e.target.value })}
                                    className="w-full px-4 py-2.5 pr-11 border border-[#D5C9BC] rounded-lg focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-[#1C1108]"
                                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8896A] hover:text-[#B86B05] transition-colors"
                                >
                                    {showPassword.new ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirm New Password */}
                        <div>
                            <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Xác nhận mật khẩu mới</label>
                            <div className="relative">
                                <input
                                    type={showPassword.confirm ? "text" : "password"}
                                    value={password.confirmPassword}
                                    onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-2.5 pr-11 border border-[#D5C9BC] rounded-lg focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-[#1C1108]"
                                    placeholder="Nhập lại mật khẩu mới"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8896A] hover:text-[#B86B05] transition-colors"
                                >
                                    {showPassword.confirm ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2.5 bg-[#B86B05] text-white font-semibold rounded-lg hover:bg-[#95520B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {saving ? "Đang lưu..." : "Cập nhật mật khẩu"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
    );
};

export default ChangePasswordPage;
