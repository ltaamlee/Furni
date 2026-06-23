const mongoose = require('mongoose');
const Blog = require('../models/blog');
const BlogComment = require('../models/blogComment');
const Shop = require('../models/shop');

const { STATUS } = Blog;

// Lấy shop của vendor đang đăng nhập
const getOwnerShop = async (userId) => Shop.findOne({ owner: userId });

// Whitelist field vendor được gửi lên
const BLOG_FIELDS = [
    'title', 'slug', 'excerpt', 'content', 'coverImage', 'category', 'tags',
    'products', 'status', 'scheduledAt', 'allowComments', 'allowLikes', 'isPinned'
];
const pickFields = (body) => {
    const data = {};
    BLOG_FIELDS.forEach((k) => { if (body[k] !== undefined) data[k] = body[k]; });
    return data;
};

const populateBlog = (q) => q.populate('products', 'name images price slug').populate('author', 'fullName');

// ── VENDOR ───────────────────────────────────────────────────
// @desc    Danh sách bài viết blog của shop (kèm số đếm + thống kê)
// @route   GET /api/vendor/blogs
// @access  Private/Vendor
const getMyBlogs = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });

        const { status, category, search, page = 1, limit = 9, sort = '-createdAt' } = req.query;
        const query = { shop: shop._id };
        if (status && status !== 'all') query.status = status;
        if (category) query.category = category;
        if (search) query.title = { $regex: search, $options: 'i' };

        const skip = (Number(page) - 1) * Number(limit);
        const [blogs, total] = await Promise.all([
            Blog.find(query).populate('author', 'fullName').sort(sort).skip(skip).limit(Number(limit)),
            Blog.countDocuments(query)
        ]);

        // Số đếm tab + thống kê tổng
        const base = { shop: shop._id };
        const [all, published, draft, scheduled, agg] = await Promise.all([
            Blog.countDocuments(base),
            Blog.countDocuments({ ...base, status: STATUS.PUBLISHED }),
            Blog.countDocuments({ ...base, status: STATUS.DRAFT }),
            Blog.countDocuments({ ...base, status: STATUS.SCHEDULED }),
            Blog.aggregate([
                { $match: { shop: shop._id } },
                { $group: { _id: null, views: { $sum: '$views' }, likes: { $sum: '$likes' }, comments: { $sum: '$commentsCount' } } }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                blogs,
                counts: { all, published, draft, scheduled },
                stats: {
                    totalViews: agg[0]?.views || 0,
                    totalLikes: agg[0]?.likes || 0,
                    totalComments: agg[0]?.comments || 0
                },
                pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy bài viết', error: error.message });
    }
};

// @desc    Chi tiết 1 bài viết của shop (để sửa)
// @route   GET /api/vendor/blogs/:id
// @access  Private/Vendor
const getMyBlog = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) return res.status(404).json({ success: false, message: 'Bạn chưa có cửa hàng' });

        const blog = await populateBlog(Blog.findById(req.params.id));
        if (!blog || blog.shop.toString() !== shop._id.toString()) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
        }
        res.status(200).json({ success: true, data: { blog } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy bài viết', error: error.message });
    }
};

// @desc    Tạo bài viết blog
// @route   POST /api/vendor/blogs
// @access  Private/Vendor
const createBlog = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        if (!shop) return res.status(400).json({ success: false, message: 'Bạn chưa có cửa hàng' });

        const data = pickFields(req.body);
        data.shop = shop._id;
        data.author = req.user._id;
        if (data.status === STATUS.PUBLISHED) data.publishedAt = new Date();

        let blog = await Blog.create(data);
        blog = await populateBlog(Blog.findById(blog._id));
        res.status(201).json({ success: true, message: 'Tạo bài viết thành công', data: { blog } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Lỗi khi tạo bài viết' });
    }
};

