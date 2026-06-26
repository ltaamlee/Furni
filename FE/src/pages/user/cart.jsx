import { useState, useEffect, useContext, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../components/context/authContext";
import {
    getCartApi,
    updateCartItemApi,
    removeFromCartApi,
    getAvailableVouchersApi,
    validateVoucherApi,
    getShopVouchersApi,
    getAddressesApi,
    calculateShippingFeesApi,
    getShopShippingConfigApi,
} from "../../utils/api";
import { useToast } from "../../components/context/ToastContext";

const CartPage = () => {
    const { auth } = useContext(AuthContext);
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [coupons, setCoupons] = useState([]);
    const [loadingCoupons, setLoadingCoupons] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [couponCode, setCouponCode] = useState("");
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [shopVouchers, setShopVouchers] = useState({});
    
    // Selection state
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [shippingFees, setShippingFees] = useState([]);
    const [loadingShipping, setLoadingShipping] = useState(false);
    const shippingDebounceRef = useRef(null);

    useEffect(() => {
        fetchCart();
        fetchAddresses();
        if (auth?.user) {
            fetchCoupons();
        }
    }, []);

    useEffect(() => {
        // Update select all when all items are selected
        const availableProducts = cart?.products?.filter(item => item.shopIsActive !== false) || [];
        if (availableProducts.length > 0) {
            const allSelected = availableProducts.every(item => 
                selectedItems.has(item.product._id || item.product)
            );
            setSelectAll(allSelected);
        }
    }, [selectedItems, cart]);

    const fetchCart = async () => {
        try {
            setLoading(true);
            const res = await getCartApi();
            if (res.success) {
                const newCart = res.data;
                setCart(newCart);
                // Preserve selection: remove IDs that no longer exist in cart
                const currentIds = new Set((newCart.products || [])
                    .filter(item => item.shopIsActive !== false)
                    .map(item => item.product._id || item.product));
                setSelectedItems((prev) => {
                    const kept = [...prev].filter(id => currentIds.has(id));
                    // If all cart items are in the kept selection, keep selectAll = true
                    if (kept.length === currentIds.size && currentIds.size > 0) {
                        setSelectAll(true);
                    } else {
                        setSelectAll(false);
                    }
                    return new Set(kept);
                });
            }
        } catch (error) {
            console.error("Error fetching cart:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCoupons = async () => {
        try {
            const res = await getAvailableVouchersApi();
            if (res.success) {
                setCoupons(res.data || []);
            }
        } catch (error) {
            console.error("Error fetching vouchers:", error);
        }
    };

    const fetchShopVouchers = async (shopId) => {
        try {
            const res = await getShopVouchersApi(shopId);
            if (res.success) {
                setShopVouchers(prev => ({ ...prev, [shopId]: res.data || [] }));
            }
        } catch (error) {
            console.error("Error fetching shop vouchers:", error);
        }
    };

    const fetchAddresses = async () => {
        try {
            const res = await getAddressesApi();
            if (res.success) {
                const addrList = res.data || [];
                setAddresses(addrList);
                const def = addrList.find(a => a.isDefault) || addrList[0];
                if (def) {
                    setSelectedAddressId(def._id);
                }
            }
        } catch (error) {
            console.error("Error fetching addresses:", error);
        }
    };

    const fetchShippingFees = async (provinceCode) => {
        if (!provinceCode) return;
        try {
            setLoadingShipping(true);
            // Get the first selected item's shop to filter providers
            let enabledProviders = null;
            const firstSelectedItem = cart?.products?.find(item =>
                selectedItems.has(item.product._id || item.product) && item.shopIsActive !== false
            );
            if (firstSelectedItem) {
                const shopId = firstSelectedItem.shop?._id || firstSelectedItem.shop;
                if (shopId) {
                    try {
                        const cfgRes = await getShopShippingConfigApi(shopId);
                        if (cfgRes.success) {
                            enabledProviders = cfgRes.data.shippingConfig?.enabledProviders || null;
                        }
                    } catch (_) { /* ignore */ }
                }
            }
            const params = {
                provinceCode,
                orderTotal: selectedItemsData.itemsTotal,
            };
            if (enabledProviders) params.enabledProviders = enabledProviders.join(',');
            const res = await calculateShippingFeesApi(params);
            if (res.success) {
                setShippingFees(res.data.fees || []);
            }
        } catch (error) {
            console.error("Error fetching shipping fees:", error);
        } finally {
            setLoadingShipping(false);
        }
    };

    const selectedAddress = addresses.find(a => a._id === selectedAddressId);

    const handleUpdateQuantity = async (productId, newQuantity) => {
        if (newQuantity < 1) return;
        try {
            setUpdating(productId);
            await updateCartItemApi(productId, newQuantity);
            window.dispatchEvent(new Event("cart-updated"));
            await fetchCart();
            // Restore selection for the updated item
            setSelectedItems((prev) => {
                const next = new Set(prev);
                next.add(productId);
                return next;
            });
        } catch (error) {
            showToast(error.message || "Cập nhật thất bại", "error");
        } finally {
            setUpdating(null);
        }
    };

    const handleRemoveItem = async (productId) => {
        if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
        try {
            setUpdating(productId);
            await removeFromCartApi(productId);
            setSelectedItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(productId);
                return newSet;
            });
            await fetchCart();
            showToast("Đã xóa sản phẩm!", "success");
        } catch (error) {
            showToast(error.message || "Xóa thất bại", "error");
        } finally {
            setUpdating(null);
        }
    };

    const handleToggleItem = (productId) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedItems(new Set());
        } else {
            const allIds = cart.products
                .filter(item => item.shopIsActive !== false)
                .map(item => item.product._id || item.product);
            setSelectedItems(new Set(allIds));
        }
        setSelectAll(!selectAll);
    };

    const handleSelectShop = (shopId) => {
        const shopItems = cart.products.filter(item => 
            (item.shop?._id || item.shop) === shopId && item.shopIsActive !== false
        );
        const shopItemIds = shopItems.map(item => item.product._id || item.product);
        const allSelected = shopItemIds.every(id => selectedItems.has(id));
        
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (allSelected) {
                shopItemIds.forEach(id => newSet.delete(id));
            } else {
                shopItemIds.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) {
            showToast("Vui lòng nhập mã giảm giá!", "warning");
            return;
        }

        try {
            setApplyingCoupon(true);
            // Compute subtotal using original prices for coupon validation
            const selectedCartProducts = cart?.products?.filter(item =>
                selectedItems.has(item.product._id || item.product)
            ) || [];
            const originalSubtotal = selectedCartProducts.reduce((sum, item) => {
                const op = item.originalPrice || item.price;
                return sum + (op * item.quantity);
            }, 0);
            const res = await validateVoucherApi({
                code: couponCode,
                orderTotal: originalSubtotal
            });
            if (res.success) {
                setSelectedCoupon(res.data.voucher);
                setCouponDiscount(res.data.discount);
                showToast(`Áp dụng mã ${couponCode.toUpperCase()} thành công! Giảm ${formatPrice(res.data.discount)}`, "success");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Mã voucher không hợp lệ!", "error");
            setSelectedCoupon(null);
            setCouponDiscount(0);
        } finally {
            setApplyingCoupon(false);
        }
    };

    const handleSelectCoupon = async (voucher) => {
        try {
            setApplyingCoupon(true);
            const selectedCartProducts = cart?.products?.filter(item =>
                selectedItems.has(item.product._id || item.product)
            ) || [];
            const originalSubtotal = selectedCartProducts.reduce((sum, item) => {
                const op = item.originalPrice || item.price;
                return sum + (op * item.quantity);
            }, 0);
            const res = await validateVoucherApi({
                code: voucher.code,
                orderTotal: originalSubtotal
            });
            if (res.success) {
                setSelectedCoupon(res.data.voucher);
                setCouponDiscount(res.data.discount);
                setCouponCode(voucher.code);
                showToast(`Áp dụng mã ${voucher.code} thành công! Giảm ${formatPrice(res.data.discount)}`, "success");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Không thể áp dụng mã này!", "error");
        } finally {
            setApplyingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setSelectedCoupon(null);
        setCouponDiscount(0);
        setCouponCode("");
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    const formatDiscount = (discount) => {
        return `-${discount}%`;
    };

    // Group products by shop and sort by added time
    const groupedCart = useMemo(() => {
        if (!cart?.products) return [];
        
        const groups = {};
        cart.products.forEach(item => {
            const shopId = item.shop?._id || item.shop || 'unknown';
            const shopName = item.shop?.name || item.shopName || 'Cửa hàng';
            const shopAvatar = item.shop?.avatar || item.shopAvatar || null;
            
            if (!groups[shopId]) {
                groups[shopId] = {
                    shopId,
                    shopName,
                    shopAvatar,
                    items: [],
                    addedAt: item.addedAt
                };
            }
            groups[shopId].items.push(item);
        });
        
        // Sort shops by most recent item added
        return Object.values(groups).sort((a, b) => {
            const aTime = Math.max(...a.items.map(i => new Date(i.addedAt || 0).getTime()));
            const bTime = Math.max(...b.items.map(i => new Date(i.addedAt || 0).getTime()));
            return bTime - aTime;
        });
    }, [cart]);

    // Calculate selected items total
    const selectedItemsData = useMemo(() => {
        const items = cart?.products?.filter(item =>
            selectedItems.has(item.product._id || item.product) && item.shopIsActive !== false
        ) || [];

        const subtotal = items.reduce((sum, item) => {
            const originalPrice = item.originalPrice || item.price;
            return sum + (originalPrice * item.quantity);
        }, 0);
        const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalDiscount = items.reduce((sum, item) => {
            if (item.discount > 0) {
                const originalPrice = item.originalPrice || item.price;
                return sum + ((originalPrice - item.price) * item.quantity);
            }
            return sum;
        }, 0);
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        
        return { items, subtotal, itemsTotal, totalDiscount, totalQuantity };
    }, [selectedItems, cart]);

    // Fetch shipping fees when items total or address changes (debounced 500ms)
    useEffect(() => {
        if (selectedAddress?.provinceCode && selectedItemsData.itemsTotal > 0) {
            if (shippingDebounceRef.current) clearTimeout(shippingDebounceRef.current);
            shippingDebounceRef.current = setTimeout(() => {
                fetchShippingFees(String(selectedAddress.provinceCode));
            }, 500);
        }
        return () => {
            if (shippingDebounceRef.current) clearTimeout(shippingDebounceRef.current);
        };
    }, [selectedItemsData.itemsTotal, selectedAddressId, selectedAddress?.provinceCode]);

    // Get the cheapest available shipping fee - only show when items are selected
    const cheapestShippingFee = shippingFees.length > 0
        ? Math.min(...shippingFees.map(f => f.isFree ? 0 : f.fee))
        : null;
    const selectedCount = selectedItems.size;
    const shippingFee = selectedCount > 0
        ? (cheapestShippingFee === 0 ? 0 : (cheapestShippingFee ?? 0))
        : 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4]">
                <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin"></div>
            </div>
        );
    }

    const products = cart?.products || [];
    const originalSubtotal = selectedItemsData.subtotal; // giá gốc tổng (để hiển thị tiết kiệm)
    const itemsTotal = selectedItemsData.itemsTotal; // giá sau giảm tổng
    const totalDiscount = selectedItemsData.totalDiscount;
    const discount = couponDiscount;
    const total = Math.max(0, itemsTotal + shippingFee - discount);

    return (
        <div className="min-h-screen bg-[#FAF7F4] py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#1C1108]">GIỎ HÀNG</h1>
                    <p className="text-sm text-[#A8896A] mt-1">Xem lại giỏ hàng của bạn và chỉnh sửa số lượng</p>
                </div>

                {products.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#EDE8E0] p-16 text-center">
                        <div className="text-6xl mb-4 select-none">🛒</div>
                        <h2 className="text-xl font-bold text-[#1C1108] mb-2">Giỏ hàng trống</h2>
                        <p className="text-sm text-[#A8896A] mb-8">Hãy thêm sản phẩm vào giỏ hàng của bạn</p>
                        <Link to="/" className="inline-flex items-center gap-2 bg-[#B86B05] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#95520B] transition-colors active:scale-[0.98]">
                            Tiếp tục mua sắm
                        </Link>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {/* Select All Header */}
                            <div className="bg-white rounded-2xl border border-[#EDE8E0] p-4">
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={selectAll}
                                                onChange={handleSelectAll}
                                                className="sr-only"
                                            />
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                                selectAll 
                                                    ? 'bg-[#B86B05] border-[#B86B05]' 
                                                    : 'border-[#D5C9BC] bg-white'
                                            }`}>
                                                {selectAll && (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
                                                        <path d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                        <span className="font-semibold text-[#1C1108] text-sm">Chọn tất cả ({cart.totalQuantity} sản phẩm)</span>
                                    </label>
                                    {selectedCount > 0 && (
                                        <button
                                            onClick={() => {
                                                setSelectedItems(new Set());
                                                setSelectAll(false);
                                            }}
                                            className="text-xs text-[#BF4343] hover:underline"
                                        >
                                            Bỏ chọn
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Products grouped by shop */}
                            {groupedCart.map((shop) => {
                                const shopItemIds = shop.items.map(item => item.product._id || item.product);
                                const shopAllSelected = shopItemIds.every(id => selectedItems.has(id));
                                const shopPartialSelected = shopItemIds.some(id => selectedItems.has(id)) && !shopAllSelected;
                                const shopTotal = shop.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                const shopTotalOriginal = shop.items.reduce((sum, item) => {
                                    const originalPrice = item.originalPrice || item.price;
                                    return sum + (originalPrice * item.quantity);
                                }, 0);
                                
                                return (
                                    <div key={shop.shopId} className="bg-white rounded-2xl border border-[#EDE8E0] overflow-hidden">
                                        {/* Shop Header */}
                                        <div className="bg-[#FAF7F4] px-4 py-3 border-b border-[#EDE8E0]">
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            checked={shopAllSelected}
                                                            onChange={() => handleSelectShop(shop.shopId)}
                                                            className="sr-only"
                                                        />
                                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                                            shopAllSelected
                                                                ? 'bg-[#B86B05] border-[#B86B05]'
                                                                : shopPartialSelected
                                                                    ? 'bg-[#B86B05]/50 border-[#B86B05]'
                                                                    : 'border-[#D5C9BC] bg-white'
                                                        }`}>
                                                            {(shopAllSelected || shopPartialSelected) && (
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
                                                                    <path d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                            {shopPartialSelected && !shopAllSelected && (
                                                                <div className="w-2 h-2 bg-white rounded-full" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {shop.shopAvatar ? (
                                                            <img src={shop.shopAvatar} alt={shop.shopName} className="w-6 h-6 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-6 h-6 bg-[#B86B05]/20 rounded-full flex items-center justify-center">
                                                                <span className="text-[#B86B05] text-xs font-bold">
                                                                    {shop.shopName.charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <span className="font-semibold text-[#1C1108] text-sm">{shop.shopName}</span>
                                                    </div>
                                                </label>

                                                {/* Shop actions */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <Link
                                                        to={`/shop/${shop.shopId}`}
                                                        className="text-xs text-[#B86B05] hover:text-[#95520B] font-medium flex items-center gap-1 transition-colors"
                                                    >
                                                        Xem shop
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                                                            <path d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </Link>
                                                    <button
                                                        onClick={() => {
                                                            if (!shopVouchers[shop.shopId]) {
                                                                fetchShopVouchers(shop.shopId);
                                                            }
                                                        }}
                                                        className="text-xs px-2.5 py-1 bg-[#B86B05] text-white rounded-lg font-semibold hover:bg-[#95520B] transition-colors"
                                                    >
                                                        🎟️ Thu thập voucher
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Voucher panel */}
                                            {shopVouchers[shop.shopId] && shopVouchers[shop.shopId].length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {shopVouchers[shop.shopId].map((voucher) => (
                                                        <div key={voucher._id} className="flex items-center gap-1.5 bg-white border border-[#B86B05] rounded-lg px-3 py-1.5">
                                                            <span className="text-xs font-bold text-[#B86B05]">
                                                                {voucher.discountType === 'percent' ? `-${voucher.value}%` : `-${new Intl.NumberFormat('vi-VN').format(voucher.value)}đ`}
                                                            </span>
                                                            <span className="text-[10px] text-[#6B5C4C]">|</span>
                                                            <span className="text-[10px] text-[#6B5C4C]">{voucher.minOrderValue > 0 ? `Đơn từ ${new Intl.NumberFormat('vi-VN').format(voucher.minOrderValue)}đ` : 'Không giới hạn'}</span>
                                                            <button
                                                                onClick={() => {
                                                                    setCouponCode(voucher.code);
                                                                    handleApplyCoupon();
                                                                }}
                                                                className="ml-1 text-[10px] text-[#B86B05] font-semibold hover:underline"
                                                            >
                                                                Lưu
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {shopVouchers[shop.shopId] && shopVouchers[shop.shopId].length === 0 && (
                                                <p className="mt-1 text-[10px] text-[#A8896A]">Hiện không có voucher nào khả dụng</p>
                                            )}
                                        </div>

                                        {/* Shop Items */}
                                        <div className="divide-y divide-[#EDE8E0]">
                                            {shop.items.map((item) => {
                                                const productId = item.product._id || item.product;
                                                const isSelected = selectedItems.has(productId);
                                                // item.price đã là giá sale hiện tại (re-evaluated từ backend getCart)
                                                const originalPrice = item.originalPrice || item.price;
                                                const hasDiscount = item.discount > 0;
                                                // Giá hiển thị = item.price (đã trừ KM), gạch ngang = originalPrice
                                                const discountedPrice = item.price;
                                                const isUnavailable = item.shopIsActive === false;
                                                
                                                return (
                                                    <div key={productId} className={`p-4 flex gap-4 transition-colors ${isSelected ? 'bg-white' : 'bg-white/50'} ${isUnavailable ? 'opacity-60' : ''}`}>
                                                        {/* Checkbox - disabled if unavailable */}
                                                        <label className={`flex items-center cursor-pointer shrink-0 ${isUnavailable ? 'cursor-not-allowed' : ''}`}>
                                                            <div className="relative">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => !isUnavailable && handleToggleItem(productId)}
                                                                    disabled={isUnavailable}
                                                                    className="sr-only"
                                                                />
                                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                                                    isUnavailable ? 'bg-gray-200 border-gray-300' :
                                                                    isSelected 
                                                                        ? 'bg-[#B86B05] border-[#B86B05]' 
                                                                        : 'border-[#D5C9BC] bg-white'
                                                                }`}>
                                                                    {isSelected && !isUnavailable && (
                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
                                                                            <path d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </label>

                                                        {/* Product Image */}
                                                        <div className="relative shrink-0">
                                                            <img
                                                                src={item.image || "/placeholder.png"}
                                                                alt={item.name}
                                                                className={`w-24 h-24 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity ${isUnavailable ? 'grayscale' : ''}`}
                                                                onClick={() => !isUnavailable && navigate(`/product/${productId}`)}
                                                            />
                                                            {hasDiscount && (
                                                                <div className="absolute -top-2 -right-2 bg-[#BF4343] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                                    -{item.discount}%
                                                                </div>
                                                            )}
                                                            {isUnavailable && (
                                                                <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                                                                    <span className="text-white text-xs font-bold bg-amber-600 px-2 py-1 rounded">Tạm nghỉ</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Product Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <h3 
                                                                className={`font-semibold text-sm cursor-pointer line-clamp-2 leading-snug ${isUnavailable ? 'text-gray-500' : 'text-[#1C1108] hover:text-[#B86B05] transition-colors'}`}
                                                                onClick={() => !isUnavailable && navigate(`/product/${productId}`)}
                                                            >
                                                                {item.name}
                                                            </h3>

                                                            {/* Variant Name */}
                                                            {item.variant && (
                                                                <p className="text-xs text-[#A8896A] mt-1">
                                                                    Phân loại: <span className="font-medium text-[#6B5344]">{item.variant}</span>
                                                                </p>
                                                            )}
                                                            
                                                            {isUnavailable && (
                                                                <p className="text-xs text-amber-600 mt-1 font-medium">Shop đang tạm nghỉ, sản phẩm chưa thể thanh toán</p>
                                                            )}
                                                            
                                                            {/* Price Section - Shopee Style */}
                                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                                <span className={`font-bold text-base ${isUnavailable ? 'text-gray-400' : 'text-[#B86B05]'}`}>
                                                                    {formatPrice(discountedPrice)}
                                                                </span>
                                                                {hasDiscount && (
                                                                    <>
                                                                        <span className="text-[#A8896A] text-xs line-through">
                                                                            {formatPrice(originalPrice)}
                                                                        </span>
                                                                        <span className="bg-red-50 text-[#BF4343] text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                                            {formatDiscount(item.discount)}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>

                                                            {/* Flash Sale / Promotion Badge */}
                                                            {hasDiscount && (
                                                                <div className="mt-1.5 flex items-center gap-2">
                                                                    <span className="bg-red-100 text-[#BF4343] text-[10px] font-semibold px-2 py-0.5 rounded">
                                                                        Mã giảm giá
                                                                    </span>
                                                                    <span className="text-[10px] text-[#A8896A]">
                                                                        Giảm {item.discount}%
                                                                    </span>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-3 mt-3">
                                                                <div className="flex items-center border border-[#D5C9BC] rounded-full overflow-hidden bg-white">
                                                                    <button
                                                                        onClick={() => !isUnavailable && handleUpdateQuantity(productId, item.quantity - 1)}
                                                                        disabled={updating === productId || item.quantity <= 1 || isUnavailable}
                                                                        className="w-9 h-9 flex items-center justify-center hover:bg-[#FAF7F4] disabled:opacity-50 transition-colors"
                                                                    >
                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M5 12h14" /></svg>
                                                                    </button>
                                                                    <span className="w-10 text-center font-bold text-sm">{item.quantity}</span>
                                                                    <button
                                                                        onClick={() => !isUnavailable && handleUpdateQuantity(productId, item.quantity + 1)}
                                                                        disabled={updating === productId || isUnavailable}
                                                                        className="w-9 h-9 flex items-center justify-center hover:bg-[#FAF7F4] disabled:opacity-50 transition-colors"
                                                                    >
                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M12 5v14M5 12h14" /></svg>
                                                                    </button>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleRemoveItem(productId)}
                                                                    disabled={updating === productId}
                                                                    className="text-[#BF4343] hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                                    title="Xóa sản phẩm"
                                                                >
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Item Total */}
                                                        <div className="text-right shrink-0 flex flex-col items-end justify-between">
                                                            <p className={`font-bold text-sm ${isUnavailable ? 'text-gray-400' : 'text-[#1C1108]'}`}>
                                                                {formatPrice(discountedPrice * item.quantity)}
                                                            </p>
                                                            {hasDiscount && (
                                                                <p className="text-[#A8896A] text-xs line-through">
                                                                    {formatPrice(originalPrice * item.quantity)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Available Coupons */}
                            {auth?.user && coupons.length > 0 && (
                                <div className="bg-white rounded-2xl border border-[#EDE8E0] p-5">
                                    <h3 className="font-bold text-sm text-[#1C1108] mb-4 flex items-center gap-2">
                                        <span>🎟️</span> Voucher có sẵn
                                    </h3>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {coupons.slice(0, 5).map((voucher) => (
                                            <div
                                                key={voucher._id}
                                                className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                                                    selectedCoupon?.code === voucher.code
                                                        ? "border-[#B86B05] bg-[#B86B05]/5"
                                                        : "border-[#EDE8E0] hover:border-[#B86B05]"
                                                }`}
                                                onClick={() => handleSelectCoupon(voucher)}
                                            >
                                                <div>
                                                    <p className="font-bold text-xs text-[#1C1108]">{voucher.code}</p>
                                                    <p className="text-xs text-[#A8896A] mt-0.5">
                                                        {voucher.discountType === 'percent' ? `Giảm ${voucher.value}%` : `Giảm ${formatPrice(voucher.value)}`}
                                                        {voucher.minOrderValue > 0 && ` (Đơn từ ${formatPrice(voucher.minOrderValue)})`}
                                                    </p>
                                                </div>
                                                <span className="text-xs font-semibold text-[#B86B05]">
                                                    {selectedCoupon?.code === voucher.code ? "✓ Đang dùng" : "Dùng ngay"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl border border-[#EDE8E0] p-6 sticky top-24">
                                {/* Selection Summary */}
                                {selectedCount > 0 && (
                                    <div className="mb-4 p-3 bg-[#B86B05]/5 rounded-xl border border-[#B86B05]/20">
                                        <p className="text-sm font-semibold text-[#1C1108]">
                                            {selectedCount} sản phẩm đã chọn
                                        </p>
                                        {totalDiscount > 0 && (
                                            <p className="text-xs text-[#BF4343] mt-1">
                                                Tiết kiệm: {formatPrice(totalDiscount)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <h3 className="text-base font-bold text-[#1C1108] mb-5">TÓM TẮT ĐƠN HÀNG</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-[#6B5C4C]">Tạm tính ({selectedCount > 0 ? selectedCount : cart.totalQuantity} sản phẩm)</span>
                                        <span className="font-semibold text-[#1C1108]">{formatPrice(originalSubtotal)}</span>
                                    </div>

                                    {totalDiscount > 0 && selectedCount > 0 && (
                                        <div className="flex justify-between text-[#BF4343]">
                                            <span>Tiết kiệm</span>
                                            <span className="font-semibold">-{formatPrice(totalDiscount)}</span>
                                        </div>
                                    )}
                                    
                                    {couponDiscount > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span>Giảm giá</span>
                                            <span className="font-semibold">-{formatPrice(couponDiscount)}</span>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between">
                                        <span className="text-[#6B5C4C]">Phí vận chuyển</span>
                                        <span className="font-semibold text-[#1C1108]">
                                            {selectedCount === 0 ? (
                                                <span className="text-[#A8896A]">Chọn sản phẩm để xem</span>
                                            ) : loadingShipping ? (
                                                <span className="text-[#A8896A]">Đang tính...</span>
                                            ) : cheapestShippingFee === 0 ? (
                                                <span className="text-green-600">Miễn phí</span>
                                            ) : cheapestShippingFee ? (
                                                formatPrice(cheapestShippingFee)
                                            ) : (
                                                <span className="text-[#A8896A]">—</span>
                                            )}
                                        </span>
                                    </div>
                                    {cheapestShippingFee !== 0 && !loadingShipping && selectedCount > 0 && (
                                        <p className="text-xs text-orange-500 bg-orange-50 rounded-lg px-3 py-2">
                                            Mua thêm {formatPrice(500000 - itemsTotal)} để được miễn phí ship!
                                        </p>
                                    )}
                                    
                                    <div className="border-t border-[#EDE8E0] pt-3 flex justify-between">
                                        <span className="font-bold text-[#1C1108]">Tổng cộng</span>
                                        <span className="font-extrabold text-xl text-[#B86B05]">{formatPrice(total)}</span>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={() => {
                                        // Save selected items to localStorage before navigating
                                        localStorage.setItem('checkout_selected_items', JSON.stringify([...selectedItems]));
                                        // Pass coupon state so checkout can restore it
                                        if (selectedCoupon) {
                                            localStorage.setItem('checkout_coupon', JSON.stringify({
                                                code: selectedCoupon.code,
                                                discount: couponDiscount,
                                                type: selectedCoupon.type,   // 'product' | 'shipping'
                                            }));
                                        } else {
                                            localStorage.removeItem('checkout_coupon');
                                        }
                                        navigate("/checkout");
                                    }}
                                    disabled={selectedCount === 0}
                                    className="w-full mt-6 bg-[#B86B05] text-white py-3.5 rounded-xl font-bold text-base hover:bg-[#95520B] transition-colors active:scale-[0.98] disabled:bg-[#D5C9BC] disabled:cursor-not-allowed"
                                >
                                    TIẾP TỤC THANH TOÁN ({selectedCount} sản phẩm)
                                </button>
                                <Link to="/" className="block text-center mt-3 text-sm text-[#A8896A] hover:text-[#B86B05] transition-colors">
                                    ← Tiếp tục mua sắm
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartPage;
