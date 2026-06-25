// Province to Region mapping
const PROVINCE_REGION_MAP = {
    // Miền Nam
    79: REGION.SOUTH, 74: REGION.SOUTH, 75: REGION.SOUTH,
    80: REGION.SOUTH, 83: REGION.SOUTH, 84: REGION.SOUTH, 82: REGION.SOUTH,
    60: REGION.SOUTH, 64: REGION.SOUTH, 86: REGION.SOUTH, 71: REGION.SOUTH,
    52: REGION.SOUTH, 51: REGION.SOUTH,
    // Miền Trung
    92: REGION.CENTRAL, 38: REGION.CENTRAL, 39: REGION.CENTRAL, 40: REGION.CENTRAL,
    42: REGION.CENTRAL, 43: REGION.CENTRAL, 44: REGION.CENTRAL, 46: REGION.CENTRAL,
    56: REGION.CENTRAL, 62: REGION.CENTRAL, 58: REGION.CENTRAL, 68: REGION.CENTRAL,
    // Miền Bắc
    1: REGION.NORTH, 15: REGION.NORTH, 16: REGION.NORTH, 17: REGION.NORTH,
    18: REGION.NORTH, 19: REGION.NORTH, 20: REGION.NORTH, 23: REGION.NORTH,
    24: REGION.NORTH, 26: REGION.NORTH, 31: REGION.NORTH, 33: REGION.NORTH,
    36: REGION.NORTH, 67: REGION.NORTH, 45: REGION.NORTH, 10: REGION.NORTH,
    11: REGION.NORTH, 13: REGION.NORTH, 14: REGION.NORTH, 25: REGION.NORTH,
    29: REGION.NORTH, 30: REGION.NORTH, 66: REGION.NORTH,
};

const getRegionForProvince = (provinceCode) => {
    const code = Number(provinceCode);
    return PROVINCE_REGION_MAP[code] || REGION.SOUTH;
};

// Tính phí vận chuyển dựa trên cân nặng (theo bảng giá thực tế)
// weightGrams: cân nặng gram, baseFee: phí 1kg đầu, feePer500g: phí mỗi 0.5kg thêm
const calculateFeeByWeight = (baseFee, feePer500g, weightGrams) => {
    if (weightGrams <= 1000) {
        return Math.round(baseFee);
    }
    // Mỗi 0.5kg (500g) tính thêm phí
    const additional500gBlocks = Math.ceil((weightGrams - 1000) / 500);
    const weightFee = baseFee + (feePer500g * additional500gBlocks);
    return Math.round(weightFee);
};

// Base fees by province/region (fixed shipping fee - fallback khi không có ShippingRate)
const SHIPPING_FEES = {
    // TP HCM và vùng lân cận (miền Nam)
    79: 16500,  // TP HCM
    74: 20000,  // Long An
    75: 20000,  // Đồng Nai
    80: 20000,  // Bình Dương
    83: 25000,  // Tây Ninh
    84: 25000,  // Tiền Giang
    82: 25000,  // Bà Rịa Vũng Tàu
    60: 30000,  // Bạc Liêu
    64: 30000,  // Trà Vinh
    86: 30000,  // Sóc Trăng
    71: 22000,  // Hưng Yên
    52: 28000,  // Cần Thơ
    51: 30000,  // Vĩnh Long
    // Hà Nội và vùng lân cận (miền Bắc)
    1: 22000,   // Hà Nội
    15: 28000,  // Vĩnh Phúc
    16: 28000,  // Bắc Ninh
    17: 32000,  // Yên Bái
    18: 32000,  // Phú Thọ
    19: 28000,  // Thái Bình
    20: 32000,  // Thái Nguyên
    23: 28000,  // Nam Định
    24: 38000,  // Lạng Sơn
    26: 28000,  // Hải Dương
    31: 28000,  // Hải Phòng
    33: 45000,  // Cao Bằng
    36: 45000,  // Bắc Kạn
    66: 40000,  // Hà Giang
    67: 30000,  // Hà Nam
    45: 35000,  // Quảng Ninh
    10: 38000,  // Lâm Đồng
    11: 50000,  // Lai Châu
    13: 50000,  // Sơn La
    14: 45000,  // Tuyên Quang
    25: 45000,  // Điện Biên
    29: 45000,  // Đắk Lắk
    30: 45000,  // Đắk Nông
    // Miền Trung
    92: 25000,  // Đà Nẵng
    38: 35000,  // Thanh Hóa
    39: 32000,  // Thừa Thiên Huế
    40: 38000,  // Quảng Bình
    42: 32000,  // Quảng Ngãi
    43: 32000,  // Quảng Nam
    44: 35000,  // Khánh Hòa
    46: 38000,  // Quảng Trị
    56: 35000,  // Bình Định
    62: 45000,  // Gia Lai
    58: 35000,  // Phú Yên
    68: 38000,  // Hà Tĩnh
    // Default cho các tỉnh không có trong danh sách
    default: 30000
};

const getShippingFee = (provinceCode) => {
    return SHIPPING_FEES[provinceCode] || SHIPPING_FEES.default;
};
