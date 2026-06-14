const mongoose = require('mongoose');

const loyaltyPointSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    points: {
        type: Number,
        default: 0,
        min: [0, 'Điểm không thể âm!']
    },
    totalEarned: {
        type: Number,
        default: 0
    },
    totalRedeemed: {
        type: Number,
        default: 0
    },
    history: [{
        type: {
            type: String,
            enum: ['earn', 'redeem', 'expire', 'bonus', 'refund'],
            required: true
        },
        points: {
            type: Number,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        },
        coupon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon'
        },
        expiresAt: Date,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    tier: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum'],
        default: 'bronze'
    },
    tierProgress: {
        nextTier: String,
        pointsNeeded: Number,
        currentProgress: Number
    }
}, { timestamps: true });

// Calculate tier based on total earned points
loyaltyPointSchema.methods.calculateTier = function() {
    const total = this.totalEarned;
    if (total >= 1000000) return 'platinum';
    if (total >= 500000) return 'gold';
    if (total >= 200000) return 'silver';
    return 'bronze';
};

// Update tier automatically
loyaltyPointSchema.methods.updateTier = function() {
    const newTier = this.calculateTier();
    if (newTier !== this.tier) {
        this.tier = newTier;
    }
    
    // Calculate progress to next tier
    const tiers = {
        bronze: { next: 'silver', points: 200000 },
        silver: { next: 'gold', points: 500000 },
        gold: { next: 'platinum', points: 1000000 },
        platinum: { next: null, points: 0 }
    };
    
    if (tiers[this.tier].next) {
        this.tierProgress = {
            nextTier: tiers[this.tier].next,
            pointsNeeded: tiers[this.tier].points - this.totalEarned,
            currentProgress: this.totalEarned
        };
    }
    
    return this.tier;
};

// Add points with history
loyaltyPointSchema.methods.addPoints = async function(points, description, orderId = null) {
    this.points += points;
    this.totalEarned += points;
    this.history.push({
        type: 'earn',
        points: points,
        description: description,
        order: orderId,
        createdAt: new Date()
    });
    this.updateTier();
    await this.save();
    return this;
};

// Redeem points with history
loyaltyPointSchema.methods.redeemPoints = async function(points, description, couponId = null) {
    if (this.points < points) {
        throw new Error('Không đủ điểm để đổi!');
    }
    
    this.points -= points;
    this.totalRedeemed += points;
    this.history.push({
        type: 'redeem',
        points: -points,
        description: description,
        coupon: couponId,
        createdAt: new Date()
    });
    await this.save();
    return this;
};

// Virtual for id
loyaltyPointSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

loyaltyPointSchema.set('toJSON', { virtuals: true });
loyaltyPointSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LoyaltyPoint', loyaltyPointSchema);
