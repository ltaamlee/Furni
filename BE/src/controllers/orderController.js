const Order = require('../models/Order');
const Cart = require('../models/cart');
const Product = require('../models/Product');
const { ORDER_STATUS } = require('../models/Order');

// @desc    Create order from cart
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    try {
        const { shippingAddress, paymentMethod = 'COD', note } = req.body;

        // Lấy cart của user
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart || cart.products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng trống!'
            });
        }

        // Kiểm tra số lượng tồn kho
        for (const item of cart.products) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm không tồn tại!`
                });
            }
            if (product.quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm "${product.name}" chỉ còn ${product.quantity} trong kho!`
                });
            }
        }

        // Tính phí ship (miễn phí nếu > 500k)
        const shippingFee = cart.totalPrice >= 500000 ? 0 : 30000;
        const totalPrice = cart.totalPrice + shippingFee;

        // Tạo đơn hàng
        const order = new Order({
            user: req.user._id,
            products: cart.products.map(item => ({
                product: item.product,
                quantity: item.quantity,
                price: item.price,
                name: item.name,
                image: item.image
            })),
            shippingAddress: {
                ...shippingAddress,
                note: note || ''
            },
            paymentMethod,
            subtotal: cart.totalPrice,
            shippingFee,
            totalPrice,
            totalQuantity: cart.totalQuantity,
            orderedAt: new Date(),
            estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 ngày
        });

        // Trừ tồn kho và tăng sold
        for (const item of cart.products) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { 
                    quantity: -item.quantity,
                    sold: item.quantity
                }
            });
        }

        // Xóa giỏ hàng sau khi đặt thành công
        await Cart.findByIdAndDelete(cart._id);

        await order.save();

        res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công!',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đơn hàng',
            error: error.message
        });
    }
};

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
const getUserOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = { user: req.user._id };
        if (status) {
            query.status = status;
        }

        const skip = (Number(page) - 1) * Number(limit);
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Order.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                orders,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    limit: Number(limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đơn hàng',
            error: error.message
        });
    }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({ 
            _id: req.params.id, 
            user: req.user._id 
        }).populate('products.product');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin đơn hàng',
            error: error.message
        });
    }
};

// @desc    Cancel order (trong 30 phút)
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
    try {
        const { reason } = req.body;

        const order = await Order.findOne({ 
            _id: req.params.id, 
            user: req.user._id 
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra có thể hủy không
        if (!order.canCancel()) {
            if (order.canRequestCancel()) {
                // Đang ở bước chuẩn bị -> gửi yêu cầu hủy
                order.cancelRequest = {
                    reason: reason || '',
                    requestedAt: new Date(),
                    status: 'pending'
                };
                order.status = ORDER_STATUS.CANCEL_REQUESTED;
                await order.save();

                return res.status(200).json({
                    success: true,
                    message: 'Yêu cầu hủy đơn đã được gửi, đang chờ duyệt!',
                    data: order
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Không thể hủy đơn hàng. Đơn hàng đã được xác nhận hoặc đang giao!'
            });
        }

        // Hoàn tồn kho
        for (const item of order.products) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { quantity: item.quantity }
            });
        }

        order.status = ORDER_STATUS.CANCELLED;
        order.cancelledAt = new Date();
        order.statusHistory.push({
            status: ORDER_STATUS.CANCELLED,
            timestamp: new Date(),
            note: reason ? `Lý do: ${reason}` : 'Khách hàng hủy đơn'
        });

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Hủy đơn hàng thành công!',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy đơn hàng',
            error: error.message
        });
    }
};

// @desc    Confirm order (Vendor/Admin)
// @route   PUT /api/orders/:id/confirm
// @access  Private (Vendor/Admin)
const confirmOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        if (order.status !== ORDER_STATUS.PENDING) {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng không ở trạng thái chờ xác nhận'
            });
        }

        order.status = ORDER_STATUS.CONFIRMED;
        order.confirmedAt = new Date();
        order.statusHistory.push({
            status: ORDER_STATUS.CONFIRMED,
            timestamp: new Date(),
            note: 'Đơn hàng đã được xác nhận'
        });

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Xác nhận đơn hàng thành công!',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xác nhận đơn hàng',
            error: error.message
        });
    }
};

// @desc    Update order status (Vendor/Admin)
// @route   PUT /api/orders/:id/status
// @access  Private (Vendor/Admin)
const updateOrderStatus = async (req, res) => {
    try {
        const { status, note } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Validate status transition
        const validTransitions = {
            [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.PREPARING]: [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.DELIVERED],
            [ORDER_STATUS.CANCEL_REQUESTED]: [ORDER_STATUS.CANCELLED, ORDER_STATUS.PREPARING],
            [ORDER_STATUS.DELIVERED]: [],
            [ORDER_STATUS.CANCELLED]: []
        };

        if (!validTransitions[order.status]?.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Không thể chuyển trạng thái này!'
            });
        }

        order.status = status;
        order.statusHistory.push({
            status,
            timestamp: new Date(),
            note: note || ''
        });

        if (status === ORDER_STATUS.DELIVERED) {
            order.deliveredAt = new Date();
        }

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái thành công!',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái',
            error: error.message
        });
    }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders/admin/all
