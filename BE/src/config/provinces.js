/**
 * Cấu hình 34 đơn vị hành chính cấp tỉnh theo Quyết định 2025.
 * Không gọi API bên ngoài - dữ liệu local.
 */

const REGION = {
    NORTH: 'north',
    CENTRAL: 'central',
    SOUTH: 'south'
};

/**
 * 34 TỈNH/THÀNH theo Quyết định 2025
 * Mã số theo open-api.vn
 */
const PROVINCES = [
    // Miền Bắc
    { code: 1,  name: 'Thành phố Hà Nội',      region: REGION.NORTH, order: 1 },
    { code: 4,  name: 'Tỉnh Cao Bằng',           region: REGION.NORTH, order: 2 },
    { code: 8,  name: 'Tỉnh Tuyên Quang',        region: REGION.NORTH, order: 3 },
    { code: 11, name: 'Tỉnh Điện Biên',          region: REGION.NORTH, order: 4 },
    { code: 12, name: 'Tỉnh Lai Châu',            region: REGION.NORTH, order: 5 },
    { code: 14, name: 'Tỉnh Sơn La',             region: REGION.NORTH, order: 6 },
    { code: 15, name: 'Tỉnh Lào Cai',             region: REGION.NORTH, order: 7 },
    { code: 19, name: 'Tỉnh Thái Nguyên',        region: REGION.NORTH, order: 8 },
    { code: 20, name: 'Tỉnh Lạng Sơn',           region: REGION.NORTH, order: 9 },
    { code: 22, name: 'Tỉnh Quảng Ninh',          region: REGION.NORTH, order: 10 },
    { code: 24, name: 'Tỉnh Bắc Ninh',            region: REGION.NORTH, order: 11 },
    { code: 25, name: 'Tỉnh Phú Thọ',            region: REGION.NORTH, order: 12 },
    { code: 31, name: 'Thành phố Hải Phòng',    region: REGION.NORTH, order: 13 },
    { code: 33, name: 'Tỉnh Hưng Yên',           region: REGION.NORTH, order: 14 },
    { code: 37, name: 'Tỉnh Ninh Bình',          region: REGION.NORTH, order: 15 },

    // Miền Trung
    { code: 38, name: 'Tỉnh Thanh Hóa',          region: REGION.CENTRAL, order: 16 },
    { code: 40, name: 'Tỉnh Nghệ An',            region: REGION.CENTRAL, order: 17 },
    { code: 42, name: 'Tỉnh Hà Tĩnh',            region: REGION.CENTRAL, order: 18 },
    { code: 44, name: 'Tỉnh Quảng Trị',          region: REGION.CENTRAL, order: 19 },
    { code: 46, name: 'Thành phố Huế',          region: REGION.CENTRAL, order: 20 },
    { code: 48, name: 'Thành phố Đà Nẵng',      region: REGION.CENTRAL, order: 21 },
    { code: 51, name: 'Tỉnh Quảng Ngãi',         region: REGION.CENTRAL, order: 22 },
    { code: 52, name: 'Tỉnh Gia Lai',            region: REGION.CENTRAL, order: 23 },
    { code: 56, name: 'Tỉnh Khánh Hòa',          region: REGION.CENTRAL, order: 24 },
    { code: 66, name: 'Tỉnh Đắk Lắk',            region: REGION.CENTRAL, order: 25 },
    { code: 68, name: 'Tỉnh Lâm Đồng',           region: REGION.CENTRAL, order: 26 },

    // Miền Nam
    { code: 75, name: 'Tỉnh Đồng Nai',          region: REGION.SOUTH, order: 27 },
    { code: 79, name: 'Thành phố Hồ Chí Minh',   region: REGION.SOUTH, order: 28 },
    { code: 80, name: 'Tỉnh Tây Ninh',           region: REGION.SOUTH, order: 29 },
    { code: 82, name: 'Tỉnh Đồng Tháp',         region: REGION.SOUTH, order: 30 },
    { code: 86, name: 'Tỉnh Vĩnh Long',          region: REGION.SOUTH, order: 31 },
    { code: 91, name: 'Tỉnh An Giang',           region: REGION.SOUTH, order: 32 },
    { code: 92, name: 'Thành phố Cần Thơ',      region: REGION.SOUTH, order: 33 },
    { code: 96, name: 'Tỉnh Cà Mau',             region: REGION.SOUTH, order: 34 },
];

// provinceCode (number) → region
const PROVINCE_REGION_MAP = {};
PROVINCES.forEach(p => {
    PROVINCE_REGION_MAP[p.code] = p.region;
});

// provinceCode (number) → full name
const PROVINCE_CODE_TO_NAME = {};
PROVINCES.forEach(p => {
    PROVINCE_CODE_TO_NAME[p.code] = p.name;
});

// provinceName → provinceCode (number) — hỗ trợ MapVina / FE
const PROVINCE_NAME_TO_CODE = {};
PROVINCES.forEach(p => {
    PROVINCE_NAME_TO_CODE[p.name] = p.code;
    PROVINCE_NAME_TO_CODE[p.name.replace('Thành phố ', 'TP. ')] = p.code;
    PROVINCE_NAME_TO_CODE[p.name.replace('Thành phố ', '')] = p.code;
    PROVINCE_NAME_TO_CODE[p.name.replace('Tỉnh ', '')] = p.code;
});

// helpers
const getRegion = (provinceCode) => {
    const code = Number(provinceCode);
    return PROVINCE_REGION_MAP[code] || REGION.SOUTH;
};

const getProvinceName = (provinceCode) => {
    return PROVINCE_CODE_TO_NAME[Number(provinceCode)] || `Tỉnh #${provinceCode}`;
};

const getProvinceCode = (provinceName) => {
    return PROVINCE_NAME_TO_CODE[provinceName] || null;
};

const getProvincesByRegion = (region) => {
    return PROVINCES.filter(p => p.region === region).sort((a, b) => a.order - b.order);
};

module.exports = {
    REGION,
    PROVINCES,
    PROVINCE_REGION_MAP,
    PROVINCE_CODE_TO_NAME,
    PROVINCE_NAME_TO_CODE,
    getRegion,
    getProvinceName,
    getProvinceCode,
    getProvincesByRegion,
};
