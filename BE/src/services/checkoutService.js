/**
 * Checkout Service — STEP 3: Unified Checkout Preview
 *
 * Two flows converge here:
 *   BUY_NOW → { productId, variantId, quantity }[]
 *   CART    → { cartItemIds: string[] }
 *
 * Everything downstream (shipping, vouchers, pricing) works on
 * a common CheckoutItem array — no mode checks beyond this point.
 */

const mongoose = require('mongoose');
const Cart = mongoose.models.Cart || require('../models/Cart');
const Product = mongoose.models.Product || require('../models/Product');
const Shop = mongoose.models.Shop || require('../models/Shop');
const Coupon = mongoose.models.Coupon || require('../models/Coupon');
const { VoucherWallet, VOUCHER_STATUS } = require('../models/voucherWallet');
const { attachPricing } = require('../utils/pricing');
const { ShippingRate } = require('../models/shippingRate');

// ─── Shipping helpers (copied from shippingController.js to keep service self-contained) ───
const PROVINCE_REGION_MAP = {
    79: 'south', 74: 'south', 75: 'south', 80: 'south', 83: 'south', 84: 'south', 82: 'south',
    60: 'south', 64: 'south', 86: 'south', 71: 'south', 52: 'south', 51: 'south',
    92: 'central', 38: 'central', 39: 'central', 40: 'central', 42: 'central', 43: 'central',
    44: 'central', 46: 'central', 56: 'central', 62: 'central', 58: 'central', 68: 'central',
    1: 'north', 15: 'north', 16: 'north', 17: 'north', 18: 'north', 19: 'north', 20: 'north',
    23: 'north', 24: 'north', 26: 'north', 31: 'north', 33: 'north', 36: 'north', 66: 'north',
    67: 'north', 45: 'north', 10: 'north', 11: 'north', 13: 'north', 14: 'north', 25: 'north',
    29: 'north', 30: 'north',
};

const PROVIDER_LABELS = {
    jt: 'J&T Express',
    ghtk: 'Giao Hàng Tiết Kiệm',
    viettel: 'Viettel Post',
};

const getRegion = (provinceCode) => {
    return PROVINCE_REGION_MAP[Number(provinceCode)] || 'south';
};

// ────────────────────────────────────────────────────────────────
// STEP 3a: Normalize input to CheckoutItem[]
// ────────────────────────────────────────────────────────────────
/**
 * @param {string} mode - 'BUY_NOW' | 'CART'
 * @param {object} body - request body
 * @param {string} userId
 * @returns {Promise<Array<{productId, variantId, quantity}>>}
 */
const normalizeToCheckoutItems = async (mode, body, userId) => {
    console.log('[Checkout] normalizeToCheckoutItems', { mode, userId });
    if (mode === 'BUY_NOW') {
        const { items = [] } = body;
        console.log('[Checkout] BUY_NOW items:', items);
        return items
            .filter(item => item.productId && Number(item.quantity) > 0)
            .map(item => ({
                productId: item.productId.toString(),
                variantId: item.variantId ? item.variantId.toString() : null,
                quantity: Math.max(1, Number(item.quantity)),
            }));
    }
    const { cartItemIds = [] } = body;
    console.log('[Checkout] CART mode, cartItemIds:', cartItemIds);
    const cart = await Cart.findOne({ user: userId }).lean();
    console.log('[Checkout] cart found:', cart ? `products=${cart.products.length}` : 'null');

    const selected = new Set(cartItemIds.map(id => id.toString()));
    const items = (cartItemIds.length === 0
        ? cart.products
        : cart.products.filter(p =>
            selected.has(p._id.toString()) || selected.has(p.product.toString())
        ));

    return items.map(item => ({
        cartItemId: item._id.toString(),
        productId: item.product.toString(),
        variantId: item.variantId ? item.variantId.toString() : null,
        variantName: item.variant || null,
        variantSize: item.variantSize || null,
        variantSku: item.variantSku || null,
        variantPrice: item.variantPrice ?? null,
        variantStock: item.variantStock ?? null,
        quantity: item.quantity,
        cartPromotion: item.promotion || null, // promotion at the time of adding to cart
    }));
};

