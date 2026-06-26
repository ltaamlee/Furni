const Order = require('../models/order');
const Cart = require('../models/cart');
const Product = require('../models/product');
const Shop = require('../models/Shop');
const Notification = require('../models/notification');
const { ORDER_STATUS } = require('../models/order');
const payoutService = require('../services/payoutService');
const { attachPricing } = require('../utils/pricing');
const { VoucherWallet, VOUCHER_STATUS } = require('../models/voucherWallet');
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
        const { shippingAddress, paymentMethod = 'COD', note, selectedProductIds = [], selectedProducts = [], buyNowProduct = null, shippingTier = 'express', shippingProvider = null, couponCode = null } = req.body;
        const isBuyNow = Boolean(buyNowProduct?.productId && Number(buyNowProduct.quantity) > 0);
        // Ước tính ngày giao dựa trên tier
        const estimatedDays = shippingTier === 'express' ? 3 : 7;

        // Lấy cart của user
        const cart = isBuyNow ? null : await Cart.findOne({ user: req.user._id });
        if (!isBuyNow && (!cart || cart.products.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng trống!'
            });
        }

        // Kiểm tra tồn kho + thu thập thông tin shop của từng sản phẩm
        const checkoutItems = isBuyNow
            ? [{
                product: buyNowProduct.productId,
                quantity: Math.max(1, Number(buyNowProduct.quantity) || 1)
            }]
            : pickCheckoutItems(cart, selectedProductIds, selectedProducts);
        if (checkoutItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có sản phẩm hợp lệ để thanh toán!'
            });
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
            if (product.quantity < item.quantity) {
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
            const productDiscount = pricedProduct.discountPercent || pricedProduct.discount || 0;
            // originalPrice = giá gốc (chưa sale), salePrice = giá sau giảm
            const originalPrice = pricedProduct.originalPrice || product.price;
            const salePrice = pricedProduct.salePrice || (productDiscount > 0
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
                name: product.name,
                image: getProductImage(product)
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

                    if (!couponEndDate || new Date(couponEndDate) >= new Date()) {
                        if (!minOrderValue || totalSubtotal >= minOrderValue) {
                            if (discountType === 'percent') {
                                couponDiscount = Math.round(totalSubtotal * couponValue / 100);
                                if (maxDiscount) couponDiscount = Math.min(couponDiscount, maxDiscount);
                            } else {
                                couponDiscount = Math.min(couponValue, totalSubtotal);
                            }
                            usedCouponCode = coupon.code || voucher.code;
                            usedCouponId = voucher._id;
                        }
                    }
                }
            }
        }

        // Tạo 1 đơn hàng độc lập cho mỗi shop (không còn parent/child)
        const createdOrders = [];
        
        // Lấy shippingFee từ frontend (đã tính từ bảng phí cố định theo khu vực)
        const frontendShippingFee = req.body.shippingFee || 0;
        
        for (const shopId of shopKeys) {
            const group = shopGroups[shopId];

            // Dùng phí ship từ frontend, chỉ kiểm tra miễn phí nếu >= 500k
            let shippingFee = frontendShippingFee;
            if (group.subtotal >= 500000) {
                shippingFee = 0; // Miễn phí vận chuyển
            }

            // Phân bổ coupon discount theo tỷ lệ subtotal của shop
            const shopCouponDiscount = totalSubtotal > 0
                ? Math.round(couponDiscount * group.subtotal / totalSubtotal)
                : 0;
            const groupTotal = Math.max(0, group.subtotal - shopCouponDiscount + shippingFee);

            const order = new Order({
                user: req.user._id,
                shop: group.shop,
                shopName: group.shopName,
                shopCode: group.shopCode,
                products: group.items,
                shippingAddress: {
                    ...shippingAddress,
                    note: note || ''
                },
                paymentMethod,
                subtotal: group.subtotal,
                couponDiscount: shopCouponDiscount,
                couponCode: shopId === shopKeys[0] ? usedCouponCode : null,
                shippingFee,
                shippingTier,
                shippingProvider,
                totalPrice: groupTotal,
                totalQuantity: group.totalQuantity,
                orderedAt: new Date(),
                estimatedDelivery: new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000)
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
        if (!isBuyNow) {
            await removeCheckoutItemsFromCart(cart, checkoutItems, selectedProducts, selectedProductIds);
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
                isSplit: isMultiVendor
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

        // Backward-compat: đơn cha cũ (rỗng) ← populate từ subOrders nếu vẫn còn
        if (!obj.isChildOrder && (!obj.products || obj.products.length === 0) && obj.subOrders?.length > 0) {
            obj.products = obj.subOrders.flatMap(sub => sub.products || []);
        }

        res.status(200).json({
            success: true,
            data: obj
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

module.exports = {
    createOrder,
    getUserOrders,
    getOrderById,
    getOrderByNumber,
    cancelOrder,
    confirmOrder,
    updateOrderStatus,
    getAllOrders,
    processCancelRequest,
    autoConfirmOrders,
    confirmReceived,
    getOrderStats
};
