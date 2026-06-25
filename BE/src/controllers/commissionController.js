const Shop = require('../models/Shop');
const Order = require('../models/order');
const { ORDER_STATUS } = require('../models/order');
const Notification = require('../models/notification');

// @desc    Lấy danh sách shop kèm doanh thu GMV 
// @route   GET /api/admin/commissions
// @access  Private/Admin
const getCommissionsList = async (req, res) => {
    try {
        const { search, rateQuery, page = 1, limit = 10 } = req.query;
        
        //Khởi tạo bộ lọc tìm kiếm
        const matchQuery = {};
        if (search) {
            matchQuery.name = { $regex: search, $options: 'i' };
        }
        if (rateQuery) {
            matchQuery.commissionRate = Number(rateQuery);
        }

        const skip = (Number(page) - 1) * Number(limit);

        let sortQuery = { updatedAt: -1 }; 
        if (req.query.sort === 'asc') sortQuery = { commissionRate: 1 };
        if (req.query.sort === 'desc') sortQuery = { commissionRate: -1 };
        //Lấy danh sách Shop từ Database
        const shops = await Shop.find(matchQuery)
            .select('name commissionRate updatedAt')
            .sort(sortQuery)
            .skip(skip)
            .limit(Number(limit));

        const total = await Shop.countDocuments(matchQuery);

        const data = await Promise.all(shops.map(async (shop) => {
            const gmvAgg = await Order.aggregate([
                { $match: { 'products.shop': shop._id, status: ORDER_STATUS.DELIVERED } },
                { $unwind: '$products' },
                { $match: { 'products.shop': shop._id } },
                { $group: { 
                    _id: null, 
                    gmv: { $sum: { $multiply: ['$products.price', '$products.quantity'] } } 
                }}
            ]);

            return {
                _id: shop._id,
                name: shop.name,
                commissionRate: shop.commissionRate || 0, 
                updatedAt: shop.updatedAt,
                gmv: gmvAgg[0]?.gmv || 0 
            };
        }));

        res.status(200).json({
            success: true,
            data: {
                shops: data,
                pagination: { 
                    total, 
                    page: Number(page), 
                    pages: Math.ceil(total / Number(limit)),
                    limit: Number(limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách chiết khấu', error: error.message });
    }
};

// @desc    Cập nhật tỷ lệ chiết khấu cho Shop 
// @route   PUT /api/admin/commissions/:id/rate
// @access  Private/Admin
const updateCommissionRate = async (req, res) => {
    try {
        const { commissionRate } = req.body;
        
        if (commissionRate === undefined || commissionRate < 0 || commissionRate > 100) {
            return res.status(400).json({ success: false, message: 'Tỷ lệ chiết khấu không hợp lệ (0-100)' });
        }

        const shop = await Shop.findById(req.params.id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cửa hàng' });
        }

        const oldRate = shop.commissionRate || 0;

        if (oldRate !== commissionRate) {
            shop.commissionRate = commissionRate;
            await shop.save();

            await Notification.create({
                user: shop.owner,       
                type: 'system',        
                title: 'Cập nhật tỷ lệ chiết khấu',
                body: `Hệ thống vừa điều chỉnh tỷ lệ chiết khấu phí sàn cho cửa hàng "${shop.name}" từ ${oldRate}% thành ${commissionRate}%. Sự thay đổi này sẽ được áp dụng cho các đơn hàng kể từ bây giờ.`,
                isRead: false
            });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Cập nhật chiết khấu thành công!',
            data: { commissionRate: shop.commissionRate }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật chiết khấu', error: error.message });
    }
};

module.exports = { getCommissionsList, updateCommissionRate };