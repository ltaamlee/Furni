const mongoose = require('mongoose');
const slugify = require('slugify');

// Chủ đề bài viết blog của shop
const BLOG_CATEGORY = {
    INSPIRATION: 'inspiration',     // Cảm hứng
    STYLING: 'styling',             // Mẹo phối đồ
    GUIDE: 'guide',                 // Hướng dẫn
    BRAND_STORY: 'brand_story',     // Câu chuyện thương hiệu
    TREND: 'trend'                  // Xu hướng
};

const BLOG_STATUS = {
    DRAFT: 'draft',                 // Nháp
    PUBLISHED: 'published',         // Đã đăng
    SCHEDULED: 'scheduled'          // Đã lên lịch
};

const blogSchema = new mongoose.Schema({
    // Shop sở hữu bài viết
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: [true, 'Bài viết phải thuộc về một shop!'],
        index: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    title: {
        type: String,
        required: [true, 'Vui lòng nhập tiêu đề bài viết!'],
        trim: true,
        maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự!']
    },
    slug: {
        type: String,
        index: true
    },
    excerpt: {
        type: String,
        maxlength: [500, 'Tóm tắt không được vượt quá 500 ký tự!'],
        default: ''
    },
    // Nội dung bài viết (HTML/rich text)
    content: {
        type: String,
        maxlength: [50000, 'Nội dung không được vượt quá 50.000 ký tự!'],
        default: ''
    },
    coverImage: {
        type: String,
        default: null
    },
    category: {
        type: String,
        enum: Object.values(BLOG_CATEGORY),
        default: BLOG_CATEGORY.INSPIRATION
    },
    tags: [{
        type: String,
        trim: true
    }],
    // Sản phẩm gắn kèm bài viết (hiển thị thẻ mua hàng cuối bài)
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    status: {
        type: String,
        enum: Object.values(BLOG_STATUS),
        default: BLOG_STATUS.DRAFT
    },
    publishedAt: {
        type: Date,
        default: null
    },
    scheduledAt: {
        type: Date,
        default: null
    },
    views: {
        type: Number,
        default: 0,
        min: 0
    },
    likes: {
        type: Number,
        default: 0,
        min: 0
    },
    commentsCount: {
        type: Number,
        default: 0,
        min: 0
    },
    allowComments: {
        type: Boolean,
        default: true
    },
    allowLikes: {
        type: Boolean,
        default: true
    },
    isPinned: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

blogSchema.index({ shop: 1, status: 1, createdAt: -1 });

// Sinh slug từ tiêu đề khi tạo / đổi tên (kèm hậu tố để hạn chế trùng)
blogSchema.pre('save', function (next) {
    if (this.isModified('title') && !this.isModified('slug')) {
        const base = slugify(this.title, { lower: true, strict: true, locale: 'vi' });
        const suffix = this._id.toString().slice(-6);
        this.slug = `${base}-${suffix}`;
    }
    next();
});

blogSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

blogSchema.set('toJSON', { virtuals: true });
blogSchema.set('toObject', { virtuals: true });

const Blog = mongoose.model('Blog', blogSchema);
Blog.CATEGORY = BLOG_CATEGORY;
Blog.STATUS = BLOG_STATUS;

module.exports = Blog;
module.exports.CATEGORY = BLOG_CATEGORY;
module.exports.STATUS = BLOG_STATUS;
