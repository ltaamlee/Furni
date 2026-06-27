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
const { PayOS } = require('@payos/node');

let payosInstance = null;
const PUBLIC_PRODUCT_STATUSES = ['active', 'out_of_stock'];

const pickCheckoutItems = (cart, selectedProductIds = [], selectedProducts = []) => {
    if (Array.isArray(selectedProducts) && selectedProducts.length > 0) {
        const quantityByProduct = new Map(
            selectedProducts
                .filter((item) => item?.productId && Number(item.quantity) > 0)
                .map((item) => [item.productId.toString(), Number(item.quantity)])
        );

        return cart.products
            .filter((item) => quantityByProduct.has(item.product.toString()))
            .map((item) => {
                const checkoutQuantity = quantityByProduct.get(item.product.toString());
                const plainItem = item.toObject ? item.toObject() : { ...item };
                return {
                    ...plainItem,
                    product: item.product,
                    quantity: Math.min(checkoutQuantity, item.quantity)
                };
            });
    }

    if (!Array.isArray(selectedProductIds) || selectedProductIds.length === 0) {
        return cart.products;
    }
    const selected = new Set(selectedProductIds.map((id) => id.toString()));
    return cart.products.filter((item) => selected.has(item.product.toString()));
};

const getProductImage = (product) => {
    const firstImage = Array.isArray(product.images) ? product.images[0] : null;
    return firstImage?.url || firstImage || product.image || null;
};

const removeCheckoutItemsFromCart = async (cart, checkoutItems, selectedProducts = [], selectedProductIds = []) => {
    if (Array.isArray(selectedProducts) && selectedProducts.length > 0) {
        const purchasedByProduct = new Map(
            checkoutItems.map((item) => [item.product.toString(), Number(item.quantity) || 0])
        );

        cart.products = cart.products
            .map((item) => {
                const purchasedQuantity = purchasedByProduct.get(item.product.toString()) || 0;
                if (purchasedQuantity <= 0) return item;
                item.quantity = Math.max(0, item.quantity - purchasedQuantity);
                return item;
            })
            .filter((item) => item.quantity > 0);

        await cart.save();
        return;
    }

    if (Array.isArray(selectedProductIds) && selectedProductIds.length > 0) {
        const selected = new Set(checkoutItems.map((item) => item.product.toString()));
        cart.products = cart.products.filter((item) => !selected.has(item.product.toString()));
        await cart.save();
        return;
    }

    await Cart.findByIdAndDelete(cart._id);
};

const getPayOSInstance = () => {
    if (!payosInstance) {
        try {
            payosInstance = new PayOS({
                clientId: process.env.PAYOS_CLIENT_ID,
                apiKey: process.env.PAYOS_API_KEY,
                checksumKey: process.env.PAYOS_CHECKSUM_KEY,
            });
        } catch (e) {
            console.error('PayOS init error:', e.message);
            return null;
        }
    }
    return payosInstance;
};

const markPayOSOrderPaid = async (order) => {
    if (order.paymentStatus === 'paid') return order;

    order.paymentStatus = 'paid';
    await order.save();

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

    if (order.usedCouponId) {
        const { VoucherWallet, VOUCHER_STATUS } = require('../models/voucherWallet');
        const Coupon = require('../models/Coupon');
        await VoucherWallet.findByIdAndUpdate(order.usedCouponId, {
            status: VOUCHER_STATUS.USED,
            usedAt: new Date()
        });
        if (order.couponCode) {
            const voucher = await VoucherWallet.findById(order.usedCouponId);
            if (voucher?.coupon) {
                await Coupon.findByIdAndUpdate(voucher.coupon, { $inc: { usedCount: 1 } });
            }
        }
    }

    return order;
};

