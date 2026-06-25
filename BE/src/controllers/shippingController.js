const { ShippingProvider, ShippingOrder, SHIPPING_STATUS } = require('../models/shipping');
const Order = require('../models/Order');
const { GHNService, PROVINCE_TO_GHN_DISTRICT, calculateFallbackFee, getShopShippingConfig, getGhnDistrictId } = require('../services/shippingService');
const { protect, authorize } = require('../middleware/authMiddleware');

// @desc    Get all shipping providers
// @route   GET /api/shipping/providers
// @access  Public
const getProviders = async (req, res) => {
    try {
        const providers = await ShippingProvider.find({ isActive: true });
        res.status(200).json({ success: true, data: { providers } });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy đơn vị vận chuyển',
            error: error.message
        });
    }
};

// @desc    Calculate shipping fee for a specific provider (GHN only in this version)
// @route   GET /api/shipping/calculate
// @access  Public
const calculateFee = async (req, res) => {
    try {
        const { provinceCode, districtCode, orderTotal } = req.query;

        if (!provinceCode) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp tỉnh/thành phố'
            });
        }

        const provCode = Number(provinceCode);
        const distCode = districtCode ? Number(districtCode) : null;
        const total = Number(orderTotal) || 0;

        const ghnProvider = await ShippingProvider.findOne({ code: 'GHN', isActive: true });
        if (!ghnProvider) {
            return res.status(400).json({ success: false, message: 'GHN chưa được kích hoạt' });
        }

        const { GHN: ghnConfig } = await getShopShippingConfig(null);
        let result = null;

        if (distCode) {
            const ghnDistrictId = await getGhnDistrictId(provCode, distCode, ghnConfig);
            if (ghnDistrictId) {
                result = await GHNService.calculateFee(ghnDistrictId, 1000, ghnConfig);
            }
        }

        if (!result?.success) {
            const defaultDistrict = PROVINCE_TO_GHN_DISTRICT[provCode];
            if (defaultDistrict) {
                result = await GHNService.calculateFee(defaultDistrict.district_id, 1000, ghnConfig);
            }
        }

        if (!result?.success) {
            result = calculateFallbackFee(ghnProvider.baseFee, provCode, ghnProvider.freeThreshold);
        }

        const isFree = total >= ghnProvider.freeThreshold;

        res.status(200).json({
            success: true,
            data: {
                fee: isFree ? 0 : (result?.data?.fee || ghnProvider.baseFee),
                estimatedDays: result?.data?.estimatedDaysRange || ghnProvider.estimatedDays,
                isFree,
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tính phí vận chuyển',
            error: error.message
        });
    }
};

