/**
 * Location controller - administrative divisions.
 * Dữ liệu local từ config/provinces.js, không gọi API bên ngoài.
 */
const { PROVINCES } = require('../config/provinces');

const axios = require('axios');
const EXTERNAL_API = 'https://provinces.open-api.vn/api';

// Proxy: List all provinces — dùng data local (34 tỉnh 2025)
const getProvincesHandler = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            data: PROVINCES.map(p => ({
                ProvinceID: p.code,
                ProvinceName: p.name,
            })),
        });
    } catch (error) {
        console.error('Error in getProvinces:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách tỉnh/thành phố',
            error: error.message,
        });
    }
};

// Proxy: Get districts by province code — gọi open-api.vn
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
            data: (response.data.districts || []).map(d => ({
                DistrictID: d.code,
                DistrictName: d.name,
            })),
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

// Proxy: Get wards by district code — gọi open-api.vn
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
            data: (response.data.wards || []).map(w => ({
                WardCode: w.code,
                WardName: w.name,
            })),
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

// Proxy: Get all wards of a province — gọi open-api.vn
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
        const allWards = (province.districts || []).flatMap(d => d.wards || []);
        res.status(200).json({
            success: true,
            data: allWards.map(w => ({
                WardCode: w.code,
                WardName: w.name,
            })),
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
