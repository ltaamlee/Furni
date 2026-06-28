const mongoose = require('mongoose');
const Order = require('../models/order');
const Cart = require('../models/cart');
const Product = require('../models/product');
const Shop = require('../models/Shop');
const Notification = require('../models/notification');
const { ORDER_STATUS } = require('../models/order');
const payoutService = require('../services/payoutService');
const { attachPricing } = require('../utils/pricing');
const { VoucherWallet, VOUCHER_STATUS } = require('../models/voucherWallet');
const {
    allocateWalletAmount,
    getOrCreateWallet,
    normalizeMoney,
    refundOrderToWallet,
} = require('../services/walletService');
const PUBLIC_PRODUCT_STATUSES = ['active', 'out_of_stock'];

const getProductImage = (product) => {
    const firstImage = Array.isArray(product.images) ? product.images[0] : null;
    return firstImage?.url || firstImage || product.image || null;
};

const getShopShippingProvider = (shippingProvider, shopId) => {
    if (!shippingProvider || typeof shippingProvider !== 'object' || Array.isArray(shippingProvider)) {
        return shippingProvider || null;
    }

    if (shippingProvider.code || shippingProvider.name || shippingProvider._id) {
        return shippingProvider;
    }

    return shippingProvider[shopId.toString()] || null;
};

const removeCheckoutItemsFromCart = async (cart, checkoutItems, selectedProductIds = []) => {
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
    // If no selection, keep all (STEP 11: items are from preview, not all cart)
    // Just remove purchased items
    const purchased = new Set(checkoutItems.map((item) => item.product.toString()));
    cart.products = cart.products.filter((item) => !purchased.has(item.product.toString()));
    await cart.save();
};

// Gửi thông báo "đơn mới" tới vendor của từng shop có trong đơn
const notifyVendorsNewOrder = async (order) => {
    try {
        const shopIds = [...new Set((order.products || []).map((p) => p.shop && p.shop.toString()).filter(Boolean))];
        if (shopIds.length === 0) return;
        const shops = await Shop.find({ _id: { $in: shopIds } }).select('owner name');
        await Notification.create(shops.filter((s) => s.owner).map((s) => ({
            user: s.owner,
            type: 'order',
            title: 'Đơn hàng mới cần xác nhận',
            body: `Đơn ${order.orderNumber} vừa được đặt · ${order.totalPrice.toLocaleString('vi-VN')}₫`,
            relatedId: order._id,
            relatedModel: 'Order',
            link: '/vendor/orders'
        })));
    } catch (e) {
        console.error('notifyVendorsNewOrder error:', e.message);
    }
};

