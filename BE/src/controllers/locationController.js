const {
    getProvinces,
    getDistricts: getDistrictsFromPkg,
    getWards: getWardsFromPkg,
} = require('vn-provinces');

// Proxy: List all provinces (served from local package, no external call)
const getProvincesHandler = async (req, res) => {
    try {
        const data = getProvinces();
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error serving provinces:', error.message);
        res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách tỉnh/thành phố',
            error: error.message,
        });
    }
};

// Proxy: Get districts by province code
const getDistrictsHandler = async (req, res) => {
    try {
        const { provinceCode } = req.params;
        if (!provinceCode) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu mã tỉnh/thành phố',
            });
        }
        const districtsData = getDistrictsFromPkg(provinceCode);
        res.status(200).json({
            success: true,
            data: districtsData || [],
        });
    } catch (error) {
        console.error('Error fetching districts:', error.message);
        res.status(502).json({
            success: false,
            message: 'Không thể lấy danh sách quận/huyện',
            error: error.message,
        });
    }
};

// Proxy: Get wards by district code
const getWardsHandler = async (req, res) => {
    try {
        const { districtCode } = req.params;
        if (!districtCode) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu mã quận/huyện',
            });
        }
        const wardsData = getWardsFromPkg(districtCode);
        res.status(200).json({
            success: true,
            data: wardsData || [],
        });
    } catch (error) {
        console.error('Error fetching wards:', error.message);
        res.status(502).json({
            success: false,
            message: 'Không thể lấy danh sách phường/xã',
            error: error.message,
        });
    }
};

// Proxy: Get all wards of a province (flattened from all districts)
const getWardsByProvinceHandler = async (req, res) => {
    try {
        const { provinceCode } = req.params;
        if (!provinceCode) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu mã tỉnh/thành phố',
            });
        }
        const {
            getDistrictsByProvinceCode,
            getWardsByDistrictCode,
        } = require('vn-provinces');

        const districts = getDistrictsByProvinceCode(provinceCode) || [];
        const allWards = districts.flatMap((d) => {
            const wards = getWardsByDistrictCode(d.code);
            return Array.isArray(wards) ? wards : [];
        });
        res.status(200).json({ success: true, data: allWards });
    } catch (error) {
        console.error('Error fetching wards by province:', error.message);
        res.status(502).json({
            success: false,
            message: 'Không thể lấy danh sách phường/xã',
            error: error.message,
        });
    }
};

module.exports = {
    getProvinces: getProvincesHandler,
    getDistricts: getDistrictsHandler,
    getWards: getWardsHandler,
    getWardsByProvince: getWardsByProvinceHandler,
};