// @desc    Cập nhật bài viết
// @route   PUT /api/vendor/blogs/:id
// @access  Private/Vendor
const updateBlog = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
        if (!shop || blog.shop.toString() !== shop._id.toString()) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa bài viết này' });
        }

        const data = pickFields(req.body);
        // Lần đầu chuyển sang "đã đăng" thì ghi mốc thời gian đăng
        if (data.status === STATUS.PUBLISHED && !blog.publishedAt) data.publishedAt = new Date();

        Object.assign(blog, data);
        await blog.save();
        const populated = await populateBlog(Blog.findById(blog._id));
        res.status(200).json({ success: true, message: 'Cập nhật bài viết thành công', data: { blog: populated } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Lỗi khi cập nhật bài viết' });
    }
};

// @desc    Xoá bài viết
// @route   DELETE /api/vendor/blogs/:id
// @access  Private/Vendor
const deleteBlog = async (req, res) => {
    try {
        const shop = await getOwnerShop(req.user._id);
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
        if (!shop || blog.shop.toString() !== shop._id.toString()) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xoá bài viết này' });
        }
        await blog.deleteOne();
        res.status(200).json({ success: true, message: 'Đã xoá bài viết' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi xoá bài viết', error: error.message });
    }
};

// ── PUBLIC ───────────────────────────────────────────────────
// @desc    Bài viết đã đăng (toàn sàn hoặc theo shop)
// @route   GET /api/blogs?shop=...&category=...&sort=...&search=...
// @access  Public
const getPublicBlogs = async (req, res) => {
    try {
        const { shop, category, search, page = 1, limit = 9, sort = "-publishedAt" } = req.query;
        const query = { status: STATUS.PUBLISHED };
        if (shop) query.shop = shop;
        if (category) query.category = category;
        if (search) query.title = { $regex: search, $options: 'i' };

        // Parse sort: front-end sends "-publishedAt", "-views", "-likes"
        let sortOption;
        if (sort === "-publishedAt") sortOption = { isPinned: -1, publishedAt: -1, createdAt: -1 };
        else if (sort === "-views") sortOption = { isPinned: -1, views: -1, publishedAt: -1 };
        else if (sort === "-likes") sortOption = { isPinned: -1, likes: -1, publishedAt: -1 };
        else sortOption = { isPinned: -1, publishedAt: -1, createdAt: -1 };

        const skip = (Number(page) - 1) * Number(limit);
        const [blogs, total] = await Promise.all([
            Blog.find(query).populate('shop', 'name slug logo').populate('author', 'fullName')
                .select('-content').sort(sortOption).skip(skip).limit(Number(limit)),
            Blog.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: { blogs, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) } }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy bài viết', error: error.message });
    }
};

// @desc    Chi tiết 1 bài viết công khai (theo id hoặc slug) + tăng view
// @route   GET /api/blogs/:idOrSlug
// @access  Public
const getPublicBlog = async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        const lookup = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const blog = await populateBlog(
            Blog.findOneAndUpdate({ ...lookup, status: STATUS.PUBLISHED }, { $inc: { views: 1 } }, { new: true })
                .populate('shop', 'name slug logo')
        );
        if (!blog) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });

        res.status(200).json({ success: true, data: { blog } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy bài viết', error: error.message });
    }
};

// @desc    Like / unlike a blog post
// @route   POST /api/blogs/:id/like
// @access  Private
const toggleLike = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog || blog.status !== STATUS.PUBLISHED) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
        }
        if (!blog.allowLikes) {
            return res.status(400).json({ success: false, message: 'Bài viết không cho phép thích' });
        }

        // Simple toggle: track likes in a set-like array on the blog or just increment/decrement
        // Using a simple counter approach - in production you'd track per-user likes
        const isLiked = blog.likedBy && blog.likedBy.includes(req.user._id);

        if (isLiked) {
            blog.likes = Math.max(0, blog.likes - 1);
            blog.likedBy = blog.likedBy.filter(id => id.toString() !== req.user._id.toString());
        } else {
            blog.likes = (blog.likes || 0) + 1;
            if (!blog.likedBy) blog.likedBy = [];
            blog.likedBy.push(req.user._id);
        }
        await blog.save();

        res.status(200).json({ success: true, data: { liked: !isLiked, likes: blog.likes } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi thích bài viết', error: error.message });
    }
};

