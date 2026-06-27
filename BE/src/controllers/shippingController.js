const { ShippingOrder, SHIPPING_STATUS } = require('../models/shipping');
const { ShippingRate, REGION, SERVICE_TYPE, PROVIDER_CODE } = require('../models/shippingRate');
const Order = require('../models/Order');
const { PROVINCE_REGION_MAP, getRegion } = require('../config/provinces');
const mongoose = require('mongoose');

// In-memory cache for shipping rates
let ratesCache = null;
let ratesCacheTime = 0;
const RATES_CACHE_TTL = 60 * 1000;

const getCachedRates = async () => {
    const now = Date.now();
    if (ratesCache && (now - ratesCacheTime) < RATES_CACHE_TTL) {
        return ratesCache;
    }
    ratesCache = await ShippingRate.find({ isActive: true }).sort({ provider: 1, serviceType: 1 });
    ratesCacheTime = now;
    return ratesCache;
};

const PROVIDER_LABELS = {
    jt: 'J&T Express',
    ghtk: 'Giao Hàng Tiết Kiệm',
    viettel: 'Viettel Post',
    ghn: 'Giao Hàng Nhanh',
};

// ──────────────────────────────────────────────────────────
// @route   GET /api/shipping/calculate
// @access  Public
// ──────────────────────────────────────────────────────────
const calculateFee = async (req, res) => {
    try {
        const { provinceCode, weight = 1000, provider, serviceType } = req.query;

        if (!provinceCode) {
            return res.status(400).json({ success: false, message: 'Thiếu provinceCode!' });
        }

        const code = Number(provinceCode);
        const region = getRegion(code);

        const rates = await getCachedRates();
        let selectedRate = null;

        if (provider && serviceType) {
            selectedRate = rates.find(r =>
                r.provider === provider && r.serviceType === serviceType && r.region === region,
            );
        }

        if (!selectedRate) {
            selectedRate = rates.find(r => r.region === region);
        }

        let fee;
        if (selectedRate) {
            const additional500gBlocks = Math.max(0, Math.ceil((weight - 1000) / 500));
            fee = Math.round(selectedRate.baseFee + selectedRate.feePer500g * additional500gBlocks);
        } else {
            fee = 30000;
        }

        res.status(200).json({
            success: true,
            data: {
                fee,
                region,
                provinceCode: code,
                weight: Number(weight),
                provider: selectedRate?.provider || 'ghtk',
                serviceType: selectedRate?.serviceType || 'economy',
                estimatedDays: selectedRate?.estimatedDays || { min: 2, max: 5 },
                isFree: false,
            },
        });
    } catch (error) {
        console.error('Calculate fee error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tính phí vận chuyển!' });
    }
};

// ──────────────────────────────────────────────────────────
// @route   GET /api/shipping/calculate-all
// @access  Public
// ──────────────────────────────────────────────────────────
const calculateAllFees = async (req, res) => {
    try {
        const { provinceCode, weight = 1000, enabledProviders, shopProvinceCode, isUrbanZone } = req.query;

        if (!provinceCode) {
            return res.status(400).json({ success: false, message: 'Thiếu provinceCode!' });
        }

        const code = Number(provinceCode);
        const customerRegion = getRegion(code);
        const shopCode = shopProvinceCode ? Number(shopProvinceCode) : code;
        const shopRegion = getRegion(shopCode);
        const rates = await getCachedRates();

        let enabled = [];
        if (enabledProviders) {
            enabled = enabledProviders.split(',').map(p => p.trim()).filter(Boolean).map(p => p.toLowerCase());
        }

        const regionRates = rates.filter(r => r.region === shopRegion)
            .filter(r => enabled.length === 0 || enabled.includes(r.provider.toLowerCase()));

        const isSameProvince = shopCode === Number(provinceCode);
        const isSameRegion = shopRegion === customerRegion;
        let distanceMultiplier = isSameRegion
            ? (isSameProvince ? (isUrbanZone ? 0.7 : 1.0) : 1.0)
            : 1.3;

        const results = regionRates.map(r => {
            const additional500gBlocks = Math.max(0, Math.ceil((Number(weight) - 1000) / 500));
            const rawFee = r.baseFee + r.feePer500g * additional500gBlocks;
            const fee = Math.round(rawFee * distanceMultiplier);
            return {
                provider: r.provider,
                providerName: PROVIDER_LABELS[r.provider] || r.provider,
                serviceType: r.serviceType,
                tier: r.serviceType,
                fee,
                baseFee: r.baseFee,
                estimatedDays: r.estimatedDays,
                isFree: false,
            };
        });

        if (results.length === 0) {
            results.push({
                provider: 'ghtk',
                providerName: PROVIDER_LABELS.ghtk,
                serviceType: 'express',
                tier: 'express',
                fee: 30000,
                estimatedDays: { min: 2, max: 4 },
                isFree: false,
            });
        }

        res.status(200).json({ success: true, data: { rates: results } });
    } catch (error) {
        console.error('Calculate all fees error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tính phí vận chuyển!' });
    }
};

