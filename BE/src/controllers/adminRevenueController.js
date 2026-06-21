const Order = require('../models/order');
const Transaction = require('../models/transaction'); 

// @desc    Lấy thống kê GMV (từ Order) và Doanh thu (từ Transaction) cho Admin
// @route   GET /api/admin/revenue?timeFilter=this_month
// @access  Private/Admin
const getRevenueStats = async (req, res) => {
    try {
        const { timeFilter = 'this_month' } = req.query;
        let startDate, endDate;
        let isYearFilter = false;
        
        const now = new Date();

        if (timeFilter === 'this_month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (timeFilter === 'last_month') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        } else {
            isYearFilter = true;
            const year = parseInt(timeFilter);
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59, 999);
        }

        const [gmvRaw, commissionRaw] = await Promise.all([
            Order.aggregate([
                { $match: { 
                    status: 'delivered', 
                    deliveredAt: { $gte: startDate, $lte: endDate } 
                }},
                { $group: {
                    _id: { $dateToString: { format: isYearFilter ? "%Y-%m" : "%Y-%m-%d", date: "$deliveredAt", timezone: "+07:00" } },
                    totalGmv: { $sum: '$totalPrice' } 
                }}
            ]),

            Transaction.aggregate([
                { $match: { 
                    category: 'platform_fee',
                    status: 'success',        
                    createdAt: { $gte: startDate, $lte: endDate } 
                }},
                { $group: {
                    _id: { $dateToString: { format: isYearFilter ? "%Y-%m" : "%Y-%m-%d", date: "$createdAt", timezone: "+07:00" } },
                    totalCommission: { $sum: '$amount' } 
                }}
            ])
        ]);

        let labels = [];
        let gmvData = [];
        let commissionData = [];
        let summaryGmv = 0;
        let summaryCommission = 0;

        if (isYearFilter) {
            // Chuẩn bị 12 tháng
            for (let i = 1; i <= 12; i++) {
                const monthStr = `${timeFilter}-${i.toString().padStart(2, '0')}`;
                labels.push(`Thg ${i}`);
                
                const foundGmv = gmvRaw.find(d => d._id === monthStr);
                const foundComm = commissionRaw.find(d => d._id === monthStr);
                
                const gmv = foundGmv ? foundGmv.totalGmv : 0;
                const comm = foundComm ? foundComm.totalCommission : 0;

                gmvData.push(gmv);
                commissionData.push(comm);
                summaryGmv += gmv;
                summaryCommission += comm;
            }
        } else {
            // Chuẩn bị các ngày trong tháng 
            const daysInMonth = endDate.getDate();
            const monthFormat = (startDate.getMonth() + 1).toString().padStart(2, '0');
            const yearFormat = startDate.getFullYear();
            
            for (let i = 1; i <= daysInMonth; i++) {
                const dayStr = i.toString().padStart(2, '0');
                const dateQueryStr = `${yearFormat}-${monthFormat}-${dayStr}`;
                labels.push(`${dayStr}/${monthFormat}`); 
                
                const foundGmv = gmvRaw.find(d => d._id === dateQueryStr);
                const foundComm = commissionRaw.find(d => d._id === dateQueryStr);

                const gmv = foundGmv ? foundGmv.totalGmv : 0;
                const comm = foundComm ? foundComm.totalCommission : 0;

                gmvData.push(gmv);
                commissionData.push(comm);
                summaryGmv += gmv;
                summaryCommission += comm;
            }
        }

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    gmv: summaryGmv,
                    commission: summaryCommission
                },
                chart: {
                    labels,
                    gmv: gmvData,
                    commission: commissionData
                }
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi tính toán doanh thu', error: error.message });
    }
};

module.exports = { getRevenueStats };