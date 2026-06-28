/**
 * Platform / Admin Ledger
 *
 * Sổ cái kép (double-entry) ghi nhận mọi biến động tiền liên quan đến
 * Admin / Sàn thương mại điện tử.
 *
 * Mỗi entry luôn có:
 *   - debit  (số tiền đi ra khỏi ví Admin)
 *   - credit (số tiền đi vào ví Admin)
 *
 * Một entry chỉ ghi HOẶC debit HOẶC credit, không bao giờ cả hai.
 *
 * Các loại ví Admin (accountType):
 *   - PAYOS_HOLDING   : Tiền PayOS nhận từ khách, chưa phân bổ
 *   - PLATFORM_FEE    : Phí sàn đã thu (từ PAYOS_HOLDING)
 *   - VOUCHER_LIAB    : Nợ voucher sàn tài trợ (liability chờ quyết toán)
 *   - PAYOUT_POOL     : Tiền chuẩn bị chi trả cho vendor
 *
 * Luồng tiền chuẩn:
 *   1. Khách thanh toán PayOS → PAYOS_HOLDING (+credit)
 *   2. Thu phí sàn 5%        → PLATFORM_FEE (+credit) | PAYOS_HOLDING (-debit)
 *   3. Ghi nợ voucher sàn     → VOUCHER_LIAB (+credit) | PAYOS_HOLDING (-debit)
 *   4. Chi trả cho vendor      → PAYOUT_POOL (-debit)   | PAYOS_HOLDING (-debit)
 *   5. Quyết toán voucher     → VOUCHER_LIAB (-debit) | Shop Wallet (+credit)
 */

const mongoose = require('mongoose');

const LEDGER_TYPE = {
    // PayOS / COD settlement
    PAYOS_SETTLEMENT_IN:    'PAYOS_SETTLEMENT_IN',    // Tiền vào PAYOS_HOLDING (khách thanh toán)
    PAYOS_SETTLEMENT_OUT:   'PAYOS_SETTLEMENT_OUT',   // Tiền ra khỏi PAYOS_HOLDING (không dùng trực tiếp)

    // Phí sàn
    PLATFORM_FEE_IN:        'PLATFORM_FEE_IN',        // Thu phí sàn → PLATFORM_FEE (+credit)
    PLATFORM_FEE_REFUND:    'PLATFORM_FEE_REFUND',     // Hoàn phí sàn khi refund (trả lại)

    // Voucher sàn tài trợ
    VOUCHER_SPONSOR_IN:     'VOUCHER_SPONSOR_IN',     // Ghi nợ voucher sàn → VOUCHER_LIAB (+credit)
    VOUCHER_SPONSOR_SETTLE:'VOUCHER_SPONSOR_SETTLE', // Quyết toán voucher sàn → VOUCHER_LIAB (-debit)
    VOUCHER_SPONSOR_REFUND: 'VOUCHER_SPONSOR_REFUND', // Khách hoàn hàng → voucher sàn hoàn lại cho admin

    // Freeship sàn tài trợ
    FREESHIP_SPONSOR_IN:    'FREESHIP_SPONSOR_IN',    // Ghi nợ freeship sàn → VOUCHER_LIAB (+credit)
    FREESHIP_SPONSOR_SETTLE:'FREESHIP_SPONSOR_SETTLE',// Quyết toán freeship sàn → VOUCHER_LIAB (-debit)
    FREESHIP_SPONSOR_REFUND: 'FREESHIP_SPONSOR_REFUND',// Hoàn freeship

    // Payout
    PAYOUT_TO_VENDOR:       'PAYOUT_TO_VENDOR',       // Chi trả cho vendor → PAYOUT_POOL (-debit)

    // Refund từ vendor
    VENDOR_REFUND_IN:       'VENDOR_REFUND_IN',        // Vendor hoàn tiền khi hủy sau payout → PAYOS_HOLDING

    // Hoàn tiền cho khách
    REFUND_TO_CUSTOMER:      'REFUND_TO_CUSTOMER',      // Hoàn tiền cho khách → PAYOS_HOLDING (-debit)

    // Điều chỉnh thủ công
    ADJUSTMENT:              'ADJUSTMENT',               // Điều chỉnh số dư
};

const ACCOUNT_TYPE = {
    PAYOS_HOLDING:  'PAYOS_HOLDING',
    PLATFORM_FEE:   'PLATFORM_FEE',
    VOUCHER_LIAB:   'VOUCHER_LIAB',
    PAYOUT_POOL:    'PAYOUT_POOL',
};

const LEDGER_STATUS = {
    PENDING:    'pending',
    COMPLETED:  'completed',
    FAILED:     'failed',
    REVERSED:   'reversed',
};