// @desc    Create order from cart or buy now
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    try {
        const {
            mode,                // 'BUY_NOW' | 'CART'  (STEP 11)
            items,               // BUY_NOW: [{ productId, quantity }]
            cartItemIds,         // CART: string[]
            shippingAddress,
            paymentMethod = 'COD',
            note,
            orderNotes = {},     // { [shopId]: string } — lời nhắn cho từng shop
            shippingProvider = null,   // { [shopId]: { _id, name, code } } (STEP 11)
            shippingFeesByShop = {},    // { [shopId]: fee } (STEP 11)
            couponCode = null,
            selectedShippingCoupon = null,
            useWalletBalance = false,
            walletAmount = 0,
        } = req.body;

        // Backward compat: legacy fields (buyNowProduct, selectedProductIds, etc.)
        const legacyBuyNow = req.body.buyNowProduct
            || (req.body.buyNowProductId ? { productId: req.body.buyNowProductId, quantity: req.body.buyNowQuantity } : null);
        const legacyBuyNowActive = Boolean(legacyBuyNow?.productId && Number(legacyBuyNow.quantity) > 0);

        // Normalize mode: new payload has explicit mode; fall back to legacy detection
        const effectiveMode = mode || (legacyBuyNowActive ? 'BUY_NOW' : 'CART');
        const isBuyNow = effectiveMode === 'BUY_NOW';

        // Normalize items
        let checkoutItems = [];
        if (isBuyNow && Array.isArray(items) && items.length > 0) {
            // STEP 11 format: items = [{ productId, quantity, variantId? }]
            checkoutItems = items
                .filter(i => i.productId && Number(i.quantity) > 0)
                .map(i => ({ product: i.productId, quantity: Math.max(1, Number(i.quantity)), variantId: i.variantId || null }));
        } else if (isBuyNow && legacyBuyNowActive) {
            // Legacy format
            checkoutItems = [{ product: legacyBuyNow.productId, quantity: Math.max(1, Number(legacyBuyNow.quantity)) }];
        } else if (!isBuyNow && Array.isArray(cartItemIds) && cartItemIds.length > 0) {
            // STEP 11 CART format
            const cart = await Cart.findOne({ user: req.user._id }).lean();
            if (!cart || cart.products.length === 0) {
                return res.status(400).json({ success: false, message: 'Giỏ hàng trống!' });
            }
            const selected = new Set(cartItemIds.map(id => id.toString()));
            checkoutItems = cart.products
                .filter(p => selected.has(p._id.toString()) || selected.has(p.product.toString()))
                .map(p => {
                    const plain = p.toObject ? p.toObject() : p;
                    return { ...plain, product: p.product, quantity: p.quantity };
                });
        } else {
            // Legacy CART format
            const { selectedProductIds = [], selectedProducts = [] } = req.body;
            const cart = await Cart.findOne({ user: req.user._id });
            if (!cart || cart.products.length === 0) {
                return res.status(400).json({ success: false, message: 'Giỏ hàng trống!' });
            }
            const quantityByProduct = new Map(
                selectedProducts
                    .filter(i => i?.productId && Number(i.quantity) > 0)
                    .map(i => [i.productId.toString(), Number(i.quantity)])
            );
            checkoutItems = cart.products
                .filter(item => {
                    if (quantityByProduct.has(item.product.toString())) {
                        item.quantity = Math.min(quantityByProduct.get(item.product.toString()), item.quantity);
                        return true;
                    }
                    const selected = new Set(selectedProductIds.map(id => id.toString()));
                    return selected.has(item.product.toString());
                })
                .map(item => {
                    const plain = item.toObject ? item.toObject() : item;
                    return { ...plain, product: item.product, quantity: item.quantity };
                });
        }

        if (checkoutItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Không có sản phẩm hợp lệ để thanh toán!' });
        }

        // shippingTier for estimatedDays
        const firstShopShipping = Object.values(shippingProvider || {})[0];
        const effectiveTier = firstShopShipping?.serviceType || req.body.shippingTier || 'express';
        const estimatedDays = effectiveTier === 'express' ? 3 : 7;

        // Lấy cart nếu cần
        const cart = isBuyNow ? null : await Cart.findOne({ user: req.user._id });
        if (!isBuyNow && !cart) {
            // cart null nhưng checkoutItems đã có → OK, đang dùng STEP 11 format
        }

        const productMap = {};
        const productList = [];
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
            const availableStock = item.variantStock ?? product.quantity;
            if (availableStock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm "${product.name}" chỉ còn ${product.quantity} trong kho!`
                });
            }
            productList.push(product);
            productMap[item.product.toString()] = { product, item };
        }

        // Gắn pricing (discountPercent từ promotion đang chạy) trước khi tạo order
        await attachPricing(productList);
        const pricedProductMap = Object.fromEntries(productList.map(p => [p._id.toString(), p]));

        // Nhóm sản phẩm theo shop (multi-vendor: tách đơn)
        const shopGroups = {};
        for (const item of checkoutItems) {
            const { product } = productMap[item.product.toString()];
            const pricedProduct = pricedProductMap[item.product.toString()];
            const shopId = product.shop?._id?.toString() || 'no-shop';

            if (!shopGroups[shopId]) {
                shopGroups[shopId] = {
                    shop: product.shop?._id || null,
                    shopName: product.shop?.name || 'Cửa hàng',
                    shopCode: product.shop?.code || '',
                    items: [],
                    subtotal: 0,
                    totalQuantity: 0
                };
            }

            // Dùng discountPercent từ attachPricing (từ promotion), fallback về discount field thủ công
            const productDiscount = item.discount ?? pricedProduct.discountPercent ?? pricedProduct.discount ?? 0;
            // originalPrice = giá gốc (chưa sale), salePrice = giá sau giảm
            const originalPrice = item.originalPrice ?? item.variantPrice ?? pricedProduct.originalPrice ?? product.price;
            const salePrice = item.price ?? pricedProduct.salePrice ?? (productDiscount > 0
                ? Math.round(originalPrice * (1 - productDiscount / 100))
                : originalPrice);

            shopGroups[shopId].items.push({
                product: item.product,
                shop: product.shop?._id || null,
                shopName: product.shop?.name || '',
                shopCode: product.shop?.code || '',
                quantity: item.quantity,
                price: salePrice,
                originalPrice: originalPrice,
                discount: productDiscount,
                variant: item.variant || null,
                variantId: item.variantId || null,
                variantSku: item.variantSku || null,
                variantSize: item.variantSize || null,
                name: product.name,
                image: getProductImage(product),
                ...(item.variantId ? { variantId: item.variantId } : {}),
            });
            shopGroups[shopId].subtotal += salePrice * item.quantity;
            shopGroups[shopId].totalQuantity += item.quantity;
        }

        const shopKeys = Object.keys(shopGroups);
        const isMultiVendor = shopKeys.length > 1;

        // Tính tổng subtotal tất cả shop để validate coupon
        const totalSubtotal = shopKeys.reduce((sum, key) => sum + shopGroups[key].subtotal, 0);

        // Validate và tính coupon discount (lấy dữ liệu mới nhất từ Coupon)
        let couponDiscount = 0;
        let usedCouponCode = null;
        let usedCouponId = null;
        let usedCouponShopId = null;
        if (couponCode) {
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
                        ? (shopGroups[coupon.shop.toString()]?.subtotal || 0)
                        : totalSubtotal;

                    if (!couponEndDate || new Date(couponEndDate) >= new Date()) {
                        if (applicableSubtotal > 0 && (!minOrderValue || applicableSubtotal >= minOrderValue)) {
                            if (discountType === 'percent') {
                                couponDiscount = Math.round(applicableSubtotal * couponValue / 100);
                                if (maxDiscount) couponDiscount = Math.min(couponDiscount, maxDiscount);
                            } else {
                                couponDiscount = Math.min(couponValue, applicableSubtotal);
                            }
                            usedCouponCode = coupon.code || voucher.code;
                            usedCouponId = voucher._id;
                            usedCouponShopId = coupon.shop ? coupon.shop.toString() : null;
                        }
                    }
                }
            }
        }

        // Tạo 1 đơn hàng độc lập cho mỗi shop (không còn parent/child)
        const createdOrders = [];
        const checkoutGroupId = new mongoose.Types.ObjectId().toString();

        // Lấy shippingFee per-shop từ frontend (FE đã tính riêng cho mỗi shop)
        // shippingFeesByShop đã được destructured ở đầu hàm
        // Kiểm tra xem có dùng shipping coupon (freeship) không
        const isShippingFree = Boolean(selectedShippingCoupon);
        const shopTotals = {};
        const totalByShop = {};

        for (const shopId of shopKeys) {
            const group = shopGroups[shopId];
            let shippingFee = (shippingFeesByShop[shopId] !== undefined && shippingFeesByShop[shopId] !== null)
                ? Number(shippingFeesByShop[shopId])
                : (req.body.shippingFee || 0);
            if (isShippingFree) shippingFee = 0;

            const shopCouponDiscount = usedCouponShopId
                ? (shopId === usedCouponShopId ? couponDiscount : 0)
                : (totalSubtotal > 0 ? Math.round(couponDiscount * group.subtotal / totalSubtotal) : 0);
            const groupTotal = Math.max(0, group.subtotal - shopCouponDiscount + shippingFee);
            shopTotals[shopId] = { shippingFee, couponDiscount: shopCouponDiscount, total: groupTotal };
            totalByShop[shopId] = groupTotal;
        }

        const checkoutTotal = shopKeys.reduce((sum, key) => sum + (shopTotals[key]?.total || 0), 0);
        let walletForPartialPayment = null;
        let walletAllocationByShop = {};

        if (paymentMethod !== 'WALLET' && (useWalletBalance === true || normalizeMoney(walletAmount) > 0)) {
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

        // ── Xử lý thanh toán bằng ví điện tử ──────────────────────────────────────
        if (paymentMethod === 'WALLET') {
            // Kiểm tra số dư ví trước khi tạo đơn
            const wallet = await getOrCreateWallet(req.user._id);
            const totalPayable = checkoutTotal;

            if (wallet.balance < totalPayable) {
                return res.status(400).json({
                    success: false,
                    message: `Số dư ví không đủ! Bạn cần ${totalPayable.toLocaleString('vi-VN')}₫ nhưng chỉ có ${wallet.balance.toLocaleString('vi-VN')}₫.`
                });
            }

            // Trừ tiền từ ví cho từng đơn
            for (const shopId of shopKeys) {
                const group = shopGroups[shopId];
                const shopTotal = shopTotals[shopId];
                const shippingFee = shopTotal.shippingFee;
                const shopCouponDiscount = shopTotal.couponDiscount;
                const groupTotal = shopTotal.total;

                const order = new Order({
                    user: req.user._id,
                    checkoutGroupId,
                    shop: group.shop,
                    shopName: group.shopName,
                    shopCode: group.shopCode,
                    products: group.items,
                    shippingAddress: { ...shippingAddress, note: note || '' },
                    paymentMethod: 'WALLET',
                    paymentStatus: 'paid',
                    subtotal: group.subtotal,
                    couponDiscount: shopCouponDiscount,
                    couponCode: usedCouponShopId ? (shopId === usedCouponShopId ? usedCouponCode : null) : (shopId === shopKeys[0] ? usedCouponCode : null),
                    shippingFee,
                    shippingTier: effectiveTier,
                    shippingProvider: getShopShippingProvider(shippingProvider, shopId),
                    totalPrice: groupTotal,
                    walletUsedAmount: groupTotal,
                    payableAmount: 0,
                    totalQuantity: group.totalQuantity,
                    orderedAt: new Date(),
                    estimatedDelivery: new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000),
                    orderNotes: new Map(Object.entries(orderNotes || {}).filter(([, v]) => v))
                });

                // Trừ tồn kho
                for (const item of group.items) {
                    await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity, sold: item.quantity } });
                }

                // Trừ tiền từ ví
                await order.save();

                if (groupTotal > 0) {
                    await wallet.deductForPayment(groupTotal, {
                        orderId: order._id,
                        orderNumber: order.orderNumber,
                        description: `Thanh toán đơn hàng #${order.orderNumber} bằng ví SORA`,
                    });
                }

                createdOrders.push(order);
            }

            // Đánh dấu voucher đã sử dụng
            if (usedCouponId) {
                await VoucherWallet.findByIdAndUpdate(usedCouponId, { status: VOUCHER_STATUS.USED, usedAt: new Date() });
            }

            // Xóa khỏi giỏ
            if (!isBuyNow && cart) {
                await removeCheckoutItemsFromCart(cart, checkoutItems, cartItemIds);
            }

            // Thông báo vendors
            for (const order of createdOrders) {
                await notifyVendorsNewOrder(order);
            }

            return res.status(201).json({
                success: true,
                message: 'Đặt hàng thành công qua ví SORA!',
                data: { orders: createdOrders, walletBalance: wallet.balance }
            });
        }
        // ── Kết thúc xử lý thanh toán ví ─────────────────────────────────────────
        for (const shopId of shopKeys) {
            const group = shopGroups[shopId];

            // Lấy phí ship từ FE (đã tính sẵn)
            // Chỉ set = 0 khi có voucher freeship (selectedShippingCoupon)
            let shippingFee = (shippingFeesByShop[shopId] !== undefined && shippingFeesByShop[shopId] !== null)
                ? Number(shippingFeesByShop[shopId])
                : (req.body.shippingFee || 0);
            if (isShippingFree) {
                shippingFee = 0; // Miễn phí vận chuyển khi có voucher freeship
            }

            // Phân bổ coupon discount theo tỷ lệ subtotal của shop
            const shopCouponDiscount = usedCouponShopId
                ? (shopId === usedCouponShopId ? couponDiscount : 0)
                : (totalSubtotal > 0 ? Math.round(couponDiscount * group.subtotal / totalSubtotal) : 0);
            const groupTotal = Math.max(0, group.subtotal - shopCouponDiscount + shippingFee);

            const order = new Order({
                user: req.user._id,
                checkoutGroupId,
                shop: group.shop,
                shopName: group.shopName,
                shopCode: group.shopCode,
                products: group.items,
                shippingAddress: {
                    ...shippingAddress,
                    note: note || ''
                },
                paymentMethod,
                paymentStatus: Math.max(0, groupTotal - normalizeMoney(walletAllocationByShop[shopId])) === 0 ? 'paid' : 'pending',
                walletUsedAmount: normalizeMoney(walletAllocationByShop[shopId]),
                payableAmount: Math.max(0, groupTotal - normalizeMoney(walletAllocationByShop[shopId])),
                subtotal: group.subtotal,
                couponDiscount: shopCouponDiscount,
                couponCode: usedCouponShopId ? (shopId === usedCouponShopId ? usedCouponCode : null) : (shopId === shopKeys[0] ? usedCouponCode : null),
                shippingFee,
                shippingTier: effectiveTier,
                shippingProvider: getShopShippingProvider(shippingProvider, shopId),
                totalPrice: groupTotal,
                totalQuantity: group.totalQuantity,
                orderedAt: new Date(),
                estimatedDelivery: new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000),
                orderNotes: new Map(Object.entries(orderNotes || {}).filter(([, v]) => v))
            });

            // Trừ tồn kho cho sản phẩm của shop này
            for (const item of group.items) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: {
                        quantity: -item.quantity,
                        sold: item.quantity
                    }
                });
            }

            await order.save();

            const walletDeduction = normalizeMoney(walletAllocationByShop[shopId]);
            if (walletForPartialPayment && walletDeduction > 0) {
                await walletForPartialPayment.deductForPayment(walletDeduction, {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    description: `Dung so du vi SORA cho don hang #${order.orderNumber}`,
                });
            }

            createdOrders.push(order);
        }

        // Đánh dấu voucher là đã sử dụng (sau khi tất cả orders được tạo)
        if (usedCouponId) {
            await VoucherWallet.findByIdAndUpdate(usedCouponId, {
                status: VOUCHER_STATUS.USED,
                usedAt: new Date()
            });
        }

        // Xóa khỏi giỏ các sản phẩm vừa thanh toán, giữ lại item chưa chọn.
        if (!isBuyNow && cart) {
            await removeCheckoutItemsFromCart(cart, checkoutItems, cartItemIds);
        }

        // Gửi thông báo cho vendors
        for (const order of createdOrders) {
            await notifyVendorsNewOrder(order);
        }

        // Trả về danh sách đơn hàng đã tạo (luôn là mảng)
        res.status(201).json({
            success: true,
            message: isMultiVendor
                ? `Đặt hàng thành công! Đơn hàng được chia thành ${createdOrders.length} đơn theo cửa hàng.`
                : 'Đặt hàng thành công!',
            data: {
                orders: createdOrders,
                isSplit: isMultiVendor,
                ...(walletForPartialPayment ? { walletBalance: walletForPartialPayment.balance } : {})
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đơn hàng',
            error: error.message
        });
    }
};

