const Order = require('../models/order');

const buildDateRange = (timeFilter) => {
    const now = new Date();

    if (timeFilter === 'this_month') {
        return {
            startDate: new Date(now.getFullYear(), now.getMonth(), 1),
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
            isYearFilter: false,
        };
    }

    if (timeFilter === 'last_month') {
        return {
            startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
            isYearFilter: false,
        };
    }

    const year = parseInt(timeFilter, 10);
    return {
        startDate: new Date(year, 0, 1),
        endDate: new Date(year, 11, 31, 23, 59, 59, 999),
        isYearFilter: true,
    };
};

// @desc    Thong ke doanh thu san theo don da giao/da payout
// @route   GET /api/admin/revenue?timeFilter=this_month
// @access  Private/Admin
const getRevenueStats = async (req, res) => {
    try {
        const { timeFilter = 'this_month' } = req.query;
        const { startDate, endDate, isYearFilter } = buildDateRange(timeFilter);
        const bucketFormat = isYearFilter ? '%Y-%m' : '%Y-%m-%d';

        const revenueRaw = await Order.aggregate([
            {
                $match: {
                    status: 'delivered',
                    payoutStatus: 'paid',
                    payoutAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $project: {
                    bucket: {
                        $dateToString: {
                            format: bucketFormat,
                            date: '$payoutAt',
                            timezone: '+07:00',
                        },
                    },
                    productRevenue: {
                        $max: [{ $subtract: ['$subtotal', '$couponDiscount'] }, 0],
                    },
                    shopRevenue: '$vendorTakeHome',
                },
            },
            {
                $group: {
                    _id: '$bucket',
                    totalGmv: { $sum: '$productRevenue' },
                    totalCommission: {
                        $sum: { $subtract: ['$productRevenue', '$shopRevenue'] },
                    },
                },
            },
        ]);

        const labels = [];
        const gmvData = [];
        const commissionData = [];
        let summaryGmv = 0;
        let summaryCommission = 0;

        if (isYearFilter) {
            for (let i = 1; i <= 12; i += 1) {
                const key = `${timeFilter}-${String(i).padStart(2, '0')}`;
                const found = revenueRaw.find((row) => row._id === key);
                const gmv = found?.totalGmv || 0;
                const commission = found?.totalCommission || 0;

                labels.push(`Thg ${i}`);
                gmvData.push(gmv);
                commissionData.push(commission);
                summaryGmv += gmv;
                summaryCommission += commission;
            }
        } else {
            const daysInMonth = endDate.getDate();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const year = startDate.getFullYear();

            for (let i = 1; i <= daysInMonth; i += 1) {
                const day = String(i).padStart(2, '0');
                const key = `${year}-${month}-${day}`;
                const found = revenueRaw.find((row) => row._id === key);
                const gmv = found?.totalGmv || 0;
                const commission = found?.totalCommission || 0;

                labels.push(`${day}/${month}`);
                gmvData.push(gmv);
                commissionData.push(commission);
                summaryGmv += gmv;
                summaryCommission += commission;
            }
        }

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    gmv: summaryGmv,
                    commission: summaryCommission,
                },
                chart: {
                    labels,
                    gmv: gmvData,
                    commission: commissionData,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Loi tinh toan doanh thu', error: error.message });
    }
};

module.exports = { getRevenueStats };
