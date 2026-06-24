/**
 * Payment Controller
 * 
 * Xử lý các API liên quan đến thanh toán PayOS
 */

const Order = require('../models/order');
const Cart = require('../models/cart');
const Product = require('../models/product');
const { ORDER_STATUS } = require('../models/order');
const { payosConfig, PAYOS_CLIENT_URL } = require('../config/payos');
const payoutService = require('../services/payoutService');

// Sử dụng thư viện PayOS SDK
const PayOS = require('@payos/node');

let payosInstance = null;

const getPayOSInstance = () => {
    if (!payosInstance && payosConfig.isConfigured()) {
        payosInstance = new PayOS(
            payosConfig.clientId,
            payosConfig.apiKey,
            payosConfig.checksumKey
        );
    }
    return payosInstance;
};

/**
 * Tạo payment link PayOS
 * @route POST /api/payments/payos/create
 * @access Private
 */
const createPayOSPayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        // Kiểm tra PayOS đã được cấu hình chưa
        if (!payosConfig.isConfigured()) {
            return res.status(400).json({
                success: false,
                message: 'PayOS chưa được cấu hình. Vui lòng liên hệ quản trị viên.'
            });
        }

        // Lấy thông tin đơn hàng
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra đơn hàng thuộc về user hiện tại
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thanh toán đơn hàng này'
            });
        }

        // Kiểm tra phương thức thanh toán
        if (order.paymentMethod !== 'PAYOS') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng không phải thanh toán qua PayOS'
            });
        }

        // Kiểm tra trạng thái thanh toán
        if (order.paymentStatus === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã được thanh toán'
            });
        }

        const payos = getPayOSInstance();
        if (!payos) {
            return res.status(500).json({
                success: false,
                message: 'Không thể khởi tạo PayOS'
            });
        }

        // Tạo mã đơn hàng PayOS (tối đa 25 ký tự)
        const payosOrderCode = `PAY${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        // Lưu mã PayOS vào đơn hàng
        order.payosOrderCode = payosOrderCode;
        await order.save();

        // Tạo payment link
        const paymentData = {
            orderCode: payosOrderCode,
            amount: Math.round(order.totalPrice), // PayOS yêu cầu số nguyên
            description: `Thanh toan don hang ${order.orderNumber}`,
            customerName: order.shippingAddress?.fullName || req.user.fullName || 'Khach hang',
            customerEmail: req.user.email || '',
            customerPhone: order.shippingAddress?.phone || '',
            returnUrl: `${PAYOS_CLIENT_URL}/payment/payos/return`,
            cancelUrl: `${PAYOS_CLIENT_URL}/payment/payos/cancel?orderId=${order._id}`,
        };

        const response = await payos.createPaymentLink(paymentData);

        if (response.data && response.data.checkoutUrl) {
            return res.status(200).json({
                success: true,
                message: 'Tạo link thanh toán thành công',
                data: {
                    checkoutUrl: response.data.checkoutUrl,
                    paymentId: response.data.paymentId,
                    orderCode: payosOrderCode
                }
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Không thể tạo link thanh toán'
        });

    } catch (error) {
        console.error('PayOS create payment error:', error);
        
        // Xử lý lỗi từ PayOS
        if (error.response) {
            return res.status(error.response.status || 400).json({
                success: false,
                message: error.response.data?.message || 'Lỗi từ PayOS',
                error: error.response.data
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo thanh toán PayOS',
            error: error.message
        });
    }
};

/**
 * Tạo đơn hàng và thanh toán PayOS (tạo mới - chưa có orderId)
 * @route POST /api/payments/payos/create-with-cart
 * @access Private
 */
const createPayOSPaymentWithCart = async (req, res) => {
    try {
        const { shippingAddress, shippingProvider, shippingFee, note } = req.body;

        // Kiểm tra PayOS đã được cấu hình chưa
        if (!payosConfig.isConfigured()) {
            return res.status(400).json({
                success: false,
                message: 'PayOS chưa được cấu hình. Vui lòng liên hệ quản trị viên.'
            });
        }

        // Lấy cart của user
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart || cart.products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng trống!'
            });
        }

        // Kiểm tra tồn kho
        const productMap = {};
        for (const item of cart.products) {
            const product = await Product.findById(item.product).populate('shop', 'name code');
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
            productMap[item.product.toString()] = product;
        }

        const subtotal = cart.totalPrice;
        const totalPrice = subtotal + (shippingFee || 0);

        // Tạo đơn hàng
        const order = new Order({
            user: req.user._id,
            products: cart.products.map(item => {
                const product = productMap[item.product.toString()];
                return {
                    product: item.product,
                    shop: product.shop?._id || product.shop || null,
                    shopName: product.shop?.name || '',
                    shopCode: product.shop?.code || '',
                    quantity: item.quantity,
                    price: item.price,
                    name: item.name,
                    image: item.image
                };
            }),
            shippingAddress: {
                ...shippingAddress,
                note: note || ''
            },
            paymentMethod: 'PAYOS',
            paymentStatus: 'pending',
            subtotal,
            shippingFee: shippingFee || 0,
            totalPrice,
            totalQuantity: cart.totalQuantity,
            orderedAt: new Date(),
            estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        });

        await order.save();

        const payos = getPayOSInstance();
        if (!payos) {
            // Rollback - xóa đơn hàng nếu không khởi tạo được PayOS
            await Order.findByIdAndDelete(order._id);
            return res.status(500).json({
                success: false,
                message: 'Không thể khởi tạo PayOS'
            });
        }

        // Tạo mã đơn hàng PayOS
        const payosOrderCode = `PAY${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        order.payosOrderCode = payosOrderCode;
        await order.save();

        // Tạo payment link
        const paymentData = {
            orderCode: payosOrderCode,
            amount: Math.round(totalPrice),
            description: `Thanh toan don hang ${order.orderNumber}`,
            customerName: shippingAddress?.fullName || req.user.fullName || 'Khach hang',
            customerEmail: req.user.email || '',
            customerPhone: shippingAddress?.phone || '',
            returnUrl: `${PAYOS_CLIENT_URL}/payment/payos/return`,
            cancelUrl: `${PAYOS_CLIENT_URL}/payment/payos/cancel?orderId=${order._id}`,
        };

        const response = await payos.createPaymentLink(paymentData);

        if (response.data && response.data.checkoutUrl) {
            // Xóa giỏ hàng sau khi tạo đơn hàng thành công
            await Cart.findByIdAndDelete(cart._id);

            return res.status(200).json({
                success: true,
                message: 'Tạo link thanh toán thành công',
                data: {
                    orderId: order._id,
                    checkoutUrl: response.data.checkoutUrl,
                    paymentId: response.data.paymentId,
                    orderCode: payosOrderCode
                }
            });
        }

        // Rollback
        await Order.findByIdAndDelete(order._id);
        return res.status(500).json({
            success: false,
            message: 'Không thể tạo link thanh toán'
        });

    } catch (error) {
        console.error('PayOS create payment with cart error:', error);

        if (error.response) {
            return res.status(error.response.status || 400).json({
                success: false,
                message: error.response.data?.message || 'Lỗi từ PayOS',
                error: error.response.data
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo thanh toán PayOS',
            error: error.message
        });
    }
};

