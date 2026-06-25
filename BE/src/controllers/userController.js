const User = require('../models/user');

// @desc    Get current user profile
// @route   GET /api/user/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          username: user.username,
          role: user.role,
          profileImage: user.profileImage,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi lấy thông tin cá nhân'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { fullName, email, phone, address, profileImage, gender, dateOfBirth } = req.body;

    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email này đã được sử dụng bởi tài khoản khác'
        });
      }
    }

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (gender !== undefined) updateData.gender = gender;
    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin cá nhân thành công',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          username: user.username,
          role: user.role,
          profileImage: user.profileImage,
          isVerified: user.isVerified,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth
        }
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu nhập vào không hợp lệ',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi cập nhật thông tin cá nhân'
    });
  }
};

// @desc    Change password
// @route   PUT /api/user/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác'
      });
    }

    // Update password
    user.password = newPassword;
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

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, role, status } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role && role !== 'Tất cả Vai trò') {
      query.role = role.toLowerCase(); 
    }

    if (status && status !== 'Tất cả Trạng thái') {
      if (status === 'Hoạt động') {
        query.isBlocked = false;
      } else if (status === 'Bị khóa') {
        query.isBlocked = true;
      }
    }

    const users = await User.find(query)
      .select('-password -otp')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi lấy danh sách người dùng'
    });
  }
};

// @desc    Get single user (Admin only)
// @route   GET /api/user/:id
// @access  Private/Admin
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -otp');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi lấy thông tin người dùng'
    });
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/user/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const { fullName, email, phone, address, role, isVerified } = req.body;

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (role !== undefined) updateData.role = role;
    if (isVerified !== undefined) updateData.isVerified = isVerified;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -otp');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật người dùng thành công',
      data: { user }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu nhập vào không hợp lệ',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi cập nhật người dùng'
    });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/user/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Xóa người dùng thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi xóa người dùng'
    });
  }
};
// @desc    Toggle block/unblock user (Admin only)
// @route   PUT /api/admin/users/:id/toggle-block
// @access  Private/Admin
const toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể tự khóa tài khoản quản trị của chính mình!'
      });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Đã ${user.isBlocked ? 'khóa' : 'mở khóa'} tài khoản thành công`,
      data: { isBlocked: user.isBlocked }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi thay đổi trạng thái tài khoản'
    });
  }
};
module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  toggleBlockUser
};