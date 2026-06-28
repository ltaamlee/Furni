const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Vui lòng đăng nhập để thêm vào giỏ hàng!']
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Sản phẩm không tồn tại!']
        },
        quantity: {
            type: Number,
            required: [true, 'Vui lòng nhập số lượng!'],
            min: [1, 'Số lượng phải lớn hơn 0!'],
            default: 1
        },
        price: {
            type: Number,
            required: [true, 'Vui lòng nhập giá sản phẩm!'],
            min: [0, 'Giá sản phẩm phải lớn hơn hoặc bằng 0!']
        },
        originalPrice: {
            type: Number,
            min: 0
        },
        name: {
            type: String,
            required: [true, 'Tên sản phẩm không được trống!']
        },
        image: {
            type: String,
            default: null
        },
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shop'
        },
        shopName: {
            type: String,
            default: 'Cửa hàng'
        },
        shopAvatar: {
            type: String,
            default: null
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        promotionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Promotion'
        },
        promotionName: {
            type: String,
            default: null
        },
        variant: {
            type: String,
            default: null
        },
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        variantIndex: {
            type: Number,
            default: null
        },
        variantSku: {
            type: String,
            default: null
        },
        variantSize: {
            type: String,
            default: null
        },
        variantPrice: {
            type: Number,
            default: null,
            min: 0
        },
        variantStock: {
            type: Number,
            default: null,
            min: 0
        },
        variantColor: {
            type: String,
            default: null
        },
        variantMaterial: {
            type: String,
            default: null
        },
        variantStyle: {
            type: String,
            default: null
        },
        variantDimensions: {
            length: { type: Number, default: 0 },
            width:  { type: Number, default: 0 },
            depth:  { type: Number, default: 0 },
            height: { type: Number, default: 0 }
        },
        variantWeight: {
            type: Number,
            default: null,
            min: 0
        },
        variantDescription: {
            type: String,
            default: null
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    totalPrice: {
        type: Number,
        default: 0,
        min: [0, 'Tổng giá không được nhỏ hơn 0!']
    },
    totalQuantity: {
        type: Number,
        default: 0,
        min: [0, 'Tổng số lượng không được nhỏ hơn 0!']
    }
}, { timestamps: true });

// Virtual for cart ID
cartSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

// Calculate totals before saving (using discounted price if available)
cartSchema.pre('save', function(next) {
    this.totalQuantity = this.products.reduce((sum, item) => sum + item.quantity, 0);
    
    // Calculate total using discounted price
    this.totalPrice = this.products.reduce((sum, item) => {
        const originalPrice = item.originalPrice || item.price;
        const discount = item.discount || 0;
        const discountedPrice = discount > 0 
            ? Math.round(originalPrice * (1 - discount / 100)) 
            : originalPrice;
        return sum + (discountedPrice * item.quantity);
    }, 0);
    
    next();
});

// Method to add product to cart
cartSchema.methods.addProduct = async function(productId, quantity, price, name, image, options = {}) {
    const existingProduct = this.products.find(
        (item) => item.product.toString() === productId.toString()
    );

    if (existingProduct) {
        existingProduct.quantity += quantity;
    } else {
        this.products.push({
            product: productId,
            quantity,
            price,
            name,
            image,
            ...options,
            addedAt: new Date()
        });
    }

    return this.save();
};

// Method to remove product from cart
cartSchema.methods.removeProduct = function(productId) {
    this.products = this.products.filter(
        (item) => item.product.toString() !== productId.toString()
    );
    return this.save();
};

// Method to update product quantity
cartSchema.methods.updateQuantity = function(productId, quantity) {
    const product = this.products.find(
        (item) => item.product.toString() === productId.toString()
    );

    if (product) {
        product.quantity = quantity;
        return this.save();
    }
    return null;
};

// Enable virtuals in JSON
cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cart', cartSchema);