/**
 * Webhook callback từ PayOS
 * @route POST /api/payments/payos/webhook
 * @access Public
 */
const payOSWebhook = async (req, res) => {
    try {
        const { orderCode, code, status, amount } = req.body;

        console.log('PayOS Webhook received:', req.body);

        // Tìm đơn hàng theo mã PayOS
        const order = await Order.findOne({ payosOrderCode: orderCode });

        if (!order) {
            console.log('Order not found for PayOS orderCode:', orderCode);
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Xử lý theo trạng thái thanh toán
        if (code === '00' && status === 'PAID') {
            // Thanh toán thành công
            if (order.paymentStatus !== 'paid') {
                order.paymentStatus = 'paid';
                await order.save();
                
                // Trừ tồn kho và tăng sold (chỉ khi chưa làm ở bước tạo đơn)
                // Với COD, stock được trừ khi giao hàng. Với PayOS, trừ khi thanh toán thành công
                const products = await Product.find({
                    _id: { $in: order.products.map(p => p.product) }
                });

                for (const item of order.products) {
                    const product = products.find(p => p._id.toString() === item.product.toString());
                    if (product && product.quantity >= item.quantity) {
                        await Product.findByIdAndUpdate(item.product, {
                            $inc: { 
                                quantity: -item.quantity,
                                sold: item.quantity
                            }
                        });
                    }
                }
                
                console.log('Order paid successfully:', order.orderNumber);

                // KHÔNG gọi payout ở đây - payout chỉ gọi khi đơn DELIVERED
                // Điều này đảm bảo vendor chỉ nhận tiền khi giao hàng thành công
            }
        } else if (status === 'CANCELLED' || status === 'FAILED') {
            // Thanh toán thất bại hoặc bị hủy
            order.paymentStatus = 'failed';
            order.status = ORDER_STATUS.CANCELLED;
            order.cancelledAt = new Date();
            order.statusHistory.push({
                status: ORDER_STATUS.CANCELLED,
                timestamp: new Date(),
                note: 'Thanh toán PayOS thất bại/bị hủy'
            });
            await order.save();
            console.log('Order payment failed/cancelled:', order.orderNumber);
        }

        return res.status(200).json({ 
            success: true,
            message: 'Webhook processed'
        });

    } catch (error) {
        console.error('PayOS Webhook error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi xử lý webhook'
        });
    }
};

