const Category = require('../models/category');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi lấy danh mục' });
    }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
    try {
        const { name, description, parentCategory } = req.body;
        const category = await Category.create({ name, description, parentCategory });
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }
        res.status(200).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi lấy danh mục' });
    }
};

// @desc    Update category (Admin only)
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
    try {
        const { name, description, parentCategory } = req.body;
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description, parentCategory },
            { new: true, runValidators: true }
        );  
        if (!category) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }
        res.status(200).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi cập nhật danh mục' });
    }   
};

// @desc    Delete category (Admin only)
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }
        await Category.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Xóa danh mục thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi xóa danh mục' });
    }
};

// @desc Filter, sorting and Pagination
// @route   GET /api/categories?=...&sort=...&page=...&limit=...
// @access  Public
const filterCategories = async (req, res) => {
  try {

    const queryObj = { ...req.query }

    const excludeFields = ['sort', 'page', 'limit', 'fields']
    excludeFields.forEach(el => delete queryObj[el])

    let queryString = JSON.stringify(queryObj)

    queryString = queryString.replace(
      /\b(gte|gt|lte|lt)\b/g,
      match => `$${match}`
    )

    const formatQuery = JSON.parse(queryString)

    // Search by name
    if (queryObj?.name) {
      formatQuery.name = {
        $regex: queryObj.name,
        $options: 'i'
      }
    }

    // Sorting
    let sortBy = '-createdAt'

    if (req.query.sort) {

      // asc | desc
      if (req.query.sort === 'asc') {
        sortBy = 'createdAt'
      }

      if (req.query.sort === 'desc') {
        sortBy = '-createdAt'
      }
    }


    // Pagination
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Query
    const categories = await Category.find(formatQuery)
      .sort(sortBy)
      .skip(skip)
      .limit(limit)

    const count = await Category.countDocuments(formatQuery)

    res.status(200).json({
      success: true,

      data: {
        categories,

        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit),
          limit
        }
      }
    })

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi lọc danh mục',
      error: error.message
    })
  }
}

module.exports = {
    getAllCategories,
    createCategory,
    getCategory,
    updateCategory,
    deleteCategory,
    filterCategories
};