// @desc    Get user's orders (tất cả đơn độc lập, mỗi shop = 1 đơn)
// @route   GET /api/orders
// @access  Private
const getUserOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        // Lấy tất cả đơn của user (không có isChildOrder nữa — mỗi đơn là độc lập)
        const query = { user: req.user._id };
        if (status) {
            query.status = status;
        }

        const skip = (Number(page) - 1) * Number(limit);
        const orders = await Order.find(query)
            .populate('shop', 'name code logo')
            .populate('products.product', 'name images slug')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Order.countDocuments(query);

        // Backward-compat: đơn cha cũ (rỗng) ← populate từ subOrders nếu vẫn còn
        const ordersWithCanCancel = orders.map(order => {
            const obj = order.toObject();
            if (!obj.isChildOrder && (!obj.products || obj.products.length === 0) && obj.subOrders?.length > 0) {
                obj.products = obj.subOrders.flatMap(sub => sub.products || []);
            }
            return { ...obj, canCancel: order.canCancel() };
        });

        res.status(200).json({
            success: true,
            data: {
                orders: ordersWithCanCancel,
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

// @desc    Get single order (đơn độc lập)
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('shop', 'name code logo')
          .populate('products.product', 'name images slug');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        const obj = order.toObject();

        // Backward-compat: đơn cha cũ (rỗng) ← populate từ subOrders nếu vẫn còn
        if (!obj.isChildOrder && (!obj.products || obj.products.length === 0) && obj.subOrders?.length > 0) {
            obj.products = obj.subOrders.flatMap(sub => sub.products || []);
        }

        res.status(200).json({
            success: true,
            data: { ...obj, canCancel: order.canCancel() }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin đơn hàng',
            error: error.message
        });
    }
};

// @desc    Get order by orderNumber (public, for OrderSuccess page)
// @route   GET /api/orders/number/:orderNumber
// @access  Public
const getOrderByNumber = async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const order = await Order.findOne({ orderNumber })
            .populate('shop', 'name code logo')
            .populate('products.product', 'name images slug');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        const obj = order.toObject();

        let relatedOrders = [obj];
        if (order.checkoutGroupId) {
            const groupOrders = await Order.find({
                checkoutGroupId: order.checkoutGroupId,
                user: order.user
            })
                .populate('shop', 'name code logo')
                .populate('products.product', 'name images slug')
                .sort({ createdAt: 1 });
            relatedOrders = groupOrders.map((item) => item.toObject());
        }

        // Backward-compat: đơn cha cũ (rỗng) ← populate từ subOrders nếu vẫn còn
        if (!obj.isChildOrder && (!obj.products || obj.products.length === 0) && obj.subOrders?.length > 0) {
            obj.products = obj.subOrders.flatMap(sub => sub.products || []);
        }

        res.status(200).json({
            success: true,
            data: {
                ...obj,
                relatedOrders
            }
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

        // Hoàn tồn kho: đơn đơn (new) hoặc đơn cha cũ (backward-compat)
        if (order.products && order.products.length > 0) {
            // Đơn độc lập mới hoặc đơn cha mới có sản phẩm
            for (const item of order.products) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { quantity: item.quantity }
                });
            }
        } else if (!order.isChildOrder && order.subOrders && order.subOrders.length > 0) {
            // Backward-compat: đơn cha cũ (rỗng) → hoàn tồn kho qua subOrders
            const childOrders = await Order.find({ _id: { $in: order.subOrders } });
            for (const child of childOrders) {
                for (const item of child.products) {
                    await Product.findByIdAndUpdate(item.product, {
                        $inc: { quantity: item.quantity }
                    });
                }
            }
            await Order.updateMany(
                { _id: { $in: order.subOrders } },
                { status: ORDER_STATUS.CANCELLED, cancelledAt: new Date() }
            );
        }

        order.status = ORDER_STATUS.CANCELLED;
        order.cancelledAt = new Date();
        await refundOrderToWallet(order, {
            description: `Hoan tien don huy #${order.orderNumber} vao vi SORA`,
        });
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

            // Trigger payout cho vendor (xử lý bất đồng bộ để không block response)
            payoutService.payoutOrderToVendors(order._id)
                .then(result => {
                    console.log(`[Payout] Đã xử lý chi trả cho đơn ${order.orderNumber}:`, result.success ? 'Thành công' : 'Thất bại');
                })
                .catch(err => {
                    console.error(`[Payout] Lỗi chi trả cho đơn ${order._id}:`, err.message);
                });
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