const syncOrderWithPayOS = async (order) => {
    if (order.paymentMethod !== 'PAYOS' || !order.payosOrderCode || order.paymentStatus === 'paid') {
        return { order, paymentLink: null };
    }

    const payos = getPayOSInstance();
    if (!payos) return { order, paymentLink: null };

    const paymentLink = await payos.paymentRequests.get(Number(order.payosOrderCode));
    const status = paymentLink?.status;

    if (status === 'PAID') {
        await markPayOSOrderPaid(order);
    } else if (['CANCELLED', 'EXPIRED', 'FAILED'].includes(status) && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'failed';
        order.status = ORDER_STATUS.CANCELLED;
        order.cancelledAt = new Date();
        order.statusHistory.push({
            status: ORDER_STATUS.CANCELLED,
            timestamp: new Date(),
            note: `Thanh toán PayOS ${status.toLowerCase()}`
        });
        await order.save();
    }

    return { order, paymentLink };
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
        let order = await Order.findById(orderId);
        
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

        // Tạo mã đơn hàng PayOS (orderCode phải là number, tối đa 10 chữ số)
        const payosOrderCode = Number(`${Date.now()}${Math.random().toString(36).substring(2, 6)}`.slice(0, 10));

        // Lưu mã PayOS vào đơn hàng
        order.payosOrderCode = payosOrderCode;
        order.paymentExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await order.save();

        // Tạo payment link
        const paymentData = {
            orderCode: payosOrderCode,
            amount: Math.round(order.totalPrice), // PayOS yêu cầu số nguyên
            description: `TT ${order.orderNumber}`.slice(0, 25),
            buyerName: order.shippingAddress?.fullName || req.user.fullName || 'Khach hang',
            buyerEmail: req.user.email || '',
            buyerPhone: order.shippingAddress?.phone || '',
            returnUrl: `${PAYOS_CLIENT_URL}/payment/payos/return?orderId=${order._id}`,
            cancelUrl: `${PAYOS_CLIENT_URL}/payment/payos/return?payment=cancelled&orderId=${order._id}`,
        };

        const response = await payos.paymentRequests.create(paymentData);

        if (response && response.checkoutUrl) {
            return res.status(200).json({
                success: true,
                message: 'Tạo link thanh toán thành công',
                data: {
                    checkoutUrl: response.checkoutUrl,
                    paymentId: response.paymentLinkId,
                    orderCode: payosOrderCode,
                    qrCode: response.qrCode,
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
        if (error.status || error.code) {
            return res.status(error.status || 400).json({
                success: false,
                message: error.desc || error.message || 'Lỗi từ PayOS',
                error: error.message
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
        const { shippingAddress, shippingTier = 'express', shippingProvider = null, shippingFee, shippingFeesByShop = {}, note, selectedProductIds = [], selectedProducts = [], buyNowProduct = null, couponCode = null, selectedShippingCoupon = null } = req.body;
        const normalizedBuyNowProduct = buyNowProduct?.productId
            ? buyNowProduct
            : (req.body.buyNowProductId
                ? { productId: req.body.buyNowProductId, quantity: req.body.buyNowQuantity }
                : null);
        const isBuyNow = Boolean(normalizedBuyNowProduct?.productId && Number(normalizedBuyNowProduct.quantity) > 0);

        // Kiểm tra PayOS đã được cấu hình chưa
        if (!payosConfig.isConfigured()) {
            return res.status(400).json({
                success: false,
                message: 'PayOS chưa được cấu hình. Vui lòng liên hệ quản trị viên.'
            });
        }

        // Lấy cart của user
        const cart = isBuyNow ? null : await Cart.findOne({ user: req.user._id });
        if (!isBuyNow && (!cart || cart.products.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng trống!'
            });
        }

        // Kiểm tra tồn kho
        const checkoutItems = isBuyNow
            ? [{
                product: normalizedBuyNowProduct.productId,
                quantity: Math.max(1, Number(normalizedBuyNowProduct.quantity) || 1)
            }]
            : pickCheckoutItems(cart, selectedProductIds, selectedProducts);
        if (checkoutItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có sản phẩm hợp lệ để thanh toán!'
            });
        }

        const productMap = {};
        for (const item of checkoutItems) {
            const product = await Product.findById(item.product).populate('shop', 'name code status isActive');
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm không tồn tại!`
                });
            }
            if (!product.isActive || !PUBLIC_PRODUCT_STATUSES.includes(product.status) || (product.shop && (product.shop.status !== 'approved' || product.shop.isActive === false))) {
                return res.status(400).json({
                    success: false,
                    message: product.shop?.isActive === false
                        ? `Shop của sản phẩm "${product.name}" đang tạm nghỉ, chưa thể thanh toán!`
                        : `Sản phẩm "${product.name}" hiện chưa thể mua!`
                });
            }
            if (product.quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm "${product.name}" chỉ còn ${product.quantity} trong kho!`
                });
            }
            if (isBuyNow) {
                const productDiscount = product.discount || 0;
                item.price = productDiscount > 0
                    ? Math.round(product.price * (1 - productDiscount / 100))
                    : product.price;
                item.originalPrice = product.price;
                item.discount = productDiscount;
                item.name = product.name;
                item.image = getProductImage(product);
            }
            productMap[item.product.toString()] = product;
        }

        const subtotal = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Tính giảm giá voucher nếu có (lấy dữ liệu mới nhất từ Coupon)
        let couponDiscount = 0;
        let usedCoupon = null;
        if (couponCode) {
            const { VoucherWallet, VOUCHER_STATUS } = require('../models/voucherWallet');
            const voucher = await VoucherWallet.findOne({ user: req.user._id, code: couponCode.toUpperCase() })
                .populate('coupon');
            
            if (voucher && voucher.status === VOUCHER_STATUS.ACTIVE) {
                const coupon = voucher.coupon;
                // Kiểm tra Coupon còn tồn tại và active
                if (coupon && coupon.isActive) {
                    // Sử dụng dữ liệu mới nhất từ Coupon
                    const couponValue = coupon.value ?? voucher.value;
                    const discountType = coupon.discountType || voucher.discountType;
                    const maxDiscount = coupon.maxDiscount ?? voucher.maxDiscount;
                    const minOrderValue = coupon.minOrderValue ?? voucher.minOrderValue;
                    const couponEndDate = coupon.endDate || voucher.endDate;
                    const applicableSubtotal = coupon.shop
                        ? checkoutItems.reduce((sum, item) => {
                            const product = productMap[item.product.toString()];
                            const productShopId = product?.shop?._id || product?.shop;
                            if (productShopId?.toString() !== coupon.shop.toString()) return sum;
                            return sum + (item.price * item.quantity);
                        }, 0)
                        : subtotal;

                    if (!couponEndDate || new Date(couponEndDate) >= new Date()) {
                        if (applicableSubtotal > 0 && (!minOrderValue || applicableSubtotal >= minOrderValue)) {
                            if (discountType === 'percent') {
                                couponDiscount = Math.round(applicableSubtotal * couponValue / 100);
                                if (maxDiscount) couponDiscount = Math.min(couponDiscount, maxDiscount);
                            } else {
                                couponDiscount = Math.min(couponValue, applicableSubtotal);
                            }
                            usedCoupon = voucher;
                        }
                    }
                }
            }
        }

        const discountedSubtotal = subtotal - couponDiscount;
        // Tổng phí ship = sum các shop (FE đã tính riêng); fallback về shippingFee cũ
        const isShippingFree = Boolean(selectedShippingCoupon);
        const totalShippingFee = isShippingFree 
            ? 0 
            : (Object.values(shippingFeesByShop).reduce((sum, f) => sum + (Number(f) || 0), 0) || (shippingFee || 0));
        const totalPrice = Math.max(0, discountedSubtotal + totalShippingFee);

        // Lấy thông tin shop từ sản phẩm đầu tiên (multi-vendor: mỗi shop sẽ tạo đơn riêng)
        const firstProduct = productMap[checkoutItems[0]?.product?.toString() || checkoutItems[0]?.product];
        const orderShop = firstProduct?.shop?._id || firstProduct?.shop || null;
        const orderShopName = firstProduct?.shop?.name || '';
        const orderShopCode = firstProduct?.shop?.code || '';

        // Tạo đơn hàng
        const order = new Order({
            user: req.user._id,
            shop: orderShop,
            shopName: orderShopName,
            shopCode: orderShopCode,
            products: checkoutItems.map(item => {
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
            couponDiscount,
            couponCode: usedCoupon ? couponCode.toUpperCase() : null,
            shippingFee: totalShippingFee,
            shippingTier,
            shippingProvider,
            totalPrice,
            totalQuantity: checkoutItems.reduce((sum, item) => sum + item.quantity, 0),
            usedCouponId: usedCoupon ? usedCoupon._id : null,
            orderedAt: new Date(),
            estimatedDelivery: new Date(Date.now() + (shippingTier === 'express' ? 3 : 7) * 24 * 60 * 60 * 1000),
            // Thanh toán PayOS hết hạn sau 30 phút
            paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000)
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

        // Tạo mã đơn hàng PayOS (orderCode phải là number, tối đa 10 chữ số)
        const payosOrderCode = Number(`${Date.now()}${Math.random().toString(36).substring(2, 6)}`.slice(0, 10));
        order.payosOrderCode = payosOrderCode;
        await order.save();

        // Tạo payment link
        const paymentData = {
            orderCode: payosOrderCode,
            amount: Math.round(totalPrice),
            description: `TT ${order.orderNumber}`.slice(0, 25),
            buyerName: shippingAddress?.fullName || req.user.fullName || 'Khach hang',
            buyerEmail: req.user.email || '',
            buyerPhone: shippingAddress?.phone || '',
            returnUrl: `${PAYOS_CLIENT_URL}/payment/payos/return?orderId=${order._id}`,
            cancelUrl: `${PAYOS_CLIENT_URL}/payment/payos/return?payment=cancelled&orderId=${order._id}`,
        };

        const response = await payos.paymentRequests.create(paymentData);

        if (response && response.checkoutUrl) {
            // Xóa khỏi giỏ các sản phẩm vừa tạo thanh toán, giữ lại item chưa chọn.
            if (!isBuyNow) {
                await removeCheckoutItemsFromCart(cart, checkoutItems, selectedProducts, selectedProductIds);
            }

            // Đánh dấu voucher là đã sử dụng (sau khi PayOS link tạo thành công)
            if (usedCoupon) {
                const { VoucherWallet, VOUCHER_STATUS } = require('../models/voucherWallet');
                await VoucherWallet.findByIdAndUpdate(usedCoupon._id, {
                    status: VOUCHER_STATUS.USED,
                    usedAt: new Date()
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Tạo link thanh toán thành công',
                data: {
                    orderId: order._id,
                    checkoutUrl: response.checkoutUrl,
                    paymentId: response.paymentLinkId,
                    orderCode: payosOrderCode,
                    qrCode: response.qrCode,
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

        if (error.status || error.code) {
            return res.status(error.status || 400).json({
                success: false,
                message: error.desc || error.message || 'Lỗi từ PayOS',
                error: error.message
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
        // PayOS v2: body chứa { success, code, data: { orderCode, amount, ... } }
        const { success, code, data } = req.body;
        const { orderCode, amount } = data || {};

        console.log('PayOS Webhook received:', req.body);

        // Tìm đơn hàng theo mã PayOS (orderCode từ webhook là number)
        const order = await Order.findOne({ payosOrderCode: Number(orderCode) });

        if (!order) {
            console.log('Order not found for PayOS orderCode:', orderCode);
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Xử lý theo trạng thái thanh toán (PayOS v2: success=true, code='00')
        if (success === true && code === '00') {
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

                // Đánh dấu voucher là đã sử dụng (nếu có)
                if (order.usedCouponId) {
                    const { VoucherWallet, VOUCHER_STATUS } = require('../models/voucherWallet');
                    const Coupon = require('../models/Coupon');
                    await VoucherWallet.findByIdAndUpdate(order.usedCouponId, {
                        status: VOUCHER_STATUS.USED,
                        usedAt: new Date()
                    });
                    if (order.couponCode) {
                        const voucher = await VoucherWallet.findById(order.usedCouponId);
                        if (voucher?.coupon) {
                            await Coupon.findByIdAndUpdate(voucher.coupon, { $inc: { usedCount: 1 } });
                        }
                    }
                }
            }
        } else if (success === false || (code && code !== '00')) {
            // Thanh toán thất bại hoặc bị hủy tại cổng PayOS
            if (order.paymentStatus !== 'paid') {
                order.paymentStatus = 'failed';
                order.status = ORDER_STATUS.CANCELLED;
                order.cancelledAt = new Date();
                order.statusHistory.push({
                    status: ORDER_STATUS.CANCELLED,
                    timestamp: new Date(),
                    note: 'Thanh toán PayOS thất bại/bị hủy tại cổng thanh toán'
                });
                await order.save();

                // Hoàn tồn kho
                for (const item of order.products) {
                    await Product.findByIdAndUpdate(item.product, {
                        $inc: { quantity: item.quantity }
                    });
                }

                console.log('Order payment failed/cancelled:', order.orderNumber);
            }
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
        const { orderId, success, code } = req.query;

        console.log('PayOS Return URL received:', req.query);

        if (success === 'true' || success === true || code === '00') {
            return res.redirect(`${PAYOS_CLIENT_URL}/order-success/${orderId}?payment=success`);
        } else {
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

        let paymentLinkStatus = null;
        try {
            const synced = await syncOrderWithPayOS(order);
            order = synced.order;
            paymentLinkStatus = synced.paymentLink?.status || null;
        } catch (syncError) {
            console.warn('PayOS status sync warning:', syncError.message);
        }

        return res.status(200).json({
            success: true,
            data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                payosStatus: paymentLinkStatus,
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
