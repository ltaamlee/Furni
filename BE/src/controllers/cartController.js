const Cart = require('../models/cart');
const Product = require('../models/product');
const Shop = require('../models/Shop');
const { currentSalePrice } = require('../utils/pricing');

const PUBLIC_PRODUCT_STATUSES = ['active', 'out_of_stock'];

// @desc    Get user's cart with shop and promotion info
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id })
            .populate('products.product', 'name images price discount shop promotion status isActive');

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
        const transformedProducts = (await Promise.all(cart.products.map(async (item) => {
            const product = item.product;
            if (!product || product.isActive === false || !PUBLIC_PRODUCT_STATUSES.includes(product.status)) {
                return null;
            }
            const discount = product?.discount || 0;
            const originalPrice = product?.price || item.price;
            const discountedPrice = discount > 0 
                ? Math.round(originalPrice * (1 - discount / 100)) 
                : originalPrice;

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
                price: discountedPrice,
                originalPrice: originalPrice,
                discount: discount,
                name: product?.name || item.name,
                image: product?.images?.[0] || item.image,
                shop: shopInfo._id,
                shopName: shopInfo.name,
                shopAvatar: shopInfo.avatar,
                shopIsActive: shopInfo.isActive,
                addedAt: item.addedAt || cart.createdAt
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
// @access  Private
const addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

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

        if (product.quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng sản phẩm trong kho không đủ'
            });
        }

        // Calculate discount
        const discount = product.discount || 0;
        const originalPrice = product.price;
        const discountedPrice = discount > 0 
            ? Math.round(originalPrice * (1 - discount / 100)) 
            : originalPrice;

        // Get shop info
        const shopInfo = product.shop ? {
            _id: product.shop._id,
            name: product.shop.name,
            avatar: product.shop.avatar || product.shop.logo
        } : null;
        // Giá tại thời điểm thêm giỏ = đã trừ khuyến mãi đang chạy (nếu có)
        const salePrice = await currentSalePrice(product);

        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            cart = new Cart({
                user: req.user._id,
                products: [{
                    product: productId,
                    quantity,
                    price: discountedPrice,
                    originalPrice: originalPrice,
                    name: product.name,
                    image: product.images[0] || null,
                    shop: shopInfo?._id,
                    shopName: shopInfo?.name || 'Cửa hàng',
                    shopAvatar: shopInfo?.avatar || null,
                    discount: discount
                }]
            });
        } else {
            const existingProduct = cart.products.find(
                (item) => item.product.toString() === productId.toString()
            );

            if (existingProduct) {
                const newQuantity = existingProduct.quantity + quantity;
                if (newQuantity > product.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Chỉ còn ${product.quantity} sản phẩm trong kho`
                    });
                }
                existingProduct.quantity = newQuantity;
                existingProduct.price = salePrice; // cập nhật giá KM mới nhất
            } else {
                cart.products.push({
                    product: productId,
                    quantity,
                    price: discountedPrice,
                    originalPrice: originalPrice,
                    name: product.name,
                    image: product.images[0] || null,
                    shop: shopInfo?._id,
                    shopName: shopInfo?.name || 'Cửa hàng',
                    shopAvatar: shopInfo?.avatar || null,
                    discount: discount,
                    addedAt: new Date()
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
// @access  Private
const updateCartItem = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng phải lớn hơn 0'
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        if (quantity > product.quantity) {
            return res.status(400).json({
                success: false,
                message: `Chỉ còn ${product.quantity} sản phẩm trong kho`
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

        cartItem.quantity = quantity;
        // Recalculate price from current promotion (latest flash sale price)
        const salePrice = await currentSalePrice(product);
        cartItem.price = salePrice;
        cartItem.originalPrice = product.price;
        cartItem.discount = product.discount || 0;

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
// @access  Private
const removeFromCart = async (req, res) => {
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
// @access  Private
const clearCart = async (req, res) => {
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
