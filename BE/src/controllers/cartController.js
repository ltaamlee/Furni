const Cart = require('../models/cart');
const Product = require('../models/product');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });

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

        res.status(200).json({
            success: true,
            data: cart
        });
    } catch (error) {
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

        const product = await Product.findById(productId);
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

        if (product.quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng sản phẩm trong kho không đủ'
            });
        }

        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            cart = new Cart({
                user: req.user._id,
                products: [{
                    product: productId,
                    quantity,
                    price: product.price,
                    name: product.name,
                    image: product.images[0] || null
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
            } else {
                cart.products.push({
                    product: productId,
                    quantity,
                    price: product.price,
                    name: product.name,
                    image: product.images[0] || null
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
        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Cập nhật số lượng thành công',
            data: cart
        });
    } catch (error) {
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