// @desc    Check if user liked a blog
// @route   GET /api/blogs/:id/like
// @access  Private
const checkLike = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id).select('likedBy likes allowLikes');
        if (!blog) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });

        const liked = blog.likedBy && blog.likedBy.some(id => id.toString() === req.user._id.toString());
        res.status(200).json({ success: true, data: { liked, likes: blog.likes, allowLikes: blog.allowLikes } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi kiểm tra', error: error.message });
    }
};

// @desc    Get comments for a blog
// @route   GET /api/blogs/:id/comments
// @access  Public
const getComments = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog || blog.status !== STATUS.PUBLISHED) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
        }

        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        // Get top-level comments only (no parentComment)
        const query = { blog: blog._id, parentComment: null, isDeleted: false };
        const [comments, total] = await Promise.all([
            BlogComment.find(query)
                .populate('author', 'fullName avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            BlogComment.countDocuments(query)
        ]);

        // Get reply counts for each comment
        const commentIds = comments.map(c => c._id);
        const replyCounts = await BlogComment.aggregate([
            { $match: { parentComment: { $in: commentIds }, isDeleted: false } },
            { $group: { _id: '$parentComment', count: { $sum: 1 } } }
        ]);
        const replyCountMap = Object.fromEntries(replyCounts.map(r => [r._id.toString(), r.count]));

        res.status(200).json({
            success: true,
            data: {
                comments: comments.map(c => ({ ...c.toObject(), replyCount: replyCountMap[c._id.toString()] || 0 })),
                pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy bình luận', error: error.message });
    }
};

// @desc    Create a comment
// @route   POST /api/blogs/:id/comments
// @access  Private
const createComment = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog || blog.status !== STATUS.PUBLISHED) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
        }
        if (!blog.allowComments) {
            return res.status(400).json({ success: false, message: 'Bài viết không cho phép bình luận' });
        }
        if (!req.body.content || !req.body.content.trim()) {
            return res.status(400).json({ success: false, message: 'Nội dung bình luận không được để trống' });
        }

        const comment = await BlogComment.create({
            blog: blog._id,
            author: req.user._id,
            content: req.body.content.trim(),
            parentComment: req.body.parentComment || null
        });

        // Increment commentsCount on blog
        await Blog.findByIdAndUpdate(blog._id, { $inc: { commentsCount: 1 } });

        const populated = await BlogComment.findById(comment._id).populate('author', 'fullName avatar');
        res.status(201).json({ success: true, message: 'Đã gửi bình luận', data: { comment: { ...populated.toObject(), replyCount: 0 } } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Lỗi khi tạo bình luận' });
    }
};

// @desc    Delete own comment
// @route   DELETE /api/blogs/:blogId/comments/:commentId
// @access  Private
const deleteComment = async (req, res) => {
    try {
        const comment = await BlogComment.findById(req.params.commentId);
        if (!comment) return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
        if (comment.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xoá bình luận này' });
        }

        // Soft delete
        comment.isDeleted = true;
        comment.content = '[Bình luận đã bị xoá]';
        await comment.save();

        // Decrement commentsCount on blog
        await Blog.findByIdAndUpdate(comment.blog, { $inc: { commentsCount: -1 } });

        res.status(200).json({ success: true, message: 'Đã xoá bình luận' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi xoá bình luận', error: error.message });
    }
};

// @desc    Get replies for a comment
// @route   GET /api/blogs/:blogId/comments/:commentId/replies
// @access  Public
const getReplies = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const replies = await BlogComment.find({
            parentComment: req.params.commentId,
            isDeleted: false
        })
            .populate('author', 'fullName avatar')
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await BlogComment.countDocuments({
            parentComment: req.params.commentId,
            isDeleted: false
        });

        res.status(200).json({
            success: true,
            data: {
                replies,
                pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy trả lời', error: error.message });
    }
};

module.exports = {
    getMyBlogs,
    getMyBlog,
    createBlog,
    updateBlog,
    deleteBlog,
    getPublicBlogs,
    getPublicBlog,
    toggleLike,
    checkLike,
    getComments,
    createComment,
    deleteComment,
    getReplies
};
