const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const LoyaltyPoint = require('../models/LoyaltyPoint');
const mongoose = require('mongoose');

const REVIEW_TYPE = require('../models/Review').TYPE || { PRODUCT: 'product', ORDER: 'order', SHOP: 'shop' };

// Helper: find-or-throw pattern used consistently throughout
const findOrderOrThrow = async (query, errorMsg) => {
    const order = await Order.findOne(query).populate('products.product');
    if (!order) throw Object.assign(new Error(errorMsg), { status: 400 });
    return order;
};
const findProductOrThrow = async (id, errorMsg) => {
    const product = await Product.findById(id);
    if (!product) throw Object.assign(new Error(errorMsg), { status: 404 });
    return product;
};

// @desc    Create a review for a product
// @route   POST /api/reviews
// @access  Private/Customer
const createReview = async (req, res) => {
    try {
        const { productId, orderId, rating, comment, images } = req.body;
        const userId = req.user._id;

        // ── Validate productId ──────────────────────────────────────
        if (!productId) {
            return res.status(400).json({ success: false, message: 'Thiếu productId!' });
        }
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'productId không hợp lệ!' });
        }

        // ── Validate orderId ───────────────────────────────────────
        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn đơn hàng để đánh giá!' });
        }
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'orderId không hợp lệ!' });
        }

        // ── Validate rating ────────────────────────────────────────
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Số sao phải từ 1 đến 5!' });
        }

        // ── Check if user purchased this product in a delivered order ──
        const order = await findOrderOrThrow(
            { _id: orderId, user: userId, status: 'delivered' },
            'Không tìm thấy đơn hàng đã giao để đánh giá!'
        );

        // ── Check product exists in order ─────────────────────────
        const productInOrder = order.products.find(
            p => p.product._id.toString() === productId
        );
        if (!productInOrder) {
            return res.status(400).json({
                success: false,
                message: 'Sản phẩm không có trong đơn hàng của bạn!'
            });
        }

        // ── Fetch shop from product ─────────────────────────────────
        const product = await findProductOrThrow(productId, 'Sản phẩm không tồn tại!');
        const shopId = product.shop;

        // ── Check duplicate review using the model's unique index ─────
        // Model index: { user, type, targetId, order } — all 4 fields required
        const existingReview = await Review.findOne({
            user: userId,
            type: REVIEW_TYPE.PRODUCT,
            targetId: productId,
            order: orderId
        });
        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi!'
            });
        }

        // ── Create review (matches new Review model schema) ──────────
        const review = await Review.create({
            type: REVIEW_TYPE.PRODUCT,
            targetId: productId,          // required by model schema
            product: productId,            // for backward / query convenience
            shop: shopId || undefined,
            order: orderId,
            user: userId,
            rating,
            content: comment || '',
            images: images || [],
            status: 'approved'
        });

        // ── Update product rating stats ─────────────────────────────
        const allReviews = await Review.find({
            targetId: productId,
            status: 'approved'
        });

        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

        await Product.findByIdAndUpdate(productId, {
            totalRatings: allReviews.length,
            averageRating: Math.round(averageRating * 10) / 10
        });

        // ── Reward user ─────────────────────────────────────────────
        let reward = null;

        if (rating >= 4) {
            const coupon = await Coupon.create({
                code: `RATED-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
                name: `Cảm ơn bạn đã đánh giá ${rating} sao!`,
                description: 'Mã giảm giá từ việc đánh giá sản phẩm',
                type: 'fixed',
                value: 10000,
                maxUses: 1,
                perUserLimit: 1,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                isPublic: false,
                loyaltyCost: null
            });
            await Coupon.findByIdAndUpdate(coupon._id, { applicableProducts: [productId] });
            reward = { type: 'coupon', code: coupon.code, value: coupon.value };
        } else {
            let loyaltyPoint = await LoyaltyPoint.findOne({ user: userId });
            if (!loyaltyPoint) {
                loyaltyPoint = await LoyaltyPoint.create({ user: userId });
            }
            await loyaltyPoint.addPoints(
                50,
                `Nhận điểm từ việc đánh giá sản phẩm ${rating} sao`,
                orderId
            );
            reward = { type: 'points', value: 50 };
        }

        const populatedReview = await Review.findById(review._id)
            .populate('user', 'fullName profileImage')
            .populate('product', 'name images');

        res.status(201).json({
            success: true,
            message: 'Cảm ơn bạn đã đánh giá sản phẩm!',
            data: { review: populatedReview, reward }
        });
    } catch (error) {
        const status = error.status || 500;
        console.error('Create review error:', error);
        res.status(status).json({
            success: false,
            message: error.message || 'Đã xảy ra lỗi khi tạo đánh giá!'
        });
    }
};

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10, sort = 'newest' } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        let sortOption = { createdAt: -1 };
        if (sort === 'oldest') sortOption = { createdAt: 1 };
        if (sort === 'highest') sortOption = { rating: -1, createdAt: -1 };
        if (sort === 'lowest') sortOption = { rating: 1, createdAt: -1 };

        const reviews = await Review.find({
            targetId: productId,
            status: 'approved'
        })
        .populate('user', 'fullName profileImage')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit));

        const total = await Review.countDocuments({
            targetId: productId,
            status: 'approved'
        });

        // Get rating distribution
        const ratingStats = await Review.aggregate([
        {
            $match: {
                targetId: new mongoose.Types.ObjectId(productId),
                status: 'approved'
            }
        },
        {
            $group: {
                _id: '$rating',
                count: { $sum: 1 }
            }
        }
    ]);

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratingStats.forEach(stat => {
            distribution[stat._id] = stat.count;
        });

        res.status(200).json({
            success: true,
            data: {
                reviews,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                },
                distribution
            }
        });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy danh sách đánh giá!'
        });
    }
};

// @desc    Get user's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private/Customer
const getMyReviews = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reviews = await Review.find({ user: userId })
            .populate('product', 'name images price')
            .populate('order', 'orderNumber')
            .populate('targetId', 'name images price')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Review.countDocuments({ user: userId });

        res.status(200).json({
            success: true,
            data: {
                reviews,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Get my reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy danh sách đánh giá!'
        });
    }
};

// @desc    Update a review
// @route   PUT /api/reviews/:reviewId
// @access  Private/Customer
const updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, comment, images } = req.body;
        const userId = req.user._id;

        const review = await Review.findOne({ _id: reviewId, user: userId });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đánh giá!'
            });
        }

        if (rating !== undefined) review.rating = rating;
        if (comment !== undefined) review.content = comment;
        if (images !== undefined) review.images = images;

        await review.save();

        // Recalculate product rating using targetId
        const allReviews = await Review.find({
            targetId: review.targetId,
            status: 'approved'
        });

        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

        const productId = review.product || review.targetId;
        if (productId) {
            await Product.findByIdAndUpdate(productId, {
                totalRatings: allReviews.length,
                averageRating: Math.round(averageRating * 10) / 10
            });
        }

        const populatedReview = await Review.findById(review._id)
            .populate('user', 'fullName profileImage')
            .populate('product', 'name images');

        res.status(200).json({
            success: true,
            message: 'Cập nhật đánh giá thành công!',
            data: { review: populatedReview }
        });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi cập nhật đánh giá!'
        });
    }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:reviewId
// @access  Private/Customer
const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;

        const review = await Review.findOne({ _id: reviewId, user: userId });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đánh giá!'
            });
        }

        const targetId = review.targetId;
        await Review.findByIdAndDelete(reviewId);

        // Recalculate product rating using targetId
        const allReviews = await Review.find({
            targetId: targetId,
            status: 'approved'
        });

        const totalRating = allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
            : 0;

        const productId = review.product || targetId;
        if (productId) {
            await Product.findByIdAndUpdate(productId, {
                totalRatings: allReviews.length,
                averageRating: Math.round(totalRating * 10) / 10
            });
        }

        res.status(200).json({
            success: true,
            message: 'Xóa đánh giá thành công!'
        });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xóa đánh giá!'
        });
    }
};

// @desc    Get purchasable products for review (delivered orders)
// @route   GET /api/reviews/purchasable
// @access  Private/Customer
const getPurchasableProducts = async (req, res) => {
    try {
        const userId = req.user._id;

        const deliveredOrders = await Order.find({
            user: userId,
            status: 'delivered'
        }).populate('products.product', 'name images price');

        // Filter out products that have been reviewed
        const purchasableProducts = [];

        for (const order of deliveredOrders) {
            for (const item of order.products) {
                const existingReview = await Review.findOne({
                    user: userId,
                    targetId: item.product._id,
                    order: order._id
                });

                if (!existingReview) {
                    purchasableProducts.push({
                        orderId: order._id,
                        orderNumber: order.orderNumber,
                        product: item.product,
                        quantity: item.quantity,
                        price: item.price,
                        deliveredAt: order.deliveredAt
                    });
                }
            }
        }

        res.status(200).json({
            success: true,
            data: { products: purchasableProducts }
        });
    } catch (error) {
        console.error('Get purchasable products error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy sản phẩm có thể đánh giá!'
        });
    }
};

// @desc    Get product stats (buyer count, commenter count)
// @route   GET /api/reviews/stats/:productId
// @access  Public
const getProductStats = async (req, res) => {
    try {
        const { productId } = req.params;

        const buyerCount = await Order.distinct('user', {
            'products.product': productId,
            status: { $in: ['delivered', 'shipping', 'preparing', 'confirmed'] }
        });

        const reviewerCount = await Review.countDocuments({
            targetId: productId,
            status: 'approved'
        });

        const product = await Product.findById(productId).select('sold views averageRating totalRatings');

        res.status(200).json({
            success: true,
            data: {
                buyerCount: buyerCount.length,
                reviewerCount,
                sold: product?.sold || 0,
                views: product?.views || 0,
                averageRating: product?.averageRating || 0,
                totalRatings: product?.totalRatings || 0
            }
        });
    } catch (error) {
        console.error('Get product stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy thống kê sản phẩm!'
        });
    }
};

module.exports = {
    createReview,
    getProductReviews,
    getMyReviews,
    updateReview,
    deleteReview,
    getPurchasableProducts,
    getProductStats
};