// ────────────────────────────────────────────────────────────────
// STEP 3b: Load products with pricing
// ────────────────────────────────────────────────────────────────
const loadProducts = async (checkoutItems) => {
    const productIds = checkoutItems.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds } })
        .select('+variants') // include variants for pricing
        .populate('shop', 'name avatar code status isActive shippingConfig provinceCode provinceName')
        .lean();

    await attachPricing(products);

    return products; // each has salePrice, originalPrice, discountPercent, promotion, variants with salePrice
};

// ────────────────────────────────────────────────────────────────
// STEP 3c: Validate stock & build enriched CheckoutItem
// ────────────────────────────────────────────────────────────────
const validateAndEnrichItems = async (checkoutItems, products, address) => {
    const productMap = new Map(products.map(p => [p._id.toString(), p]));
    const enriched = [];
    const errors = [];

    for (const item of checkoutItems) {
        const product = productMap.get(item.productId);
        if (!product) {
            errors.push({ productId: item.productId, error: 'Sản phẩm không tồn tại!' });
            continue;
        }

        const shop = product.shop;
        if (!shop || !shop.status || shop.status !== 'approved' || shop.isActive === false) {
            errors.push({ productId: item.productId, error: `Shop "${shop?.name || ''}" đang tạm nghỉ!` });
            continue;
        }

        const variant = item.variantId
            ? product.variants?.find(v => v._id?.toString() === item.variantId)
            : (item.variantName ? product.variants?.find(v => v.name === item.variantName) : null);
        const stock = variant ? Number(variant.stock ?? 0) : Number(item.variantStock ?? product.quantity);

        if (stock < item.quantity) {
            errors.push({ productId: item.productId, error: `Sản phẩm "${product.name}" chỉ còn ${product.quantity} trong kho!` });
            continue;
        }

        const discountPercent = variant?.discountPercent ?? product.discountPercent ?? 0;
        const originalPrice = item.variantPrice ?? variant?.originalPrice ?? variant?.price ?? product.originalPrice ?? product.price;
        const salePrice = variant?.salePrice || (discountPercent > 0
            ? Math.round(originalPrice * (1 - discountPercent / 100))
            : (item.variantPrice ?? product.salePrice ?? originalPrice));

        enriched.push({
            cartItemId: item.cartItemId || item.productId,
            productId: item.productId,
            variantId: item.variantId,
            variantName: item.variantName || variant?.name || null,
            variantSize: item.variantSize || variant?.size || null,
            variantSku: item.variantSku || variant?.sku || null,
            quantity: item.quantity,
            // Product data
            name: product.name,
            image: (product.images?.[0]?.url) || (product.images?.[0]) || null,
            originalPrice,
            salePrice,
            discountPercent,
            weight: product.weight || 0,
            // Shop data
            shopId: shop._id.toString(),
            shopName: shop.name || 'Cửa hàng',
            shopAvatar: shop.avatar || null,
            // Stock
            stock,
            // Promotion
            promotion: variant
                ? (product.variants.find(v => v._id?.toString() === item.variantId?.toString())?.promotion || null)
                : (product.promotion || null),
        });
    }

    return { enriched, errors };
};

// ────────────────────────────────────────────────────────────────
// STEP 3d: Group by shop
// ────────────────────────────────────────────────────────────────
const groupByShop = (enrichedItems) => {
    const groups = {};
    for (const item of enrichedItems) {
        if (!groups[item.shopId]) {
            groups[item.shopId] = {
                shopId: item.shopId,
                shopName: item.shopName,
                shopAvatar: item.shopAvatar,
                items: [],
                subtotal: 0,
                totalWeight: 0,
            };
        }
        groups[item.shopId].items.push(item);
        groups[item.shopId].subtotal += item.salePrice * item.quantity;
        groups[item.shopId].totalWeight += (item.weight || 0) * item.quantity;
    }
    return Object.values(groups);
};

