/**
 * Platform Configuration
 * 
 * Cấu hình cho sàn thương mại điện tử Furni
 */

const mongoose = require('mongoose');

const platformConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    description: {
        type: String,
        default: ''
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

// Pre-defined config keys
const CONFIG_KEYS = {
    PLATFORM_FEE_PERCENT: 'platform_fee_percent',      // % phí sàn trên mỗi đơn
    MIN_WITHDRAW_AMOUNT: 'min_withdraw_amount',        // Số tiền rút tối thiểu
    PAYOUT_SCHEDULE: 'payout_schedule',                // Lịch chi trả (daily, weekly, monthly)
    PAYOUT_DELAY_DAYS: 'payout_delay_days',            // Số ngày chờ sau khi giao hàng
    PAYOUT_AUTO_ENABLED: 'payout_auto_enabled',        // Bật/tắt chi trả tự động
    PAYOS_WEBHOOK_ENABLED: 'payos_webhook_enabled',     // Bật webhook PayOS
    PAYMENT_HOLD_HOURS: 'payment_hold_hours',           // Số giờ giữ tiền trước khi chuyển
    PRODUCTS_PER_PAGE: 'products_per_page'              // Số sản phẩm mỗi trang
};

// Default values
const DEFAULT_CONFIG = {
    [CONFIG_KEYS.PLATFORM_FEE_PERCENT]: 5,             // 5% phí sàn
    [CONFIG_KEYS.MIN_WITHDRAW_AMOUNT]: 100000,          // 100k tối thiểu
    [CONFIG_KEYS.PAYOUT_SCHEDULE]: 'daily',             // Chi trả hàng ngày
    [CONFIG_KEYS.PAYOUT_DELAY_DAYS]: 0,                  // Chuyển ngay khi giao
    [CONFIG_KEYS.PAYOUT_AUTO_ENABLED]: true,             // Bật chi trả tự động
    [CONFIG_KEYS.PAYOS_WEBHOOK_ENABLED]: true,          // Bật webhook
    [CONFIG_KEYS.PAYMENT_HOLD_HOURS]: 0,                 // Không giữ tiền
    [CONFIG_KEYS.PRODUCTS_PER_PAGE]: 12                 // 12 sản phẩm mỗi trang
};

// Get config value
platformConfigSchema.statics.getValue = async function(key, defaultValue = null) {
    const config = await this.findOne({ key });
    return config ? config.value : (DEFAULT_CONFIG[key] ?? defaultValue);
};

// Set config value
platformConfigSchema.statics.setValue = async function(key, value, updatedBy = null) {
    return this.findOneAndUpdate(
        { key },
        { key, value, updatedBy, description: getConfigDescription(key) },
        { upsert: true, new: true }
    );
};

// Get all configs
platformConfigSchema.statics.getAllConfigs = async function() {
    const configs = await this.find();
    const configMap = {};
    configs.forEach(c => {
        configMap[c.key] = c.value ?? DEFAULT_CONFIG[c.key] ?? null;
    });
    // Fill in defaults for missing keys
    Object.keys(DEFAULT_CONFIG).forEach(key => {
        if (configMap[key] === undefined) {
            configMap[key] = DEFAULT_CONFIG[key];
        }
    });
    return configMap;
};

function getConfigDescription(key) {
    const descriptions = {
        [CONFIG_KEYS.PLATFORM_FEE_PERCENT]: 'Phần trăm phí sàn trên mỗi đơn hàng (%)',
        [CONFIG_KEYS.MIN_WITHDRAW_AMOUNT]: 'Số tiền rút tối thiểu (VND)',
        [CONFIG_KEYS.PAYOUT_SCHEDULE]: 'Lịch chi trả: daily, weekly, monthly',
        [CONFIG_KEYS.PAYOUT_DELAY_DAYS]: 'Số ngày chờ sau khi giao hàng thành công trước khi chi trả cho vendor',
        [CONFIG_KEYS.PAYOUT_AUTO_ENABLED]: 'Bật/tắt chi trả tự động cho vendor (true/false)',
        [CONFIG_KEYS.PAYOS_WEBHOOK_ENABLED]: 'Bật xử lý webhook PayOS (true/false)',
        [CONFIG_KEYS.PAYMENT_HOLD_HOURS]: 'Số giờ giữ tiền trước khi chuyển cho vendor (0 = chuyển ngay)',
        [CONFIG_KEYS.PRODUCTS_PER_PAGE]: 'Số sản phẩm hiển thị mỗi trang (FE)'
    };
    return descriptions[key] || '';
}

const PlatformConfig = mongoose.model('PlatformConfig', platformConfigSchema);

// Export constants
PlatformConfig.CONFIG_KEYS = CONFIG_KEYS;
PlatformConfig.DEFAULT_CONFIG = DEFAULT_CONFIG;

module.exports = PlatformConfig;