// ──────────────────────────────────────────────────────────
// @route   POST /api/shipping/orders
// @access  Private
// ──────────────────────────────────────────────────────────
const createShippingOrder = async (req, res) => {
    try {
        const { orderId, shippingAddress, weight, dimensions, shippingFee, providerCode } = req.body;
        const userId = req.user._id;

        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Thiếu orderId!' });
        }
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'orderId không hợp lệ!' });
        }

        const order = await Order.findOne({ _id: orderId, user: userId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });
        }

        const existing = await ShippingOrder.findOne({ order: orderId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Đơn vận chuyển đã tồn tại cho đơn hàng này!' });
        }

        const shippingOrder = await ShippingOrder.create({
            order: orderId,
            providerCode: providerCode || 'ghtk',
            shippingAddress: shippingAddress || {
                fullName: order.shippingAddress?.fullName,
                phone: order.shippingAddress?.phone,
                address: order.shippingAddress?.address,
                city: order.shippingAddress?.city,
            },
            weight: weight || 1000,
            dimensions: dimensions || { length: 30, width: 30, height: 30 },
            shippingFee: shippingFee || 0,
            codAmount: order.paymentMethod === 'COD' ? order.totalPrice : 0,
        });

        res.status(201).json({ success: true, data: { shippingOrder } });
    } catch (error) {
        console.error('Create shipping order error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tạo đơn vận chuyển!' });
    }
};

// ──────────────────────────────────────────────────────────
// @route   GET /api/shipping/orders/:orderId
// @access  Private
// ──────────────────────────────────────────────────────────
const getShippingByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'orderId không hợp lệ!' });
        }

        const order = await Order.findOne({ _id: orderId, user: userId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });
        }

        const shippingOrder = await ShippingOrder.findOne({ order: orderId });
        if (!shippingOrder) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn vận chuyển!' });
        }

        res.status(200).json({ success: true, data: { shippingOrder } });
    } catch (error) {
        console.error('Get shipping order error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy đơn vận chuyển!' });
    }
};

// ──────────────────────────────────────────────────────────
// @route   GET /api/shipping/track/:trackingNumber
// @access  Public
// ──────────────────────────────────────────────────────────
const trackShipment = async (req, res) => {
    try {
        const { trackingNumber } = req.params;

        const shippingOrder = await ShippingOrder.findOne({ trackingNumber });
        if (!shippingOrder) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy vận đơn!' });
        }

        res.status(200).json({
            success: true,
            data: {
                trackingNumber,
                status: shippingOrder.status,
                statusHistory: shippingOrder.statusHistory,
                estimatedDelivery: shippingOrder.estimatedDelivery,
                providerCode: shippingOrder.providerCode,
            },
        });
    } catch (error) {
        console.error('Track shipment error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi theo dõi vận đơn!' });
    }
};

// ──────────────────────────────────────────────────────────
// @route   PUT /api/shipping/orders/:id/status
// @access  Private/Admin/Vendor
// ──────────────────────────────────────────────────────────
const updateShippingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID không hợp lệ!' });
        }

        if (!status || !Object.values(SHIPPING_STATUS).includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ!' });
        }

        const shippingOrder = await ShippingOrder.findById(id);
        if (!shippingOrder) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn vận chuyển!' });
        }

        shippingOrder.status = status;
        if (note) shippingOrder.lastAttemptNote = note;
        if (status === SHIPPING_STATUS.FAILED) {
            shippingOrder.attempts += 1;
        }
        await shippingOrder.save();

        if (status === SHIPPING_STATUS.DELIVERED) {
            await Order.findByIdAndUpdate(shippingOrder.order, { status: 'delivered' });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái thành công!',
            data: { shippingOrder },
        });
    } catch (error) {
        console.error('Update shipping status error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái!' });
    }
};