// ────────────────────────────────────────────────────────────────
// STEP 3e: Calculate shipping tiers per shop
// ────────────────────────────────────────────────────────────────
const calculateShopShipping = async (shopGroup, customerProvinceCode, address) => {
    const shopId = shopGroup.shopId;
    const weight = Math.max(1, Math.round(shopGroup.totalWeight)); // kg
    const weightGrams = Math.round(shopGroup.totalWeight * 1000);
    const additional500gBlocks = Math.max(0, Math.floor((weightGrams - 500) / 500));

    // Get shop shipping config
    let shopProvinceCode = null;
    let isUrbanZone = false;
    let enabledProviders = null;
    let defaultProvider = null;

    try {
        const shop = await Shop.findById(shopId)
            .select('shippingConfig provinceCode isActive status')
            .lean();
        if (shop) {
            shopProvinceCode = shop.provinceCode ? String(shop.provinceCode) : null;
            isUrbanZone = shop.shippingConfig?.isUrbanZone || false;
            enabledProviders = shop.shippingConfig?.enabledProviders || null;
            defaultProvider = shop.shippingConfig?.defaultProvider || null;
        }
    } catch (_) { /* no shop */ }

    const customerRegion = getRegion(customerProvinceCode);
    const shopRegion = getRegion(shopProvinceCode || customerProvinceCode);
    const customerCode = Number(customerProvinceCode);

    // Distance multiplier
    const isSameProvince = shopProvinceCode && Number(shopProvinceCode) === customerCode;
    const isSameRegion = shopRegion === customerRegion;
    let multiplier = 1.0;
    let distanceLabel = 'khác vùng';

    if (isSameProvince) {
        multiplier = isUrbanZone ? 0.7 : 1.0;
        distanceLabel = isUrbanZone ? 'nội thành' : 'ngoại thành';
    } else if (isSameRegion) {
        multiplier = 1.0;
        distanceLabel = 'cùng vùng';
    } else {
        multiplier = 1.3;
        distanceLabel = 'khác vùng';
    }

    // Load rates from DB — use CUSTOMER's region (destination), not shop's region
    let rates = [];
    const targetProviders = defaultProvider
        ? [defaultProvider]
        : (enabledProviders && enabledProviders.length > 0 ? enabledProviders : null);
    try {
        const query = {
            region: customerRegion,
            isActive: true,
        };
        if (targetProviders) {
            query.provider = { $in: targetProviders };
        }
        rates = await ShippingRate.find(query).lean();
    } catch (_) { /* no rates */ }

    // If vendor has set a defaultProvider, show ONLY that provider (both economy + express)
    // Otherwise pick cheapest per tier across all available providers
    const pickForTier = (tier) => {
        const tierRates = rates.filter(r => r.serviceType === tier);
        if (!tierRates.length) return null;
        if (defaultProvider) {
            return tierRates.find(r => r.provider === defaultProvider) || null;
        }
        return tierRates.reduce((best, r) => {
            const fee = Math.round((r.baseFee + r.feePer500g * additional500gBlocks) * multiplier);
            const bestFee = Math.round((best.baseFee + best.feePer500g * additional500gBlocks) * multiplier);
            return fee < bestFee ? r : best;
        });
    };

    // Build tiers — each method carries the provider's label
    const tierResults = ['economy', 'express'].map(tier => {
        const chosen = pickForTier(tier);
        if (!chosen) return null;

        const baseFee = chosen.baseFee + chosen.feePer500g * additional500gBlocks;
        const fee = Math.round(baseFee * multiplier);

        return {
            provider: {
                _id: chosen.provider,
                name: PROVIDER_LABELS[chosen.provider] || chosen.provider,
                code: chosen.provider?.toUpperCase() || chosen.provider,
            },
            serviceType: tier,
            serviceName: tier === 'economy' ? 'Tiết Kiệm' : 'Nhanh',
            fee,
            baseFee: Math.round(baseFee),
            estimatedDays: chosen.estimatedDays || { min: 2, max: 5 },
            isFree: false,
            distanceLabel,
            weight,
        };
    }).filter(Boolean);

    // Fallback: prefer defaultProvider over enabledProviders[0]
    if (tierResults.length === 0) {
        const fallback = defaultProvider || enabledProviders?.[0] || 'ghtk';
        tierResults.push(
            {
                provider: { _id: fallback, name: PROVIDER_LABELS[fallback] || fallback, code: fallback.toUpperCase() },
                serviceType: 'economy',
                serviceName: 'Tiết Kiệm',
                fee: Math.round(25000 * multiplier),
                estimatedDays: { min: 4, max: 7 },
                isFree: false,
                distanceLabel,
                weight,
            },
            {
                provider: { _id: fallback, name: PROVIDER_LABELS[fallback] || fallback, code: fallback.toUpperCase() },
                serviceType: 'express',
                serviceName: 'Nhanh',
                fee: Math.round(35000 * multiplier),
                estimatedDays: { min: 1, max: 3 },
                isFree: false,
                distanceLabel,
                weight,
            }
        );
    }

    return {
        shippingMethods: tierResults,
        // Auto-select economy tier as default
        selectedShippingMethod: tierResults[0] ? {
            code: tierResults[0].provider.code,
            serviceType: tierResults[0].serviceType,
        } : null,
        shippingFee: tierResults[0]?.fee || 0,
    };
};