// @desc    Get all orders (Admin/Vendor) 
// @route   GET /api/orders/admin/all
// @access  Private (Admin, Vendor)
const getAllOrders = async (req, res) => {
    try {
        const { status, shopId, search, page = 1, limit = 20 } = req.query;

        const query = {};
        
        //  Lọc theo trạng thái
        if (status) {
            query.status = status;
        }

        // Lọc theo Shop 
        if (shopId) {
            query.shop = shopId;
        }

        // Tìm kiếm theo mã đơn hàng
        if (search) {
            query.orderNumber = { $regex: search, $options: 'i' };
        }

        // Nếu là Vendor chỉ được xem đơn của shop mình
        if (req.user.role === 'vendor') {
            const vendorShop = await Shop.findOne({ owner: req.user._id });
            if (!vendorShop) {
                return res.status(403).json({ success: false, message: 'Tài khoản chưa có cửa hàng' });
            }
            query.shop = vendorShop._id; 
        }

        const skip = (Number(page) - 1) * Number(limit);
        const orders = await Order.find(query)
            .populate('user', 'fullName email phone')
            .populate('shop', 'name code logo') // Lấy thêm thông tin Shop
            .populate('products.product', 'name images slug') // Lấy thêm thông tin Sản phẩm
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
            await refundOrderToWallet(order, {
                description: `Hoan tien don huy #${order.orderNumber} vao vi SORA`,
            });
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
        }).populate('subOrders');

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

