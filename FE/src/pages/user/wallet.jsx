import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/context/ToastContext";
import { formatVND } from "../../components/vendor/data";
import { getUserTransactionHistoryApi } from "../../utils/api";

const WalletPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [newWallet, setNewWallet] = useState({
        type: "bank",
        accountNumber: "",
        accountName: "",
        bankName: "",
        branch: ""
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    
    // Transaction history state
    const [transactions, setTransactions] = useState([]);
    const [txLoading, setTxLoading] = useState(false);
    const [txPage, setTxPage] = useState(1);
    const [txTotalPages, setTxTotalPages] = useState(1);
    const [activeTab, setActiveTab] = useState("accounts"); // "accounts" | "history"

    useEffect(() => {
        fetchWallets();
    }, []);

    useEffect(() => {
        if (activeTab === "history") {
            fetchTransactionHistory();
        }
    }, [activeTab, txPage]);

    const fetchWallets = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/wallets/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setWallet(data.data.wallet);
                setAccounts(data.data.wallet?.accounts || []);
            }
        } catch (error) {
            console.error("Error fetching wallets:", error);
            showToast("Không thể tải danh sách ví!", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactionHistory = async () => {
        try {
            setTxLoading(true);
            const res = await getUserTransactionHistoryApi({ page: txPage, limit: 10 });
            if (res.success) {
                setTransactions(res.data.transactions);
                setTxTotalPages(res.data.pagination.totalPages);
            }
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setTxLoading(false);
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
                    bankName: newWallet.bankName,
                    branch: newWallet.branch
                })
            });
            const data = await res.json();
            
            if (data.success) {
                showToast("Thêm ví thành công!", "success");
                setShowAddModal(false);
                setNewWallet({ type: "bank", accountNumber: "", accountName: "", bankName: "", branch: "" });
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

    const handleEditWallet = async (e) => {
        e.preventDefault();
        if (!editingAccount) return;
        
        if (!newWallet.accountNumber || !newWallet.accountName) {
            showToast("Vui lòng điền đầy đủ thông tin!", "error");
            return;
        }

        try {
            setSaving(true);
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/wallets/${editingAccount._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    accountNumber: newWallet.accountNumber,
                    accountName: newWallet.accountName,
                    bankName: newWallet.bankName,
                    branch: newWallet.branch
                })
            });
            const data = await res.json();
            
            if (data.success) {
                showToast("Cập nhật ví thành công!", "success");
                setEditingAccount(null);
                setNewWallet({ type: "bank", accountNumber: "", accountName: "", bankName: "", branch: "" });
                fetchWallets();
            } else {
                showToast(data.message || "Cập nhật ví thất bại!", "error");
            }
        } catch (error) {
            showToast("Có lỗi xảy ra!", "error");
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (account) => {
        setEditingAccount(account);
        setNewWallet({
            type: account.type,
            accountNumber: account.accountNumber,
            accountName: account.accountHolder,
            bankName: account.bankName || "",
            branch: account.branch || ""
        });
    };

    const handleDeleteWallet = async (accountId) => {
        if (!confirm("Bạn có chắc muốn xóa ví này?")) return;

        try {
            setDeleting(accountId);
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
        } finally {
            setDeleting(null);
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
                    <svg className="w-6 h-6 text-[#B86B05]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

    const getWalletTypeColor = (type) => {
        const colors = {
            bank: "bg-blue-50 text-blue-600",
            momo: "bg-pink-50 text-pink-600",
            zalopay: "bg-green-50 text-green-600",
            vnpay: "bg-indigo-50 text-indigo-600"
        };
        return colors[type] || "bg-gray-50 text-gray-600";
    };

    const getMaskedAccountNumber = (number) => {
        if (!number) return "";
        if (number.length <= 4) return number;
        return "*".repeat(number.length - 4) + number.slice(-4);
    };

    const getTransactionIcon = (type) => {
        switch (type) {
            case "payos": return "💳";
            case "cod": return "💵";
            default: return "💰";
        }
    };

    const getTransactionStatusColor = (status) => {
        switch (status) {
            case "paid": return "bg-green-100 text-green-700";
            case "pending": return "bg-yellow-100 text-yellow-700";
            case "failed": return "bg-red-100 text-red-700";
            case "refunded": return "bg-blue-100 text-blue-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    const getTransactionStatusName = (status) => {
        switch (status) {
            case "paid": return "Thành công";
            case "pending": return "Đang xử lý";
            case "failed": return "Thất bại";
            case "refunded": return "Đã hoàn tiền";
            default: return status;
        }
    };

    const getPaymentMethodName = (type) => {
        switch (type) {
            case "payos": return "PayOS";
            case "cod": return "COD";
            default: return type;
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    };

    const formatDateTime = (date) => {
        return new Date(date).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF7F4] pb-10">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#95520B] to-[#B86B05] px-4 pt-8 pb-16">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                        >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h1 className="text-xl font-bold text-white">Ví thanh toán</h1>
                    </div>
                    
                    {/* Balance Card */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">
                        <p className="text-white/80 text-sm mb-1">Số dư ví</p>
                        <p className="text-3xl font-extrabold text-white mb-1">
                            {formatVND(wallet?.balance || 0)}
                        </p>
                        <p className="text-white/60 text-xs">Có thể sử dụng để thanh toán đơn hàng</p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 -mt-6">
                {/* Tabs */}
                <div className="flex bg-white rounded-xl shadow-sm border border-[#EDE8E0] mb-6 overflow-hidden">
                    <button
                        onClick={() => setActiveTab("accounts")}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                            activeTab === "accounts"
                                ? "bg-[#B86B05] text-white"
                                : "text-[#6B5C4C] hover:bg-[#FAF7F4]"
                        }`}
                    >
                        📱 Tài khoản thanh toán
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                            activeTab === "history"
                                ? "bg-[#B86B05] text-white"
                                : "text-[#6B5C4C] hover:bg-[#FAF7F4]"
                        }`}
                    >
                        📜 Lịch sử giao dịch
                    </button>
                </div>

                {/* Account Tab Content */}
                {activeTab === "accounts" && (
                    <>
                        {/* Quick Actions */}
                        <div className="flex gap-3 mb-6">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex-1 bg-[#B86B05] text-white py-3 rounded-xl font-semibold hover:bg-[#95520B] transition-colors flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Thêm tài khoản
                            </button>
                            <button
                                onClick={() => navigate("/checkout")}
                                className="flex-1 bg-white text-[#B86B05] py-3 rounded-xl font-semibold border-2 border-[#B86B05] hover:bg-[#B86B05]/5 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Thanh toán ngay
                            </button>
                        </div>

                        {/* Wallet List */}
                        <div className="bg-white rounded-2xl border border-[#EDE8E0]">
                            <div className="p-4 border-b border-[#EDE8E0]">
                                <h2 className="font-bold text-[#1C1108]">Tài khoản thanh toán</h2>
                                <p className="text-xs text-[#A8896A] mt-0.5">Quản lý phương thức thanh toán của bạn</p>
                            </div>

                            {accounts.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 bg-[#FAF7F4] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-3xl">💳</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-[#1C1108] mb-2">Chưa có tài khoản nào</h3>
                                    <p className="text-sm text-[#A8896A] mb-4">Thêm tài khoản ngân hàng hoặc ví điện tử để thanh toán nhanh hơn</p>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="px-6 py-2.5 bg-[#B86B05] text-white font-semibold rounded-xl hover:bg-[#95520B] transition-colors"
                                    >
                                        Thêm tài khoản ngay
                                    </button>
                                </div>
                            ) : (
                                <div className="divide-y divide-[#EDE8E0]">
                                    {accounts.map((wallet_account) => (
                                        <div
                                            key={wallet_account._id}
                                            className={`p-4 hover:bg-[#FAF7F4]/50 transition-colors ${
                                                wallet_account.isDefault ? "bg-[#B86B05]/5" : ""
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Wallet Icon */}
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                    wallet_account.isDefault ? "bg-[#B86B05]/10" : "bg-[#FAF7F4]"
                                                }`}>
                                                    {getWalletIcon(wallet_account.type)}
                                                </div>

                                                {/* Wallet Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-[#1C1108]">{wallet_account.accountHolder}</span>
                                                        {wallet_account.isDefault && (
                                                            <span className="px-2 py-0.5 bg-[#B86B05] text-white text-xs font-medium rounded-full">
                                                                Mặc định
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getWalletTypeColor(wallet_account.type)}`}>
                                                            {getWalletTypeName(wallet_account.type)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-[#A8896A] mt-1 font-mono">
                                                        {getMaskedAccountNumber(wallet_account.accountNumber)}
                                                    </p>
                                                    {wallet_account.bankName && (
                                                        <p className="text-xs text-[#A8896A]">{wallet_account.bankName}</p>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex flex-col gap-1">
                                                    {!wallet_account.isDefault && (
                                                        <button
                                                            onClick={() => handleSetDefault(wallet_account._id)}
                                                            className="px-3 py-1.5 text-xs font-medium text-[#B86B05] hover:bg-[#B86B05]/10 rounded-lg transition-colors whitespace-nowrap"
                                                        >
                                                            Đặt mặc định
                                                        </button>
                                                    )}
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => openEditModal(wallet_account)}
                                                            className="p-2 text-[#6B5C4C] hover:bg-[#FAF7F4] rounded-lg transition-colors"
                                                            title="Sửa"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteWallet(wallet_account._id)}
                                                            disabled={deleting === wallet_account._id}
                                                            className="p-2 text-[#BF4343] hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                            title="Xóa"
                                                        >
                                                            {deleting === wallet_account._id ? (
                                                                <div className="w-4 h-4 border-2 border-[#BF4343] border-t-transparent rounded-full animate-spin"></div>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Info Section */}
                        <div className="mt-6 bg-blue-50 rounded-xl p-4">
                            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Lưu ý
                            </h4>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Tài khoản mặc định sẽ được sử dụng khi thanh toán</li>
                                <li>• Bạn có thể thêm nhiều tài khoản ngân hàng và ví điện tử</li>
                                <li>• Thông tin tài khoản được mã hóa và bảo mật</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>

                {/* History Tab Content */}
                {activeTab === "history" && (
                    <div className="bg-white rounded-2xl border border-[#EDE8E0]">
                        <div className="p-4 border-b border-[#EDE8E0]">
                            <h2 className="font-bold text-[#1C1108]">Lịch sử giao dịch</h2>
                            <p className="text-xs text-[#A8896A] mt-0.5">Các giao dịch thanh toán của bạn</p>
                        </div>

                        {txLoading ? (
                            <div className="p-8 text-center">
                                <div className="w-8 h-8 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin mx-auto"></div>
                                <p className="text-sm text-[#A8896A] mt-2">Đang tải...</p>
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-[#FAF7F4] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">📋</span>
                                </div>
                                <h3 className="text-lg font-bold text-[#1C1108] mb-2">Chưa có giao dịch nào</h3>
                                <p className="text-sm text-[#A8896A]">Lịch sử giao dịch sẽ hiển thị tại đây khi bạn thanh toán đơn hàng</p>
                            </div>
                        ) : (
                            <>
                                <div className="divide-y divide-[#EDE8E0]">
                                    {transactions.map((tx) => (
                                        <div
                                            key={tx._id}
                                            className="p-4 hover:bg-[#FAF7F4]/50 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/orders/${tx.orderId}`)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Icon */}
                                                <div className="w-10 h-10 bg-[#FAF7F4] rounded-full flex items-center justify-center text-lg">
                                                    {getTransactionIcon(tx.type)}
                                                </div>
                                                
                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-[#1C1108]">{tx.description}</span>
                                                        <span className={`font-bold ${tx.status === 'paid' ? 'text-green-600' : 'text-[#1C1108]'}`}>
                                                            {tx.status === 'paid' ? '-' : ''}{formatVND(tx.amount)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <span className="text-xs text-[#A8896A]">
                                                            {formatDateTime(tx.createdAt)} • {getPaymentMethodName(tx.type)}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTransactionStatusColor(tx.status)}`}>
                                                            {getTransactionStatusName(tx.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {txTotalPages > 1 && (
                                    <div className="p-4 border-t border-[#EDE8E0] flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => setTxPage(p => Math.max(1, p - 1))}
                                            disabled={txPage === 1}
                                            className="px-3 py-1 rounded-lg border border-[#EDE8E0] text-sm text-[#6B5C4C] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FAF7F4]"
                                        >
                                            ← Trước
                                        </button>
                                        <span className="text-sm text-[#6B5C4C]">
                                            Trang {txPage} / {txTotalPages}
                                        </span>
                                        <button
                                            onClick={() => setTxPage(p => Math.min(txTotalPages, p + 1))}
                                            disabled={txPage === txTotalPages}
                                            className="px-3 py-1 rounded-lg border border-[#EDE8E0] text-sm text-[#6B5C4C] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FAF7F4]"
                                        >
                                            Sau →
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Add/Edit Wallet Modal */}
            {(showAddModal || editingAccount) && (
                <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white p-4 border-b border-[#EDE8E0] flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[#1C1108]">
                                {editingAccount ? "Sửa tài khoản" : "Thêm tài khoản mới"}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setEditingAccount(null);
                                    setNewWallet({ type: "bank", accountNumber: "", accountName: "", bankName: "", branch: "" });
                                }}
                                className="p-2 hover:bg-[#FAF7F4] rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#6B5C4C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={editingAccount ? handleEditWallet : handleAddWallet} className="p-4 space-y-4">
                            {/* Wallet Type (only show when adding new) */}
                            {!editingAccount && (
                                <div>
                                    <label className="block text-sm font-medium text-[#1C1108] mb-2">Loại ví</label>
                                    <div className="grid grid-cols-4 gap-2">
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
                            )}

                            {/* Bank Name (if bank type) */}
                            {newWallet.type === "bank" && (
                                <div>
                                    <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Tên ngân hàng</label>
                                    <input
                                        type="text"
                                        value={newWallet.bankName}
                                        onChange={(e) => setNewWallet({ ...newWallet, bankName: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-[#1C1108]"
                                        placeholder="VD: Vietcombank, ACB, VietinBank..."
                                        required
                                    />
                                </div>
                            )}

                            {/* Account Number */}
                            <div>
                                <label className="block text-sm font-medium text-[#1C1108] mb-1.5">
                                    {newWallet.type === "bank" ? "Số tài khoản" : "Số ví"}
                                </label>
                                <input
                                    type="text"
                                    value={newWallet.accountNumber}
                                    onChange={(e) => setNewWallet({ ...newWallet, accountNumber: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-[#1C1108]"
                                    placeholder={newWallet.type === "bank" ? "Nhập số tài khoản" : "Nhập số ví"}
                                    required
                                />
                            </div>

                            {/* Account Name */}
                            <div>
                                <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Tên chủ tài khoản</label>
                                <input
                                    type="text"
                                    value={newWallet.accountName}
                                    onChange={(e) => setNewWallet({ ...newWallet, accountName: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-[#1C1108]"
                                    placeholder="Tên như trên tài khoản/ví"
                                    required
                                />
                            </div>

                            {/* Branch (optional for bank) */}
                            {newWallet.type === "bank" && (
                                <div>
                                    <label className="block text-sm font-medium text-[#1C1108] mb-1.5">
                                        Chi nhánh <span className="text-[#A8896A]">(tùy chọn)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newWallet.branch}
                                        onChange={(e) => setNewWallet({ ...newWallet, branch: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-[#1C1108]"
                                        placeholder="VD: Chi nhánh TP.HCM"
                                    />
                                </div>
                            )}

                            {/* Submit */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setEditingAccount(null);
                                        setNewWallet({ type: "bank", accountNumber: "", accountName: "", bankName: "", branch: "" });
                                    }}
                                    className="flex-1 px-4 py-3 border border-[#D5C9BC] text-[#6B5C4C] font-medium rounded-xl hover:bg-[#FAF7F4] transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 bg-[#B86B05] text-white font-medium rounded-xl hover:bg-[#95520B] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Đang lưu...
                                        </>
                                    ) : (
                                        editingAccount ? "Cập nhật" : "Thêm ví"
                                    )}
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