// ──────────────────────────────────────────────────────────
// @route   GET /api/shipping/calculate-tiers
// @access  Public
// ──────────────────────────────────────────────────────────
const calculateTiers = async (req, res) => {
    try {
        const {
            provinceCode,
            weight = 1000,
            provider,
            enabledProviders,
            shopProvinceCode,
            isUrbanZone = false,
        } = req.query;

        if (!provinceCode) {
            return res.status(400).json({ success: false, message: 'Thiếu provinceCode!' });
        }

        const customerCode = Number(provinceCode);
        const customerRegion = getRegion(customerCode);
        const shopCode = shopProvinceCode ? Number(shopProvinceCode) : customerCode;
        const shopRegion = getRegion(shopCode);
        const w = Number(weight);
        const additional500gBlocks = Math.max(0, Math.ceil((w - 1000) / 500));
        const rates = await getCachedRates();

        let enabled = [];
        if (provider) {
            enabled = [provider.toLowerCase()];
        } else if (enabledProviders) {
            enabled = enabledProviders.split(',').map(p => p.trim()).filter(Boolean).map(p => p.toLowerCase());
        }

        const regionRates = rates.filter(r => r.region === shopRegion)
            .filter(r => enabled.length === 0 || enabled.includes(r.provider.toLowerCase()));

        const isSameProvince = shopCode === customerCode;
        const isSameRegion = shopRegion === customerRegion;

        let distanceMultiplier = 1.0;
        let distanceLabel = 'ngoại thành';

        if (isSameProvince) {
            distanceMultiplier = isUrbanZone ? 0.7 : 1.0;
            distanceLabel = isUrbanZone ? 'nội thành' : 'ngoại thành';
        } else if (!isSameRegion) {
            distanceMultiplier = 1.3;
            distanceLabel = 'khác vùng';
        } else {
            distanceLabel = 'cùng vùng';
        }

        const tierResults = ['economy', 'express'].map(tier => {
            const tierRates = regionRates.filter(r => r.serviceType === tier);
            if (!tierRates.length) return null;

            const cheapest = tierRates.reduce((best, r) => {
                const fee = Math.round((r.baseFee + r.feePer500g * additional500gBlocks) * distanceMultiplier);
                const bestFee = Math.round((best.baseFee + best.feePer500g * additional500gBlocks) * distanceMultiplier);
                return fee < bestFee ? r : best;
            });

            const baseFee = cheapest.baseFee + cheapest.feePer500g * additional500gBlocks;
            const fee = Math.round(baseFee * distanceMultiplier);

            return {
                tier,
                provider: cheapest.provider,
                providerName: PROVIDER_LABELS[cheapest.provider] || cheapest.provider,
                fee,
                baseFee: Math.round(baseFee),
                estimatedDays: cheapest.estimatedDays,
                isFree: false,
                distanceLabel,
            };
        }).filter(Boolean);

        if (tierResults.length === 0) {
            const fallback = enabled.length > 0 ? enabled[0] : 'ghtk';
            tierResults.push(
                {
                    tier: 'economy',
                    provider: fallback,
                    providerName: PROVIDER_LABELS[fallback] || fallback,
                    fee: Math.round(18000 * 0.85 * distanceMultiplier),
                    baseFee: Math.round(18000 * 0.85),
                    estimatedDays: { min: 4, max: 7 },
                    isFree: false,
                    distanceLabel,
                },
                {
                    tier: 'express',
                    provider: fallback,
                    providerName: PROVIDER_LABELS[fallback] || fallback,
                    fee: Math.round(22000 * distanceMultiplier),
                    baseFee: 22000,
                    estimatedDays: { min: 1, max: 3 },
                    isFree: false,
                    distanceLabel,
                },
            );
        }

        res.status(200).json({
            success: true,
            data: {
                provinceCode: customerCode,
                shopProvinceCode: shopCode,
                customerRegion,
                shopRegion,
                distanceLabel,
                weight: w,
                tiers: tierResults,
            },
        });
    } catch (error) {
        console.error('Calculate tiers error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tính phí vận chuyển!' });
    }
};

module.exports = {
    calculateFee,
    calculateAllFees,
    calculateTiers,
    createShippingOrder,
    getShippingByOrderId,
    trackShipment,
    updateShippingStatus,
};
