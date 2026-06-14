const Coupon = require('../models/Coupon');
const LoyaltyPoint = require('../models/LoyaltyPoint');
const User = require('../models/User');
const Order = require('../models/Order');

// @desc    Get all available coupons for user
// @route   GET /api/coupons
// @access  Private/Customer
const getAvailableCoupons = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();

        // Get public coupons and user's private coupons
        const coupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            $or: [
                { isPublic: true },
                { createdBy: userId }
            ]
        }).sort({ createdAt: -1 });

        // Filter by usage
        const userCoupons = await Promise.all(coupons.map(async (coupon) => {
            const userOrders = await Order.countDocuments({
                user: userId,
                'usedCoupons.code': coupon.code
            });
            
            return {
                ...coupon.toObject(),
                canUse: coupon.canUserUse(userOrders),
                userUsageCount: userOrders
            };
        }));

        res.status(200).json({
            success: true,
            data: { coupons: userCoupons }
        });
    } catch (error) {
        console.error('Get available coupons error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy danh sách mã giảm giá!'
        });
    }
};

// @desc    Get user's coupons
// @route   GET /api/coupons/my-coupons
// @access  Private/Customer
const getMyCoupons = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status = 'available' } = req.query;
        const now = new Date();

        let query = {
            $or: [
                { isPublic: true },
                { createdBy: userId }
            ]
        };

        if (status === 'available') {
            query.endDate = { $gte: now };
            query.isActive = true;
        } else if (status === 'expired') {
            query.endDate = { $lt: now };
        } else if (status === 'used') {
            // Get orders where user used coupons
            const ordersWithCoupons = await Order.find({
                user: userId,
                'usedCoupons.code': { $exists: true, $ne: [] }
            });
            
            const usedCodes = ordersWithCoupons.flatMap(o => 
                o.usedCoupons.map(c => c.code)
            );
            
            return res.status(200).json({
                success: true,
                data: { coupons: [] }
            });
        }

        const coupons = await Coupon.find(query).sort({ endDate: 1 });

        res.status(200).json({
            success: true,
            data: { coupons }
        });
    } catch (error) {
        console.error('Get my coupons error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy mã giảm giá của bạn!'
        });
    }
};

// @desc    Validate and calculate coupon discount
// @route   POST /api/coupons/validate
// @access  Private/Customer
const validateCoupon = async (req, res) => {
    try {
        const { code, orderTotal, productIds } = req.body;
        const userId = req.user._id;

        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Mã giảm giá không tồn tại!'
            });
        }

        // Check usage limit
        const userOrders = await Order.countDocuments({
            user: userId,
            'usedCoupons.code': coupon.code
        });

        if (!coupon.canUserUse(userOrders)) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã sử dụng mã giảm giá này rồi!'
            });
        }

        if (!coupon.isValid()) {
            if (coupon.endDate < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã giảm giá đã hết hạn!'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Mã giảm giá không hợp lệ!'
            });
        }

        if (coupon.minOrderValue && orderTotal < coupon.minOrderValue) {
            return res.status(400).json({
                success: false,
                message: `Đơn hàng tối thiểu ${coupon.minOrderValue.toLocaleString('vi-VN')}đ để sử dụng mã này!`
            });
        }

        // Calculate discount
        const discount = coupon.calculateDiscount(orderTotal, productIds);

        res.status(200).json({
            success: true,
            data: {
                coupon: {
                    code: coupon.code,
                    name: coupon.name,
                    type: coupon.type,
                    value: coupon.value,
                    maxDiscount: coupon.maxDiscount,
                    minOrderValue: coupon.minOrderValue
                },
                discount,
                finalTotal: orderTotal - discount
            }
        });
    } catch (error) {
        console.error('Validate coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xác thực mã giảm giá!'
        });
    }
};

