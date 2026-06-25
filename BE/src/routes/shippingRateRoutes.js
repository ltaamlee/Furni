const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getAllRates,
    getGroupedRates,
    updateRate,
    bulkUpdateRates,
    seedRates,
    resetRates,
    syncRates
} = require('../controllers/shippingRateController');

// Public routes
router.get('/', getAllRates);
router.get('/grouped', getGroupedRates);

// Protected routes (Admin only)
router.put('/:id', protect, authorize('admin'), updateRate);
router.put('/bulk', protect, authorize('admin'), bulkUpdateRates);
router.post('/seed', protect, authorize('admin'), seedRates);
router.post('/reset', protect, authorize('admin'), resetRates);
router.post('/sync', protect, authorize('admin'), syncRates);

module.exports = router;
