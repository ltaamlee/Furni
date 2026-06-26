/**
 * Script để seed shipping rates vào database
 * Chạy: node seedShippingRates.js
 */

const mongoose = require('mongoose');

// Kết nối MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sora';

const REGION = {
    NORTH: 'north',
    CENTRAL: 'central',
    SOUTH: 'south'
};

const SERVICE_TYPE = {
    ECONOMY: 'economy',
    EXPRESS: 'express'
};

const PROVIDER_CODE = {
    JT: 'jt',
    GHTK: 'ghtk',
    VIETTEL: 'viettel'
};

const shippingRateSchema = new mongoose.Schema({
    provider: { type: String, required: true },
    serviceType: { type: String, required: true },
    region: { type: String, required: true },
    baseFee: { type: Number, required: true },
    feePer500g: { type: Number, default: 0 },
    estimatedDays: {
        min: { type: Number, default: 2 },
        max: { type: Number, default: 5 }
    },
    isActive: { type: Boolean, default: true }
});

const ShippingRate = mongoose.model('ShippingRate', shippingRateSchema);

const DEFAULT_RATES = [
    // J&T Express — Economy (Tiết Kiệm)
    { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.SOUTH, baseFee: 18000, feePer500g: 2500, estimatedDays: { min: 2, max: 4 } },
    { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.CENTRAL, baseFee: 20700, feePer500g: 4000, estimatedDays: { min: 3, max: 5 } },
    { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.NORTH, baseFee: 22500, feePer500g: 5000, estimatedDays: { min: 4, max: 6 } },
    // J&T Express — Express (Nhanh)
    { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.SOUTH, baseFee: 22000, feePer500g: 4000, estimatedDays: { min: 1, max: 2 } },
    { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.CENTRAL, baseFee: 31500, feePer500g: 7000, estimatedDays: { min: 2, max: 3 } },
    { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.NORTH, baseFee: 35800, feePer500g: 6000, estimatedDays: { min: 2, max: 4 } },

    // GHTK Express — Economy (Tiết Kiệm)
    { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.SOUTH, baseFee: 16500, feePer500g: 2500, estimatedDays: { min: 2, max: 3 } },
    { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.CENTRAL, baseFee: 25000, feePer500g: 3000, estimatedDays: { min: 3, max: 4 } },
    { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.NORTH, baseFee: 27000, feePer500g: 3500, estimatedDays: { min: 3, max: 5 } },
    // GHTK Express — Express (Nhanh)
    { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.SOUTH, baseFee: 21000, feePer500g: 3500, estimatedDays: { min: 1, max: 2 } },
    { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.CENTRAL, baseFee: 32000, feePer500g: 6000, estimatedDays: { min: 2, max: 3 } },
    { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.NORTH, baseFee: 37000, feePer500g: 7000, estimatedDays: { min: 2, max: 4 } },

    // Viettel Post — Economy (Tiết Kiệm)
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.SOUTH, baseFee: 16500, feePer500g: 2500, estimatedDays: { min: 2, max: 4 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.CENTRAL, baseFee: 28000, feePer500g: 3000, estimatedDays: { min: 3, max: 5 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.NORTH, baseFee: 31000, feePer500g: 5000, estimatedDays: { min: 4, max: 6 } },
    // Viettel Post — Express (Nhanh)
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.SOUTH, baseFee: 21000, feePer500g: 4000, estimatedDays: { min: 1, max: 2 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.CENTRAL, baseFee: 35000, feePer500g: 6500, estimatedDays: { min: 2, max: 3 } },
    { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.NORTH, baseFee: 42000, feePer500g: 8000, estimatedDays: { min: 2, max: 4 } },
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✓ Kết nối MongoDB thành công');

        // Xóa dữ liệu cũ
        await ShippingRate.deleteMany({});
        console.log('✓ Đã xóa dữ liệu cũ');

        // Insert dữ liệu mới
        const result = await ShippingRate.insertMany(DEFAULT_RATES);
        console.log(`✓ Đã seed ${result.length} bảng giá vận chuyển`);

        // Hiển thị danh sách
        const allRates = await ShippingRate.find({}).sort({ provider: 1, serviceType: 1, region: 1 });
        console.log('\n📦 Dữ liệu đã seed:');
        allRates.forEach(r => {
            console.log(`  - ${r.provider} | ${r.serviceType} | ${r.region} | ${r.baseFee.toLocaleString()}đ`);
        });

        await mongoose.disconnect();
        console.log('\n✓ Hoàn tất!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

seed();