// Nhóm ledger types theo account debit/credit
const TYPE_ACCOUNT_MAP = {
    [LEDGER_TYPE.PAYOS_SETTLEMENT_IN]:     { accountDebit: null,             accountCredit: ACCOUNT_TYPE.PAYOS_HOLDING },
    [LEDGER_TYPE.PLATFORM_FEE_IN]:          { accountDebit: ACCOUNT_TYPE.PAYOS_HOLDING, accountCredit: ACCOUNT_TYPE.PLATFORM_FEE },
    [LEDGER_TYPE.PLATFORM_FEE_REFUND]:      { accountDebit: ACCOUNT_TYPE.PLATFORM_FEE,  accountCredit: ACCOUNT_TYPE.PAYOS_HOLDING },
    [LEDGER_TYPE.VOUCHER_SPONSOR_IN]:        { accountDebit: ACCOUNT_TYPE.PAYOS_HOLDING, accountCredit: ACCOUNT_TYPE.VOUCHER_LIAB },
    [LEDGER_TYPE.VOUCHER_SPONSOR_SETTLE]:    { accountDebit: ACCOUNT_TYPE.VOUCHER_LIAB,  accountCredit: null },  // credit = vendor wallet
    [LEDGER_TYPE.VOUCHER_SPONSOR_REFUND]:    { accountDebit: ACCOUNT_TYPE.VOUCHER_LIAB,  accountCredit: ACCOUNT_TYPE.PAYOS_HOLDING },
    [LEDGER_TYPE.FREESHIP_SPONSOR_IN]:       { accountDebit: ACCOUNT_TYPE.PAYOS_HOLDING, accountCredit: ACCOUNT_TYPE.VOUCHER_LIAB },
    [LEDGER_TYPE.FREESHIP_SPONSOR_SETTLE]:   { accountDebit: ACCOUNT_TYPE.VOUCHER_LIAB,  accountCredit: null },  // credit = vendor wallet
    [LEDGER_TYPE.FREESHIP_SPONSOR_REFUND]:   { accountDebit: ACCOUNT_TYPE.VOUCHER_LIAB,  accountCredit: ACCOUNT_TYPE.PAYOS_HOLDING },
    [LEDGER_TYPE.PAYOUT_TO_VENDOR]:          { accountDebit: ACCOUNT_TYPE.PAYOUT_POOL,     accountCredit: null },  // credit = vendor wallet
    [LEDGER_TYPE.VENDOR_REFUND_IN]:          { accountDebit: null,             accountCredit: ACCOUNT_TYPE.PAYOS_HOLDING },
    [LEDGER_TYPE.REFUND_TO_CUSTOMER]:         { accountDebit: ACCOUNT_TYPE.PAYOS_HOLDING, accountCredit: null },  // credit = customer wallet
    [LEDGER_TYPE.ADJUSTMENT]:               { accountDebit: null,             accountCredit: null },
};

const adminLedgerSchema = new mongoose.Schema({
    // ── Liên kết order ──────────────────────────────────────────────
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
        index: true,
    },
    orderNumber: {
        type: String,
        default: null,
        index: true,
    },
    checkoutGroupId: {
        type: String,
        default: null,
        index: true,
    },

    // ── Thời gian ────────────────────────────────────────────────────
    transactionDate: {
        type: Date,
        default: Date.now,
        index: true,
    },

    // ── Loại giao dịch ──────────────────────────────────────────────
    type: {
        type: String,
        enum: Object.values(LEDGER_TYPE),
        required: [true, 'Loại ledger không được trống!'],
    },

    // ── Số tiền (luôn dương) ────────────────────────────────────────
    amount: {
        type: Number,
        required: [true, 'Số tiền không được trống!'],
        min: [0, 'Số tiền phải >= 0!'],
    },

    // ── Tài khoản Admin (ví nguồn / ví đích) ────────────────────────
    // Ví nguồn debit (tiền đi ra)
    accountDebit: {
        type: String,
        enum: [...Object.values(ACCOUNT_TYPE), null],
        default: null,
    },
    // Ví đích credit (tiền đi vào)
    accountCredit: {
        type: String,
        enum: [...Object.values(ACCOUNT_TYPE), null],
        default: null,
    },

    // ── Đối tượng liên quan ─────────────────────────────────────────
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        default: null,
        index: true,
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },

    // ── Trạng thái ──────────────────────────────────────────────────
    status: {
        type: String,
        enum: Object.values(LEDGER_STATUS),
        default: LEDGER_STATUS.COMPLETED,
    },

    // ── Số dư sau giao dịch (snapshot audit) ────────────────────────
    balanceAfter: {
        type: Map,
        of: Number,
        default: () => new Map(),
    },

    // ── Thông tin bổ sung ────────────────────────────────────────────
    description: {
        type: String,
        maxlength: [500, 'Mô tả không vượt quá 500 ký tự!'],
        default: '',
    },

    // ── Tham chiếu reversal (nếu entry này bị đảo ngược) ──────────
    reversedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminLedger',
        default: null,
    },
    reverses: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminLedger',
        default: null,
    },

    // ── Người thực hiện ─────────────────────────────────────────────
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
}, { timestamps: true });

