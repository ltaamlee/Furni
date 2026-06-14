const express = require('express');
const router = express.Router();
const { getShop, getShopProducts } = require('../controllers/shopController');

// Public
router.get('/:id/products', getShopProducts);
router.get('/:idOrSlug', getShop);

module.exports = router;
