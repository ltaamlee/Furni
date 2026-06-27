const Cart = require('../models/cart');
const Product = require('../models/product');
const Shop = require('../models/Shop');
const { currentSalePrice, attachPricing } = require('../utils/pricing');

const PUBLIC_PRODUCT_STATUSES = ['active', 'out_of_stock'];

// Middleware-like guard for customer-only routes
const requireCustomer = (req, res, next) => {
    if (req.user.role === 'vendor' || req.user.role === 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Tài khoản này không có quyền truy cập giỏ hàng'
        });
    }
    next();
};

// @desc    Get user's cart with shop and promotion info
// @route   GET /api/cart
// @access  Private / Customer only
const getCart = async (req, res) => {
    if (req.user.role === 'vendor' || req.user.role === 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Tài khoản này không có quyền truy cập giỏ hàng'
        });
    }
    try {
        const cart = await Cart.findOne({ user: req.user._id })
            .populate('products.product', 'name images price discount discountPercent shop promotion status isActive variants weight');

        if (!cart) {
            return res.status(200).json({
                success: true,
                data: {
                    products: [],
                    totalPrice: 0,
                    totalQuantity: 0
                }
            });
        }

        // Transform cart items to include shop info and calculate discount
        // Luôn re-evaluate giá KM hiện tại để tránh hiển thị giá cũ khi KM đã hết hạn

        // Chuyển populated products sang plain object và gắn pricing
        const populatedPlain = cart.products.map(item => item.product?.toObject?.() || null).filter(Boolean);
        await attachPricing(populatedPlain);
        const productMap = Object.fromEntries(populatedPlain.map(p => [p._id.toString(), p]));

        const transformedProducts = (await Promise.all(cart.products.map(async (item) => {
            const product = productMap[(item.product._id || item.product).toString()];
            if (!product || product.isActive === false || !PUBLIC_PRODUCT_STATUSES.includes(product.status)) {
                return null;
            }
            // Ưu tiên discountPercent từ attachPricing, fallback về discount field thủ công
            const discount = product.discountPercent || product.discount || 0;
            // Variant price: nếu item có variant đã lưu thì dùng, không thì dùng product.price
            const variantBasePrice = item.variantPrice || null;
            const originalPrice = variantBasePrice ?? product.price;

            // Luôn dùng currentSalePrice để lấy giá KM mới nhất từ Promotion model
            const salePrice = await currentSalePrice(product, variantBasePrice);

            // Get shop info
            let shopInfo = {
                _id: item.shop || product?.shop,
                name: item.shopName || 'Cửa hàng',
                avatar: item.shopAvatar || null,
                isActive: true
            };

            if (product?.shop) {
                try {
                    const shop = await Shop.findById(product.shop).select('name avatar logo status isActive');
                    if (!shop || shop.status !== 'approved') return null;
                    shopInfo = {
                        _id: shop._id,
                        name: shop.name,
                        avatar: shop.avatar || shop.logo,
                        isActive: shop.status === 'approved' && shop.isActive !== false && product?.isActive !== false
                    };
                } catch (e) {
                    // Keep default shop info
                }
            }

            return {
                product: item.product._id,
                quantity: item.quantity,
                price: salePrice,
                originalPrice: originalPrice,
                discount: discount,
                name: product?.name || item.name,
                image: product?.images?.[0] || item.image,
                shop: shopInfo._id,
                shopName: shopInfo.name,
                shopAvatar: shopInfo.avatar,
                shopIsActive: shopInfo.isActive,
                promotionId: product.promotion?._id || item.promotionId || null,
                promotionName: product.promotion?.name || item.promotionName || null,
                addedAt: item.addedAt || cart.createdAt,
                weight: product?.weight || 0, // Thêm weight để tính phí vận chuyển
                ...(item.variant ? { variant: item.variant, variantPrice: item.variantPrice, variantStock: item.variantStock } : {})
            };
        }))).filter(Boolean);

        // Recalculate totals
        const totalQuantity = transformedProducts.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = transformedProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        res.status(200).json({
            success: true,
            data: {
                _id: cart._id,
                products: transformedProducts,
                totalPrice,
                totalQuantity,
                createdAt: cart.createdAt,
                updatedAt: cart.updatedAt
            }
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy giỏ hàng',
            error: error.message
        });
    }
};

