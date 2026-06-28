/**
 * Checkout Controller — STEP 3
 * Exposes POST /checkout/preview
 * All pricing, shipping, vouchers computed by backend.
 */
const { buildCheckoutPreview } = require('../services/checkoutService');

// ────────────────────────────────────────────────────────────────
// POST /checkout/preview
// ────────────────────────────────────────────────────────────────
const previewCheckout = async (req, res) => {
    try {
        console.log('[Checkout] POST /preview body:', JSON.stringify(req.body));
        const { mode = 'CART' } = req.body;

        if (!['BUY_NOW', 'CART'].includes(mode)) {
            return res.status(400).json({
                success: false,
                message: 'mode phải là BUY_NOW hoặc CART!',
            });
        }

        const preview = await buildCheckoutPreview(mode, req.body, req.user._id);
        console.log('[Checkout] preview built, shops count:', preview?.shops?.length);

        res.status(200).json({
            success: true,
            data: preview,
        });
    } catch (error) {
        console.error('[Checkout] preview error:', error.message, error.stack);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Lỗi khi tạo checkout preview!',
            ...(error.errors ? { errors: error.errors } : {}),
        });
    }
};

// ────────────────────────────────────────────────────────────────
// PATCH /checkout/update-shipping
// Recalculate shipping when user changes address or shipping method
// ────────────────────────────────────────────────────────────────
const updateShipping = async (req, res) => {
    try {
        const { address, selectedShippingByShop } = req.body;
        const { buildCheckoutPreview: _build } = require('../services/checkoutService');

        // Minimal rebuild: update address province and recalculate shipping per shop
        // For now, just recalculate with the new address province
        const mode = req.body.mode || 'CART';
        const preview = await buildCheckoutPreview(mode, {
            ...req.body,
            // Keep items from original request
        }, req.user._id);

        // If address changed, shipping will auto-recalculate
        res.status(200).json({ success: true, data: preview });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { previewCheckout, updateShipping };
