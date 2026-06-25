const express = require('express');
const router = express.Router();
const {
  register,
  verifyOTP,
  login,
  forgotPassword,
  resetPassword,
  resendOTP,
  checkResetOTP,
  googleLogin,     
  googleCallback
} = require('../controllers/authController');

const {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyOTP
} = require('../middleware/validationMiddleware');

// Public routes
router.post('/register', validateRegistration, register);
router.post('/verify-otp', validateVerifyOTP, verifyOTP);
router.post('/login', validateLogin, login);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);
router.post('/resend-otp', resendOTP);
router.post('/check-reset-otp', checkResetOTP);

router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

module.exports = router;