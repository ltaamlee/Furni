const AdminLedger = require('../models/adminLedger');
const { ACCOUNT_TYPE } = require('../models/adminLedger');

const ACCOUNT_META = {
    [ACCOUNT_TYPE.PAYOS_HOLDING]: {
        label: 'PAYOS Holding',
        description: 'Tiền PayOS nhận từ khách, chưa phân bổ',
        color: 'blue',
        icon: '💳',
    },
    [ACCOUNT_TYPE.PLATFORM_FEE]: {
        label: 'Phí Sàn',
        description: 'Phí sàn đã thu từ giao dịch',
        color: 'green',
        icon: '🏛️',
    },
    [ACCOUNT_TYPE.VOUCHER_LIAB]: {
        label: 'Nợ Voucher',
        description: 'Nợ voucher sàn tài trợ (chờ quyết toán)',
        color: 'amber',
        icon: '🎟️',
    },
    [ACCOUNT_TYPE.PAYOUT_POOL]: {
        label: 'Payout Pool',
        description: 'Tiền chuẩn bị chi trả cho vendor',
        color: 'purple',
        icon: '💰',
    },
};

// @desc    Lấy số dư các ví của Admin
// @route   GET /api/admin/wallet/balances
// @access  Private / Admin only
const getAdminWalletBalances = async (req, res) => {
    try {
        const balancesMap = await AdminLedger.getCurrentBalances();

        // Convert Map → plain object (Express can't serialize Map)
        const data = {};
        for (const [accountType, meta] of Object.entries(ACCOUNT_META)) {
            data[accountType] = {
                ...meta,
                balance: balancesMap.get(accountType) || 0,
            };
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('getAdminWalletBalances error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy số dư ví', error: error.message });
    }
};

module.exports = { getAdminWalletBalances };