// @desc    Customer confirms receipt of order
// @route   PUT /api/orders/:id/confirm-received
// @access  Private (Customer only)
const confirmReceived = async (req, res) => {
    try {
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

        if (order.status !== ORDER_STATUS.SHIPPING) {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể xác nhận khi đơn đang trong trạng thái đang giao!'
            });
        }

        order.status = ORDER_STATUS.DELIVERED;
        order.deliveredAt = new Date();
        order.statusHistory.push({
            status: ORDER_STATUS.DELIVERED,
            timestamp: new Date(),
            note: 'Khách hàng xác nhận đã nhận hàng'
        });

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Xác nhận nhận hàng thành công!',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xác nhận nhận hàng',
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
// @desc    Admin force cancel order
// @route   PUT /api/orders/admin/:id/force-cancel
// @access  Private (Admin)
const adminForceCancelOrder = async (req, res) => {
    try {
        const { reason } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        if ([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(order.status)) {
            return res.status(400).json({ success: false, message: 'Không thể hủy đơn hàng đã giao thành công hoặc đã bị hủy từ trước!' });
        }

        // Hoàn lại tồn kho cho các sản phẩm trong đơn
        for (const item of order.products) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { quantity: item.quantity }
            });
        }

        // Đổi trạng thái và lưu lịch sử
        order.status = ORDER_STATUS.CANCELLED;
        order.cancelledAt = new Date();
        await refundOrderToWallet(order, {
            description: `Hoan tien don huy #${order.orderNumber} vao vi SORA`,
        });
        order.statusHistory.push({
            status: ORDER_STATUS.CANCELLED,
            timestamp: new Date(),
            note: `[ADMIN SÀN HỦY KHẨN CẤP] Lý do: ${reason || 'Vi phạm chính sách sàn'}`
        });

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Đã hủy đơn hàng khẩn cấp thành công!',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi Admin hủy đơn',
            error: error.message
        });
    }
};
// @desc    Get single order detail (Admin)
// @route   GET /api/orders/admin/:id
// @access  Private (Admin)
const getAdminOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'fullName email phone')
            .populate('shop', 'name code logo phone address email')
            .populate('products.product', 'name images slug price quantity');

        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết đơn', error: error.message });
    }
};
module.exports = {
    createOrder,
    getUserOrders,
    getOrderById,
    getOrderByNumber,
    getAdminOrderById,
    cancelOrder,
    confirmOrder,
    updateOrderStatus,
    getAllOrders,
    processCancelRequest,
    autoConfirmOrders,
    confirmReceived,
    getOrderStats,
    adminForceCancelOrder
};
