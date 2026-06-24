const express = require('express');
const router = express.Router();
const {
    getProvinces,
    getDistricts,
    getWards,
    getWardsByProvince,
} = require('../controllers/locationController');

router.get('/provinces', getProvinces);
router.get('/districts/:provinceCode', getDistricts);
router.get('/wards/:districtCode', getWards);
router.get('/wards/province/:provinceCode', getWardsByProvince);

module.exports = router;