// @desc    Calculate shipping fee (GHN only, per-shop config)
// @route   GET /api/shipping/calculate-all
// @access  Public
const calculateAllFees = async (req, res) => {
    try {
        const { provinceCode, districtCode, orderTotal, shopId } = req.query;

        if (!provinceCode) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp tỉnh/thành phố'
            });
        }

        const provCode = Number(provinceCode);
        const distCode = districtCode ? Number(districtCode) : null;

        // Lấy GHN token từ DB shop hoặc platform config
        const { GHN: ghnConfig } = await getShopShippingConfig(shopId || null);

        // Resolve GHN district ID
        let ghnDistrictId = null;
        if (distCode) {
            ghnDistrictId = await getGhnDistrictId(provCode, distCode, ghnConfig);
        }
        if (!ghnDistrictId) {
            const defaultDistrict = PROVINCE_TO_GHN_DISTRICT[provCode];
            if (defaultDistrict) ghnDistrictId = defaultDistrict.district_id;
        }

        // Tính phí qua GHN API
        let feeData = null;
        if (ghnDistrictId && ghnConfig.token) {
            feeData = await GHNService.calculateFee(ghnDistrictId, 1000, ghnConfig);
        }

        // Fallback: phí theo khoảng cách tỉnh/thành
        if (!feeData?.success) {
            // Phí cơ bản theo khu vực
            const baseFeesByRegion = {
                // TP HCM và vùng lân cận (miền Nam)
                79: 20000,  // TP HCM
                48: 20000,  // Hồ Chí Minh (code cũ)
                74: 25000,  // Long An
                75: 25000,  // Đồng Nai
                80: 25000,  // Bình Dương
                83: 30000,  // Tây Ninh
                84: 30000,  // Tiền Giang
                82: 30000,  // Bà Rịa Vũng Tàu
                // Hà Nội và vùng lân cận (miền Bắc)
                1: 25000,   // Hà Nội
                2: 25000,   // Hà Nội (code cũ)
                15: 35000,  // Vĩnh Phúc
                16: 35000,  // Bắc Ninh
                17: 40000,  // Yên Bái
                18: 40000,  // Phú Thọ
                19: 35000,  // Thái Bình
                20: 40000,  // Thái Nguyên
                23: 35000,  // Nam Định
                24: 45000,  // Lạng Sơn
                26: 35000,  // Hải Dương
                33: 50000,  // Cao Bằng
                36: 50000,  // Bắc Kạn
                // Miền Trung
                92: 35000,  // Đà Nẵng
                38: 40000,  // Thanh Hóa
                39: 40000,  // Thừa Thiên Huế
                40: 45000,  // Quảng Bình
                42: 40000,  // Quảng Ngãi
                43: 45000,  // Quảng Nam
                44: 40000,  // Khánh Hòa
                46: 45000,  // Quảng Trị
                51: 45000,  // Vĩnh Long
                56: 45000,  // Bình Định
                // Miền Tây
                72: 40000,  // Cần Thơ
                86: 45000,  // Sóc Trăng
                60: 50000,  // Bạc Liêu
            };
            
            const baseFee = baseFeesByRegion[provCode] || 40000; // Default cao cho xa
            
            feeData = {
                success: true,
                data: { fee: baseFee, estimatedDaysRange: { min: 2, max: 5 } }
            };
        }

        res.status(200).json({
            success: true,
            data: {
                fees: [{
                    provider: {
                        _id: 'ghn-default',
                        name: 'Giao Hàng Nhanh',
                        code: 'GHN',
                        logo: '/icons/ghn.png',
                    },
                    fee: feeData?.data?.fee || 25000,
                    estimatedDays: feeData?.data?.estimatedDaysRange || { min: 2, max: 5 },
                    isFree: false,
                }]
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tính phí vận chuyển',
            error: error.message
        });
    }
};

// @desc    Create shipping order
// @route   POST /api/shipping/orders
// @access  Private
const createShippingOrder = async (req, res) => {
    try {
        const { orderId, providerCode } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền tạo đơn vận chuyển cho đơn hàng này'
            });
        }

        const provider = await ShippingProvider.findOne({ code: providerCode, isActive: true });
        if (!provider) {
            return res.status(400).json({
                success: false,
                message: 'Đơn vị vận chuyển không hợp lệ'
            });
        }

        // ── Lấy token GHN từ DB shop ──────────────────────────────────
        const shopId = order.shop;
        const { GHN: ghnConfig } = await getShopShippingConfig(shopId);

        // Resolve GHN district ID từ địa chỉ người nhận
        const addr = order.shippingAddress || {};
        const provinceCode = addr.provinceCode;
        const districtCode = addr.districtCode;
        const toWardCode = addr.wardCode || '';

        let ghnDistrictId = null;
        if (provinceCode && districtCode) {
            ghnDistrictId = await getGhnDistrictId(provinceCode, districtCode, ghnConfig);
        }
        if (!ghnDistrictId) {
            const fallback = PROVINCE_TO_GHN_DISTRICT[provinceCode];
            if (fallback) ghnDistrictId = fallback.district_id;
        }

        // Tính phí qua GHN API (dùng token từ DB shop)
        let shippingFee = provider.baseFee;
        if (ghnDistrictId && ghnConfig.token) {
            const feeResult = await GHNService.calculateFee(ghnDistrictId, 1000, ghnConfig);
            if (feeResult.success) {
                shippingFee = feeResult.data.fee;
            }
        }

        const estimatedDays = provider.estimatedDays.max;
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + estimatedDays);

        const shippingOrder = new ShippingOrder({
            order: orderId,
            provider: provider._id,
            providerCode: provider.code,
            shippingAddress: addr,
            shippingFee: shippingFee,
            estimatedDelivery,
            codAmount: order.paymentMethod === 'COD' ? order.totalPrice : 0
        });

        await shippingOrder.save();

        // ── Tạo đơn trên GHN bằng token shop (nếu có district ID) ────
        if (ghnDistrictId && ghnConfig.token && providerCode === 'GHN') {
            const ghnResult = await GHNService.createOrder({
                toDistrictId: ghnDistrictId,
                toWardCode: String(toWardCode),
                toName: addr.fullName || '',
                toPhone: addr.phone || '',
                toAddress: addr.address || '',
                codAmount: order.paymentMethod === 'COD' ? order.totalPrice : 0,
                weight: 1000,
                orderCode: shippingOrder._id.toString(),
            }, ghnConfig);

            if (ghnResult.success) {
                shippingOrder.trackingNumber = ghnResult.data.trackingNumber;
                shippingOrder.externalId = ghnResult.data.orderCode;
                shippingOrder.labelUrl = ghnResult.data.labelUrl;
                await shippingOrder.save();
            }
        }

        res.status(201).json({
            success: true,
            message: 'Tạo đơn vận chuyển thành công',
            data: {
                shippingOrder,
                trackingNumber: shippingOrder.trackingNumber,
                estimatedDelivery: shippingOrder.estimatedDelivery,
                labelUrl: shippingOrder.labelUrl
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đơn vận chuyển',
            error: error.message
        });
    }
};

