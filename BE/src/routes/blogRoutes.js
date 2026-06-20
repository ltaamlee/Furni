const express = require('express');
const router = express.Router();
const { getPublicBlogs, getPublicBlog } = require('../controllers/blogController');

// Public
router.get('/', getPublicBlogs);
router.get('/:idOrSlug', getPublicBlog);

module.exports = router;
