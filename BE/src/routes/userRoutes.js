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

const { protect, authorize } = require('../middleware/authMiddleware');
const { validateUpdateProfile } = require('../middleware/validationMiddleware');

// All routes require authentication
router.use(protect);

// Profile routes - Customer only
router.route('/profile')
  .get(authorize('customer'), getProfile)
  .put(authorize('customer'), validateUpdateProfile, updateProfile);

// Change password
router.put('/change-password', authorize('customer'), changePassword);

router.get('/me', authorize('customer', 'admin'), getProfile);

// Admin only routes
router.get('/', authorize('admin'), getUsers);
router.route('/:id')
  .get(authorize('admin'), getUser)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);
  

module.exports = router;