const mongoose = require('mongoose');
const validator = require('validator');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên danh mục!'],
        unique: true,
        trim: true,
        maxlength: [100, 'Tên danh mục không được vượt quá 100 ký tự!']
    },
    slug:{
        type: String,
        unique:true,
        index:true,
        sparse: true,
        set: (v) => slugify(v, { lower: true })
    },
    description: {
        type: String,
        maxlength: [500, 'Mô tả không được vượt quá 500 ký tự!']
    },
    image: {
        type: String,
        default: null
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    }
}, { timestamps: true });

categorySchema.pre('save', function(next) {

  if (this.isModified('name')) {

    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      locale: 'vi'
    })
  }

  next()
})

module.exports = mongoose.model("Category", categorySchema)