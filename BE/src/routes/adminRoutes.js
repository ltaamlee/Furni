const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  toggleBlockUser
} = require('../controllers/userController');

const { 
  getAllShopsAdmin, 
  updateShopStatus, 
  getAdminShopDetail, 
  getAdminShopProducts, 
  toggleProductVisibilityAdmin 
} = require('../controllers/shopController');

const { 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  filterCategories 
} = require('../controllers/categoryController');

const { 
  getAdminPromotions, 
  createAdminPromotion, 
  deleteAdminPromotion,
  updateAdminPromotion
} = require('../controllers/adminPromotionController');
const { getCommissionsList, updateCommissionRate } = require('../controllers/commissionController');
const { getAdminUnreadCount, getAdminNotifications, markReadAdmin, deleteAdminNotification } = require('../controllers/adminNotificationController');
const { getRevenueStats } = require('../controllers/adminRevenueController');
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
router.put('/users/:id/toggle-block', toggleBlockUser);

// Shop approval (Admin only)
router.get('/shops', getAllShopsAdmin);
router.put('/shops/:id/status', updateShopStatus);


router.route('/categories')
  .get(filterCategories)       
  .post(createCategory);       

router.route('/categories/:id')
  .put(updateCategory)         
  .delete(deleteCategory);    

router.get('/shops/:id', protect, authorize('admin'), getAdminShopDetail);
router.get('/shops/:id/products', protect, authorize('admin'), getAdminShopProducts);
router.put('/products/:id/toggle-visibility', protect, authorize('admin'), toggleProductVisibilityAdmin);

// Admin Promotions
router.route('/promotions')
  .get(getAdminPromotions)
  .post(createAdminPromotion);
  
router.route('/promotions/:id')
  .put(updateAdminPromotion)
  .delete(deleteAdminPromotion);

// Admin Commissions 
router.route('/commissions')
  .get(getCommissionsList);
  
router.route('/commissions/:id/rate')
  .put(updateCommissionRate);
// Admin Notifications
router.get('/notifications/unread-count', getAdminUnreadCount);
router.get('/notifications', getAdminNotifications);
router.put('/notifications/read', markReadAdmin);
router.delete('/notifications/:id', deleteAdminNotification);
// Admin Revenue
router.get('/revenue', getRevenueStats);

module.exports = router;