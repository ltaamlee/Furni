const Address = require('../models/Address');
const User = require('../models/User');

// @desc    Get all addresses of current user
// @route   GET /api/user/addresses
// @access  Private
const getAddresses = async (req, res) => {
    try {
        const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
        res.status(200).json({ success: true, data: addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách địa chỉ', error: error.message });
    }
};

// @desc    Create new address
// @route   POST /api/user/addresses
// @access  Private
const createAddress = async (req, res) => {
    try {
        const {
            fullName, phone, street,
            provinceCode, provinceName,
            districtName,
            wardName,
            lat, lng, formattedAddress,
            isDefault
        } = req.body;

        if (!fullName || !phone) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin bắt buộc' });
        }

        // If setting as default, unset other defaults first
        if (isDefault) {
            await Address.updateMany({ user: req.user._id }, { isDefault: false });
        }

        const address = new Address({
            user: req.user._id,
            fullName, phone, street,
            provinceCode, provinceName,
            districtName,
            wardName,
            lat, lng, formattedAddress,
            isDefault: isDefault || false
        });

        await address.save();

        // Also add to user's addresses array
        await User.findByIdAndUpdate(req.user._id, { $addToSet: { addresses: address._id } });

        res.status(201).json({ success: true, data: address });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi tạo địa chỉ', error: error.message });
    }
};

// @desc    Update address
// @route   PUT /api/user/addresses/:id
// @access  Private
const updateAddress = async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);
        if (!address) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });
        }

        if (address.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa địa chỉ này' });
        }

        const {
            fullName, phone, street,
            provinceCode, provinceName,
            districtName,
            wardName,
            lat, lng, formattedAddress,
            isDefault
        } = req.body;

        // If setting as default, unset others first
        if (isDefault && !address.isDefault) {
            await Address.updateMany({ user: req.user._id, _id: { $ne: address._id } }, { isDefault: false });
        }

        const updated = await Address.findByIdAndUpdate(
            req.params.id,
            {
                fullName, phone, street,
                provinceCode, provinceName,
                districtName,
                wardName,
                lat, lng, formattedAddress,
                isDefault: isDefault !== undefined ? isDefault : address.isDefault
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật địa chỉ', error: error.message });
    }
};

// @desc    Delete address
// @route   DELETE /api/user/addresses/:id
// @access  Private
const deleteAddress = async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);
        if (!address) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });
        }

        if (address.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa địa chỉ này' });
        }

        await Address.findByIdAndDelete(req.params.id);
        await User.findByIdAndUpdate(req.user._id, { $pull: { addresses: req.params.id } });

        res.status(200).json({ success: true, message: 'Xóa địa chỉ thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi xóa địa chỉ', error: error.message });
    }
};

// @desc    Set address as default
// @route   PUT /api/user/addresses/:id/default
// @access  Private
const setDefaultAddress = async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);
        if (!address) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });
        }

        if (address.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác với địa chỉ này' });
        }

        // Unset all defaults for user
        await Address.updateMany({ user: req.user._id }, { isDefault: false });
        // Set this one as default
        address.isDefault = true;
        await address.save();

        res.status(200).json({ success: true, data: address });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật địa chỉ mặc định', error: error.message });
    }
};

// @desc    Get default address of current user
// @route   GET /api/user/addresses/default
// @access  Private
const getDefaultAddress = async (req, res) => {
    try {
        const address = await Address.findOne({ user: req.user._id, isDefault: true });
        res.status(200).json({ success: true, data: address || null });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy địa chỉ mặc định', error: error.message });
    }
};

module.exports = {
    getAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getDefaultAddress
};
