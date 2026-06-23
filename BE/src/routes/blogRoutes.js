const express = require('express');
const router = express.Router();
const { getPublicBlogs, getPublicBlog, toggleLike, checkLike, getComments, createComment, deleteComment, getReplies } = require('../controllers/blogController');
const { protect } = require('../middleware/authMiddleware');

// Public
router.get('/', getPublicBlogs);
router.get('/:idOrSlug', getPublicBlog);

// Comments
router.get('/:id/comments', getComments);
router.post('/:id/comments', protect, createComment);
router.delete('/:blogId/comments/:commentId', protect, deleteComment);
router.get('/:blogId/comments/:commentId/replies', getReplies);

// Like
router.post('/:id/like', protect, toggleLike);
router.get('/:id/like', protect, checkLike);

module.exports = router;
