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
const {
  uploadAvatarMiddleware,
  uploadAvatar
} = require('../controllers/uploadController');
const {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress
} = require('../controllers/addressController');
const {
  getCustomerNotifications,
  markCustomerNotificationRead,
  markAllCustomerNotificationsRead,
  streamCustomerNotifications
} = require('../controllers/customerNotificationController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { validateUpdateProfile } = require('../middleware/validationMiddleware');

router.get('/notifications/stream', streamCustomerNotifications);

// All routes require authentication
router.use(protect);

// Address management (customer only)
router.route('/addresses')
  .get(authorize('customer'), getAddresses)
  .post(authorize('customer'), createAddress);

router.route('/addresses/:id')
  .put(authorize('customer'), updateAddress)
  .delete(authorize('customer'), deleteAddress);

router.put('/addresses/:id/default', authorize('customer'), setDefaultAddress);
router.get('/addresses/default', authorize('customer'), getDefaultAddress);

// Profile routes - Customer only
router.route('/profile')
  .get(authorize('customer'), getProfile)
  .put(authorize('customer'), validateUpdateProfile, updateProfile);

// Upload avatar
router.post('/avatar', authorize('customer'), uploadAvatarMiddleware, uploadAvatar);

// Change password
router.put('/change-password', authorize('customer'), changePassword);

router.get('/notifications', authorize('customer'), getCustomerNotifications);
router.put('/notifications/read-all', authorize('customer'), markAllCustomerNotificationsRead);
router.put('/notifications/:id/read', authorize('customer'), markCustomerNotificationRead);

// Current user — phải đặt TRƯỚC '/:id' để không bị shadow; mở cho mọi role đã đăng nhập
router.get('/me', authorize('customer', 'admin', 'vendor'), getProfile);

// Admin only routes
router.get('/', authorize('admin'), getUsers);
router.route('/:id')
  .get(authorize('admin'), getUser)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);

module.exports = router;