// @desc    Get shipping order by order ID
// @route   GET /api/shipping/orders/:orderId
// @access  Private
const getShippingByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;

        const shippingOrder = await ShippingOrder.findOne({ order: orderId })
            .populate('provider');

        if (!shippingOrder) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin vận chuyển'
            });
        }

        const order = await Order.findById(orderId);
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem thông tin này'
            });
        }

        res.status(200).json({
            success: true,
            data: shippingOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin vận chuyển',
            error: error.message
        });
    }
};

// @desc    Get shipping status
// @route   GET /api/shipping/track/:trackingNumber
// @access  Public
const trackShipment = async (req, res) => {
    try {
        const { trackingNumber } = req.params;

        const shippingOrder = await ShippingOrder.findOne({ trackingNumber })
            .populate('provider');

        if (!shippingOrder) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng vận chuyển'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                trackingNumber: shippingOrder.trackingNumber,
                status: shippingOrder.status,
                provider: shippingOrder.provider,
                statusHistory: shippingOrder.statusHistory,
                estimatedDelivery: shippingOrder.estimatedDelivery,
                actualDelivery: shippingOrder.actualDelivery
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi theo dõi đơn hàng',
            error: error.message
        });
    }
};

// @desc    Update shipping status (Admin/Vendor)
// @route   PUT /api/shipping/orders/:id/status
// @access  Private (Admin/Vendor)
const updateShippingStatus = async (req, res) => {
    try {
        const { status, note, location } = req.body;

        const shippingOrder = await ShippingOrder.findById(req.params.id);
        if (!shippingOrder) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn vận chuyển'
            });
        }

        const validStatuses = Object.values(SHIPPING_STATUS);
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ'
            });
        }

        shippingOrder.status = status;
        shippingOrder.statusHistory.push({
            status,
            timestamp: new Date(),
            note: note || '',
            location: location || ''
        });

        if (status === SHIPPING_STATUS.DELIVERED) {
            shippingOrder.actualDelivery = new Date();
        }

        if (status === SHIPPING_STATUS.FAILED) {
            shippingOrder.attempts += 1;
            shippingOrder.lastAttemptNote = note || '';
        }

        await shippingOrder.save();

        const order = await Order.findById(shippingOrder.order);
        if (order) {
            if (status === SHIPPING_STATUS.DELIVERED) {
                order.status = 'delivered';
                order.deliveredAt = new Date();
                await order.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái thành công',
            data: shippingOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái',
            error: error.message
        });
    }
};

// @desc    Seed default shipping providers
// @route   POST /api/shipping/seed
// @access  Private (Admin)
const seedProviders = async (req, res) => {
    try {
        const providers = [
            {
                name: 'Giao Hàng Nhanh',
                code: 'GHN',
                logo: '/icons/ghn.png',
                description: 'Giao hàng nhanh trong 1-3 ngày tại các thành phố lớn',
                baseFee: 25000,
                feePerKm: 0,
                freeThreshold: 500000,
                estimatedDays: { min: 1, max: 3 }
            },
        ];

        for (const provider of providers) {
            await ShippingProvider.findOneAndUpdate(
                { code: provider.code },
                provider,
                { upsert: true, new: true }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Đã tạo GHN làm đơn vị vận chuyển mặc định'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đơn vị vận chuyển',
            error: error.message
        });
    }
};

module.exports = {
    getProviders,
    calculateFee,
    calculateAllFees,
    createShippingOrder,
    getShippingByOrderId,
    trackShipment,
    updateShippingStatus,
    seedProviders
};
