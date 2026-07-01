const { VoucherWallet, VOUCHER_STATUS } = require('../models/voucherWallet');
const Coupon = require('../models/Coupon');
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const Product = require('../models/product');
const Promotion = require('../models/promotion');
const { markVoucherUsed } = require('../services/voucherUsageService');

// @desc    Claim a voucher (coupon) into user's wallet
// @route   POST /api/vouchers/claim
// @access  Private (Customer)
const claimVoucher = async (req, res) => {
    try {
        const { couponId } = req.body;
        const userId = req.user._id;

        if (!couponId) {
            return res.status(400).json({ success: false, message: 'Thiếu mã coupon' });
        }

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Voucher không tồn tại' });
        }

        // Validate coupon is usable
        if (!coupon.isUsable()) {
            return res.status(400).json({ success: false, message: 'Voucher đã hết lượt sử dụng hoặc hết hạn' });
        }

        // Check if already claimed
        const existing = await VoucherWallet.findOne({ user: userId, coupon: couponId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Bạn đã nhận voucher này rồi!' });
        }

        // Snapshot shop info if applicable
        let shopName = '';
        if (coupon.shop) {
            const shop = await Shop.findById(coupon.shop).select('name');
            shopName = shop?.name || '';
        }

        const wallet = await VoucherWallet.create({
            user: userId,
            coupon: couponId,
            code: coupon.code,
            description: coupon.description,
            discountType: coupon.discountType,
            value: coupon.value,
            maxDiscount: coupon.maxDiscount,
            minOrderValue: coupon.minOrderValue,
            endDate: coupon.endDate,
            shopId: coupon.shop || null,
            shopName,
        });

        res.status(201).json({
            success: true,
            message: 'Nhận voucher thành công!',
            data: wallet
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Bạn đã nhận voucher này rồi!' });
        }
        res.status(500).json({ success: false, message: 'Lỗi khi nhận voucher', error: error.message });
    }
};

// @desc    Get all vouchers in user's wallet
// @route   GET /api/vouchers/wallet
// @access  Private (Customer)
const getMyVouchers = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query; // active | used | expired | revoked

        const now = new Date();
        let query = { user: userId };

        if (status === 'used') {
            query.status = VOUCHER_STATUS.USED;
        } else if (status === 'expired') {
            query.status = VOUCHER_STATUS.EXPIRED;
        } else if (status === 'revoked') {
            query.status = VOUCHER_STATUS.REVOKED;
        } else {
            // Default: show active vouchers (status=active AND not expired AND not revoked)
            query = {
                user: userId,
                status: VOUCHER_STATUS.ACTIVE,
                endDate: { $gte: now }
            };
        }

        const vouchers = await VoucherWallet.find(query)
            .populate('coupon', 'code description usageLimit usedCount discountType value maxDiscount minOrderValue endDate')
            .sort({ claimedAt: -1 });

        // Với tab "Còn lại" (active), kiểm tra thêm coupon có hết lượt chưa
        // Nếu usageLimit > 0 VÀ usedCount >= usageLimit → hiển thị với badge "Hết lượt"
        const enrichedVouchers = status !== 'used' && status !== 'expired'
            ? vouchers.map(v => {
                const coupon = v.coupon;
                const isExhausted = coupon?.usageLimit > 0 &&
                    (coupon?.usedCount || 0) >= coupon.usageLimit;
                // Luôn dùng dữ liệu LIVE từ Coupon (nếu còn) thay vì snapshot cũ
                return {
                    ...v.toObject(),
                    code: coupon?.code || v.code,
                    description: coupon?.description || v.description,
                    discountType: coupon?.discountType || v.discountType,
                    value: coupon?.value ?? v.value,
                    maxDiscount: coupon?.maxDiscount ?? v.maxDiscount,
                    minOrderValue: coupon?.minOrderValue ?? v.minOrderValue,
                    endDate: coupon?.endDate || v.endDate,
                    isExhausted // FE dùng để hiện badge "Hết lượt"
                };
            })
            : vouchers.map(v => {
                const coupon = v.coupon;
                return {
                    ...v.toObject(),
                    code: coupon?.code || v.code,
                    description: coupon?.description || v.description,
                    discountType: coupon?.discountType || v.discountType,
                    value: coupon?.value ?? v.value,
                    maxDiscount: coupon?.maxDiscount ?? v.maxDiscount,
                    minOrderValue: coupon?.minOrderValue ?? v.minOrderValue,
                    endDate: coupon?.endDate || v.endDate,
                };
            });

        res.status(200).json({ success: true, data: enrichedVouchers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy voucher', error: error.message });
    }
};

// @desc    Get voucher count summary
// @route   GET /api/vouchers/count
// @access  Private (Customer)
const getVoucherCount = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();

        const [activeWallets, used, expired, revoked] = await Promise.all([
            VoucherWallet.find({ user: userId, status: VOUCHER_STATUS.ACTIVE, endDate: { $gte: now } })
                .populate('coupon', 'usageLimit usedCount'),
            VoucherWallet.countDocuments({ user: userId, status: VOUCHER_STATUS.USED }),
            // expired: voucher còn ACTIVE nhưng đã hết hạn (chưa bị revoke/used)
            VoucherWallet.countDocuments({ user: userId, status: VOUCHER_STATUS.ACTIVE, endDate: { $lt: now } }),
            VoucherWallet.countDocuments({ user: userId, status: VOUCHER_STATUS.REVOKED }),
        ]);

        // Loại bỏ voucher đã hết lượt khỏi active
        const active = activeWallets.filter(v => {
            const coupon = v.coupon;
            if (!coupon) return false;
            if (coupon.usageLimit > 0 && (coupon.usedCount || 0) >= coupon.usageLimit) return false;
            return true;
        }).length;

        res.status(200).json({
            success: true,
            data: { active, used, expired, revoked, total: active + used + expired + revoked }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi đếm voucher', error: error.message });
    }
};

// @desc    Apply voucher from wallet to an order (mark as used)
// @route   POST /api/vouchers/apply
// @access  Private (Customer)
const applyVoucher = async (req, res) => {
    try {
        const { voucherWalletId, orderId } = req.body;
        const userId = req.user._id;

        const voucher = await VoucherWallet.findOne({ _id: voucherWalletId, user: userId });
        if (!voucher) {
            return res.status(404).json({ success: false, message: 'Voucher không hợp lệ' });
        }

        if (voucher.status !== VOUCHER_STATUS.ACTIVE) {
            return res.status(400).json({ success: false, message: 'Voucher đã được sử dụng hoặc hết hạn' });
        }

        if (voucher.endDate && new Date(voucher.endDate) < new Date()) {
            voucher.status = VOUCHER_STATUS.EXPIRED;
            await voucher.save();
            return res.status(400).json({ success: false, message: 'Voucher đã hết hạn' });
        }

        await markVoucherUsed(voucher._id, orderId || null);

        res.status(200).json({ success: true, message: 'Đã áp dụng voucher', data: voucher });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi áp dụng voucher', error: error.message });
    }
};

// @desc    Get available vouchers for checkout (active, not used, not expired)
// @route   GET /api/vouchers/available
// @access  Private (Customer)
const getAvailableVouchers = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();

        // Populate Coupon để lấy dữ liệu mới nhất (nếu admin chỉnh sửa sau khi user claim)
        const walletVouchers = await VoucherWallet.find({
            user: userId,
            status: VOUCHER_STATUS.ACTIVE,
            endDate: { $gte: now }
        })
        .populate('coupon')
        .sort({ endDate: 1 });

        // Lấy fresh data từ Coupon, fallback về snapshot nếu Coupon bị xóa
        const formattedVouchers = walletVouchers.map(v => {
            const coupon = v.coupon;
            
            // Nếu Coupon bị xóa hoặc không còn active, bỏ qua voucher này
            if (!coupon || !coupon.isActive) return null;
            
            // Nếu Coupon hết hạn, đánh dấu expired và bỏ qua
            if (coupon.endDate && new Date(coupon.endDate) < now) return null;

            // Nếu Coupon có giới hạn lượt và đã dùng hết, bỏ qua
            if (coupon.usageLimit > 0 && (coupon.usedCount || 0) >= coupon.usageLimit) return null;
            
            // Ưu tiên dữ liệu từ Coupon (mới nhất), fallback về snapshot
            return {
                ...v.toObject(),
                // Lấy từ Coupon gốc để luôn có dữ liệu mới nhất
                code: coupon.code || v.code,
                description: coupon.description || v.description,
                discountType: coupon.discountType || v.discountType,
                value: coupon.value ?? v.value,
                maxDiscount: coupon.maxDiscount ?? v.maxDiscount,
                minOrderValue: coupon.minOrderValue ?? v.minOrderValue,
                endDate: coupon.endDate || v.endDate,
                // Giữ thông tin snapshot (shop info)
                shopId: v.shopId,
                shopName: v.shopName,
                source: 'wallet'
            };
        }).filter(Boolean); // Loại bỏ null entries

        res.status(200).json({ success: true, data: formattedVouchers });
    } catch (error) {
        console.error('Get available vouchers error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy voucher', error: error.message });
    }
};

