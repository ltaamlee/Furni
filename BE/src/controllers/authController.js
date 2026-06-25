const User = require('../models/user');
const { generateToken } = require('../utils/jwtUtils');
const { sendRegistrationOTP, sendPasswordResetOTP } = require('../utils/emailService');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:8386/api/auth/google/callback' // Phải khớp 100% với link đã cấu hình trên Google Cloud
);

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { fullName, email, phone, address, username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: 'Email này đã được đăng ký'
        });
      }
      if (existingUser.username === username) {
        return res.status(400).json({
          success: false,
          message: 'Tên đăng nhập này đã tồn tại'
        });
      }
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      phone,
      address,
      username,
      password
    });

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    try {
      await sendRegistrationOTP(email, otp);
    } catch (emailError) {
      // If email fails, delete user and return error
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({
        success: false,
        message: 'Không thể gửi email OTP. Vui lòng thử lại.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          username: user.username
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.'
    });
  }
};

// @desc    Verify OTP for registration
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với email này'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã được xác thực'
      });
    }

    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không chính xác hoặc đã hết hạn'
      });
    }

    // Clear OTP and mark as verified
    user.otp = undefined;
    user.isVerified = true;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Xác thực thành công',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi xác thực OTP'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    // Check if user exists and get password
    const { usernameOrEmail, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: usernameOrEmail },
        { username: usernameOrEmail }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại'
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: 'Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ 1900 8080 để được hỗ trợ.' 
      });
    }
    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Tài khoản đã bị khóa tạm thời do quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 1 giờ.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Increment login attempts
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu không chính xác'
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        needsVerification: true,
        message: 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản.'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi đăng nhập'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Email này chưa được đăng ký'
      });
    }

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    try {
      await sendPasswordResetOTP(email, otp);
    } catch (emailError) {
      return res.status(500).json({
        success: false,
        message: 'Không thể gửi email OTP. Vui lòng thử lại.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi gửi mã OTP'
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với email này'
      });
    }

    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không hợp lệ'
      });
    }

    user.password = newPassword;
    user.otp = undefined; 
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi đổi mật khẩu'
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
  try {
    const { email, type } = req.body; 

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với email này'
      });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save();

    // Send appropriate email
    try {
      if (type === 'reset') {
        await sendPasswordResetOTP(email, otp);
      } else {
        await sendRegistrationOTP(email, otp);
      }
    } catch (emailError) {
      return res.status(500).json({
        success: false,
        message: 'Không thể gửi email OTP. Vui lòng thử lại.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Mã OTP mới đã được gửi đến email của bạn'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi gửi lại mã OTP'
    });
  }
};
// @desc    Kiểm tra OTP khôi phục mật khẩu 
// @route   POST /api/auth/check-reset-otp
// @access  Public
const checkResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản với email này' });
    }

    if (!user.verifyOTP(otp)) {
      return res.status(400).json({ success: false, message: 'Mã OTP không chính xác hoặc đã hết hạn' });
    }
    res.status(200).json({ success: true, message: 'Mã OTP hợp lệ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi kiểm tra OTP' });
  }
};
// @desc    Khởi tạo đăng nhập Google
// @route   GET /api/auth/google
// @access  Public
const googleLogin = (req, res) => {
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['profile', 'email']
  })
  res.redirect(url);
};

// @desc    Nhận dữ liệu Google trả về 
// @route   GET /api/auth/google/callback
// @access  Public
const googleCallback = async (req, res) => {
  try {
    const { code } = req.query; 
    
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub, picture } = payload; // 'sub' là ID định danh duy nhất của Google

    // Kiểm tra xem email này đã có trong database chưa
    let user = await User.findOne({ email });

    if (!user) {
      // Nếu chưa có: Tự động tạo tài khoản mới
      user = await User.create({
        fullName: name,
        email: email,
        username: `user_${sub.substring(0, 8)}`, // Tạo username ngẫu nhiên để không bị lỗi trống
        authProvider: 'google',
        googleId: sub,
        isVerified: true, // Đăng nhập Google thì mặc định là email thật, không cần gửi OTP nữa
        profileImage: picture, 
        role: 'customer'
      });
    } else {
      if (!user.googleId) {
        user.googleId = sub;
        user.authProvider = 'google';
        user.isVerified = true;
        await user.save();
      }
    }

    // Sinh ra JWT Token của hệ thống 
    const token = generateToken(user._id);
    res.redirect(`http://localhost:5173/login?token=${token}`);

  } catch (error) {
    console.error('Lỗi Google Callback:', error);
    res.redirect('http://localhost:5173/login?error=google_failed');
  }
};

module.exports = {
  register,
  verifyOTP,
  login,
  forgotPassword,
  resetPassword,
  resendOTP,
  checkResetOTP,
  googleLogin,
  googleCallback
};