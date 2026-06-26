const Promotion = require('../models/promotion');

// Loại khuyến mãi tự động giảm giá hiển thị (không cần nhập mã).
// coupon = nhập mã khi thanh toán; bundle/gift/freeship = không giảm giá đơn sản phẩm.
const AUTO_TYPES = ['flash_sale'];

const idStr = (v) => (v && v._id ? String(v._id) : v ? String(v) : '');

// Giá sau giảm theo 1 khuyến mãi
const discountedPrice = (price, promo) => {
    if (promo.discountType === 'percent') {
        let d = (price * (promo.value || 0)) / 100;
        if (promo.maxDiscount && promo.maxDiscount > 0) d = Math.min(d, promo.maxDiscount);
        return Math.max(0, Math.round(price - d));
    }
    if (promo.discountType === 'fixed') {
        return Math.max(0, Math.round(price - (promo.value || 0)));
    }
    return price; // freeship... không đổi giá sản phẩm
};

// Khuyến mãi có áp dụng cho sản phẩm này không (theo phạm vi)
const promoApplies = (promo, product) => {
    // Khuyến mãi của shop: sản phẩm phải cùng shop. Toàn sàn (shop null): áp cho mọi shop.
    if (promo.shop && idStr(promo.shop) !== idStr(product.shop)) return false;
    if (promo.appliesTo === 'all') return true;
    if (promo.appliesTo === 'category') return (promo.categories || []).some((c) => idStr(c) === idStr(product.category));
    if (promo.appliesTo === 'product') return (promo.products || []).some((p) => idStr(p) === idStr(product._id));
    return false;
};

// Tải các khuyến mãi đang chạy (của các shop liên quan + toàn sàn)
const loadRunningPromotions = async (shopIds = []) => {
    const now = new Date();
    return Promotion.find({
        type: { $in: AUTO_TYPES },
        status: 'running',
        startDate: { $lte: now },
        endDate: { $gte: now },
        $or: [{ shop: { $in: shopIds } }, { shop: null }]
    }).lean();
};

// Chọn khuyến mãi cho giá thấp nhất
// basePrice: cho variant; nếu null dùng product.price
const bestPricing = (product, promos, basePrice = null) => {
    const base = basePrice ?? product.price;
    let best = null;
    for (const promo of promos) {
        if (promo.maxUsage && promo.usedCount >= promo.maxUsage) continue;
        if (!promoApplies(promo, product)) continue;
        const sp = discountedPrice(base, promo);
        if (sp < base && (!best || sp < best.salePrice)) {
            best = { salePrice: sp, promotionId: promo._id, promotionName: promo.name, promotionType: promo.type };
        }
    }
    return best;
};

/**
 * Gắn thông tin giá khuyến mãi vào danh sách sản phẩm (plain object / lean).
 * Thêm: salePrice, originalPrice (giá gốc), discountPercent, promotion {id,name,type}.
 * Nếu có variants, cũng tính giá sale cho từng variant.
 */
const attachPricing = async (products) => {
    const list = Array.isArray(products) ? products : [products];
    if (list.length === 0) return products;

    const shopIds = [...new Set(list.map((p) => idStr(p.shop)).filter(Boolean))];
    const promos = await loadRunningPromotions(shopIds);
    if (promos.length === 0) {
        // Vẫn cần đảm bảo variants có originalPrice
        for (const p of list) {
            if (p.variants && Array.isArray(p.variants)) {
                for (const v of p.variants) {
                    v.originalPrice = v.originalPrice ?? v.price;
                }
            }
        }
        return products;
    }

    for (const p of list) {
        const best = bestPricing(p, promos);
        if (best) {
            p.salePrice = best.salePrice;
            p.originalPrice = p.price;
            p.discountPercent = Math.round((1 - best.salePrice / p.price) * 100);
            p.promotion = { id: best.promotionId, name: best.promotionName, type: best.promotionType };
        }

        // Tính giá sale cho từng variant
        if (p.variants && Array.isArray(p.variants)) {
            for (const v of p.variants) {
                v.originalPrice = v.originalPrice ?? v.price;
                const variantBest = bestPricing(p, promos, v.price);
                if (variantBest) {
                    v.salePrice = variantBest.salePrice;
                    v.discountPercent = Math.round((1 - variantBest.salePrice / v.price) * 100);
                    v.promotion = { id: variantBest.promotionId, name: variantBest.promotionName, type: variantBest.promotionType };
                } else {
                    v.salePrice = null;
                    v.discountPercent = null;
                    v.promotion = null;
                }
            }
        }
    }
    return products;
};

// Giá bán hiện tại của 1 sản phẩm (dùng khi thêm vào giỏ) — đã trừ khuyến mãi
// basePrice: nếu truyền sẽ dùng làm base (cho variant), không truyền thì dùng product.price
const currentSalePrice = async (product, basePrice = null) => {
    const promos = await loadRunningPromotions([idStr(product.shop)].filter(Boolean));
    const base = basePrice ?? product.price;
    const promo = bestPricing(product, promos, basePrice); // truyền basePrice để tính giá sale đúng
    if (!promo) return base;
    return promo.salePrice;
};

module.exports = { attachPricing, currentSalePrice, discountedPrice };
