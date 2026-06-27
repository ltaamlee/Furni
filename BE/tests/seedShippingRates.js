/* ============================================================
   Seed ShippingRates cho dự án Furni.
   Tạo phí vận chuyển theo vùng (North/Central/South) cho từng provider.

   Chạy:  cd BE && node tests/seedShippingRates.js
   ============================================================ */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { ShippingRate, REGION, SERVICE_TYPE, PROVIDER_CODE } = require('../src/models/shippingRate');

// Shipping rates: baseFee (VNĐ) + feePer500g (VNĐ)
const RATES = [
    // Miền Nam - GHTK
    { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.SOUTH, baseFee: 16500, feePer500g: 2500, estimatedDays: { min: 2, max: 3 } },
    { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.SOUTH, baseFee: 21000, feePer500g: 3500, estimatedDays: { min: 1, max: 2 } },

    // Miền Nam - J&T
    { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.SOUTH, baseFee: 18000, feePer500g: 2500, estimatedDays: { min: 2, max: 4 } },
    { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.SOUTH, baseFee: 22000, feePer500g: 4000, estimatedDays: { min: 1, max: 2 } },

    // Miền Bắc - GHTK
    { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.NORTH, baseFee: 22000, feePer500g: 3000, estimatedDays: { min: 2, max: 4 } },
    { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.NORTH, baseFee: 28000, feePer500g: 4000, estimatedDays: { min: 1, max: 2 } },

    // Miền Bắc - J&T
    { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.NORTH, baseFee: 20000, feePer500g: 3000, estimatedDays: { min: 2, max: 4 } },
    { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.NORTH, baseFee: 25000, feePer500g: 4500, estimatedDays: { min: 1, max: 2 } },

    // Miền Trung - GHTK
    { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.CENTRAL, baseFee: 20000, feePer500g: 3000, estimatedDays: { min: 2, max: 4 } },
    { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.CENTRAL, baseFee: 25000, feePer500g: 4000, estimatedDays: { min: 1, max: 3 } },

    // Miền Trung - J&T
    { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.CENTRAL, baseFee: 19000, feePer500g: 3000, estimatedDays: { min: 2, max: 4 } },
    { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.CENTRAL, baseFee: 24000, feePer500g: 4000, estimatedDays: { min: 1, max: 3 } },

    // Viettel Post - cho tất cả vùng
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.SOUTH, baseFee: 15000, feePer500g: 2000, estimatedDays: { min: 3, max: 5 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.SOUTH, baseFee: 20000, feePer500g: 3000, estimatedDays: { min: 1, max: 2 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.NORTH, baseFee: 18000, feePer500g: 2500, estimatedDays: { min: 3, max: 5 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.NORTH, baseFee: 23000, feePer500g: 3500, estimatedDays: { min: 1, max: 2 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.CENTRAL, baseFee: 17000, feePer500g: 2500, estimatedDays: { min: 3, max: 5 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.CENTRAL, baseFee: 22000, feePer500g: 3500, estimatedDays: { min: 1, max: 3 } },
];

const seedShippingRates = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/furni-ecommerce');
        console.log('Connected to MongoDB\n');

        // Xoá dữ liệu cũ
        await ShippingRate.deleteMany({});
        console.log('Cleared old ShippingRates');

        // Tạo dữ liệu mới
        const created = await ShippingRate.create(RATES);
        console.log(`Created ${created.length} ShippingRates:\n`);

        // Hiển thị theo vùng
        const byRegion = {
            south: created.filter(r => r.region === REGION.SOUTH),
            north: created.filter(r => r.region === REGION.NORTH),
            central: created.filter(r => r.region === REGION.CENTRAL),
        };

        for (const [region, rates] of Object.entries(byRegion)) {
            console.log(`📍 ${region.toUpperCase()}:`);
            for (const rate of rates) {
                console.log(`   ${rate.provider} | ${rate.serviceType} | base: ${rate.baseFee.toLocaleString()}đ | +500g: ${rate.feePer500g.toLocaleString()}đ`);
            }
            console.log('');
        }

        console.log('=============================================');
        console.log('ShippingRates seed completed!');
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
