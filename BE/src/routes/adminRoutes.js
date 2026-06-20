const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  getUsers,
  getUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

const { getAllShopsAdmin, updateShopStatus } = require('../controllers/shopController');
const {
    getAdminPromotions, createAdminPromotion, updateAdminPromotion, deleteAdminPromotion
} = require('../controllers/promotionController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { validateUpdateProfile } = require('../middleware/validationMiddleware');

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Admin profile routes
router.route('/profile')
  .get(getProfile)
  .put(validateUpdateProfile, updateProfile);

// Change password
router.put('/change-password', changePassword);

// User management routes (Admin only)
router.get('/users', getUsers);
router.route('/users/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

// Shop approval (Admin only)
router.get('/shops', getAllShopsAdmin);
router.put('/shops/:id/status', updateShopStatus);

// Khuyến mãi toàn sàn (Admin only)
router.route('/promotions')
  .get(getAdminPromotions)
  .post(createAdminPromotion);
router.route('/promotions/:id')
  .put(updateAdminPromotion)
  .delete(deleteAdminPromotion);

module.exports = router;
