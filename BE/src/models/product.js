const mongoose = require('mongoose');
const validator = require('validator');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên sản phẩm!'],
        trim: true,
        maxlength: [200, 'Tên sản phẩm không được vượt quá 200 ký tự!']
    },
    description: {
        type: String,
        maxlength: [1000, 'Mô tả sản phẩm không được vượt quá 1000 ký tự!']
    },
    dimensions: {
        width: {
            type: Number,
            required: [true, 'Vui lòng nhập chiều rộng sản phẩm!']
        },
        depth: {
            type: Number,
            required: [true, 'Vui lòng nhập độ dày sản phẩm!']
        },
        height: {
            type: Number,
            required: [true, 'Vui lòng nhập chiều cao sản phẩm!']
        }
    },
    brand: {
        type: String,
        maxlength: [100, 'Thương hiệu không được vượt quá 100 ký tự!']
    },
    color: {
        type: String,
        maxlength: [50, 'Màu sắc không được vượt quá 50 ký tự!']
    },
    material: {
        type: String,
        maxlength: [100, 'Chất liệu không được vượt quá 100 ký tự!']
    },
    variant: {
        type: String,
        maxlength: [100, 'Biến thể không được vượt quá 100 ký tự!']
    },
    price: {
        type: Number,
        required: [true, 'Vui lòng nhập giá sản phẩm!'],
        min: [0, 'Giá sản phẩm phải lớn hơn hoặc bằng 0!']
    },
    quantity: {
        type: Number,
        required: [true, 'Vui lòng nhập số lượng tồn kho!'],
        min: [0, 'Số lượng tồn kho phải lớn hơn hoặc bằng 0!']
    },
    sold: {
        type: Number,
        default: 0,
        min: [0, 'Số lượng đã bán phải lớn hơn hoặc bằng 0!']
    },
    isStock: {
        type: Boolean,
        default: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Vui lòng chọn danh mục sản phẩm!']
    },
    images: [{
        type: String,
        default: null
    }],
    rating: {
        star: {
            type: Number,
            default: 0,
        },
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        comment: {
            type: String,
            maxlength: [500, 'Bình luận không được vượt quá 500 ký tự!']
        }
    }, 
    totalRatings: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

productSchema.pre('save', function(next) {

  if (this.isModified('name')) {

    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      locale: 'vi'
    })
  }

  next()
})

productSchema.pre('save', function(next) {

  if (this.isModified('name')) {

    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      locale: 'vi'
    })
  }

  next()
})

module.exports = mongoose.model('Product', productSchema);