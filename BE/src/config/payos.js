/**
 * PayOS Configuration
 * 
 * PayOS Payment Gateway Integration
 * https://payos.vn
 */

const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || '';
const PAYOS_API_KEY = process.env.PAYOS_API_KEY || '';
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || '';

// PayOS API URLs
const PAYOS_API_URL = 'https://api.payos.vn';
const PAYOS_CLIENT_URL = process.env.PAYOS_CLIENT_URL || 'http://localhost:5173';

class PayOSConfig {
    constructor() {
        this.clientId = PAYOS_CLIENT_ID;
        this.apiKey = PAYOS_API_KEY;
        this.checksumKey = PAYOS_CHECKSUM_KEY;
        this.clientUrl = PAYOS_CLIENT_URL;
    }

    isConfigured() {
        return !!(this.clientId && this.apiKey && this.checksumKey);
    }

    getConfig() {
        return {
            clientId: this.clientId,
            apiKey: this.apiKey,
            checksumKey: this.checksumKey,
        };
    }
}

const payosConfig = new PayOSConfig();

module.exports = {
    payosConfig,
    PAYOS_CLIENT_URL,
};
