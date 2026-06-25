const { ShippingOrder, SHIPPING_STATUS } = require('../models/shipping');
const { ShippingRate, REGION, SERVICE_TYPE, PROVIDER_CODE } = require('../models/shippingRate');
const Order = require('../models/Order');
const Shop = require('../models/Shop');
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

// Province code -> Region mapping
const PROVINCE_REGION_MAP = {
    79: REGION.SOUTH, 74: REGION.SOUTH, 75: REGION.SOUTH,
    80: REGION.SOUTH, 83: REGION.SOUTH, 84: REGION.SOUTH, 82: REGION.SOUTH,
    60: REGION.SOUTH, 64: REGION.SOUTH, 86: REGION.SOUTH, 71: REGION.SOUTH,
    52: REGION.SOUTH, 51: REGION.SOUTH,
    92: REGION.CENTRAL, 38: REGION.CENTRAL, 39: REGION.CENTRAL, 40: REGION.CENTRAL,
    42: REGION.CENTRAL, 43: REGION.CENTRAL, 44: REGION.CENTRAL, 46: REGION.CENTRAL,
    56: REGION.CENTRAL, 62: REGION.CENTRAL, 58: REGION.CENTRAL, 68: REGION.CENTRAL,
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

// Base fees by province code (VNĐ)
const SHIPPING_FEES = {
    79: 16500, 74: 20000, 75: 20000, 80: 20000, 83: 25000, 84: 25000, 82: 25000,
    60: 30000, 64: 30000, 86: 30000, 71: 22000, 52: 28000, 51: 30000,
    1: 22000, 15: 28000, 16: 28000, 17: 32000, 18: 32000, 19: 28000, 20: 32000,
    23: 28000, 24: 38000, 26: 28000, 31: 28000, 33: 45000, 36: 45000, 66: 40000,
    67: 30000, 45: 35000, 10: 38000, 11: 50000, 13: 50000, 14: 45000, 25: 45000,
    29: 45000, 30: 45000,
    92: 25000, 38: 35000, 39: 32000, 40: 38000, 42: 32000, 43: 32000, 44: 35000,
    46: 38000, 56: 35000, 62: 45000, 58: 35000, 68: 38000,
    default: 30000
};

const getShippingFee = (provinceCode) => {
    return SHIPPING_FEES[provinceCode] || SHIPPING_FEES.default;
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
        const region = getRegionForProvince(code);

        // Try cached rates first
        const rates = await getCachedRates();
        let selectedRate = null;

        if (provider && serviceType) {
            selectedRate = rates.find(r =>
                r.provider === provider &&
                r.serviceType === serviceType &&
                r.region === region
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
            fee = getShippingFee(code);
        }

        res.status(200).json({
            success: true,
            data: {
                fee,
                region,
                provinceCode: code,
                weight: Number(weight),
                provider: selectedRate?.provider || 'GHN',
                serviceType: selectedRate?.serviceType || 'express',
                estimatedDays: selectedRate?.estimatedDays || { min: 2, max: 5 },
                isFree: false
            }
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
        const { provinceCode, weight = 1000 } = req.query;

        if (!provinceCode) {
            return res.status(400).json({ success: false, message: 'Thiếu provinceCode!' });
        }

        const code = Number(provinceCode);
        const region = getRegionForProvince(code);
        const rates = await getCachedRates();

        const results = rates
            .filter(r => r.region === region)
            .map(r => {
                const additional500gBlocks = Math.max(0, Math.ceil((weight - 1000) / 500));
                const fee = Math.round(r.baseFee + r.feePer500g * additional500gBlocks);
                return {
                    provider: r.provider,
                    serviceType: r.serviceType,
                    fee,
                    estimatedDays: r.estimatedDays
                };
            });

        // Fallback if no rates match region
        if (results.length === 0) {
            results.push({
                provider: 'GHN',
                serviceType: 'express',
                fee: getShippingFee(code),
                estimatedDays: { min: 2, max: 5 }
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
            providerCode: providerCode || 'GHN',
            shippingAddress: shippingAddress || {
                fullName: order.shippingAddress?.fullName,
                phone: order.shippingAddress?.phone,
                address: order.shippingAddress?.address,
                city: order.shippingAddress?.city
            },
            weight: weight || 1000,
            dimensions: dimensions || { length: 30, width: 30, height: 30 },
            shippingFee: shippingFee || 0,
            codAmount: order.paymentMethod === 'COD' ? order.totalPrice : 0
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
                providerCode: shippingOrder.providerCode
            }
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

        // If delivered, update order status
        if (status === SHIPPING_STATUS.DELIVERED) {
            await Order.findByIdAndUpdate(shippingOrder.order, { status: 'delivered' });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái thành công!',
            data: { shippingOrder }
        });
    } catch (error) {
        console.error('Update shipping status error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái!' });
    }
};

module.exports = {
    calculateFee,
    calculateAllFees,
    createShippingOrder,
    getShippingByOrderId,
    trackShipment,
    updateShippingStatus
};