// @desc    Create a coupon from loyalty points
// @route   POST /api/coupons/redeem
// @access  Private/Customer
const redeemCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;
        const userId = req.user._id;

        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mã giảm giá!'
            });
        }

        if (coupon.type !== 'loyalty') {
            return res.status(400).json({
                success: false,
                message: 'Mã giảm giá này không thể đổi bằng điểm!'
            });
        }

        if (!coupon.isValid()) {
            return res.status(400).json({
                success: false,
                message: 'Mã giảm giá đã hết hạn!'
            });
        }

        // Check loyalty points
        let loyaltyPoint = await LoyaltyPoint.findOne({ user: userId });

        if (!loyaltyPoint || loyaltyPoint.points < coupon.loyaltyCost) {
            return res.status(400).json({
                success: false,
                message: `Bạn cần ${coupon.loyaltyCost} điểm để đổi mã này. Điểm hiện có: ${loyaltyPoint?.points || 0}`
            });
        }

        // Redeem points
        await loyaltyPoint.redeemPoints(
            coupon.loyaltyCost,
            `Đổi điểm lấy mã giảm giá ${coupon.code}`,
            coupon._id
        );

        // Generate unique code for user
        const userCouponCode = `LP-${userId.toString().slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

        // Update coupon for this user
        const userCoupon = await Coupon.create({
            ...coupon.toObject(),
            _id: undefined,
            code: userCouponCode,
            isPublic: false,
            createdBy: userId,
            maxUses: 1,
            loyaltyCost: null,
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        });

        res.status(200).json({
            success: true,
            message: 'Đổi mã giảm giá thành công!',
            data: {
                coupon: userCoupon,
                remainingPoints: loyaltyPoint.points
            }
        });
    } catch (error) {
        console.error('Redeem coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi đổi mã giảm giá!'
        });
    }
};

// @desc    Get loyalty points
// @route   GET /api/loyalty/points
// @access  Private/Customer
const getMyPoints = async (req, res) => {
    try {
        const userId = req.user._id;

        let loyaltyPoint = await LoyaltyPoint.findOne({ user: userId });

        if (!loyaltyPoint) {
            loyaltyPoint = await LoyaltyPoint.create({ user: userId });
        }

        res.status(200).json({
            success: true,
            data: {
                points: loyaltyPoint.points,
                totalEarned: loyaltyPoint.totalEarned,
                totalRedeemed: loyaltyPoint.totalRedeemed,
                tier: loyaltyPoint.tier,
                tierProgress: loyaltyPoint.tierProgress,
                history: loyaltyPoint.history.slice(-20)
            }
        });
    } catch (error) {
        console.error('Get my points error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy điểm tích lũy!'
        });
    }
};

// @desc    Get point history
// @route   GET /api/loyalty/history
// @access  Private/Customer
const getPointHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 20 } = req.query;

        let loyaltyPoint = await LoyaltyPoint.findOne({ user: userId });

        if (!loyaltyPoint) {
            loyaltyPoint = await LoyaltyPoint.create({ user: userId });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const history = loyaltyPoint.history.slice().reverse().slice(skip, skip + parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                history,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: loyaltyPoint.history.length,
                    pages: Math.ceil(loyaltyPoint.history.length / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Get point history error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy lịch sử điểm!'
        });
    }
};

// @desc    Get exchangeable coupons
// @route   GET /api/loyalty/exchangeable
// @access  Private/Customer
const getExchangeableCoupons = async (req, res) => {
    try {
        const userId = req.user._id;

        const loyaltyPoint = await LoyaltyPoint.findOne({ user: userId });
        const userPoints = loyaltyPoint?.points || 0;

        // Get loyalty coupons that user can afford
        const coupons = await Coupon.find({
            type: 'loyalty',
            isActive: true,
            endDate: { $gte: new Date() },
            loyaltyCost: { $lte: userPoints }
        });

        res.status(200).json({
            success: true,
            data: {
                coupons,
                userPoints
            }
        });
    } catch (error) {
        console.error('Get exchangeable coupons error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy mã có thể đổi!'
        });
    }
};

// @desc    Add points after order (called by order controller)
// @route   POST /api/loyalty/add-from-order
// @access  Private
const addPointsFromOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user._id;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng!'
            });
        }

        if (order.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này!'
            });
        }

        if (order.status !== 'delivered') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ nhận điểm sau khi đơn hàng được giao thành công!'
            });
        }

        let loyaltyPoint = await LoyaltyPoint.findOne({ user: userId });

        if (!loyaltyPoint) {
            loyaltyPoint = await LoyaltyPoint.create({ user: userId });
        }

        // Calculate points: 1 point per 1000 VND spent
        const points = Math.floor(order.totalPrice / 1000);

        await loyaltyPoint.addPoints(
            points,
            `Nhận điểm từ đơn hàng ${order.orderNumber}`,
            orderId
        );

        res.status(200).json({
            success: true,
            message: `Bạn đã nhận được ${points} điểm tích lũy!`,
            data: {
                pointsEarned: points,
                totalPoints: loyaltyPoint.points,
                tier: loyaltyPoint.tier
            }
        });
    } catch (error) {
        console.error('Add points from order error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi cộng điểm!'
        });
    }
};

module.exports = {
    getAvailableCoupons,
    getMyCoupons,
    validateCoupon,
    redeemCoupon,
    getMyPoints,
    getPointHistory,
    getExchangeableCoupons,
    addPointsFromOrder
};