// @desc    Add product to cart
// @route   POST /api/cart
// @access  Private / Customer only
const addToCart = async (req, res) => {
    if (req.user.role === 'vendor' || req.user.role === 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Tài khoản này không có quyền truy cập giỏ hàng'
        });
    }
    try {
        const { productId, quantity = 1, variantIndex = null } = req.body;

        const product = await Product.findById(productId).populate('shop', 'name avatar logo status isActive');
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        if (!product.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Sản phẩm đã ngừng kinh doanh'
            });
        }

        if (!PUBLIC_PRODUCT_STATUSES.includes(product.status)) {
            return res.status(400).json({
                success: false,
                message: 'Sản phẩm hiện không được mở bán'
            });
        }

        // Check if shop is active
        if (product.shop && (product.shop.status !== 'approved' || product.shop.isActive === false)) {
            return res.status(400).json({
                success: false,
                message: product.shop.isActive === false
                    ? 'Shop đang tạm nghỉ, sản phẩm hiện chưa thể mua'
                    : 'Cửa hàng đã ngừng hoạt động'
            });
        }

        // Kiểm tra variant hoặc sản phẩm chính
        // Convert Mongoose doc to plain object to avoid comparison issues
        const rawVariant = variantIndex != null ? product.variants?.[variantIndex] : null;
        const selectedVariant = rawVariant ? rawVariant.toObject ? rawVariant.toObject() : rawVariant : null;
        const variantStock = selectedVariant ? selectedVariant.stock : product.quantity;
        if (variantStock < quantity) {
            return res.status(400).json({
                success: false,
                message: selectedVariant
                    ? `Chỉ còn ${variantStock} sản phẩm "${selectedVariant.name}" trong kho`
                    : `Chỉ còn ${product.quantity} sản phẩm trong kho`
            });
        }

        // Discount: ưu tiên discountPercent từ attachPricing, fallback về discount field thủ công
        const discount = product.discountPercent || product.discount || 0;
        // Original price: variant price if selected, else product price
        const basePrice = selectedVariant ? selectedVariant.price : product.price;
        const originalPrice = basePrice;

        // Get shop info
        const shopInfo = product.shop ? {
            _id: product.shop._id,
            name: product.shop.name,
            avatar: product.shop.avatar || product.shop.logo
        } : null;

        // Giá sale: dùng currentSalePrice để hỗ trợ basePrice (variant) và maxDiscount cap
        const salePrice = await currentSalePrice(product, basePrice);

        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            cart = new Cart({
                user: req.user._id,
                products: [{
                    product: productId,
                    quantity,
                    price: salePrice,
                    originalPrice: originalPrice,
                    name: product.name,
                    image: product.images[0] || null,
                    shop: shopInfo?._id,
                    shopName: shopInfo?.name || 'Cửa hàng',
                    shopAvatar: shopInfo?.avatar || null,
                    discount: discount,
                    promotionId: product.promotion?._id || product.promotionId || null,
                    promotionName: product.promotion?.name || product.promotionName || null,
                }]
            });
        } else {
            // Tìm sản phẩm trùng: cùng productId VÀ cùng variant (nếu có)
            const variantName = selectedVariant?.name || null;
            const existingProduct = cart.products.find(
                (item) => {
                    if (item.product.toString() !== productId.toString()) return false;
                    // Không có variant: so sánh variantName (null) với item.variant
                    if (!variantName) return !item.variant;
                    // Có variant: so sánh theo tên
                    return item.variant === variantName;
                }
            );

            if (existingProduct) {
                const newQuantity = existingProduct.quantity + quantity;
                if (newQuantity > variantStock) {
                    return res.status(400).json({
                        success: false,
                        message: `Chỉ còn ${variantStock} sản phẩm trong kho`
                    });
                }
                existingProduct.quantity = newQuantity;
                existingProduct.price = salePrice;
                existingProduct.originalPrice = originalPrice;
                existingProduct.discount = discount;
                existingProduct.promotionId = product.promotion?._id || product.promotionId || null;
                existingProduct.promotionName = product.promotion?.name || product.promotionName || null;
                if (selectedVariant) {
                    existingProduct.variant = selectedVariant.name || null;
                    existingProduct.variantPrice = selectedVariant.price || null;
                    existingProduct.variantStock = selectedVariant.stock || 0;
                } else {
                    // Nếu không chọn variant → xóa variant info
                    existingProduct.variant = null;
                    existingProduct.variantPrice = null;
                    existingProduct.variantStock = null;
                }
            } else {
                cart.products.push({
                    product: productId,
                    quantity,
                    price: salePrice,
                    originalPrice: originalPrice,
                    name: product.name,
                    image: product.images[0] || null,
                    shop: shopInfo?._id,
                    shopName: shopInfo?.name || 'Cửa hàng',
                    shopAvatar: shopInfo?.avatar || null,
                    discount: discount,
                    promotionId: product.promotion?._id || product.promotionId || null,
                    promotionName: product.promotion?.name || product.promotionName || null,
                    addedAt: new Date(),
                    ...(selectedVariant ? {
                        variant: selectedVariant.name || null,
                        variantPrice: selectedVariant.price || null,
                        variantStock: selectedVariant.stock || 0,
                    } : {})
                });
            }
        }

        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Thêm vào giỏ hàng thành công',
            data: cart
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thêm vào giỏ hàng',
            error: error.message
        });
    }
};

