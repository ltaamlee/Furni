const mongoose = require('mongoose');

const recentlyViewedSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        viewedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

// Index for efficient queries
recentlyViewedSchema.index({ user: 1 });

// Add product to recently viewed (max 20)
recentlyViewedSchema.methods.addProduct = async function(productId) {
    const existingIndex = this.products.findIndex(
        p => p.product.toString() === productId.toString()
    );
    
    if (existingIndex !== -1) {
        this.products[existingIndex].viewedAt = new Date();
        this.products.splice(existingIndex, 1);
    }
    
    this.products.unshift({
        product: productId,
        viewedAt: new Date()
    });
    
    if (this.products.length > 20) {
        this.products = this.products.slice(0, 20);
    }
    
    await this.save();
};

// Get recent products with pagination
recentlyViewedSchema.methods.getRecentProducts = function(limit = 10) {
    return this.products.slice(0, limit);
};

// Virtual for id
recentlyViewedSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

recentlyViewedSchema.set('toJSON', { virtuals: true });
recentlyViewedSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('RecentlyViewed', recentlyViewedSchema);
