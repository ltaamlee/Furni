const axios = require('axios');
const { GHN } = require('../config/shipping');
const Shop = require('../models/Shop');

/**
 * Lấy config GHN của một shop.
 * Nếu shop chưa set → fallback về token mặc định của platform.
 */
async function getShopShippingConfig(shopId) {
    if (!shopId) {
        return { GHN };
    }
    const shop = await Shop.findById(shopId).select('shippingProviders');
    if (!shop) {
        return { GHN };
    }
    const sp = shop.shippingProviders || {};

    return {
        GHN: {
            ...GHN,
            token: sp.GHN?.token || GHN.token,
            shopId: sp.GHN?.shopId || GHN.shopId,
            fromDistrictId: sp.GHN?.fromDistrictId || GHN.fromDistrictId,
        },
    };
}

const PROVINCE_TO_GHN_DISTRICT = {
    // TP HCM (district_id GHN)
    79: { name: 'TP Hồ Chí Minh', district_id: 1542 },       // Quận 1
    // Hà Nội
    1: { name: 'Hà Nội', district_id: 1447 },               // Ba Đình
    // Other major provinces
    48: { name: 'Hồ Chí Minh', district_id: 1542 },
    31: { name: 'Hải Phòng', district_id: 921 },
    92: { name: 'Đà Nẵng', district_id: 268 },
    72: { name: 'Cần Thơ', district_id: 1561 },
    2: { name: 'Hà Nội', district_id: 1447 },
    26: { name: 'Hải Dương', district_id: 561 },
    16: { name: 'Bắc Ninh', district_id: 231 },
    15: { name: 'Vĩnh Phúc', district_id: 1626 },
    80: { name: 'Bình Dương', district_id: 1486 },
    75: { name: 'Đồng Nai', district_id: 1456 },
    82: { name: 'Bà Rịa - Vũng Tàu', district_id: 2090 },
    52: { name: 'Cần Thơ', district_id: 1561 },
    74: { name: 'Hồ Chí Minh', district_id: 1542 },
    60: { name: 'Bạc Liêu', district_id: 1773 },
    45: { name: 'Quảng Ninh', district_id: 1763 },
    56: { name: 'Bình Định', district_id: 1014 },
    62: { name: 'Gia Lai', district_id: 1443 },
    66: { name: 'Hà Giang', district_id: 488 },
    67: { name: 'Hà Nam', district_id: 484 },
    68: { name: 'Hà Tĩnh', district_id: 510 },
    70: { name: 'Hải Dương', district_id: 561 },
    71: { name: 'Hưng Yên', district_id: 589 },
    44: { name: 'Khánh Hòa', district_id: 931 },
    77: { name: 'Nghệ An', district_id: 1485 },
    78: { name: 'Ninh Bình', district_id: 1509 },
    40: { name: 'Quảng Bình', district_id: 1711 },
    42: { name: 'Quảng Ngãi', district_id: 1713 },
    43: { name: 'Quảng Nam', district_id: 1715 },
    46: { name: 'Quảng Trị', district_id: 1717 },
    86: { name: 'Sóc Trăng', district_id: 1781 },
    83: { name: 'Tây Ninh', district_id: 1793 },
    19: { name: 'Thái Bình', district_id: 1803 },
    20: { name: 'Thái Nguyên', district_id: 1817 },
    38: { name: 'Thanh Hóa', district_id: 1821 },
    39: { name: 'Thừa Thiên Huế', district_id: 1835 },
    84: { name: 'Tiền Giang', district_id: 1839 },
    64: { name: 'Trà Vinh', district_id: 1851 },
    51: { name: 'Vĩnh Long', district_id: 1863 },
    17: { name: 'Yên Bái', district_id: 1875 },
    36: { name: 'Bắc Kạn', district_id: 237 },
    33: { name: 'Cao Bằng', district_id: 367 },
    25: { name: 'Điện Biên', district_id: 449 },
    29: { name: 'Đắk Lắk', district_id: 433 },
    30: { name: 'Đắk Nông', district_id: 437 },
    11: { name: 'Lai Châu', district_id: 1051 },
    10: { name: 'Lâm Đồng', district_id: 1095 },
    12: { name: 'Lào Cai', district_id: 1103 },
    24: { name: 'Lạng Sơn', district_id: 1073 },
    23: { name: 'Nam Định', district_id: 1473 },
    18: { name: 'Phú Thọ', district_id: 1631 },
    13: { name: 'Sơn La', district_id: 1775 },
    14: { name: 'Tuyên Quang', district_id: 1859 },
};

