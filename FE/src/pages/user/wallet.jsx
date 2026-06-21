import { useState, useEffect } from "react";
import { useToast } from "../../components/context/ToastContext";

const WalletPage = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [wallets, setWallets] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newWallet, setNewWallet] = useState({
        type: "bank",
        accountNumber: "",
        accountName: "",
        bankName: ""
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/wallets/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setWallets(data.data.wallet?.accounts || []);
            }
        } catch (error) {
            console.error("Error fetching wallets:", error);
            showToast("Không thể tải danh sách ví!", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddWallet = async (e) => {
        e.preventDefault();
        if (!newWallet.accountNumber || !newWallet.accountName) {
            showToast("Vui lòng điền đầy đủ thông tin!", "error");
            return;
        }

        try {
            setSaving(true);
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/wallets`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: newWallet.type,
                    accountNumber: newWallet.accountNumber,
                    accountName: newWallet.accountName,
                    bankName: newWallet.bankName
                })
            });
            const data = await res.json();
            
            if (data.success) {
                showToast("Thêm ví thành công!", "success");
                setShowAddModal(false);
                setNewWallet({ type: "bank", accountNumber: "", accountName: "", bankName: "" });
                fetchWallets();
            } else {
                showToast(data.message || "Thêm ví thất bại!", "error");
            }
        } catch (error) {
            showToast("Có lỗi xảy ra!", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteWallet = async (accountId) => {
        if (!confirm("Bạn có chắc muốn xóa ví này?")) return;

        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/wallets/${accountId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                showToast("Xóa ví thành công!", "success");
                fetchWallets();
            } else {
                showToast(data.message || "Xóa ví thất bại!", "error");
            }
        } catch (error) {
            showToast("Có lỗi xảy ra!", "error");
        }
    };

    const handleSetDefault = async (accountId) => {
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/wallets/${accountId}/default`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                showToast("Đặt ví mặc định thành công!", "success");
                fetchWallets();
            } else {
                showToast(data.message || "Đặt mặc định thất bại!", "error");
            }
        } catch (error) {
            showToast("Có lỗi xảy ra!", "error");
        }
    };

    const getWalletIcon = (type) => {
        switch (type) {
            case "bank":
                return (
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                );
            case "momo":
                return <span className="text-2xl">📱</span>;
            case "zalopay":
                return <span className="text-2xl">💚</span>;
            case "vnpay":
                return <span className="text-2xl">🔵</span>;
            default:
                return <span className="text-2xl">💳</span>;
        }
    };

    const getWalletTypeName = (type) => {
        const names = {
            bank: "Tài khoản ngân hàng",
            momo: "Ví MoMo",
            zalopay: "ZaloPay",
            vnpay: "VNPay"
        };
        return names[type] || type;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-[#EDE8E0]">
                {/* Header */}
                <div className="p-6 border-b border-[#EDE8E0] flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-[#1C1108]">Ví điện tử</h1>
                        <p className="text-sm text-[#A8896A] mt-1">Quản lý phương thức thanh toán của bạn</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-[#B86B05] text-white text-sm font-medium rounded-lg hover:bg-[#95520B] transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Thêm ví
                    </button>
                </div>

                {/* Wallet List */}
                <div className="p-6">
                    {wallets.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">💳</div>
                            <h2 className="text-xl font-bold text-[#1C1108] mb-2">Chưa có ví nào</h2>
                            <p className="text-sm text-[#A8896A] mb-6">Thêm ví điện tử để thanh toán nhanh hơn</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-6 py-2.5 bg-[#B86B05] text-white font-semibold rounded-lg hover:bg-[#95520B] transition-colors"
                            >
                                Thêm ví ngay
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {wallets.map((wallet) => (
                                <div
                                    key={wallet._id}
                                    className={`flex items-center gap-4 p-4 rounded-xl border ${
                                        wallet.isDefault
                                            ? "border-[#B86B05] bg-[#B86B05]/5"
                                            : "border-[#EDE8E0] hover:border-[#D5C9BC]"
                                    } transition-colors`}
                                >
                                    {/* Wallet Icon */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        wallet.isDefault ? "bg-[#B86B05]/10" : "bg-[#FAF7F4]"
                                    }`}>
                                        {getWalletIcon(wallet.type)}
                                    </div>

                                    {/* Wallet Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-[#1C1108]">{wallet.accountHolder}</span>
                                            {wallet.isDefault && (
                                                <span className="px-2 py-0.5 bg-[#B86B05] text-white text-xs font-medium rounded-full">
                                                    Mặc định
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-[#A8896A]">
                                            {getWalletTypeName(wallet.type)} • ****{wallet.accountNumber.slice(-4)}
                                        </p>
                                        {wallet.bankName && (
                                            <p className="text-xs text-[#A8896A]">{wallet.bankName}</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {!wallet.isDefault && (
                                            <button
                                                onClick={() => handleSetDefault(wallet._id)}
                                                className="px-3 py-1.5 text-xs font-medium text-[#B86B05] hover:bg-[#B86B05]/10 rounded-lg transition-colors"
                                            >
                                                Đặt mặc định
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteWallet(wallet._id)}
                                            className="p-2 text-[#BF4343] hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Wallet Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md">
                            <div className="p-6 border-b border-[#EDE8E0] flex items-center justify-between">
                                <h2 className="text-lg font-bold text-[#1C1108]">Thêm ví mới</h2>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 hover:bg-[#FAF7F4] rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#6B5C4C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleAddWallet} className="p-6 space-y-4">
                                {/* Wallet Type */}
                                <div>
                                    <label className="block text-sm font-medium text-[#1C1108] mb-2">Loại ví</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { value: "bank", label: "Ngân hàng", icon: "🏦" },
                                            { value: "momo", label: "MoMo", icon: "📱" },
                                            { value: "zalopay", label: "ZaloPay", icon: "💚" },
                                            { value: "vnpay", label: "VNPay", icon: "🔵" }
                                        ].map((type) => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => setNewWallet({ ...newWallet, type: type.value })}
                                                className={`p-3 rounded-xl border text-center transition-colors ${
                                                    newWallet.type === type.value
                                                        ? "border-[#B86B05] bg-[#B86B05]/10"
                                                        : "border-[#EDE8E0] hover:border-[#D5C9BC]"
                                                }`}
                                            >
                                                <span className="text-2xl block mb-1">{type.icon}</span>
                                                <span className="text-xs font-medium text-[#1C1108]">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Bank Name (if bank) */}
                                {newWallet.type === "bank" && (
                                    <div>
                                        <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Tên ngân hàng</label>
                                        <input
                                            type="text"
                                            value={newWallet.bankName}
                                            onChange={(e) => setNewWallet({ ...newWallet, bankName: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-lg focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-[#1C1108]"
                                            placeholder="VD: Vietcombank"
                                            required
                                        />
                                    </div>
                                )}

                                {/* Account Number */}
                                <div>
                                    <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Số tài khoản / Số ví</label>
                                    <input
                                        type="text"
                                        value={newWallet.accountNumber}
                                        onChange={(e) => setNewWallet({ ...newWallet, accountNumber: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-lg focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-[#1C1108]"
                                        placeholder="Nhập số tài khoản"
                                        required
                                    />
                                </div>

                                {/* Account Name */}
                                <div>
                                    <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Tên tài khoản</label>
                                    <input
                                        type="text"
                                        value={newWallet.accountName}
                                        onChange={(e) => setNewWallet({ ...newWallet, accountName: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-lg focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-[#1C1108]"
                                        placeholder="Tên chủ tài khoản"
                                        required
                                    />
                                </div>

                                {/* Submit */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-2.5 border border-[#D5C9BC] text-[#6B5C4C] font-medium rounded-lg hover:bg-[#FAF7F4] transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 px-4 py-2.5 bg-[#B86B05] text-white font-medium rounded-lg hover:bg-[#95520B] transition-colors disabled:opacity-50"
                                    >
                                        {saving ? "Đang lưu..." : "Thêm ví"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
    );
};

export default WalletPage;
