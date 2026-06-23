const mongoose = require('mongoose');

const blogCommentSchema = new mongoose.Schema({
    blog: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Blog',
        required: [true, 'Bình luận phải thuộc về một bài viết!'],
        index: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Bình luận phải có người viết!']
    },
    content: {
        type: String,
        required: [true, 'Nội dung bình luận không được để trống!'],
        trim: true,
        maxlength: [2000, 'Bình luận không được vượt quá 2000 ký tự!']
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BlogComment',
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

blogCommentSchema.index({ blog: 1, createdAt: -1 });
blogCommentSchema.index({ parentComment: 1 });

const BlogComment = mongoose.model('BlogComment', blogCommentSchema);

module.exports = BlogComment;