/**
 * Tra cứu mã quận GHN từ tên tỉnh + mã quận VN.
 * Dùng GHN /v2/location/districts và /v2/location/wards để resolve,
 * kết quả được cache trong biến module.
 */
let _districtIdCache = {}; // key: `${provinceCode}:${districtCode}`, value: ghn_district_id
let _provinceDistrictCache = {}; // key: provinceCode, value: Map<vn_district_code, ghn_district_id>

async function getGhnDistrictId(provinceCode, vnDistrictCode, _config) {
    const cfg = _config || GHN;
    if (!cfg.token) return null;
    const cacheKey = `${provinceCode}:${vnDistrictCode}`;

    // 1. Hit local district table
    const cached = _districtIdCache[cacheKey];
    if (cached) return cached;

    // 2. Fetch province districts from GHN if not yet cached
    if (!_provinceDistrictCache[provinceCode]) {
        try {
            const res = await axios.get(`${cfg.baseUrl}/v2/location/districts`, {
                headers: { 'Token': cfg.token },
                params: { province_id: Number(provinceCode) },
                timeout: 8000,
            });
            if (res.data?.code === 200) {
                const map = {};
                for (const d of res.data.data) {
                    map[d.district_id] = d.DistrictID; // GHN id → VN code
                }
                _provinceDistrictCache[provinceCode] = map;
            }
        } catch {
            _provinceDistrictCache[provinceCode] = {};
        }
    }

    const reverseMap = _provinceDistrictCache[provinceCode] || {};
    // reverseMap: ghn_district_id → vn_district_code
    for (const [ghnId, vnCode] of Object.entries(reverseMap)) {
        if (String(vnCode) === String(vnDistrictCode)) {
            _districtIdCache[cacheKey] = Number(ghnId);
            return Number(ghnId);
        }
    }
    return null;
}

/**
 * Giao Hang Nhanh (GHN) API
 */
