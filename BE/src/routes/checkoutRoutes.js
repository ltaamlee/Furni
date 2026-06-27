const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { previewCheckout, updateShipping } = require('../controllers/checkoutController');

// All checkout routes are private (user must be logged in)
router.post('/preview', protect, previewCheckout);
router.patch('/update-shipping', protect, updateShipping);

module.exports = router;