const validateVoucher = async (req, res) => {
    try {
        const { code, orderTotal, cartItems = [] } = req.body;
        const userId = req.user._id;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập mã voucher' });
        }

        // Tìm voucher trong ví của user, populate Coupon để lấy dữ liệu mới nhất
        const voucher = await VoucherWallet.findOne({ user: userId, code: code.toUpperCase() })
            .populate('coupon');
        
        if (!voucher) {
            return res.status(404).json({ success: false, message: 'Mã voucher không tồn tại trong ví của bạn' });
        }

        if (voucher.status !== VOUCHER_STATUS.ACTIVE) {
            return res.status(400).json({ success: false, message: 'Voucher đã được sử dụng hoặc hết hạn' });
        }

        // Lấy dữ liệu mới nhất từ Coupon + Promotion (để kiểm tra phạm vi áp dụng)
        const coupon = voucher.coupon;
        const promotion = coupon?.promotion
            ? await Promotion.findById(coupon.promotion).select('type appliesTo products categories').lean()
            : null;
        const isCouponDeleted = !coupon;
        const isCouponExpired = coupon?.endDate && new Date(coupon.endDate) < new Date();
        const isCouponExhausted = coupon?.usageLimit > 0 && (coupon?.usedCount || 0) >= coupon.usageLimit;

        if (isCouponDeleted || isCouponExpired || isCouponExhausted) {
            return res.status(400).json({ success: false, message: 'Voucher không còn khả dụng' });
        }

        // Sử dụng dữ liệu mới nhất từ Coupon
        const voucherValue = coupon.value ?? voucher.value;
        const voucherDiscountType = coupon.discountType || voucher.discountType;
        const voucherMaxDiscount = coupon.maxDiscount ?? voucher.maxDiscount;
        const voucherMinOrderValue = coupon.minOrderValue ?? voucher.minOrderValue;
        const voucherEndDate = coupon.endDate || voucher.endDate;
        const couponShopId = coupon.shop ? coupon.shop.toString() : null;

        if (voucherEndDate && new Date(voucherEndDate) < new Date()) {
            return res.status(400).json({ success: false, message: 'Voucher đã hết hạn' });
        }

        // Chỉ voucher loại COUPON (nhập mã) mới áp dụng theo phạm vi sản phẩm.
        // Bundle/freeship có xử lý riêng.
        const isScopedVoucher = promotion && promotion.type === 'coupon';

        let applicableTotal = Number(orderTotal) || 0;
        if (couponShopId) {
            if (!Array.isArray(cartItems) || cartItems.length === 0) {
                return res.status(400).json({ success: false, message: 'Voucher này chỉ áp dụng cho sản phẩm của shop phát hành' });
            }

            const productIds = cartItems.map((item) => item.productId).filter(Boolean);
            const products = await Product.find({ _id: { $in: productIds } }).select('shop category').lean();
            const eligibleProductIds = new Set();

            for (const product of products) {
                // Phải cùng shop trước
                if (product.shop?.toString() !== couponShopId) continue;

                // Nếu là voucher có phạm vi áp dụng, kiểm tra thêm category/product
                if (isScopedVoucher && promotion.appliesTo) {
                    if (promotion.appliesTo === 'category') {
                        const catIds = (promotion.categories || []).map((c) => c.toString());
                        if (!catIds.includes(product.category?.toString())) continue;
                    } else if (promotion.appliesTo === 'product') {
                        const prodIds = (promotion.products || []).map((p) => p.toString());
                        if (!prodIds.includes(product._id.toString())) continue;
                    }
                    // appliesTo === 'all' → không cần lọc thêm
                }

                eligibleProductIds.add(product._id.toString());
            }

            applicableTotal = cartItems.reduce((sum, item) => {
                if (!eligibleProductIds.has(item.productId?.toString())) return sum;
                return sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1));
            }, 0);

            if (applicableTotal <= 0) {
                return res.status(400).json({ success: false, message: 'Voucher này chỉ áp dụng cho sản phẩm của shop phát hành' });
            }
        } else if (isScopedVoucher && promotion?.appliesTo) {
            // Platform coupon (shop null) nhưng có phạm vi cụ thể → lọc theo category/product
            if (promotion.appliesTo !== 'all' && Array.isArray(cartItems) && cartItems.length > 0) {
                const productIds = cartItems.map((item) => item.productId).filter(Boolean);
                const products = await Product.find({ _id: { $in: productIds } }).select('category').lean();
                const eligibleProductIds = new Set();

                for (const product of products) {
                    if (promotion.appliesTo === 'category') {
                        const catIds = (promotion.categories || []).map((c) => c.toString());
                        if (!catIds.includes(product.category?.toString())) continue;
                    } else if (promotion.appliesTo === 'product') {
                        const prodIds = (promotion.products || []).map((p) => p.toString());
                        if (!prodIds.includes(product._id.toString())) continue;
                    }
                    eligibleProductIds.add(product._id.toString());
                }

                applicableTotal = cartItems.reduce((sum, item) => {
                    if (!eligibleProductIds.has(item.productId?.toString())) return sum;
                    return sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1));
                }, 0);
            }
        }

        if (voucherMinOrderValue && applicableTotal < voucherMinOrderValue) {
            return res.status(400).json({
                success: false,
                message: `Đơn hàng tối thiểu ${voucherMinOrderValue.toLocaleString('vi-VN')}đ để sử dụng voucher này`
            });
        }

        let discount = 0;
        if (voucherDiscountType === 'percent') {
            discount = Math.round(applicableTotal * voucherValue / 100);
            if (voucherMaxDiscount) {
                discount = Math.min(discount, voucherMaxDiscount);
            }
        } else {
            discount = Math.min(voucherValue, applicableTotal);
        }

        // Trả về dữ liệu từ Coupon (mới nhất)
        const voucherData = {
            ...voucher.toObject(),
            code: coupon.code || voucher.code,
            description: coupon.description || voucher.description,
            discountType: voucherDiscountType,
            value: voucherValue,
            maxDiscount: voucherMaxDiscount,
            minOrderValue: voucherMinOrderValue,
            endDate: voucherEndDate
        };

        res.status(200).json({
            success: true,
            data: {
                voucher: voucherData,
                discount,
                message: `Áp dụng voucher ${code} thành công`
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi xác thực voucher', error: error.message });
    }
};

module.exports = {
    claimVoucher,
    getMyVouchers,
    getVoucherCount,
    applyVoucher,
    getAvailableVouchers,
    validateVoucher,
};