const GHNService = {
    /**
     * Tính phí ship cho GHN
     * @param {object} _config - Override config (nếu có shopId thì dùng config shop)
     */
    async calculateFee(toDistrict, weight = 1000, _config) {
        const cfg = _config || GHN;
        if (!cfg.token) {
            return { success: false, message: 'GHN chưa được cấu hình (thiếu GHN_TOKEN)' };
        }

        const fromDistrict = cfg.fromDistrictId || process.env.GHN_FROM_DISTRICT_ID || 1447;

        try {
            const res = await axios.post(
                `${cfg.baseUrl}/v2/shipping-order/fee`,
                {
                    service_type_id: cfg.serviceTypeId,
                    from_district_id: Number(fromDistrict),
                    to_district_id: Number(toDistrict),
                    weight: Number(weight),
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Token': cfg.token,
                    },
                    timeout: 10000,
                }
            );

            if (res.data?.code === 200) {
                const d = res.data.data;
                return {
                    success: true,
                    data: {
                        fee: d.total || d.fee || 0,
                        estimatedDays: d.leadtime
                            ? Math.ceil((d.leadtime - Date.now()) / (1000 * 60 * 60 * 24))
                            : 3,
                        estimatedDaysRange: d.leadtime
                            ? { min: Math.max(1, Math.ceil((d.leadtime - Date.now()) / (1000 * 60 * 60 * 24)) - 1), max: Math.ceil((d.leadtime - Date.now()) / (1000 * 60 * 60 * 24)) }
                            : { min: 2, max: 4 },
                    }
                };
            } else {
                return { success: false, message: res.data?.message || 'GHN API lỗi' };
            }
        } catch (error) {
            if (error.response) {
                return { success: false, message: `GHN lỗi: ${error.response.data?.message || error.response.statusText}` };
            }
            if (error.code === 'ECONNABORTED') {
                return { success: false, message: 'GHN API timeout' };
            }
            return { success: false, message: `Lỗi GHN: ${error.message}` };
        }
    },

    /**
     * Tạo đơn vận chuyển GHN
     * @param {object} orderData - Thông tin đơn
     * @param {object} _config - Override config (shop shipping config)
     */
    async createOrder(orderData, _config) {
        const cfg = _config || GHN;
        if (!cfg.token) {
            return { success: false, message: 'GHN chưa được cấu hình (thiếu GHN_TOKEN)' };
        }

        const fromDistrict = cfg.fromDistrictId || process.env.GHN_FROM_DISTRICT_ID || 1447;
        const shopId = cfg.shopId;

        try {
            const res = await axios.post(
                `${cfg.baseUrl}/v2/shipping-order/create`,
                {
                    ...(shopId ? { shop_id: Number(shopId) } : {}),
                    from_district_id: Number(fromDistrict),
                    to_district_id: Number(orderData.toDistrictId),
                    to_ward_code: String(orderData.toWardCode || ''),
                    service_type_id: cfg.serviceTypeId,
                    weight: orderData.weight || 1000,
                    length: orderData.length || 30,
                    width: orderData.width || 30,
                    height: orderData.height || 30,
                    cod_amount: orderData.codAmount || 0,
                    required_note: 'KHONGCHOXEMHANG',
                    client_order_code: orderData.orderCode || '',
                    to_name: orderData.toName || '',
                    to_phone: orderData.toPhone || '',
                    to_address: orderData.toAddress || '',
                    content: orderData.content || '',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Token': cfg.token,
                    },
                    timeout: 15000,
                }
            );

            if (res.data?.code === 200) {
                return {
                    success: true,
                    data: {
                        orderCode: res.data.data.order_code,
                        trackingNumber: res.data.data.order_code,
                        labelUrl: res.data.data.label_url,
                        fee: res.data.data.total_fee,
                    }
                };
            } else {
                return { success: false, message: res.data?.message || 'Tạo đơn GHN thất bại' };
            }
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            return { success: false, message: `Lỗi GHN: ${msg}` };
        }
    },

    /**
     * Tra cứu trạng thái đơn GHN
     * @param {object} _config - Override config (shop shipping config)
     */
    async getStatus(orderCode, _config) {
        const cfg = _config || GHN;
        if (!cfg.token) {
            return { success: false, message: 'GHN chưa được cấu hình' };
        }

        try {
            const res = await axios.post(
                `${cfg.baseUrl}/v2/shipping-order/detail`,
                { order_code: orderCode },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Token': cfg.token,
                    },
                    timeout: 10000,
                }
            );

            if (res.data?.code === 200) {
                return { success: true, data: res.data.data };
            }
            return { success: false, message: res.data?.message || 'Không tìm thấy đơn GHN' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },
};

/**
 * Fallback: tính phí ước lượng khi API chính fail
 */
const calculateFallbackFee = (baseFee, provinceCode, freeThreshold) => {
    const surcharges = {
        1: 15000, 79: 0, 48: 0, 31: 15000, 92: 20000,
        72: 25000, 2: 15000, 26: 20000, 16: 20000, 15: 20000,
        80: 20000, 75: 25000, 82: 25000,
    };
    return {
        success: true,
        data: {
            fee: (surcharges[provinceCode] ?? 30000) + baseFee,
            estimatedDays: { min: 2, max: 5 },
            isFallback: true,
        }
    };
};

module.exports = {
    GHNService,
    PROVINCE_TO_GHN_DISTRICT,
    calculateFallbackFee,
    getShopShippingConfig,
    getGhnDistrictId,
};
