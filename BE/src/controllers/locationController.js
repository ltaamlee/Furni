const axios = require('axios');

const EXTERNAL_API = 'https://provinces.open-api.vn/api';

// Proxy: List all provinces
const getProvincesHandler = async (req, res) => {
    try {
        const response = await axios.get(`${EXTERNAL_API}/`, {
            timeout: 10000,
        });
        res.status(200).json({
            success: true,
            data: response.data,
        });
    } catch (error) {
        console.error('Error fetching provinces:', error.message);
        res.status(502).json({
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
        const response = await axios.get(`${EXTERNAL_API}/p/${provinceCode}?depth=2`, {
            timeout: 15000,
        });
        res.status(200).json({
            success: true,
            data: response.data.districts || [],
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
        const response = await axios.get(`${EXTERNAL_API}/d/${districtCode}`, {
            timeout: 10000,
        });
        res.status(200).json({
            success: true,
            data: response.data.wards || [],
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

// Proxy: Get all wards of a province (flattened from all districts — for new 2-level structure)
const getWardsByProvinceHandler = async (req, res) => {
    try {
        const { provinceCode } = req.params;
        if (!provinceCode) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu mã tỉnh/thành phố',
            });
        }
        const response = await axios.get(`${EXTERNAL_API}/p/${provinceCode}?depth=3`, {
            timeout: 20000,
        });
        const province = response.data;
        // Flatten all wards from all districts (depth=3 returns province → districts → wards)
        const allWards = (province.districts || []).flatMap((d) => d.wards || []);
        res.status(200).json({
            success: true,
            data: allWards,
        });
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
