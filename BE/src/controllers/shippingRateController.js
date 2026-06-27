const { ShippingRate, REGION, SERVICE_TYPE, PROVIDER_CODE } = require('../models/shippingRate');
const { getProvincesByRegion } = require('../config/provinces');

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

const PROVIDER_NAMES = {
    [PROVIDER_CODE.JT]: 'J&T Express',
    [PROVIDER_CODE.GHTK]: 'Giao Hàng Tiết Kiệm',
    [PROVIDER_CODE.VIETTEL]: 'Viettel Post',
};

const PROVIDER_LOGOS = {
    [PROVIDER_CODE.JT]: '/icons/jt.svg',
    [PROVIDER_CODE.GHTK]: '/icons/ghtk.svg',
    [PROVIDER_CODE.VIETTEL]: '/icons/viettel.svg',
};

const REGION_NAMES = {
    [REGION.NORTH]: 'Miền Bắc',
    [REGION.CENTRAL]: 'Miền Trung',
    [REGION.SOUTH]: 'Miền Nam',
};

const SERVICE_NAMES = {
    [SERVICE_TYPE.ECONOMY]: 'Tiết Kiệm',
    [SERVICE_TYPE.EXPRESS]: 'Nhanh',
};

// @desc    Get all shipping rates
// @route   GET /api/shipping-rates
// @access  Public
const getAllRates = async (req, res) => {
    try {
        const { provider, region, serviceType } = req.query;
        const filter = {};
        if (provider) filter.provider = provider;
        if (region) filter.region = region;
        if (serviceType) filter.serviceType = serviceType;

        const rates = await ShippingRate.find(filter).sort({ provider: 1, serviceType: 1, region: 1 });

        res.status(200).json({
            success: true,
            data: {
                rates,
                summary: {
                    total: rates.length,
                    providers: [...new Set(rates.map(r => r.provider))],
                    regions: [...new Set(rates.map(r => r.region))],
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy bảng giá', error: error.message });
    }
};

// @desc    Get rates grouped by provider and region
// @route   GET /api/shipping-rates/grouped
// @access  Public
const getGroupedRates = async (req, res) => {
    try {
        const rates = await ShippingRate.find({ isActive: true }).sort({ provider: 1, serviceType: 1, region: 1 });

        const grouped = {};
        for (const rate of rates) {
            if (!grouped[rate.provider]) {
                grouped[rate.provider] = {
                    provider: rate.provider,
                    name: PROVIDER_NAMES[rate.provider] || rate.provider,
                    logo: PROVIDER_LOGOS[rate.provider] || '',
                    regions: {},
                };
            }
            if (!grouped[rate.provider].regions[rate.region]) {
                grouped[rate.provider].regions[rate.region] = {
                    region: rate.region,
                    regionName: REGION_NAMES[rate.region] || rate.region,
                    services: [],
                };
            }
            grouped[rate.provider].regions[rate.region].services.push({
                serviceType: rate.serviceType,
                serviceName: SERVICE_NAMES[rate.serviceType] || rate.serviceType,
                baseFee: rate.baseFee,
                feePer500g: rate.feePer500g,
                estimatedDays: rate.estimatedDays,
                notes: rate.notes,
            });
        }

        res.status(200).json({ success: true, data: { grouped } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy bảng giá', error: error.message });
    }
};

// @desc    Update shipping rate
// @route   PUT /api/shipping-rates/:id
// @access  Private (Admin)
const updateRate = async (req, res) => {
    try {
        const { id } = req.params;
        const { baseFee, feePer500g, estimatedDays, isActive, notes } = req.body;

        const rate = await ShippingRate.findById(id);
        if (!rate) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bảng giá' });
        }

        if (baseFee !== undefined) rate.baseFee = baseFee;
        if (feePer500g !== undefined) rate.feePer500g = feePer500g;
        if (estimatedDays !== undefined) rate.estimatedDays = estimatedDays;
        if (isActive !== undefined) rate.isActive = isActive;
        if (notes !== undefined) rate.notes = notes;

        await rate.save();
        res.status(200).json({ success: true, message: 'Cập nhật bảng giá thành công', data: { rate } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật bảng giá', error: error.message });
    }
};

// @desc    Bulk update shipping rates
// @route   PUT /api/shipping-rates/bulk
// @access  Private (Admin)
const bulkUpdateRates = async (req, res) => {
    try {
        const { rates } = req.body;
        if (!Array.isArray(rates) || rates.length === 0) {
            return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }

        const results = { updated: 0, errors: [] };
        for (const rateData of rates) {
            try {
                const { provider, serviceType, region, baseFee, feePer500g, estimatedDays, isActive, notes } = rateData;
                const rate = await ShippingRate.findOne({ provider, serviceType, region });
                if (rate) {
                    if (baseFee !== undefined) rate.baseFee = baseFee;
                    if (feePer500g !== undefined) rate.feePer500g = feePer500g;
                    if (estimatedDays !== undefined) rate.estimatedDays = estimatedDays;
                    if (isActive !== undefined) rate.isActive = isActive;
                    if (notes !== undefined) rate.notes = notes;
                    await rate.save();
                    results.updated++;
                }
            } catch (err) {
                results.errors.push({ data: rateData, error: err.message });
            }
        }

        res.status(200).json({ success: true, message: `Đã cập nhật ${results.updated} bảng giá`, data: { results } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật bảng giá', error: error.message });
    }
};

// @desc    Seed default shipping rates
// @route   POST /api/shipping-rates/seed
// @access  Private (Admin)
const seedRates = async (req, res) => {
    try {
        const count = await ShippingRate.countDocuments();
        if (count > 0) {
            return res.status(400).json({ success: false, message: 'Bảng giá đã tồn tại. Vui lòng reset trước.' });
        }

        await ShippingRate.insertMany(DEFAULT_RATES);
        res.status(201).json({ success: true, message: `Đã tạo ${DEFAULT_RATES.length} bảng giá vận chuyển`, data: { count: DEFAULT_RATES.length } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi tạo bảng giá', error: error.message });
    }
};

// @desc    Reset to default rates
// @route   POST /api/shipping-rates/reset
// @access  Private (Admin)
const resetRates = async (req, res) => {
    try {
        await ShippingRate.deleteMany({});
        await ShippingRate.insertMany(DEFAULT_RATES);
        res.status(201).json({ success: true, message: `Đã reset về ${DEFAULT_RATES.length} bảng giá mặc định`, data: { count: DEFAULT_RATES.length } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi reset bảng giá', error: error.message });
    }
};

// @desc    Sync/adjust shipping rates
// @route   POST /api/shipping-rates/sync
// @access  Private (Admin)
const syncRates = async (req, res) => {
    try {
        const { adjustment = 0 } = req.body;
        const rates = await ShippingRate.find({});

        for (const rate of rates) {
            if (adjustment !== 0) {
                const multiplier = 1 + (adjustment / 100);
                rate.baseFee = Math.round(rate.baseFee * multiplier);
                rate.feePer500g = Math.round(rate.feePer500g * multiplier);
            }
            rate.lastSynced = new Date();
            await rate.save();
        }

        res.status(200).json({ success: true, message: `Đã cập nhật ${rates.length} bảng giá`, data: { count: rates.length, lastUpdated: new Date(), adjustment } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi đồng bộ bảng giá', error: error.message });
    }
};

module.exports = {
    getAllRates,
    getGroupedRates,
    updateRate,
    bulkUpdateRates,
    seedRates,
    resetRates,
    syncRates,
    DEFAULT_RATES,
};