// @access  Private (Admin)
const getAllOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const query = {};
        if (status) {
            query.status = status;
        }

        const skip = (Number(page) - 1) * Number(limit);
        const orders = await Order.find(query)
            .populate('user', 'fullName email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Order.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                orders,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    limit: Number(limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đơn hàng',
            error: error.message
        });
    }
};

// @desc    Process cancel request (Admin)
// @route   PUT /api/orders/:id/cancel-request
// @access  Private (Admin)
const processCancelRequest = async (req, res) => {
    try {
        const { action, note } = req.body; // action: 'approve' | 'reject'

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        if (order.status !== ORDER_STATUS.CANCEL_REQUESTED) {
            return res.status(400).json({
                success: false,
                message: '�ơn hàng không có yêu cầu hủy nào'
            });
        }

        if (action === 'approve') {
            // Hoàn tồn kho
            for (const item of order.products) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { quantity: item.quantity }
                });
            }

            order.status = ORDER_STATUS.CANCELLED;
            order.cancelledAt = new Date();
            order.cancelRequest.processedAt = new Date();
            order.cancelRequest.processedBy = req.user._id;
            order.cancelRequest.status = 'approved';
            order.statusHistory.push({
                status: ORDER_STATUS.CANCELLED,
                timestamp: new Date(),
                note: `Yêu cầu hủy được chấp nhận. ${note || ''}`
            });

            await order.save();

            return res.status(200).json({
                success: true,
                message: 'Đã chấp nhận yêu cầu hủy đơn!',
                data: order
            });
        } else {
            // Từ chối - quay lại preparing
            order.status = ORDER_STATUS.PREPARING;
            order.cancelRequest.processedAt = new Date();
            order.cancelRequest.processedBy = req.user._id;
            order.cancelRequest.status = 'rejected';
            order.statusHistory.push({
                status: ORDER_STATUS.PREPARING,
                timestamp: new Date(),
                note: `Yêu cầu hủy bị từ chối. ${note || ''}`
            });

            await order.save();

            return res.status(200).json({
                success: true,
                message: 'Đã từ chối yêu cầu hủy đơn!',
                data: order
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xử lý yêu cầu hủy',
            error: error.message
        });
    }
};

// @desc    Auto confirm orders (called by cron job or manually)
// @route   POST /api/orders/auto-confirm
// @access  Private (Admin/System)
const autoConfirmOrders = async (req, res) => {
    try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        const pendingOrders = await Order.find({
            status: ORDER_STATUS.PENDING,
            orderedAt: { $lte: thirtyMinutesAgo }
        });

        let count = 0;
        for (const order of pendingOrders) {
            order.status = ORDER_STATUS.CONFIRMED;
            order.confirmedAt = new Date();
            order.statusHistory.push({
                status: ORDER_STATUS.CONFIRMED,
                timestamp: new Date(),
                note: 'Tự động xác nhận sau 30 phút'
            });
            await order.save();
            count++;
        }

        res.status(200).json({
            success: true,
            message: `Đã tự động xác nhận ${count} đơn hàng`,
            data: { count }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tự động xác nhận đơn hàng',
            error: error.message
        });
    }
};

// @desc    Get order statistics (Admin)
// @route   GET /api/orders/admin/stats
// @access  Private (Admin)
const getOrderStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: ORDER_STATUS.PENDING });
        const confirmedOrders = await Order.countDocuments({ status: ORDER_STATUS.CONFIRMED });
        const preparingOrders = await Order.countDocuments({ status: ORDER_STATUS.PREPARING });
        const shippingOrders = await Order.countDocuments({ status: ORDER_STATUS.SHIPPING });
        const deliveredOrders = await Order.countDocuments({ status: ORDER_STATUS.DELIVERED });
        const cancelledOrders = await Order.countDocuments({ status: ORDER_STATUS.CANCELLED });

        // Doanh thu
        const revenueResult = await Order.aggregate([
            { $match: { status: { $nin: [ORDER_STATUS.CANCELLED] } } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        res.status(200).json({
            success: true,
            data: {
                totalOrders,
                byStatus: {
                    pending: pendingOrders,
                    confirmed: confirmedOrders,
                    preparing: preparingOrders,
                    shipping: shippingOrders,
                    delivered: deliveredOrders,
                    cancelled: cancelledOrders
                },
                totalRevenue
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê đơn hàng',
            error: error.message
        });
    }
};

module.exports = {
    createOrder,
    getUserOrders,
    getOrderById,
    cancelOrder,
    confirmOrder,
    updateOrderStatus,
    getAllOrders,
    processCancelRequest,
    autoConfirmOrders,
    getOrderStats
};
