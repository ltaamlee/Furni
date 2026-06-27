/* ============================================================
   Update Shop provinceCode và isUrbanZone cho dự án Furni.
   Cập nhật shop từ địa chỉ text → provinceCode + isUrbanZone

   Chạy:  cd BE && node tests/updateShopShipping.js
   ============================================================ */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Shop = require('../src/models/shop');

// Mapping tỉnh/thành phố → provinceCode (theo open-api.vn)
const ADDRESS_PROVINCE_MAP = {
    'tp. hồ chí minh': { code: '79', name: 'TP. Hồ Chí Minh', urban: true },
    'hồ chí minh': { code: '79', name: 'TP. Hồ Chí Minh', urban: true },
    'hcm': { code: '79', name: 'TP. Hồ Chí Minh', urban: true },
    'tp hcm': { code: '79', name: 'TP. Hồ Chí Minh', urban: true },
    'hà nội': { code: '01', name: 'TP. Hà Nội', urban: true },
    'đà nẵng': { code: '48', name: 'TP. Đà Nẵng', urban: true },
    'cần thơ': { code: '62', name: 'TP. Cần Thơ', urban: true },
    'hải phòng': { code: '31', name: 'TP. Hải Phòng', urban: true },
    'quảng ninh': { code: '22', name: 'Tỉnh Quảng Ninh', urban: false },
    'bình dương': { code: '74', name: 'Tỉnh Bình Dương', urban: false },
    'đồng nai': { code: '75', name: 'Tỉnh Đồng Nai', urban: false },
    'bà rịa vũng tàu': { code: '77', name: 'Tỉnh Bà Rịa - Vũng Tàu', urban: false },
    'long an': { code: '62', name: 'Tỉnh Long An', urban: false },
    // Thêm các tỉnh khác nếu cần
};

// Quận nội thành TP.HCM (urban zone - phí giảm 30%)
const HCM_URBAN_DISTRICTS = [
    'quận 1', 'quận 2', 'quận 3', 'quận 4', 'quận 5', 'quận 6', 'quận 7', 'quận 8',
    'quận 9', 'quận 10', 'quận 11', 'quận 12',
    'phú nhuận', 'bình thạnh', 'gò vấp', 'tân bình', 'tân phú',
    'thủ đức', 'bình chánh', 'nhà bè', 'củ chi', 'hóc môn'
];

function parseProvinceFromAddress(address) {
    if (!address) return null;
    const lower = address.toLowerCase();

    for (const [key, value] of Object.entries(ADDRESS_PROVINCE_MAP)) {
        if (lower.includes(key)) {
            // Kiểm tra xem có phải quận nội thành không
            let isUrban = value.urban;
            for (const district of HCM_URBAN_DISTRICTS) {
                if (lower.includes(district)) {
                    isUrban = true;
                    break;
                }
            }
            return { ...value, isUrban };
        }
    }
    return null;
}

const updateShopShipping = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/furni-ecommerce');
        console.log('Connected to MongoDB\n');

        // Lấy tất cả shops
        const shops = await Shop.find({});
        console.log(`Found ${shops.length} shops\n`);

        for (const shop of shops) {
            console.log(`📦 Shop: ${shop.name}`);
            console.log(`   Address: ${shop.address || 'N/A'}`);

            const parsed = parseProvinceFromAddress(shop.address);

            if (parsed) {
                console.log(`   → Province: ${parsed.name} (${parsed.code})`);
                console.log(`   → Urban Zone: ${parsed.isUrban ? 'YES (nội thành)' : 'NO (ngoại thành)'}`);

                // Update shop
                shop.provinceCode = parsed.code;
                shop.provinceName = parsed.name;
                shop.shippingConfig = shop.shippingConfig || {};
                shop.shippingConfig.isUrbanZone = parsed.isUrban;

                await shop.save();
                console.log(`   ✅ Updated!\n`);
            } else {
                console.log(`   ⚠️ Không parse được province từ address`);
                console.log(`   → Đặt mặc định: TP.HCM, urban=true`);
                
                shop.provinceCode = '79';
                shop.provinceName = 'TP. Hồ Chí Minh';
                shop.shippingConfig = shop.shippingConfig || {};
                shop.shippingConfig.isUrbanZone = true;
                
                await shop.save();
                console.log(`   ✅ Updated (default)!`);
                
                // Gợi ý user cập nhật thủ công
                console.log(`   💡 NÊN: Cập nhật address trong Admin Panel để có thông tin chính xác\n`);
            }
        }

        console.log('=============================================');
        console.log('Shop shipping config update completed!');
        console.log('=============================================\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Update error:', error);
        await mongoose.disconnect().catch(() => {});
        process.exit(1);
    }
};

updateShopShipping();