// ── Indexes ────────────────────────────────────────────────────────────
adminLedgerSchema.index({ order: 1, type: 1 });
adminLedgerSchema.index({ order: 1, checkoutGroupId: 1 });
adminLedgerSchema.index({ shop: 1, transactionDate: -1 });
adminLedgerSchema.index({ checkoutGroupId: 1, type: 1 });
adminLedgerSchema.index({ transactionDate: -1, type: 1 });

// ── Virtual id ─────────────────────────────────────────────────────────
adminLedgerSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// ── Balance snapshot helpers ────────────────────────────────────────────
/**
 * Cập nhật số dư các tài khoản Admin sau một ledger entry.
 * @param {Object} adminBalances - Map of accountType → balance
 * @param {Object} entry - AdminLedger entry
 * @returns {Object} updated balances map
 */
adminLedgerSchema.statics.applyEntryToBalances = function (adminBalances, entry) {
    const updated = new Map(adminBalances);
    const accounts = [ACCOUNT_TYPE.PAYOS_HOLDING, ACCOUNT_TYPE.PLATFORM_FEE, ACCOUNT_TYPE.VOUCHER_LIAB, ACCOUNT_TYPE.PAYOUT_POOL];
    accounts.forEach(acc => {
        if (!updated.has(acc)) updated.set(acc, 0);
    });

    if (entry.accountDebit && entry.status === LEDGER_STATUS.COMPLETED) {
        updated.set(entry.accountDebit, Math.max(0, (updated.get(entry.accountDebit) || 0) - entry.amount));
    }
    if (entry.accountCredit && entry.status === LEDGER_STATUS.COMPLETED) {
        updated.set(entry.accountCredit, (updated.get(entry.accountCredit) || 0) + entry.amount);
    }
    return updated;
};

/**
 * Tạo một ledger entry và cập nhật balance snapshot.
 * Dùng trong transaction session để đảm bảo atomic.
 *
 * @param {Object} data - Entry data
 * @param {Object} currentBalances - Map of accountType → balance
 * @param {mongoose.ClientSession} session
 * @returns {Promise<{ entry, balances }>}
 */
adminLedgerSchema.statics.createEntry = async function (data, currentBalances, session) {
    const entry = await this.create([data], { session });
    const balances = this.applyEntryToBalances(currentBalances, entry[0]);

    // Lưu balance snapshot vào entry
    entry[0].balanceAfter = balances;
    await entry[0].save({ session });

    return { entry: entry[0], balances };
};

/**
 * Đảo ngược một ledger entry (tạo entry mới với status REVERSED,
 * debit↔credit swap, liên kết reverses).
 *
 * @param {ObjectId} entryId
 * @param {mongoose.ClientSession} session
 * @returns {Promise<{ entry, balances }>}
 */
adminLedgerSchema.statics.reverseEntry = async function (entryId, session) {
    const original = await this.findById(entryId).session(session);
    if (!original) throw new Error('Ledger entry not found');
    if (original.status === LEDGER_STATUS.REVERSED) throw new Error('Entry already reversed');

    const reversalData = {
        ...original.toObject(),
        _id: undefined,
        __v: undefined,
        type: original.type + '_REVERSED',
        status: LEDGER_STATUS.REVERSED,
        reverses: original._id,
        transactionDate: new Date(),
    };

    // Swap debit/credit
    const tempDebit = reversalData.accountDebit;
    reversalData.accountDebit = reversalData.accountCredit;
    reversalData.accountCredit = tempDebit;

    const { entry, balances } = await this.createEntry(reversalData, new Map(), session);

    // Cập nhật original
    original.reversedBy = entry._id;
    original.status = LEDGER_STATUS.REVERSED;
    await original.save({ session });

    return { entry, balances };
};

/**
 * Tính số dư hiện tại của các tài khoản Admin.
 * @returns {Promise<Map>}
 */