/**
 * Xử lý return URL từ PayOS (sau khi thanh toán)
 * @route GET /api/payments/payos/return
 * @access Public
 */
const payOSReturn = async (req, res) => {
    try {
        const { orderId, orderCode, status, code } = req.query;

        console.log('PayOS Return URL received:', req.query);

        if (code === '00' || status === 'PAID') {
            // Thanh toán thành công - chuyển hướng về trang thành công
            return res.redirect(`${PAYOS_CLIENT_URL}/order-success/${orderId}?payment=success`);
        } else {
            // Thanh toán thất bại - chuyển hướng về trang thất bại
            return res.redirect(`${PAYOS_CLIENT_URL}/payment/payos/failed?orderId=${orderId}`);
        }

    } catch (error) {
        console.error('PayOS Return error:', error);
        return res.redirect(`${PAYOS_CLIENT_URL}/payment/payos/failed`);
    }
};

/**
 * Kiểm tra trạng thái thanh toán PayOS
 * @route GET /api/payments/payos/status/:orderId
 * @access Private
 */
const getPayOSPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

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
                message: 'Bạn không có quyền xem đơn hàng này'
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                totalPrice: order.totalPrice
            }
        });

    } catch (error) {
        console.error('Get PayOS payment status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra trạng thái thanh toán',
            error: error.message
        });
    }
};

/**
 * Hủy thanh toán PayOS (nếu chưa thanh toán)
 * @route POST /api/payments/payos/cancel/:orderId
 * @access Private
 */
const cancelPayOSPayment = async (req, res) => {
    try {
        const { orderId } = req.params;

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
                message: 'Bạn không có quyền hủy đơn hàng này'
            });
        }

        if (order.paymentMethod !== 'PAYOS') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng không phải thanh toán qua PayOS'
            });
        }

        if (order.paymentStatus === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã thanh toán, không thể hủy'
            });
        }

        // Hủy đơn hàng
        order.status = ORDER_STATUS.CANCELLED;
        order.paymentStatus = 'failed';
        order.cancelledAt = new Date();
        order.statusHistory.push({
            status: ORDER_STATUS.CANCELLED,
            timestamp: new Date(),
            note: 'Hủy thanh toán PayOS'
        });

        await order.save();

        // Hoàn tồn kho
        for (const item of order.products) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { quantity: item.quantity }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Đã hủy đơn hàng và hoàn tồn kho'
        });

    } catch (error) {
        console.error('Cancel PayOS payment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy thanh toán',
            error: error.message
        });
    }
};

module.exports = {
    createPayOSPayment,
    createPayOSPaymentWithCart,
    payOSWebhook,
    payOSReturn,
    getPayOSPaymentStatus,
    cancelPayOSPayment
};
