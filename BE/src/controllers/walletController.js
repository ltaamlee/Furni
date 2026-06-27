const Wallet = require('../models/wallet');
const Order = require('../models/order');

/**
 * Helper: lấy hoặc tạo ví cho user
 */
const getOrCreateWallet = async (userId) => {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
        wallet = new Wallet({ user: userId, accounts: [], transactions: [] });
        await wallet.save();
    }
    return wallet;
};

/**
 * Lấy ví của user hiện tại
 * GET /api/wallets/my
 */
const getMyWallets = async (req, res) => {
    try {
        const userId = req.user._id;
        const wallet = await getOrCreateWallet(userId);
        res.json({
            success: true,
            data: { wallet }
        });
    } catch (error) {
        console.error('Error getting wallets:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy ví!'
        });
    }
};

/**
 * Lấy lịch sử giao dịch thanh toán của user
 * GET /api/wallets/transactions
 */
const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10, type } = req.query;
        
        // Build query
        const query = { user: userId };
        
        // Lọc theo loại thanh toán
        if (type === 'payos') {
            query.paymentMethod = 'PAYOS';
        } else if (type === 'cod') {
            query.paymentMethod = 'COD';
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [orders, total] = await Promise.all([
            Order.find(query)
                .sort({ orderedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select('orderNumber paymentMethod paymentStatus totalPrice orderedAt products'),
            Order.countDocuments(query)
        ]);
        
        // Transform orders to transaction-like format
        const transactions = orders.map(order => ({
            _id: order._id,
            type: order.paymentMethod === 'PAYOS' ? 'payos' : 'cod',
            category: 'purchase',
            amount: order.totalPrice,
            status: order.paymentStatus,
            description: `Thanh toán đơn hàng ${order.orderNumber}`,
            orderNumber: order.orderNumber,
            productCount: order.products?.length || 0,
            createdAt: order.orderedAt,
            orderId: order._id
        }));
        
        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Error getting transaction history:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy lịch sử giao dịch!'
        });
    }
};

/**
 * Thêm tài khoản thanh toán mới
 * POST /api/wallets
 */
const addAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const { type, accountNumber, accountName, bankName, branch } = req.body;
        
        // Validate required fields
        if (!type || !accountNumber || !accountName) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin!'
            });
        }
        
        // Validate type
        const validTypes = ['bank', 'momo', 'zalopay', 'vnpay'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Loại ví không hợp lệ!'
            });
        }
        
        // Validate bankName required for bank type
        if (type === 'bank' && !bankName) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên ngân hàng!'
            });
        }
        
        let wallet = await Wallet.findOne({ user: userId });
        
        if (!wallet) {
            wallet = new Wallet({ user: userId, accounts: [] });
        }
        
        // Check if this is the first account, set as default
        const isFirst = wallet.accounts.length === 0;
        
        // Thêm tài khoản mới
        const newAccount = {
            type,
            accountNumber: accountNumber.trim(),
            accountHolder: accountName.trim(),
            bankName: bankName ? bankName.trim() : '',
            branch: branch ? branch.trim() : '',
            isDefault: isFirst
        };
        
        wallet.accounts.push(newAccount);
        await wallet.save();
        
        res.json({
            success: true,
            message: 'Thêm tài khoản thành công!',
            data: {
                wallet: wallet
            }
        });
    } catch (error) {
        console.error('Error adding account:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thêm tài khoản!'
        });
    }
};

/**
 * Cập nhật tài khoản
 * PUT /api/wallets/:accountId
 */
const updateAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const { accountId } = req.params;
        const { accountNumber, accountName, bankName, branch } = req.body;
        
        const wallet = await Wallet.findOne({ user: userId });
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ví!'
            });
        }
        
        const account = wallet.accounts.id(accountId);
        
        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tài khoản!'
            });
        }
        
        // Update fields
        if (accountNumber) account.accountNumber = accountNumber.trim();
        if (accountName) account.accountHolder = accountName.trim();
        if (bankName !== undefined) account.bankName = bankName.trim();
        if (branch !== undefined) account.branch = branch.trim();
        
        await wallet.save();
        
        res.json({
            success: true,
            message: 'Cập nhật tài khoản thành công!',
            data: {
                wallet: wallet
            }
        });
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật tài khoản!'
        });
    }
};

/**
 * Xóa tài khoản
 * DELETE /api/wallets/:accountId
 */
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const { accountId } = req.params;
        
        const wallet = await Wallet.findOne({ user: userId });
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ví!'
            });
        }
        
        const account = wallet.accounts.id(accountId);
        
        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tài khoản!'
            });
        }
        
        const wasDefault = account.isDefault;
        account.deleteOne();
        
        // Nếu xóa tài khoản mặc định, đặt tài khoản đầu tiên làm mặc định
        if (wasDefault && wallet.accounts.length > 0) {
            wallet.accounts[0].isDefault = true;
        }
        
        await wallet.save();
        
        res.json({
            success: true,
            message: 'Xóa tài khoản thành công!',
            data: {
                wallet: wallet
            }
        });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa tài khoản!'
        });
    }
};

/**
 * Đặt tài khoản mặc định
 * PUT /api/wallets/:accountId/default
 */
const setDefaultAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const { accountId } = req.params;
        
        const wallet = await Wallet.findOne({ user: userId });
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ví!'
            });
        }
        
        const account = wallet.accounts.id(accountId);
        
        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tài khoản!'
            });
        }
        
        // Reset all accounts to non-default
        wallet.accounts.forEach(acc => {
            acc.isDefault = false;
        });
        
        // Set new default
        account.isDefault = true;
        await wallet.save();
        
        res.json({
            success: true,
            message: 'Đặt tài khoản mặc định thành công!',
            data: {
                wallet: wallet
            }
        });
    } catch (error) {
        console.error('Error setting default account:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đặt tài khoản mặc định!'
        });
    }
};

module.exports = {
    getMyWallets,
    getTransactionHistory,
    addAccount,
    updateAccount,
    deleteAccount,
    setDefaultAccount,
    getOrCreateWallet,
};
