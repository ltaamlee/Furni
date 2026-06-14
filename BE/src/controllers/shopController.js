const mongoose = require('mongoose');
const Shop = require('../models/shop');
const Product = require('../models/product');

// @desc    Lấy thông tin công khai của 1 shop (theo id hoặc slug)
// @route   GET /api/shops/:idOrSlug
// @access  Public
const getShop = async (req, res) => {
    try {
        const { idOrSlug } = req.params;

        let shop = null;
        if (mongoose.isValidObjectId(idOrSlug)) {
            shop = await Shop.findById(idOrSlug);
        }
        if (!shop) {
            shop = await Shop.findOne({ slug: idOrSlug });
        }
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cửa hàng' });
        }

        const [productCount, soldAgg] = await Promise.all([
            Product.countDocuments({ shop: shop._id, isActive: true }),
            Product.aggregate([
                { $match: { shop: shop._id } },
                { $group: { _id: null, totalSold: { $sum: '$sold' } } }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                shop,
                stats: {
                    productCount,
                    totalSold: soldAgg[0]?.totalSold || 0
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin cửa hàng', error: error.message });
    }
};

// @desc    Lấy sản phẩm của 1 shop (công khai, phân trang)
// @route   GET /api/shops/:id/products
// @access  Public
const getShopProducts = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 12, sort = '-createdAt', search, category } = req.query;

        const query = { shop: id, isActive: true };
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            Product.find(query).populate('category', 'name').sort(sort).skip(skip).limit(Number(limit)),
            Product.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: {
                products,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    limit: Number(limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy sản phẩm của cửa hàng', error: error.message });
    }
};

// @desc    [Admin] Danh sách cửa hàng (lọc theo trạng thái duyệt)
// @route   GET /api/admin/shops?status=pending
// @access  Private/Admin
const getAllShopsAdmin = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) query.status = status;
        if (search) query.name = { $regex: search, $options: 'i' };

        const skip = (Number(page) - 1) * Number(limit);
        const [shops, total] = await Promise.all([
            Shop.find(query).populate('owner', 'fullName email phone').sort('-createdAt').skip(skip).limit(Number(limit)),
            Shop.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: {
                shops,
                pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách cửa hàng', error: error.message });
    }
};

// @desc    [Admin] Duyệt / từ chối / tạm khoá cửa hàng
// @route   PUT /api/admin/shops/:id/status
// @access  Private/Admin
const updateShopStatus = async (req, res) => {
    try {
        const { status, statusNote } = req.body;
        if (!Object.values(Shop.STATUS).includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }

        const shop = await Shop.findById(req.params.id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cửa hàng' });
        }

        shop.status = status;
        if (statusNote !== undefined) shop.statusNote = statusNote;
        await shop.save();

        res.status(200).json({ success: true, message: 'Cập nhật trạng thái cửa hàng thành công', data: { shop } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái cửa hàng', error: error.message });
    }
};

module.exports = { getShop, getShopProducts, getAllShopsAdmin, updateShopStatus };
