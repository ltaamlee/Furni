/**
 * Payment Controller
 * 
 * Xử lý các API liên quan đến thanh toán PayOS
 */

const Coupon = require('../models/coupon');
const Order = require('../models/order');
const Cart = require('../models/cart');
const Product = require('../models/product');
const mongoose = require('mongoose');
const { ORDER_STATUS } = require('../models/order');
const { payosConfig, PAYOS_CLIENT_URL, PAYOS_WEBHOOK_URL } = require('../config/payos');
const payoutService = require('../services/payoutService');
const {
    allocateWalletAmount,
    getOrCreateWallet,
    normalizeMoney,
    refundWallet,
    refundOrderToWallet,
} = require('../services/walletService');
const AdminLedger = require('../models/adminLedger');
const { VoucherWallet, VOUCHER_STATUS } = require('../models/voucherWallet');
const { attachPricing } = require('../utils/pricing');
const {
    notifyCustomerOrderCreated,
    notifyCustomerOrderStatus,
} = require('../services/notificationService');

// Sử dụng thư viện PayOS SDK
const { PayOS } = require('@payos/node');

const {
    LEDGER_TYPE,
    ACCOUNT_TYPE,
    STATUS: LEDGER_STATUS,
} = AdminLedger;

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
    return cart.products.filter((item) =>
        selected.has(item._id.toString()) || selected.has(item.product.toString())
    );
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
        const selected = new Set(selectedProductIds.map((id) => id.toString()));
        const checkoutProductIds = new Set(checkoutItems.map((item) => item.product.toString()));
        cart.products = cart.products.filter((item) =>
            !selected.has(item._id.toString()) &&
            !(selected.has(item.product.toString()) && checkoutProductIds.has(item.product.toString()))
        );
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

    // Đánh dấu voucher USED — chỉ xử lý ở webhook để tránh trùng lặp
    // (webhook gọi markPayOSOrderPaid nên voucher được xử lý ở đó)

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
    const relatedOrders = await Order.find({ payosOrderCode: Number(order.payosOrderCode) });

    if (status === 'PAID') {
        for (const payosOrder of relatedOrders) {
            await markPayOSOrderPaid(payosOrder);
        }
        order.paymentStatus = 'paid';
    } else if (['CANCELLED', 'EXPIRED', 'FAILED'].includes(status) && order.paymentStatus !== 'paid' && order.status !== ORDER_STATUS.CANCELLED) {
        for (const payosOrder of relatedOrders) {
            if (payosOrder.paymentStatus !== 'paid' && payosOrder.status !== ORDER_STATUS.CANCELLED) {
                payosOrder.paymentStatus = 'failed';
                payosOrder.status = ORDER_STATUS.CANCELLED;
                payosOrder.cancelledAt = new Date();
                payosOrder.statusHistory.push({
                    status: ORDER_STATUS.CANCELLED,
                    timestamp: new Date(),
                    note: `Thanh toán PayOS ${status.toLowerCase()}`
                });
                await payosOrder.save();
                // Hoàn tồn kho (chỉ khi chưa paid — tức chưa trừ)
                for (const item of payosOrder.products) {
                    await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
                }
                // Hoàn ví điện tử (phần đã dùng)
                await refundOrderToWallet(payosOrder, {
                    description: `Hoàn tiền từ hủy PayOS đơn #${payosOrder.orderNumber}`,
                });
            }
        }
        order.paymentStatus = 'failed';
        order.status = ORDER_STATUS.CANCELLED;
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
        const paymentAmount = normalizeMoney(order.payableAmount ?? order.totalPrice);
        if (paymentAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Don hang khong con so tien can thanh toan qua PayOS'
            });
        }

        const paymentData = {
            orderCode: payosOrderCode,
            amount: Math.round(paymentAmount), // PayOS yêu cầu số nguyên
            description: `TT ${order.orderNumber}`.slice(0, 25),
            buyerName: order.shippingAddress?.fullName || req.user.fullName || 'Khach hang',
            buyerEmail: req.user.email || '',
            buyerPhone: order.shippingAddress?.phone || '',
            returnUrl: `${PAYOS_CLIENT_URL}/payment/payos/return?orderId=${order._id}`,
            cancelUrl: `${PAYOS_CLIENT_URL}/orders/${order._id}`,
            webhookUrl: PAYOS_WEBHOOK_URL || undefined,
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
        const {
            mode,
            items,
            cartItemIds,
            shippingAddress,
            shippingTier = 'express',
            shippingProvider = null,
            shippingFee,
            shippingFeesByShop = {},
            note,
            selectedProductIds = [],
            selectedProducts = [],
            buyNowProduct = null,
            couponCode = null,
            shopCouponCodes = {},
            selectedShippingCoupon = null,
            useWalletBalance = false,
            walletAmount = 0
        } = req.body;
        const normalizedBuyNowProduct = buyNowProduct?.productId
            ? buyNowProduct
            : (req.body.buyNowProductId
                ? { productId: req.body.buyNowProductId, quantity: req.body.buyNowQuantity, variantId: req.body.buyNowVariantId || null }
                : null);
        const legacyBuyNowActive = Boolean(normalizedBuyNowProduct?.productId && Number(normalizedBuyNowProduct.quantity) > 0);
        const effectiveMode = mode || (legacyBuyNowActive ? 'BUY_NOW' : 'CART');
        const isBuyNow = effectiveMode === 'BUY_NOW';

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
        let checkoutItems = [];
        if (isBuyNow && Array.isArray(items) && items.length > 0) {
            checkoutItems = items
                .filter((item) => item.productId && Number(item.quantity) > 0)
                .map((item) => ({
                    product: item.productId,
                    quantity: Math.max(1, Number(item.quantity) || 1),
                    variantId: item.variantId || null,
                }));
        } else if (isBuyNow && legacyBuyNowActive) {
            checkoutItems = [{
                product: normalizedBuyNowProduct.productId,
                quantity: Math.max(1, Number(normalizedBuyNowProduct.quantity) || 1),
                variantId: normalizedBuyNowProduct.variantId || null,
            }];
        } else if (!isBuyNow && Array.isArray(cartItemIds) && cartItemIds.length > 0) {
            const selected = new Set(cartItemIds.map((id) => id.toString()));
            checkoutItems = cart.products.filter((item) =>
                selected.has(item._id.toString()) || selected.has(item.product.toString())
            );
        } else {
            checkoutItems = pickCheckoutItems(cart, selectedProductIds, selectedProducts);
        }
        if (checkoutItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có sản phẩm hợp lệ để thanh toán!'
            });
        }

        const productMap = {};
        const productList = [];
        for (const item of checkoutItems) {
            const product = await Product.findById(item.product).select('+variants').populate('shop', 'name code status isActive');
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
            const availableStock = item.variantStock ?? product.quantity;
            if (availableStock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm "${product.name}" chỉ còn ${product.quantity} trong kho!`
                });
            }
            productMap[item.product.toString()] = product;
            productList.push(product.toObject ? product.toObject() : product);
        }

        // Sync PayOS order pricing with checkout preview: use current promotion/flash-sale pricing.
        await attachPricing(productList);
        const pricedProductMap = Object.fromEntries(productList.map((product) => [product._id.toString(), product]));

        for (const item of checkoutItems) {
            const pricedProduct = pricedProductMap[item.product.toString()];
            const variant = item.variantId
                ? pricedProduct?.variants?.find((v) => v._id?.toString() === item.variantId.toString())
                : null;
            const productDiscount = variant?.discountPercent ?? pricedProduct?.discountPercent ?? item.discount ?? pricedProduct?.discount ?? 0;
            const originalPrice = item.originalPrice ?? item.variantPrice ?? variant?.originalPrice ?? variant?.price ?? pricedProduct?.originalPrice ?? pricedProduct?.price ?? 0;
            const salePrice = variant?.salePrice ?? pricedProduct?.salePrice ?? (productDiscount > 0
                ? Math.round(originalPrice * (1 - productDiscount / 100))
                : originalPrice);

            item.price = salePrice;
            item.originalPrice = originalPrice;
            item.discount = productDiscount || 0;
            item.variantId = item.variantId || variant?._id || null;
            item.variant = item.variant || variant?.name || null;
            item.variantSku = item.variantSku || variant?.sku || null;
            item.variantSize = item.variantSize || variant?.size || null;
            item.variantColor = item.variantColor || variant?.color || null;
            item.variantMaterial = item.variantMaterial || variant?.material || null;
            item.variantStyle = item.variantStyle || variant?.style || null;
            item.variantDimensions = item.variantDimensions || variant?.dimensions || null;
            item.variantWeight = item.variantWeight ?? variant?.weight ?? 0;
            item.variantDescription = item.variantDescription || variant?.description || null;
            item.name = item.name || pricedProduct?.name;
            item.image = item.image || getProductImage(pricedProduct);
        }

        const subtotal = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const shopGroups = {};
        for (const item of checkoutItems) {
            const product = productMap[item.product.toString()];
            const shopId = product?.shop?._id?.toString() || 'no-shop';
            if (!shopGroups[shopId]) {
                shopGroups[shopId] = { shopId, shopName: product?.shop?.name || '', items: [] };
            }
            shopGroups[shopId].items.push(item);
        }
        const shopKeys = Object.keys(shopGroups);

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

        const globalCouponDiscount = couponDiscount;
        const shopCouponDiscounts = {};
        const usedShopCoupons = {};
        if (shopCouponCodes && typeof shopCouponCodes === 'object') {
            for (const [shopId, code] of Object.entries(shopCouponCodes)) {
                if (!code) continue;
                const voucher = await VoucherWallet.findOne({ user: req.user._id, code: String(code).toUpperCase() })
                    .populate('coupon');
                if (!voucher || voucher.status !== VOUCHER_STATUS.ACTIVE || !voucher.coupon?.isActive) continue;

                const coupon = voucher.coupon;
                const couponShopId = coupon.shop ? coupon.shop.toString() : null;
                if (couponShopId && couponShopId !== shopId) continue;

                const applicableSubtotal = (shopGroups[shopId]?.items || []).reduce(
                    (sum, item) => sum + (Number(item.price) * Number(item.quantity)),
                    0
                );
                const couponEndDate = coupon.endDate || voucher.endDate;
                const minOrderValue = coupon.minOrderValue ?? voucher.minOrderValue;
                if (couponEndDate && new Date(couponEndDate) < new Date()) continue;
                if (applicableSubtotal <= 0 || (minOrderValue && applicableSubtotal < minOrderValue)) continue;

                const couponValue = coupon.value ?? voucher.value;
                const maxDiscount = coupon.maxDiscount ?? voucher.maxDiscount;
                let discount = 0;
                if ((coupon.discountType || voucher.discountType) === 'percent') {
                    discount = Math.round(applicableSubtotal * couponValue / 100);
                    if (maxDiscount) discount = Math.min(discount, maxDiscount);
                } else {
                    discount = Math.min(couponValue, applicableSubtotal);
                }

                shopCouponDiscounts[shopId] = discount;
                usedShopCoupons[shopId] = voucher;
                couponDiscount += discount;
            }
        }

        {
            const checkoutGroupId = new mongoose.Types.ObjectId().toString();
            const createdOrders = [];
            const isShippingFree = Boolean(selectedShippingCoupon);
            const usedCouponShopId = usedCoupon?.coupon?.shop ? usedCoupon.coupon.shop.toString() : null;
            const now = new Date();
            const estimatedDelivery = new Date(now.getTime() + (shippingTier === 'express' ? 3 : 7) * 24 * 60 * 60 * 1000);
            let totalPrice = 0;
            const totalByShop = {};

            for (const shopId of shopKeys) {
                const group = shopGroups[shopId];
                const groupItems = group.items || [];
                const groupSubtotal = groupItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
                let groupShippingFee = (shippingFeesByShop[shopId] !== undefined && shippingFeesByShop[shopId] !== null)
                    ? Number(shippingFeesByShop[shopId])
                    : (shippingFee || 0);
                if (isShippingFree) groupShippingFee = 0;

                const globalGroupDiscount = usedCouponShopId
                    ? (shopId === usedCouponShopId ? globalCouponDiscount : 0)
                    : (usedCoupon ? (subtotal > 0 ? Math.round(globalCouponDiscount * groupSubtotal / subtotal) : 0) : 0);
                const groupCouponDiscount = globalGroupDiscount + (shopCouponDiscounts[shopId] || 0);
                totalByShop[shopId] = Math.max(0, groupSubtotal - groupCouponDiscount + groupShippingFee);
            }

            const checkoutTotal = shopKeys.reduce((sum, key) => sum + (totalByShop[key] || 0), 0);
            let walletForPartialPayment = null;
            let walletAllocationByShop = {};

            if (useWalletBalance === true || normalizeMoney(walletAmount) > 0) {
                walletForPartialPayment = await getOrCreateWallet(req.user._id);
                const requestedWalletAmount = normalizeMoney(walletAmount) > 0
                    ? normalizeMoney(walletAmount)
                    : checkoutTotal;
                const usableWalletAmount = Math.min(
                    normalizeMoney(walletForPartialPayment.balance),
                    requestedWalletAmount,
                    normalizeMoney(checkoutTotal)
                );

                if (usableWalletAmount > 0) {
                    walletAllocationByShop = allocateWalletAmount(shopKeys, totalByShop, usableWalletAmount);
                }
            }

            for (const shopId of shopKeys) {
                const group = shopGroups[shopId];
                const groupItems = group.items || [];
                const groupSubtotal = groupItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
                let groupShippingFee = (shippingFeesByShop[shopId] !== undefined && shippingFeesByShop[shopId] !== null)
                    ? Number(shippingFeesByShop[shopId])
                    : (shippingFee || 0);
                if (isShippingFree) groupShippingFee = 0;

                const globalGroupDiscount = usedCouponShopId
                    ? (shopId === usedCouponShopId ? globalCouponDiscount : 0)
                    : (usedCoupon ? (subtotal > 0 ? Math.round(globalCouponDiscount * groupSubtotal / subtotal) : 0) : 0);
                const groupCouponDiscount = globalGroupDiscount + (shopCouponDiscounts[shopId] || 0);
                const groupTotal = Math.max(0, groupSubtotal - groupCouponDiscount + groupShippingFee);
                const walletUsedAmount = normalizeMoney(walletAllocationByShop[shopId]);
                const groupPayableAmount = Math.max(0, groupTotal - walletUsedAmount);
                totalPrice += groupPayableAmount;

                const firstGroupProduct = productMap[groupItems[0]?.product?.toString()];
                const groupShop = firstGroupProduct?.shop || null;
                const groupShippingProvider = shippingProvider && typeof shippingProvider === 'object' && !Array.isArray(shippingProvider)
                    ? (shippingProvider[shopId] || shippingProvider)
                    : shippingProvider;

                // ── Xác định ai tài trợ voucher ───────────────────────
                const isPlatformCoupon = Boolean(usedCoupon) && !usedCouponShopId; // coupon.shop === null
                const groupVoucherPlatformAmount = isPlatformCoupon
                    ? globalGroupDiscount
                    : 0;

                const order = new Order({
                    user: req.user._id,
                    checkoutGroupId,
                    shop: groupShop?._id || groupShop || null,
                    shopName: groupShop?.name || '',
                    shopCode: groupShop?.code || '',
                    products: groupItems.map((item) => {
                        const product = productMap[item.product.toString()];
                        return {
                            product: item.product,
                            shop: product.shop?._id || product.shop || null,
                            shopName: product.shop?.name || '',
                            shopCode: product.shop?.code || '',
                            quantity: item.quantity,
                            price: item.price,
                            originalPrice: item.originalPrice,
                            discount: item.discount,
                            variant: item.variant || null,
                            variantId: item.variantId || null,
                            variantSku: item.variantSku || null,
                            variantSize: item.variantSize || null,
                            variantColor: item.variantColor || null,
                            variantMaterial: item.variantMaterial || null,
                            variantStyle: item.variantStyle || null,
                            variantDimensions: item.variantDimensions || null,
                            variantWeight: item.variantWeight ?? 0,
                            variantDescription: item.variantDescription || null,
                            name: item.name,
                            image: item.image
                        };
                    }),
                    shippingAddress: {
                        ...shippingAddress,
                        note: note || shippingAddress?.note || ''
                    },
                    paymentMethod: 'PAYOS',
                    paymentStatus: 'pending',
                    walletUsedAmount,
                    payableAmount: groupPayableAmount,
                    subtotal: groupSubtotal,
                    couponDiscount: groupCouponDiscount,
                    couponCode: usedCoupon
                        ? (usedCouponShopId ? (shopId === usedCouponShopId ? couponCode.toUpperCase() : null) : (shopId === shopKeys[0] ? couponCode.toUpperCase() : null))
                        : (usedShopCoupons[shopId]?.code || null),
                    shippingFee: groupShippingFee,
                    shippingTier,
                    shippingProvider: groupShippingProvider,
                    totalPrice: groupTotal,
                    totalQuantity: groupItems.reduce((sum, item) => sum + Number(item.quantity), 0),
                    usedCouponId: usedCoupon
                        ? (usedCouponShopId ? (shopId === usedCouponShopId ? usedCoupon._id : null) : (shopId === shopKeys[0] ? usedCoupon._id : null))
                        : (usedShopCoupons[shopId]?._id || null),
                    orderedAt: now,
                    estimatedDelivery,
                    paymentExpiresAt: new Date(now.getTime() + 30 * 60 * 1000),
                    // ── Platform ledger fields ───────────────────────────
                    voucherSponsorType: groupCouponDiscount > 0 ? (isPlatformCoupon ? 'platform' : 'shop') : null,
                    voucherPlatformAmount: groupVoucherPlatformAmount,
                    shippingSponsorType: isShippingFree ? 'platform' : null,
                    shippingPlatformAmount: isShippingFree ? (groupShippingFee) : 0,
                });

                await order.save();
                createdOrders.push(order);
            }

            if (totalPrice <= 0) {
                await Order.deleteMany({ _id: { $in: createdOrders.map((order) => order._id) } });
                return res.status(400).json({
                    success: false,
                    message: 'So du vi da du thanh toan don hang, vui long chon thanh toan bang vi SORA.'
                });
            }

            const payos = getPayOSInstance();
            if (!payos) {
                await Order.deleteMany({ _id: { $in: createdOrders.map((order) => order._id) } });
                return res.status(500).json({
                    success: false,
                    message: 'KhÃ´ng thá»ƒ khá»Ÿi táº¡o PayOS'
                });
            }

            const payosOrderCode = Number(`${Date.now()}${Math.random().toString(36).substring(2, 6)}`.slice(0, 10));
            for (const order of createdOrders) {
                order.payosOrderCode = payosOrderCode;
                await order.save();
            }

            const firstOrder = createdOrders[0];
            const paymentData = {
                orderCode: payosOrderCode,
                amount: Math.round(totalPrice),
                description: `TT ${firstOrder.orderNumber}`.slice(0, 25),
                buyerName: shippingAddress?.fullName || req.user.fullName || 'Khach hang',
                buyerEmail: req.user.email || '',
                buyerPhone: shippingAddress?.phone || '',
                returnUrl: `${PAYOS_CLIENT_URL}/payment/payos/return?orderId=${firstOrder._id}`,
                cancelUrl: `${PAYOS_CLIENT_URL}/orders/${firstOrder._id}`,
                webhookUrl: PAYOS_WEBHOOK_URL || undefined,
            };

            const response = await payos.paymentRequests.create(paymentData);

            if (response && response.checkoutUrl) {
                if (walletForPartialPayment) {
                    for (const order of createdOrders) {
                        const walletDeduction = normalizeMoney(order.walletUsedAmount);
                        if (walletDeduction > 0) {
                            await walletForPartialPayment.deductForPayment(walletDeduction, {
                                orderId: order._id,
                                orderNumber: order.orderNumber,
                                description: `Dung so du vi SORA cho don hang #${order.orderNumber}`,
                            });
                        }
                    }
                }

                if (!isBuyNow) {
                    const selectedIdsForRemoval = Array.isArray(cartItemIds) && cartItemIds.length > 0
                        ? cartItemIds
                        : selectedProductIds;
                    await removeCheckoutItemsFromCart(cart, checkoutItems, selectedProducts, selectedIdsForRemoval);
                }

                // Đánh dấu voucher USED chỉ được xử lý trong webhook khi thanh toán thành công
                // (tránh trường hợp PayOS chưa trả tiền mà voucher đã bị đánh dấu USED)

                for (const order of createdOrders) {
                    await notifyCustomerOrderCreated(order);
                }

                return res.status(200).json({
                    success: true,
                    message: 'Táº¡o link thanh toÃ¡n thÃ nh cÃ´ng',
                    data: {
                        orderId: firstOrder._id,
                        orders: createdOrders,
                        checkoutUrl: response.checkoutUrl,
                        paymentId: response.paymentLinkId,
                        orderCode: payosOrderCode,
                        qrCode: response.qrCode,
                        ...(walletForPartialPayment ? { walletBalance: walletForPartialPayment.balance } : {}),
                    }
                });
            }

            await Order.deleteMany({ _id: { $in: createdOrders.map((order) => order._id) } });
            return res.status(500).json({
                success: false,
                message: 'KhÃ´ng thá»ƒ táº¡o link thanh toÃ¡n'
            });
        }

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
        const rawBody = req.body;
        console.log('=== PayOS Webhook received ===');
        console.log('Raw body:', JSON.stringify(rawBody));

        // ── 1. Verify signature bằng PayOS SDK ──────────────────────────
        const payos = getPayOSInstance();
        if (!payos) {
            console.error('PayOS instance not available — cannot verify webhook');
            return res.status(500).json({ success: false, message: 'Server config error' });
        }

        let verifiedData;
        try {
            // SDK verify() sẽ hash data.body với checksumKey và so với signature
            verifiedData = await payos.webhooks.verify(rawBody);
            console.log('✅ Signature verified. Data:', JSON.stringify(verifiedData));
        } catch (verifyErr) {
            console.error('❌ Webhook signature verification failed:', verifyErr.message);
            return res.status(401).json({ success: false, message: 'Invalid signature' });
        }

        // verifiedData có cấu trúc PayOS v3:
        // { orderCode, amount, description, accountNumber, reference, transactionDateTime,
        //   currency, paymentLinkId, code, desc, ... }
        const { orderCode, amount, code, desc } = verifiedData;

        console.log('Parsed - orderCode:', orderCode, '| amount:', amount, '| code:', code, '| desc:', desc);

        // ── 2. Tìm đơn hàng theo mã PayOS ────────────────────────────
        const orders = await Order.find({ payosOrderCode: Number(orderCode) });
        const order = orders[0];

        console.log('Orders found by payosOrderCode:', orderCode, '-> count:', orders.length);
        if (order) {
            console.log('First order:', order.orderNumber, '| status:', order.status, '| paymentStatus:', order.paymentStatus);
        }

        if (!order) {
            console.log('Order not found for PayOS orderCode:', orderCode);
            return res.status(200).json({ success: true, message: 'Order not found, skip' });
        }

        // ── 3. Xử lý: thành công (code='00') ─────────────────────────
        if (code === '00') {
            // Guard: đã paid rồi → bỏ qua
            if (order.paymentStatus === 'paid') {
                console.log('Order already paid, skip');
                return res.status(200).json({ success: true, message: 'Already processed' });
            }

            // Tổng số PayOS nhận = sum payableAmount của tất cả orders cùng checkoutGroupId
            const totalPayosReceived = orders.reduce((sum, o) => sum + normalizeMoney(o.payableAmount), 0);

            // Ghi ledger: PayOS settlement vào PAYOS_HOLDING
            console.log('→ Creating AdminLedger PAYOS_SETTLEMENT_IN:', {
                type: LEDGER_TYPE.PAYOS_SETTLEMENT_IN,
                amount: totalPayosReceived,
                accountCredit: ACCOUNT_TYPE.PAYOS_HOLDING,
                orderNumber: order.orderNumber,
            });
            await AdminLedger.create([{
                order: order._id,
                orderNumber: order.orderNumber,
                checkoutGroupId: order.checkoutGroupId,
                type: LEDGER_TYPE.PAYOS_SETTLEMENT_IN,
                amount: totalPayosReceived,
                accountDebit: null,
                accountCredit: ACCOUNT_TYPE.PAYOS_HOLDING,
                customer: order.user,
                status: LEDGER_STATUS.COMPLETED,
                description: `PayOS thanh toán đơn #${order.orderNumber} (+${orders.length - 1} đơn con)`,
            }]);
            console.log('✅ AdminLedger PAYOS_SETTLEMENT_IN created');

            // Xử lý từng order con
            for (const payosOrder of orders) {
                if (payosOrder.paymentStatus === 'paid') continue;

                payosOrder.paymentStatus = 'paid';
                payosOrder.status = ORDER_STATUS.PENDING;

                // Trừ tồn kho
                const products = await Product.find({
                    _id: { $in: payosOrder.products.map(p => p.product) }
                });
                for (const item of payosOrder.products) {
                    const product = products.find(p => p._id.toString() === item.product.toString());
                    if (product && product.quantity >= item.quantity) {
                        await Product.findByIdAndUpdate(item.product, {
                            $inc: { quantity: -item.quantity, sold: item.quantity }
                        });
                    }
                }

                // Đánh dấu voucher USED
                if (payosOrder.usedCouponId) {
                    await VoucherWallet.findByIdAndUpdate(payosOrder.usedCouponId, {
                        status: VOUCHER_STATUS.USED,
                        usedAt: new Date(),
                        usedForOrder: payosOrder._id,
                    });
                    await Coupon.findByIdAndUpdate(
                        (await VoucherWallet.findById(payosOrder.usedCouponId))?.coupon,
                        { $inc: { usedCount: 1 } }
                    );
                }

                await payosOrder.save();
                await notifyCustomerOrderStatus(payosOrder, ORDER_STATUS.PENDING, {
                    message: 'Thanh toán PayOS thành công. Đơn hàng đang chờ shop xác nhận.',
                });
                console.log('Order paid:', payosOrder.orderNumber);
            }

        // ── 4. Xử lý: thất bại / hủy / timeout (code != '00') ─────────
        } else {
            // Guard: đã paid hoặc đã cancelled → bỏ qua
            if (order.paymentStatus === 'paid' || order.status === ORDER_STATUS.CANCELLED) {
                console.log('Order already paid/cancelled, skip');
                return res.status(200).json({ success: true, message: 'Already processed' });
            }

            // Hoàn tồn kho
            for (const payosOrder of orders) {
                for (const item of payosOrder.products) {
                    await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
                }
            }

            // Hoàn ví (nếu có dùng ví điện tử)
            const totalPaid = orders.reduce((sum, o) => sum + normalizeMoney(o.walletUsedAmount), 0);
            if (totalPaid > 0) {
                await refundWallet(order.user, totalPaid, {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    paymentMethod: 'PAYOS',
                    description: `Hoan tien tu huy PayOS ${orders.length} don (#${order.orderNumber}...)`,
                });
                for (const o of orders) {
                    if (normalizeMoney(o.walletUsedAmount) > 0) {
                        o.paymentStatus = 'refunded';
                        o.walletRefundedAmount = normalizeMoney(o.walletUsedAmount);
                        o.refundedToWalletAt = new Date();
                    }
                }
            }

            // Rollback voucher → ACTIVE
            for (const payosOrder of orders) {
                if (payosOrder.usedCouponId && !payosOrder.voucherRolledBack) {
                    await VoucherWallet.findByIdAndUpdate(payosOrder.usedCouponId, {
                        status: VOUCHER_STATUS.ACTIVE,
                        usedAt: null,
                        usedForOrder: null,
                    });
                    await Coupon.findByIdAndUpdate(
                        (await VoucherWallet.findById(payosOrder.usedCouponId))?.coupon,
                        { $inc: { usedCount: -1 } }
                    );
                    payosOrder.voucherRolledBack = true;
                }
                payosOrder.paymentStatus = 'failed';
                payosOrder.status = ORDER_STATUS.CANCELLED;
                payosOrder.cancelledAt = new Date();
                payosOrder.statusHistory.push({
                    status: ORDER_STATUS.CANCELLED,
                    timestamp: new Date(),
                    note: `Thanh toan PayOS that bai: ${desc || code}`
                });
                await payosOrder.save();
                await notifyCustomerOrderStatus(payosOrder, ORDER_STATUS.CANCELLED, {
                    message: 'Thanh toan PayOS that bai.',
                    refundedAmount: normalizeMoney(payosOrder.walletUsedAmount),
                });
            }

            // Ghi ledger refund
            if (totalPaid > 0) {
                await AdminLedger.create([{
                    order: order._id,
                    orderNumber: order.orderNumber,
                    checkoutGroupId: order.checkoutGroupId,
                    type: LEDGER_TYPE.REFUND_TO_CUSTOMER,
                    amount: totalPaid,
                    accountDebit: ACCOUNT_TYPE.PAYOS_HOLDING,
                    accountCredit: null,
                    customer: order.user,
                    status: LEDGER_STATUS.COMPLETED,
                    description: `Hoan tien PayOS cho khach don #${order.orderNumber}`,
                }]);
            }

            console.log('PayOS payment failed/cancelled:', order.orderNumber, '| code:', code, '| desc:', desc);
        }

        console.log('✅ Webhook fully processed');
        return res.status(200).json({ success: true, message: 'Webhook processed' });

    } catch (error) {
        console.error('PayOS Webhook error:', error);
        return res.status(500).json({ success: false, message: 'Loi xu ly webhook' });
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

        let order = await Order.findById(orderId);

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

        const relatedOrders = order.payosOrderCode
            ? await Order.find({
                payosOrderCode: Number(order.payosOrderCode),
                user: order.user
            })
                .populate('shop', 'name code logo')
                .populate('products.product', 'name images slug')
                .sort({ createdAt: 1 })
            : [order];
        const relatedOrderObjects = relatedOrders.map((item) => item.toObject ? item.toObject() : item);

        return res.status(200).json({
            success: true,
            data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                payosStatus: paymentLinkStatus,
                totalPrice: order.totalPrice,
                relatedOrders: relatedOrderObjects,
                orderNumbers: relatedOrderObjects.map((item) => item.orderNumber).filter(Boolean)
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

        // Chỉ hủy nếu chưa bị hủy hoặc chưa thanh toán (tránh trùng lặp khi webhook cũng gọi)
        if (order.paymentStatus !== 'paid') {
            const relatedOrders = order.payosOrderCode
                ? await Order.find({ payosOrderCode: order.payosOrderCode })
                : [order];

            // Tính tổng wallet đã dùng cho CẢ NHÓM (tránh refund nhiều lần)
            const totalWalletUsed = relatedOrders.reduce(
                (sum, o) => sum + normalizeMoney(o.walletUsedAmount), 0
            );

            // Hoàn tiền 1 LẦN cho cả nhóm (chỉ nếu có walletUsedAmount)
            let refunded = false;
            if (totalWalletUsed > 0) {
                const result = await refundOrderToWallet(order, {
                    description: `Hoan tien ${totalWalletUsed.toLocaleString('vi-VN')}đ phan vi da dung cho ${relatedOrders.length} don (${relatedOrders.map(o => o.orderNumber).join(', ')})`,
                });
                refunded = result.amount > 0;
            }

            // Ghi ledger refund (trừ PAYOS_HOLDING)
            if (totalWalletUsed > 0) {
                await AdminLedger.create([{
                    order: order._id,
                    orderNumber: order.orderNumber,
                    checkoutGroupId: order.checkoutGroupId,
                    type: LEDGER_TYPE.REFUND_TO_CUSTOMER,
                    amount: totalWalletUsed,
                    accountDebit: ACCOUNT_TYPE.PAYOS_HOLDING,
                    accountCredit: null,
                    customer: order.user,
                    status: LEDGER_STATUS.COMPLETED,
                    description: `Hoan tien tu huy PayOS ${relatedOrders.length} don (#${order.orderNumber})`,
                }]);
            }

            for (const payosOrder of relatedOrders) {
                if (payosOrder.status !== ORDER_STATUS.CANCELLED) {
                    payosOrder.status = ORDER_STATUS.CANCELLED;
                    payosOrder.paymentStatus = refunded ? 'refunded' : 'failed';
                    payosOrder.cancelledAt = new Date();
                    payosOrder.statusHistory.push({
                        status: ORDER_STATUS.CANCELLED,
                        timestamp: new Date(),
                        note: refunded
                            ? `Huy don, hoan ${normalizeMoney(payosOrder.walletUsedAmount).toLocaleString('vi-VN')}đ vao vi`
                            : 'Huy thanh toan PayOS (khong co thanh toan vi)'
                    });
                    await payosOrder.save();
                    await notifyCustomerOrderStatus(payosOrder, ORDER_STATUS.CANCELLED, {
                        message: 'Bạn đã hủy thanh toán PayOS.',
                        refundedAmount: normalizeMoney(payosOrder.walletUsedAmount),
                    });
                }
            }

            return res.status(200).json({
                success: true,
                message: refunded
                    ? `Da huy ${relatedOrders.length} don, hoan ${totalWalletUsed.toLocaleString('vi-VN')}đ vao vi`
                    : `Da huy ${relatedOrders.length} don thanh toan PayOS`,
                refundedAmount: refunded ? totalWalletUsed : 0,
            });
        }

        if (order.status === ORDER_STATUS.CANCELLED) {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã được hủy trước đó'
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

        // Hoàn tiền vào ví điện tử của khách
        const refundResult = await refundOrderToWallet(order, {
            orderId: order._id,
            orderNumber: order.orderNumber,
            paymentMethod: 'PAYOS',
            description: `Hoàn tiền từ hủy PayOS đơn #${order.orderNumber}`,
        });
        await order.save();
        await notifyCustomerOrderStatus(order, ORDER_STATUS.CANCELLED, {
            message: 'Đơn PayOS đã được hủy.',
            refundedAmount: refundResult?.amount || 0,
        });

        return res.status(200).json({
            success: true,
            message: 'Đã hủy đơn hàng, hoàn tồn kho và hoàn tiền vào ví'
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
