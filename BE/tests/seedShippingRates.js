/* ============================================================
   Seed ShippingRates + Provinces cho Furni.
   Tạo phí vận chuyển theo vùng + hiển thị 34 tỉnh.

   Chạy:  cd BE && node tests/seedShippingRates.js
   ============================================================ */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { ShippingRate, REGION, SERVICE_TYPE, PROVIDER_CODE } = require('../src/models/shippingRate');
const { PROVINCES, PROVINCE_CODE_TO_NAME, PROVINCE_REGION_MAP } = require('../src/config/provinces');

// Default rates — J&T, GHTK, Viettel Post (thực tế 2026)
const DEFAULT_RATES = [
    // J&T Express
    { provider: PROVIDER_CODE.JT,     serviceType: SERVICE_TYPE.ECONOMY, region: REGION.SOUTH,   baseFee: 18000, feePer500g: 2500, estimatedDays: { min: 2, max: 4 } },
    { provider: PROVIDER_CODE.JT,     serviceType: SERVICE_TYPE.EXPRESS, region: REGION.SOUTH,   baseFee: 22000, feePer500g: 4000, estimatedDays: { min: 1, max: 2 } },
    { provider: PROVIDER_CODE.JT,     serviceType: SERVICE_TYPE.ECONOMY, region: REGION.CENTRAL, baseFee: 20700, feePer500g: 4000, estimatedDays: { min: 3, max: 5 } },
    { provider: PROVIDER_CODE.JT,     serviceType: SERVICE_TYPE.EXPRESS, region: REGION.CENTRAL, baseFee: 31500, feePer500g: 7000, estimatedDays: { min: 2, max: 3 } },
    { provider: PROVIDER_CODE.JT,     serviceType: SERVICE_TYPE.ECONOMY, region: REGION.NORTH,   baseFee: 22500, feePer500g: 5000, estimatedDays: { min: 4, max: 6 } },
    { provider: PROVIDER_CODE.JT,     serviceType: SERVICE_TYPE.EXPRESS, region: REGION.NORTH,   baseFee: 35800, feePer500g: 6000, estimatedDays: { min: 2, max: 4 } },

    // GHTK
    { provider: PROVIDER_CODE.GHTK,   serviceType: SERVICE_TYPE.ECONOMY, region: REGION.SOUTH,   baseFee: 16500, feePer500g: 2500, estimatedDays: { min: 2, max: 3 } },
    { provider: PROVIDER_CODE.GHTK,   serviceType: SERVICE_TYPE.EXPRESS, region: REGION.SOUTH,   baseFee: 21000, feePer500g: 3500, estimatedDays: { min: 1, max: 2 } },
    { provider: PROVIDER_CODE.GHTK,   serviceType: SERVICE_TYPE.ECONOMY, region: REGION.CENTRAL, baseFee: 25000, feePer500g: 3000, estimatedDays: { min: 3, max: 4 } },
    { provider: PROVIDER_CODE.GHTK,   serviceType: SERVICE_TYPE.EXPRESS, region: REGION.CENTRAL, baseFee: 32000, feePer500g: 6000, estimatedDays: { min: 2, max: 3 } },
    { provider: PROVIDER_CODE.GHTK,   serviceType: SERVICE_TYPE.ECONOMY, region: REGION.NORTH,   baseFee: 27000, feePer500g: 3500, estimatedDays: { min: 3, max: 5 } },
    { provider: PROVIDER_CODE.GHTK,   serviceType: SERVICE_TYPE.EXPRESS, region: REGION.NORTH,   baseFee: 37000, feePer500g: 7000, estimatedDays: { min: 2, max: 4 } },

    // Viettel Post
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.SOUTH,   baseFee: 16500, feePer500g: 2500, estimatedDays: { min: 2, max: 4 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.SOUTH,   baseFee: 21000, feePer500g: 4000, estimatedDays: { min: 1, max: 2 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.CENTRAL, baseFee: 28000, feePer500g: 3000, estimatedDays: { min: 3, max: 5 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.CENTRAL, baseFee: 35000, feePer500g: 6500, estimatedDays: { min: 2, max: 3 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.NORTH,   baseFee: 31000, feePer500g: 5000, estimatedDays: { min: 4, max: 6 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.NORTH,   baseFee: 42000, feePer500g: 8000, estimatedDays: { min: 2, max: 4 } },
];

const PROVIDER_LABELS = {
    [PROVIDER_CODE.JT]: 'J&T Express',
    [PROVIDER_CODE.GHTK]: 'Giao Hàng Tiết Kiệm',
    [PROVIDER_CODE.VIETTEL]: 'Viettel Post',
};

const REGION_LABELS = {
    [REGION.NORTH]: 'Miền Bắc',
    [REGION.CENTRAL]: 'Miền Trung',
    [REGION.SOUTH]: 'Miền Nam',
};

const seedShippingRates = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/furni-ecommerce');
        console.log('Connected to MongoDB\n');

        // ── 34 Tỉnh/Thành ──────────────────────────────
        console.log('=============================================');
        console.log('  34 ĐƠN VỊ HÀNH CHÍNH CẤP TỈNH (2025)');
        console.log('=============================================');
        for (const region of [REGION.NORTH, REGION.CENTRAL, REGION.SOUTH]) {
            const list = PROVINCES.filter(p => p.region === region).sort((a, b) => a.order - b.order);
            console.log(`\n📍 ${REGION_LABELS[region]} (${list.length}):`);
            list.forEach(p => console.log(`   ${String(p.code).padStart(2, '0')}  ${p.name}`));
        }
        console.log('');

        // ── Shipping Rates ──────────────────────────────
        await ShippingRate.deleteMany({});
        console.log('Cleared old ShippingRates');

        const created = await ShippingRate.create(DEFAULT_RATES);
        console.log(`\nCreated ${created.length} ShippingRates:\n`);

        for (const region of [REGION.SOUTH, REGION.NORTH, REGION.CENTRAL]) {
            const rates = created.filter(r => r.region === region);
            console.log(`📦 ${REGION_LABELS[region]}:`);
            for (const rate of rates) {
                console.log(`   ${PROVIDER_LABELS[rate.provider]} | ${rate.serviceType} | base: ${rate.baseFee.toLocaleString()}đ | +500g: ${rate.feePer500g.toLocaleString()}đ | ${rate.estimatedDays.min}-${rate.estimatedDays.max}d`);
            }
            console.log('');
        }

        // ── Province Region Map ─────────────────────────
        console.log('=============================================');
        console.log('  PROVINCE_REGION_MAP');
        console.log('  (dùng trong shippingController.js)');
        console.log('=============================================');
        console.log(JSON.stringify(PROVINCE_REGION_MAP, null, 2));

        console.log('\n=============================================');
        console.log('Seed completed!');
        console.log('=============================================\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        await mongoose.disconnect().catch(() => {});
        process.exit(1);
    }
};

seedShippingRates();
