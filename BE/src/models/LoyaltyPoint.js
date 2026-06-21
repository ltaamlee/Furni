const mongoose = require('mongoose');

// Tier thresholds configuration
const TIER_THRESHOLDS = {
    bronze: 0,
    silver: 100000,
    gold: 500000,
    diamond: 2000000
};

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
        enum: ['bronze', 'silver', 'gold', 'diamond'],
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
    if (total >= TIER_THRESHOLDS.diamond) return 'diamond';
    if (total >= TIER_THRESHOLDS.gold) return 'gold';
    if (total >= TIER_THRESHOLDS.silver) return 'silver';
    return 'bronze';
};

// Get tier multiplier for earning points
loyaltyPointSchema.methods.getTierMultiplier = function() {
    const multipliers = {
        bronze: 1,
        silver: 1.2,
        gold: 1.5,
        diamond: 2
    };
    return multipliers[this.tier] || 1;
};

// Update tier automatically
loyaltyPointSchema.methods.updateTier = function() {
    const newTier = this.calculateTier();
    if (newTier !== this.tier) {
        this.tier = newTier;
    }
    
    // Calculate progress to next tier
    const tierOrder = ['bronze', 'silver', 'gold', 'diamond'];
    const currentIndex = tierOrder.indexOf(this.tier);
    
    if (currentIndex < tierOrder.length - 1) {
        const nextTier = tierOrder[currentIndex + 1];
        const nextThreshold = TIER_THRESHOLDS[nextTier];
        this.tierProgress = {
            nextTier: nextTier,
            pointsNeeded: nextThreshold - this.totalEarned,
            currentProgress: this.totalEarned
        };
    } else {
        // Already at highest tier
        this.tierProgress = null;
    }
    
    return this.tier;
};

// Add points with history (applies tier multiplier)
loyaltyPointSchema.methods.addPoints = async function(points, description, orderId = null) {
    // Apply tier multiplier
    const multiplier = this.getTierMultiplier();
    const earnedPoints = Math.floor(points * multiplier);
    
    this.points += earnedPoints;
    this.totalEarned += earnedPoints;
    this.history.push({
        type: 'earn',
        points: earnedPoints,
        description: description,
        order: orderId,
        createdAt: new Date()
    });
    this.updateTier();
    await this.save();
    return { totalPoints: this.points, earnedPoints, multiplier };
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

// Static method to get tier config for frontend
loyaltyPointSchema.statics.getTierConfig = function() {
    return {
        tiers: [
            { id: 'bronze', name: 'Đồng', minPoints: TIER_THRESHOLDS.bronze, multiplier: 1 },
            { id: 'silver', name: 'Bạc', minPoints: TIER_THRESHOLDS.silver, multiplier: 1.2 },
            { id: 'gold', name: 'Vàng', minPoints: TIER_THRESHOLDS.gold, multiplier: 1.5 },
            { id: 'diamond', name: 'Kim Cương', minPoints: TIER_THRESHOLDS.diamond, multiplier: 2 }
        ],
        thresholds: TIER_THRESHOLDS
    };
};

// Virtual for id
loyaltyPointSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

loyaltyPointSchema.set('toJSON', { virtuals: true });
loyaltyPointSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LoyaltyPoint', loyaltyPointSchema);
module.exports.TIER_THRESHOLDS = TIER_THRESHOLDS;