// ────────────────────────────────────────────────────────────────
// STEP 3f: Get available vouchers
// ────────────────────────────────────────────────────────────────
const getAvailableVouchers = async (userId, shopGroups, address) => {
    const shopIds = shopGroups.map(g => g.shopId);

    const now = new Date();

    // Only return vouchers the user has claimed (in their wallet)
    const userVouchers = await VoucherWallet.find({
        user: userId,
        status: VOUCHER_STATUS.ACTIVE,
    }).populate('coupon').lean();

    const available = [];

    for (const walletEntry of userVouchers) {
        const coupon = walletEntry.coupon;
        if (!coupon || !coupon.isActive) continue;
        if (coupon.startDate && new Date(coupon.startDate) > now) continue;
        if (coupon.endDate && new Date(coupon.endDate) < now) continue;
        if (coupon.usageLimit && coupon.usageLimit > 0 && (coupon.usedCount || 0) >= coupon.usageLimit) continue;

        // Skip shop vouchers that aren't in this order's shops
        if (coupon.shop) {
            const couponShopId = coupon.shop._id
                ? coupon.shop._id.toString()
                : coupon.shop.toString();
            if (!shopIds.includes(couponShopId)) continue;
        }

        available.push({
            _id: coupon._id.toString(),
            code: coupon.code,
            description: coupon.description || '',
            discountType: coupon.discountType,
            value: coupon.value,
            maxDiscount: coupon.maxDiscount ?? 0,
            minOrderValue: coupon.minOrderValue ?? 0,
            shopId: coupon.shop ? (
                coupon.shop._id
                    ? coupon.shop._id.toString()
                    : coupon.shop.toString()
            ) : null,
            shopName: coupon.shopName || '',
            endDate: coupon.endDate || walletEntry.endDate || null,
            walletId: walletEntry._id.toString(), // use wallet _id to avoid duplicate _id issues
        });
    }

    // Deduplicate by code (prefer wallet entry over raw coupon)
    const seen = new Set();
    const deduped = available.filter(v => {
        if (seen.has(v.code)) return false;
        seen.add(v.code);
        return true;
    });

    const platformVouchers = deduped.filter(v => !v.shopId);
    const shopVouchersByShop = {};
    for (const shop of shopGroups) {
        shopVouchersByShop[shop.shopId] = deduped.filter(v => v.shopId === shop.shopId);
    }

    return { platformVouchers, shopVouchersByShop };
};

