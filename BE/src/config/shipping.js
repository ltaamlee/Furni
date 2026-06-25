// GHN (Giao Hàng Nhanh) configuration
// Docs: https://api.ghn.vn/home/docs/detail?id=99
// Required: GHN_TOKEN
// Optional: GHN_FROM_DISTRICT_ID (mặc định 1447 = Ba Đình, HN)
module.exports = {
    GHN: {
        baseUrl: process.env.GHN_BASE_URL || 'https://online-gateway.ghn.vn/shiip/public-api/v2',
        token: process.env.GHN_TOKEN || '',
        serviceTypeId: 2, // 2 = Economy, 1 = GHN Express, 5 = Super Express
    },
};
