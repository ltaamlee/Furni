/**
 * Platform Controller
 * 
 * API quản lý cấu hình sàn (Admin)
 */

const PlatformConfig = require('../models/platformConfig');
const Wallet = require('../models/wallet');
const Transaction = require('../models/transaction');
const payoutService = require('../services/payoutService');
const { CONFIG_KEYS } = PlatformConfig;

/**
 * Lấy tất cả cấu hình sàn
 * @route GET /api/admin/platform/config
 * @access Private/Admin
 */
const getPlatformConfig = async (req, res) => {
    try {
        const configs = await PlatformConfig.getAllConfigs();

        res.status(200).json({
            success: true,
            data: {
                configs,
                keys: CONFIG_KEYS
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy cấu hình',
            error: error.message
        });
    }
};

/**
 * Cập nhật cấu hình sàn
 * @route PUT /api/admin/platform/config
 * @access Private/Admin
 */
const updatePlatformConfig = async (req, res) => {
    try {
        const { key, value } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp key và value'
            });
        }

        // Validate key
        if (!Object.values(CONFIG_KEYS).includes(key)) {
            return res.status(400).json({
                success: false,
                message: 'Key không hợp lệ',
                validKeys: Object.values(CONFIG_KEYS)
            });
        }

        // Validate value
        if (key === CONFIG_KEYS.PLATFORM_FEE_PERCENT) {
            if (value < 0 || value > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Phí sàn phải từ 0 đến 100%'
                });
            }
        }

        if (key === CONFIG_KEYS.MIN_WITHDRAW_AMOUNT) {
            if (value < 10000) {
                return res.status(400).json({
                    success: false,
                    message: 'Số tiền rút tối thiểu phải >= 10,000đ'
                });
            }
        }

        const config = await PlatformConfig.setValue(key, value, req.user._id);

        res.status(200).json({
            success: true,
            message: 'Cập nhật cấu hình thành công',
            data: { config }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật cấu hình',
            error: error.message
        });
    }
};

/**
 * Lấy tổng quan tài chính sàn
 * @route GET /api/admin/platform/finance-overview
 * @access Private/Admin
 */
const getFinanceOverview = async (req, res) => {
    try {
        // Tổng số dư vendors
        const vendorBalances = await payoutService.getTotalVendorBalances();

        // Tổng platform fee
        const platformFeeStats = await Transaction.aggregate([
            {
                $match: {
                    category: 'platform_fee'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Số đơn đã chi trả
        const payoutStats = await Transaction.aggregate([
            {
                $match: {
                    category: 'order_income'
                }
            },
            {
                $group: {
                    _id: null,
                    totalPaid: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Số tiền rút
        const withdrawStats = await Transaction.aggregate([
            {
                $match: {
                    category: 'withdraw',
                    status: 'success'
                }
            },
            {
                $group: {
                    _id: null,
                    totalWithdrawn: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                vendorWallets: {
                    count: vendorBalances.walletCount,
                    totalBalance: vendorBalances.totalBalance,
                    totalPending: vendorBalances.totalPending
                },
                platformFees: {
                    total: platformFeeStats[0]?.total || 0,
                    count: platformFeeStats[0]?.count || 0
                },
                payouts: {
                    totalPaid: payoutStats[0]?.totalPaid || 0,
                    count: payoutStats[0]?.count || 0
                },
                withdrawals: {
                    totalWithdrawn: withdrawStats[0]?.totalWithdrawn || 0,
                    count: withdrawStats[0]?.count || 0
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy tổng quan tài chính',
            error: error.message
        });
    }
};

/**
 * Chạy settlement thủ công cho các đơn hàng pending
 * @route POST /api/admin/platform/run-payout
 * @access Private/Admin
 */
const runManualPayout = async (req, res) => {
    try {
        const { orderIds } = req.body;

        let results;
        if (orderIds && orderIds.length > 0) {
            // Chỉ chạy cho các đơn được chỉ định
            results = await payoutService.batchPayout(orderIds);
        } else {
            // Chạy cho tất cả đơn pending
            results = await payoutService.payoutPendingOrders();
        }

        res.status(200).json({
            success: true,
            message: 'Đã hoàn thành settlement',
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi chạy settlement',
            error: error.message
        });
    }
};

/**
 * Lấy danh sách giao dịch platform
 * @route GET /api/admin/platform/transactions
 * @access Private/Admin
 */
const getPlatformTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 20, type, category } = req.query;

        const query = {};
        if (type) query.type = type;
        if (category) query.category = category;

        const skip = (Number(page) - 1) * Number(limit);
        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .populate('shop', 'name')
                .populate('order', 'orderNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Transaction.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    limit: Number(limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy giao dịch',
            error: error.message
        });
    }
};

module.exports = {
    getPlatformConfig,
    updatePlatformConfig,
    getFinanceOverview,
    runManualPayout,
    getPlatformTransactions
};