// ────────────────────────────────────────────────────────────────
// STEP 3g: Get default address
// ────────────────────────────────────────────────────────────────
const getDefaultAddress = async (userId) => {
    const Address = mongoose.models.Address || require('../models/Address');
    const addresses = await Address.find({ user: userId }).lean();
    const def = addresses.find(a => a.isDefault) || addresses[0];
    if (!def) return null;

    return {
        _id: def._id.toString(),
        fullName: def.fullName,
        phone: def.phone,
        address: def.formattedAddress || def.street || '',
        provinceCode: def.provinceCode ? String(def.provinceCode) : null,
        provinceName: def.provinceName || '',
        districtCode: def.districtCode ? String(def.districtCode) : null,
        districtName: def.districtName || '',
        wardCode: def.wardCode ? String(def.wardCode) : null,
        wardName: def.wardName || '',
        isDefault: def.isDefault || false,
    };
};

// ────────────────────────────────────────────────────────────────
// Main entry: buildCheckoutPreview
// ────────────────────────────────────────────────────────────────
/**
 * @param {string} mode - 'BUY_NOW' | 'CART'
 * @param {object} body - request body
 * @param {string} userId
 * @returns {Promise<object>} full checkout preview
 */
const buildCheckoutPreview = async (mode, body, userId) => {
    console.log('[Checkout] buildCheckoutPreview start', { mode, userId });
    // 1. Normalize to CheckoutItem[]
    const checkoutItems = await normalizeToCheckoutItems(mode, body, userId);
    console.log('[Checkout] checkoutItems:', checkoutItems.length, checkoutItems);
    if (checkoutItems.length === 0) {
        throw Object.assign(new Error(mode === 'CART' ? 'Giỏ hàng trống!' : 'Không có sản phẩm hợp lệ!'), { statusCode: 400 });
    }

    // 2. Load products with live pricing
    const products = await loadProducts(checkoutItems);
    console.log('[Checkout] products loaded:', products.length);

    // 3. Validate stock & enrich
    const { enriched, errors } = await validateAndEnrichItems(checkoutItems, products);
    console.log('[Checkout] enriched:', enriched.length, errors.length, errors);
    if (errors.length > 0) {
        throw Object.assign(new Error(errors[0].error), { statusCode: 400, errors });
    }

    // 4. Group by shop
    const shopGroups = groupByShop(enriched);

    // 5. Get default address (provinceCode needed for shipping)
    const address = await getDefaultAddress(userId);
    const provinceCode = body.address?.provinceCode
        || address?.provinceCode
        || null;

    // 6. Shipping per shop
    const shopsWithShipping = await Promise.all(
        shopGroups.map(async (group) => {
            const shipping = await calculateShopShipping(group, provinceCode, address);
            return {
                ...group,
                shippingMethods: shipping.shippingMethods,
                selectedShippingMethod: shipping.selectedShippingMethod,
                shippingFee: shipping.shippingFee,
                shopVouchers: [],   // filled by getAvailableVouchers
            };
        })
    );

    // 7. Vouchers
    const { platformVouchers, shopVouchersByShop } = await getAvailableVouchers(userId, shopGroups, address);

    // Inject shop vouchers into shop groups
    for (const shop of shopsWithShipping) {
        shop.shopVouchers = shopVouchersByShop[shop.shopId] || [];
    }

    // 8. Summary
    const subtotal = shopsWithShipping.reduce((sum, g) => sum + g.subtotal, 0);
    const shippingFee = shopsWithShipping.reduce((sum, g) => sum + (g.shippingFee || 0), 0);

    return {
        address,
        shops: shopsWithShipping,
        platformVouchers,
        paymentMethods: [
            { code: 'COD', name: 'Thanh toán khi nhận hàng (COD)', description: 'Trả tiền mặt khi nhận được hàng' },
            { code: 'PAYOS', name: 'Thanh toán online qua PayOS', description: 'Ví điện tử, Ngân hàng, QR Code' },
        ],
        summary: {
            subtotal,
            totalShippingFee: shippingFee,
            totalDiscount: 0,   // filled by FE selection
            total: subtotal + shippingFee,
            totalQuantity: enriched.reduce((sum, i) => sum + i.quantity, 0),
        },
        // Raw items for reference
        items: enriched,
    };
};

module.exports = { buildCheckoutPreview, normalizeToCheckoutItems };
