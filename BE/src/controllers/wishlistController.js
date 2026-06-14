const User = require('../models/User');
const Product = require('../models/Product');
const RecentlyViewed = require('../models/RecentlyViewed');

// @desc    Add product to wishlist
// @route   POST /api/wishlist/:productId
// @access  Private/Customer
const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm!'
            });
        }

        const user = await User.findById(userId);

        if (user.wishlist.includes(productId)) {
            return res.status(400).json({
                success: false,
                message: 'Sản phẩm đã có trong danh sách yêu thích!'
            });
        }

        user.wishlist.push(productId);
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Đã thêm vào danh sách yêu thích!',
            data: { wishlist: user.wishlist }
        });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi thêm vào wishlist!'
        });
    }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private/Customer
const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;

        const user = await User.findById(userId);

        if (!user.wishlist.includes(productId)) {
            return res.status(400).json({
                success: false,
                message: 'Sản phẩm không có trong danh sách yêu thích!'
            });
        }

        user.wishlist = user.wishlist.filter(
            id => id.toString() !== productId
        );
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Đã xóa khỏi danh sách yêu thích!',
            data: { wishlist: user.wishlist }
        });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xóa khỏi wishlist!'
        });
    }
};

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private/Customer
const getWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 20 } = req.query;

        const user = await User.findById(userId).populate({
            path: 'wishlist',
            select: 'name images price averageRating sold quantity',
            populate: { path: 'category', select: 'name' }
        });

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedWishlist = user.wishlist.slice(skip, skip + parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                wishlist: paginatedWishlist,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: user.wishlist.length,
                    pages: Math.ceil(user.wishlist.length / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy danh sách yêu thích!'
        });
    }
};

// @desc    Check if product is in wishlist
// @route   GET /api/wishlist/check/:productId
// @access  Private/Customer
const checkWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;

        const user = await User.findById(userId);
        const isInWishlist = user.wishlist.includes(productId);

        res.status(200).json({
            success: true,
            data: { isInWishlist }
        });
    } catch (error) {
        console.error('Check wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi kiểm tra wishlist!'
        });
    }
};

// @desc    Add product to recently viewed
// @route   POST /api/recently-viewed/:productId
// @access  Private/Customer
const addToRecentlyViewed = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm!'
            });
        }

        // Increment product views
        await Product.findByIdAndUpdate(productId, { $inc: { views: 1 } });

        let recentlyViewed = await RecentlyViewed.findOne({ user: userId });

        if (!recentlyViewed) {
            recentlyViewed = await RecentlyViewed.create({
                user: userId,
                products: [{ product: productId }]
            });
        } else {
            await recentlyViewed.addProduct(productId);
        }

        res.status(200).json({
            success: true,
            message: 'Đã cập nhật sản phẩm đã xem!'
        });
    } catch (error) {
        console.error('Add to recently viewed error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi cập nhật sản phẩm đã xem!'
        });
    }
};

// @desc    Get recently viewed products
// @route   GET /api/recently-viewed
// @access  Private/Customer
const getRecentlyViewed = async (req, res) => {
    try {
        const userId = req.user._id;
        const { limit = 10 } = req.query;

        let recentlyViewed = await RecentlyViewed.findOne({ user: userId });

        if (!recentlyViewed) {
            return res.status(200).json({
                success: true,
                data: { products: [] }
            });
        }

        const recentProducts = recentlyViewed.products.slice(0, parseInt(limit));

        // Populate product details
        await RecentlyViewed.populate(recentlyViewed, {
            path: 'products.product',
            select: 'name images price averageRating sold quantity',
            populate: { path: 'category', select: 'name' }
        });

        const products = recentProducts.map(item => ({
            ...item.product.toObject(),
            viewedAt: item.viewedAt
        }));

        res.status(200).json({
            success: true,
            data: { products }
        });
    } catch (error) {
        console.error('Get recently viewed error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy sản phẩm đã xem!'
        });
    }
};

// @desc    Clear recently viewed
// @route   DELETE /api/recently-viewed
// @access  Private/Customer
const clearRecentlyViewed = async (req, res) => {
    try {
        const userId = req.user._id;

        await RecentlyViewed.findOneAndDelete({ user: userId });

        res.status(200).json({
            success: true,
            message: 'Đã xóa lịch sử xem!'
        });
    } catch (error) {
        console.error('Clear recently viewed error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xóa lịch sử xem!'
        });
    }
};

// @desc    Get similar products
// @route   GET /api/products/similar/:productId
// @access  Public
const getSimilarProducts = async (req, res) => {
    try {
        const { productId } = req.params;
        const { limit = 8 } = req.query;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm!'
            });
        }

        // Find similar products by category, brand, and price range
        const similarProducts = await Product.find({
            _id: { $ne: productId },
            category: product.category,
            isActive: true,
            $or: [
                { brand: product.brand },
                { price: { $gte: product.price * 0.8, $lte: product.price * 1.2 } },
                { material: product.material }
            ]
        })
        .select('name images price averageRating sold quantity')
        .populate('category', 'name')
        .limit(parseInt(limit));

        // If not enough similar products, get more from same category
        if (similarProducts.length < parseInt(limit)) {
            const additionalProducts = await Product.find({
                _id: { $ne: productId, $nin: similarProducts.map(p => p._id) },
                category: product.category,
                isActive: true
            })
            .select('name images price averageRating sold quantity')
            .populate('category', 'name')
            .limit(parseInt(limit) - similarProducts.length);

            similarProducts.push(...additionalProducts);
        }

        res.status(200).json({
            success: true,
            data: { products: similarProducts }
        });
    } catch (error) {
        console.error('Get similar products error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy sản phẩm tương tự!'
        });
    }
};

module.exports = {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    checkWishlist,
    addToRecentlyViewed,
    getRecentlyViewed,
    clearRecentlyViewed,
    getSimilarProducts
};