// @desc    Update product quantity in cart
// @route   PUT /api/cart/:productId
// @access  Private / Customer only
const updateCartItem = async (req, res) => {
    if (req.user.role === 'vendor' || req.user.role === 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Tài khoản này không có quyền truy cập giỏ hàng'
        });
    }
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng phải lớn hơn 0'
            });
        }

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Giỏ hàng trống'
            });
        }

        const cartItem = cart.products.find(
            (item) => item.product.toString() === productId.toString()
        );

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không có trong giỏ hàng'
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        const stock = cartItem.variantStock ?? product.quantity;
        if (quantity > stock) {
            return res.status(400).json({
                success: false,
                message: `Chỉ còn ${stock} sản phẩm trong kho`
            });
        }

        cartItem.quantity = quantity;
        // Re-evaluate giá KM hiện tại (hỗ trợ variant)
        const salePrice = await currentSalePrice(product, cartItem.variantPrice || null);
        cartItem.price = salePrice;
        cartItem.originalPrice = cartItem.variantPrice ?? product.price;
        cartItem.discount = product.discountPercent || product.discount || 0;

        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Cập nhật số lượng thành công',
            data: cart
        });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật giỏ hàng',
            error: error.message
        });
    }
};

// @desc    Remove product from cart
// @route   DELETE /api/cart/:productId
// @access  Private / Customer only
const removeFromCart = async (req, res) => {
    if (req.user.role === 'vendor' || req.user.role === 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Tài khoản này không có quyền truy cập giỏ hàng'
        });
    }
    try {
        const { productId } = req.params;

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Giỏ hàng trống'
            });
        }

        const productIndex = cart.products.findIndex(
            (item) => item.product.toString() === productId.toString()
        );

        if (productIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không có trong giỏ hàng'
            });
        }

        cart.products.splice(productIndex, 1);
        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Xóa sản phẩm khỏi giỏ hàng thành công',
            data: cart
        });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa sản phẩm',
            error: error.message
        });
    }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private / Customer only
const clearCart = async (req, res) => {
    if (req.user.role === 'vendor' || req.user.role === 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Tài khoản này không có quyền truy cập giỏ hàng'
        });
    }
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Giỏ hàng trống'
            });
        }

        cart.products = [];
        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Xóa toàn bộ giỏ hàng thành công',
            data: cart
        });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa giỏ hàng',
            error: error.message
        });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
};
