const { ShippingProvider, ShippingOrder, SHIPPING_STATUS } = require('../models/shipping');
const Order = require('../models/order');

// @desc    Get all shipping providers
// @route   GET /api/shipping/providers
// @access  Public
const getProviders = async (req, res) => {
    try {
        const providers = await ShippingProvider.find({ isActive: true });

        res.status(200).json({
            success: true,
            data: { providers }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy đơn vị vận chuyển',
            error: error.message
        });
    }
};

// @desc    Calculate shipping fee
// @route   GET /api/shipping/calculate
// @access  Public
const calculateFee = async (req, res) => {
    try {
        const { providerCode, city, orderTotal } = req.query;

        if (!providerCode || !city) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp mã đơn vị vận chuyển và thành phố'
            });
        }

        const result = await ShippingOrder.calculateFee(providerCode, city, Number(orderTotal) || 0);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tính phí vận chuyển',
            error: error.message
        });
    }
};

// @desc    Calculate all providers fees
// @route   GET /api/shipping/calculate-all
// @access  Public
const calculateAllFees = async (req, res) => {
    try {
        const { city, orderTotal } = req.query;

        if (!city) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp thành phố'
            });
        }

        const providers = await ShippingProvider.find({ isActive: true });
        const fees = [];

        for (const provider of providers) {
            const result = await ShippingOrder.calculateFee(provider.code, city, Number(orderTotal) || 0);
            if (result.success) {
                fees.push(result.data);
            }
        }

        res.status(200).json({
            success: true,
            data: { fees }
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

        // Calculate fee
        const feeResult = await ShippingOrder.calculateFee(providerCode, order.shippingAddress.city, order.totalPrice);

        // Estimated delivery
        const estimatedDays = provider.estimatedDays.max;
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + estimatedDays);

        const shippingOrder = new ShippingOrder({
            order: orderId,
            provider: provider._id,
            providerCode: provider.code,
            shippingAddress: order.shippingAddress,
            shippingFee: feeResult.data.fee,
            estimatedDelivery,
            codAmount: order.paymentMethod === 'COD' ? order.totalPrice : 0
        });

        await shippingOrder.save();

        res.status(201).json({
            success: true,
            message: 'Tạo đơn vận chuyển thành công',
            data: {
                shippingOrder,
                trackingNumber: shippingOrder.trackingNumber,
                estimatedDelivery: shippingOrder.estimatedDelivery
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

        // Verify ownership
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

// @desc    Admin: Update shipping status
// @route   PUT /api/shipping/orders/:id/status
// @access  Private (Admin)
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

        // Validate status transition
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

        // Update order status if needed
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
                name: 'Giao Hàng Tiết Kiệm',
                code: 'GHTK',
                logo: '/icons/ghtk.png',
                description: 'Dịch vụ giao hàng tiết kiệm, phổ biến nhất Việt Nam',
                baseFee: 25000,
                feePerKm: 0,
                freeThreshold: 500000,
                estimatedDays: { min: 2, max: 4 }
            },
            {
                name: 'Giao Hàng Nhanh',
                code: 'GHN',
                logo: '/icons/ghn.png',
                description: 'Giao hàng nhanh trong 24h tại các thành phố lớn',
                baseFee: 30000,
                feePerKm: 0,
                freeThreshold: 500000,
                estimatedDays: { min: 1, max: 3 }
            },
            {
                name: 'Viettel Post',
                code: 'VTPOST',
                logo: '/icons/vtpost.png',
                description: 'Bưu chính Viettel - Phủ sóng toàn quốc',
                baseFee: 20000,
                feePerKm: 0,
                freeThreshold: 500000,
                estimatedDays: { min: 3, max: 7 }
            },
            {
                name: 'VNPost',
                code: 'VNPOST',
                logo: '/icons/vnpost.png',
                description: 'Bưu chính quốc gia - Dịch vụ đáng tin cậy',
                baseFee: 18000,
                feePerKm: 0,
                freeThreshold: 500000,
                estimatedDays: { min: 4, max: 10 }
            }
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
            message: 'Đã tạo các đơn vị vận chuyển mặc định'
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