adminLedgerSchema.statics.getCurrentBalances = async function () {
    const completed = { status: LEDGER_STATUS.COMPLETED };
    const reversed  = { status: LEDGER_STATUS.REVERSED };

    const pipeline = [
        { $match: { status: { $in: [completed.status, reversed.status] } } },
        { $project: {
            accountDebit: 1,
            accountCredit: 1,
            amount: 1,
            status: 1,
            multiplier: { $cond: [{ $eq: ['$status', 'reversed'] }, -1, 1] },
        }},
        { $group: {
            _id: null,
            PAYOS_HOLDING: {
                $sum: {
                    $cond: [
                        { $eq: ['$accountCredit', 'PAYOS_HOLDING'] },
                        { $multiply: ['$amount', '$multiplier'] },
                        {
                            $cond: [
                                { $eq: ['$accountDebit', 'PAYOS_HOLDING'] },
                                { $multiply: ['$amount', { $multiply: ['$multiplier', -1] }] },
                                0,
                            ],
                        },
                    ],
                },
            },
            PLATFORM_FEE: {
                $sum: {
                    $cond: [
                        { $eq: ['$accountCredit', 'PLATFORM_FEE'] },
                        { $multiply: ['$amount', '$multiplier'] },
                        {
                            $cond: [
                                { $eq: ['$accountDebit', 'PLATFORM_FEE'] },
                                { $multiply: ['$amount', { $multiply: ['$multiplier', -1] }] },
                                0,
                            ],
                        },
                    ],
                },
            },
            VOUCHER_LIAB: {
                $sum: {
                    $cond: [
                        { $eq: ['$accountCredit', 'VOUCHER_LIAB'] },
                        { $multiply: ['$amount', '$multiplier'] },
                        {
                            $cond: [
                                { $eq: ['$accountDebit', 'VOUCHER_LIAB'] },
                                { $multiply: ['$amount', { $multiply: ['$multiplier', -1] }] },
                                0,
                            ],
                        },
                    ],
                },
            },
            PAYOUT_POOL: {
                $sum: {
                    $cond: [
                        { $eq: ['$accountCredit', 'PAYOUT_POOL'] },
                        { $multiply: ['$amount', '$multiplier'] },
                        {
                            $cond: [
                                { $eq: ['$accountDebit', 'PAYOUT_POOL'] },
                                { $multiply: ['$amount', { $multiply: ['$multiplier', -1] }] },
                                0,
                            ],
                        },
                    ],
                },
            },
        }},
    ];

    const result = await this.aggregate(pipeline);
    const balances = new Map();
    balances.set(ACCOUNT_TYPE.PAYOS_HOLDING, result[0]?.PAYOS_HOLDING || 0);
    balances.set(ACCOUNT_TYPE.PLATFORM_FEE,   result[0]?.PLATFORM_FEE   || 0);
    balances.set(ACCOUNT_TYPE.VOUCHER_LIAB,   result[0]?.VOUCHER_LIAB   || 0);
    balances.set(ACCOUNT_TYPE.PAYOUT_POOL,    result[0]?.PAYOUT_POOL    || 0);
    return balances;
};

/**
 * Lấy số dư theo checkoutGroupId (cho multi-shop orders).
 * @param {string} checkoutGroupId
 * @returns {Promise<Map>}
 */
adminLedgerSchema.statics.getGroupBalances = async function (checkoutGroupId) {
    const entries = await this.find({
        checkoutGroupId,
        status: LEDGER_STATUS.COMPLETED,
    }).lean();

    const balances = new Map();
    balances.set(ACCOUNT_TYPE.PAYOS_HOLDING, 0);
    balances.set(ACCOUNT_TYPE.PLATFORM_FEE, 0);
    balances.set(ACCOUNT_TYPE.VOUCHER_LIAB, 0);
    balances.set(ACCOUNT_TYPE.PAYOUT_POOL, 0);

    entries.forEach(e => {
        if (e.accountDebit)  balances.set(e.accountDebit,  (balances.get(e.accountDebit)  || 0) + e.amount);
        if (e.accountCredit) balances.set(e.accountCredit, (balances.get(e.accountCredit) || 0) + e.amount);
    });
    return balances;
};

// ── Enable virtuals ────────────────────────────────────────────────────
adminLedgerSchema.set('toJSON', { virtuals: true });
adminLedgerSchema.set('toObject', { virtuals: true });

const AdminLedger = mongoose.models.AdminLedger || mongoose.model('AdminLedger', adminLedgerSchema);

AdminLedger.LEDGER_TYPE  = LEDGER_TYPE;
AdminLedger.ACCOUNT_TYPE = ACCOUNT_TYPE;
AdminLedger.STATUS      = LEDGER_STATUS;
AdminLedger.TYPE_ACCOUNT_MAP = TYPE_ACCOUNT_MAP;

module.exports = AdminLedger;
module.exports.LEDGER_TYPE  = LEDGER_TYPE;
module.exports.ACCOUNT_TYPE = ACCOUNT_TYPE;
module.exports.STATUS      = LEDGER_STATUS;
