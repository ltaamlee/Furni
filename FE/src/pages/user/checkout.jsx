import { useState, useEffect, useContext, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../components/context/authContext";
import { useToast } from "../../components/context/ToastContext";
import AddressModal from "../../components/common/AddressModal";
import VoucherModal from "../../components/common/VoucherModal";
import {
  createOrderApi,
  createPayOSPaymentWithCartApi,
  getAddressesApi,
  createAddressApi,
  validateVoucherApi,
  applyVoucherApi,
  getAvailableVouchersApi,
  getShopShippingConfigApi,
  getCheckoutPreviewApi,
  getUserWalletApi,
} from "../../utils/api";

// Màu sắc đồng bộ với vendor register
const COLORS = {
  primary: "#95520B",
  primaryHover: "#7a4318",
  secondary: "#B86B05",
  textDark: "#1C1108",
  textMuted: "#9E8E7E",
  textLight: "#6B5C4C",
  border: "#EDE8E0",
  borderDark: "#D5C9BC",
};

const PROVIDER_LABELS = {
  ghtk: "Giao Hàng Tiết Kiệm",
  jt: "J&T Express",
  viettel: "Viettel Post",
  ghn: "Giao Hàng Nhanh",
};

const TIER_LABELS = {
  economy: "Tiết Kiệm",
  express: "Nhanh",
};

// Step labels
const STEP_LABELS = ["Địa chỉ", "Vận chuyển", "Xác nhận"];

// Styles
const cardClass = "bg-white border border-[#EDE8E0] rounded-[14px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.09)]";
const inputClass = "w-full px-4 py-2.5 border-[1.5px] border-[#EDE8E0] rounded-[8px] text-[13px] text-[#1C1108] placeholder-[#9E8E7E] focus:outline-none focus:border-[#B86B05] transition-colors bg-white";

const CheckoutPage = () => {
  const { auth } = useContext(AuthContext);
  const { showToast } = useToast();
  const { user } = auth;
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [buyNowItem, setBuyNowItem] = useState(null);
  console.log('[Checkout] render', { userId: user?.id, selectedItemIdsLen: selectedItemIds.size, buyNowItem });

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const shippingDebounceRef = useRef(null);
  const pendingAddressIdRef = useRef(null); // captures the latest addressId immediately, bypassing React batch delay
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  // Use ref for restored coupon to persist across renders
  const restoredCouponRef = useRef(null); // { code, type, discount }

  // Voucher state
  const [selectedProductCoupon, setSelectedProductCoupon] = useState(null);
  const [selectedShippingCoupon, setSelectedShippingCoupon] = useState(null);
  const [productCouponDiscount, setProductCouponDiscount] = useState(0);
  const [shippingCouponDiscount, setShippingCouponDiscount] = useState(0);
  const [applyingProductCoupon, setApplyingProductCoupon] = useState(false);
  const [applyingShippingCoupon, setApplyingShippingCoupon] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [showProductVoucherModal, setShowProductVoucherModal] = useState(false);

  const isBuyNowRef = useRef(false);

  const [selectAll, setSelectAll] = useState(false);

  const [customerInfo, setCustomerInfo] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    email: user?.email || "",
  });

  const [shippingInfo, setShippingInfo] = useState({
    address: "",
    provinceCode: null,
    provinceName: "",
    wardName: "",
    note: "",
    selectedShippingByShop: {}, // { [shopId]: { code, serviceType } }
  });

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [walletBalance, setWalletBalance] = useState(null); // null = chưa load, number = balance
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [useWalletBalance, setUseWalletBalance] = useState(false);

  // ── STEP 7: Unified checkout data from backend ──
  const [checkout, setCheckout] = useState(null);   // full preview from /checkout/preview
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  // Fetch unified checkout preview (STEP 7 — replaces all individual fetches)
  const fetchCheckoutPreview = async () => {
    if (!user?.id) return;
    setLoadingCheckout(true);
    setCheckoutError(null);
    try {
      // Use pendingAddressIdRef to capture the latest addressId immediately (bypasses React batch delay)
      const currentAddressId = pendingAddressIdRef.current || selectedAddressId;
      const selectedAddr = addresses.find(a => a._id === currentAddressId);
      const body = {
        ...(isBuyNow
          ? {
              mode: 'BUY_NOW',
              items: [{ productId: buyNowItem?.productId, quantity: buyNowItem?.quantity || 1, variantId: buyNowItem?.variant?.variantId || null }],
            }
          : {
              mode: 'CART',
              cartItemIds: [...selectedItemIds],
            }),
        address: selectedAddr ? { provinceCode: selectedAddr.provinceCode ? Number(selectedAddr.provinceCode) : null } : {},
      };

      console.log("[Checkout] fetchCheckoutPreview called", { mode: isBuyNow ? 'BUY_NOW' : 'CART', body, userId: user?.id });
      const res = await getCheckoutPreviewApi(body);
      console.log("[Checkout] preview response:", res);
      if (res.success) {
        console.log("[Checkout] checkout data:", res.data);
        setCheckout(res.data);
        // Sync selected address — use ref to bypass batch delay; prefer local selected address over backend's default
        const currentAddrId = pendingAddressIdRef.current || selectedAddressId;
        if (!currentAddrId && res.data.address) {
          setSelectedAddressId(res.data.address._id);
        }
        // Sync selected shipping methods with preview
        const newSelected = { ...shippingInfo.selectedShippingByShop };
        for (const shop of (res.data.shops || [])) {
          if (shop.selectedShippingMethod && !newSelected[shop.shopId]) {
            newSelected[shop.shopId] = shop.selectedShippingMethod;
          }
        }
        setShippingInfo(prev => ({ ...prev, selectedShippingByShop: newSelected }));
      } else {
        console.log("[Checkout] preview failed:", res.message);
        setCheckoutError(res.message);
        showToast(res.message || 'Không thể tải checkout!', 'error');
      }
    } catch (err) {
      console.error("[Checkout] preview error:", err);
      const msg = err?.response?.data?.message || 'Lỗi khi tải checkout!';
      setCheckoutError(msg);
      showToast(msg, 'error');
    } finally {
      setLoadingCheckout(false);
    }
  };

  // ── Computed shipping fees per shop (uses FE-selected method, not backend default) ──
  const computedShippingFeesByShop = useMemo(() => {
    const result = {};
    for (const shop of (checkout?.shops || [])) {
      const sel = shippingInfo.selectedShippingByShop?.[shop.shopId];
      if (!sel) { result[shop.shopId] = shop.shippingFee || 0; continue; }
      const matched = shop.shippingMethods?.find(f =>
        f.provider.code?.toLowerCase() === sel.code?.toLowerCase() &&
        f.serviceType === sel.serviceType
      );
      result[shop.shopId] = matched ? matched.fee : (shop.shippingFee || 0);
    }
    return result;
  }, [checkout?.shops, shippingInfo.selectedShippingByShop]);

  // selectedCheckoutAddress: always derive from local addresses state (authoritative)
  const selectedCheckoutAddress = addresses.find(a => a._id === selectedAddressId) || null;

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    try {
      setLoadingWallet(true);
      const res = await getUserWalletApi();
      if (res.success) {
        setWalletBalance(res.data.wallet?.balance || 0);
      }
    } catch (e) {
      setWalletBalance(0);
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchWalletBalance();
  }, [user?.id]);

  // ── Shop-level modals (must be before any return / JSX) ──
  const [shippingModal, setShippingModal] = useState({ open: false, shopId: null });
  const [shopVoucherModal, setShopVoucherModal] = useState({ open: false, shopId: null });
  const [shopProductCoupons, setShopProductCoupons] = useState({});
  const [shopNotes, setShopNotes] = useState({});

  const openShippingModal = (shopId) => setShippingModal({ open: true, shopId });
  const closeShippingModal = () => setShippingModal({ open: false, shopId: null });
  const openShopVoucherModal = (shopId) => setShopVoucherModal({ open: true, shopId });
  const closeShopVoucherModal = () => setShopVoucherModal({ open: false, shopId: null });

  const handleSelectShopProductVoucher = async (voucher, shopId) => {
    try {
      // 1. Validate voucher
      const shopData = checkout?.shops?.find(s => s.shopId === shopId);
      const shopItems = shopData?.items || [];
      const shopSubtotal = shopItems.reduce((sum, item) => sum + (item.salePrice || 0) * (item.quantity || 1), 0);
      const res = await validateVoucherApi({
        code: voucher.code,
        orderTotal: shopSubtotal,
        cartItems: shopItems.map(item => ({
          productId: item.productId,
          price: item.salePrice,
          quantity: item.quantity,
        })),
      });

      if (res.success) {
        // Chỉ lưu trạng thái FE — KHÔNG gọi applyVoucherApi ở đây!
        // applyVoucherApi sẽ được gọi bên trong createOrder khi đơn thực sự được tạo thành công.
        setShopProductCoupons(prev => ({ ...prev, [shopId]: { coupon: res.data.voucher, discount: res.data.discount } }));

        // 3. Remove from available vouchers list (so can't be used again)
        setAvailableVouchers(prev => prev.filter(v => v._id !== voucher._id));

        showToast(`Áp dụng mã ${voucher.code} thành công! Giảm ${formatPrice(res.data.discount)}`, "success");
        closeShopVoucherModal();
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Không thể áp dụng mã này!", "error");
    }
  };

  const handleRemoveShopProductCoupon = (shopId) => {
    setShopProductCoupons(prev => {
      const next = { ...prev };
      delete next[shopId];
      return next;
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price) + " đ";
  };

  // Step indicator bar
  const StepsBar = () => (
    <div className="bg-white border-b border-[#EDE8E0] py-5">
      <div className="flex items-center justify-center max-w-[600px] mx-auto px-6">
        {STEP_LABELS.map((label, i) => {
          const s = i + 1;
          const done = s < step;
          const active = s === step;
          return (
            <div key={s} className="flex items-center" style={{ flex: i === STEP_LABELS.length - 1 ? "none" : 1 }}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold border-2 transition-all shrink-0 ${
                  done ? "bg-[#16a34a] border-[#16a34a] text-white" :
                  active ? "bg-[#95520B] border-[#95520B] text-white" :
                  "bg-white border-[#EDE8E0] text-[#9E8E7E]"
                }`}>
                  {done ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </div>
                <div className={`text-[12.5px] whitespace-nowrap hidden sm:block ${
                  active ? "text-[#1C1108] font-semibold" :
                  done ? "text-[#16a34a] font-medium" :
                  "text-[#9E8E7E] font-medium"
                }`}>{label}</div>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 min-w-[20px] transition-colors ${done ? "bg-[#16a34a]" : "bg-[#EDE8E0]"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Card header gradient
  const CardHdr = ({ title, sub, bg }) => (
    <div className={`px-6 pt-6 pb-5 border-b border-[#EDE8E0] ${bg || "bg-gradient-to-br from-[#3a1d06] to-[#7B440C] text-white"}`}>
      <h2 className="text-[17px] font-extrabold mb-0.5">{title}</h2>
      {sub && <p className="text-[12.5px] opacity-80">{sub}</p>}
    </div>
  );

  // Section title
  const SectionTitle = ({ children }) => (
    <div className="text-[13px] font-bold text-[#1C1108] mb-3 flex items-center gap-1.5">
      {children}
    </div>
  );

  // Action button primary
  const BtnPrimary = ({ children, onClick, disabled, type = "button" }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-2.5 rounded-[8px] font-semibold text-[13px] text-white transition-all ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-[0.98]"
      }`}
      style={{ background: disabled ? "#9E8E7E" : "linear-gradient(135deg, #95520B 0%, #7a4318 100%)" }}
    >
      {children}
    </button>
  );

  // Action button ghost
  const BtnGhost = ({ children, onClick, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-[8px] font-medium text-[13px] text-[#6B5C4C] border border-[#EDE8E0] bg-white transition-all hover:bg-[#FAF7F4] disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );

  useEffect(() => {
    const handleAddressUpdate = () => fetchAddresses();
    window.addEventListener("addresses-updated", handleAddressUpdate);
    return () => window.removeEventListener("addresses-updated", handleAddressUpdate);
  }, []);

  useEffect(() => {
    if (step >= 2) fetchAvailableVouchers();
  }, [step, isBuyNow]);

  useEffect(() => {
    const buyNowRaw = localStorage.getItem("buy_now");
    let buyNowMode = false;
    if (buyNowRaw) {
      try {
        const buyNow = JSON.parse(buyNowRaw);
        if (Date.now() - buyNow.timestamp < 30 * 60 * 1000) {
          buyNowMode = true;
          setIsBuyNow(true);
          isBuyNowRef.current = true;
          const qty = Math.max(1, Number(buyNow.quantity) || 1);
          const variant = buyNow.variant || null;
          setBuyNowItem({ productId: buyNow.productId, quantity: qty, variant });
          setSelectedItemIds(new Set([buyNow.productId]));
          localStorage.setItem("checkout_selected_items", JSON.stringify([buyNow.productId]));
        }
        localStorage.removeItem("buy_now");
      } catch (e) {
        console.error("Error parsing buy_now:", e);
      }
    } else {
      const savedSelected = localStorage.getItem("checkout_selected_items");
      if (savedSelected) {
        try {
          setSelectedItemIds(new Set(JSON.parse(savedSelected)));
        } catch (e) {
          console.error("Error parsing selected items:", e);
        }
      }

      // Restore coupon from cart page (store in ref for later use)
      const savedCoupon = localStorage.getItem("checkout_coupon");
      if (savedCoupon) {
        try {
          const c = JSON.parse(savedCoupon);
          if (c.code) {
            restoredCouponRef.current = c;
            if (c.type === 'shipping') {
              setSelectedShippingCoupon({ code: c.code });
              setShippingCouponDiscount(c.discount || 0);
            } else {
              setSelectedProductCoupon({ code: c.code, value: c.discount });
              setProductCouponDiscount(c.discount || 0);
            }
          }
        } catch (e) {
          console.error("Error parsing checkout_coupon:", e);
        }
      }
    }

    fetchAddresses();
    setLoading(false);
  }, []);

  // STEP 7: Gọi checkout preview khi địa chỉ đã được chọn
  useEffect(() => {
    console.log('[Checkout] Effect 7 running', { userId: user?.id, addressesLen: addresses.length, loadingAddresses, selectedAddressId });
    if (!user?.id) return;
    if (!addresses.length || loadingAddresses) return;
    if (!selectedAddressId) return; // chờ selectAddress xong trước
    console.log('[Checkout] Effect 7: calling fetchCheckoutPreview');
    fetchCheckoutPreview();
  }, [user?.id, isBuyNow, addresses.length, loadingAddresses, selectedAddressId]);

  useEffect(() => {
    if (addresses.length === 0 || loadingAddresses) return;
    if (selectedAddressId && addresses.some((a) => a._id === selectedAddressId)) return;
    const def = addresses.find((a) => a.isDefault) || addresses[0];
    if (def) {
      selectAddress(def);
      setCustomerInfo((prev) => ({
        ...prev,
        fullName: def.fullName || prev.fullName,
        phone: def.phone || prev.phone,
      }));
    }
  }, [loadingAddresses, addresses]);

  // Keep isBuyNowRef in sync
  useEffect(() => {
    isBuyNowRef.current = isBuyNow;
  }, [isBuyNow]);

  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await getAddressesApi();
      if (res.success) setAddresses(res.data || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const fetchAvailableVouchers = async () => {
    try {
      setLoadingVouchers(true);
      const res = await getAvailableVouchersApi();
      if (res.success) {
        const orderTotal = checkout?.summary?.subtotal || selectedCheckoutProducts.reduce((sum, item) => sum + (item.salePrice || 0) * (item.quantity || 1), 0);
        const selectedItemsForVoucher = (checkout?.shops || []).flatMap(shop =>
          shop.items.map(item => ({
            shopId: shop.shopId,
            subtotal: (item.salePrice || 0) * (item.quantity || 1),
          }))
        );
        const subtotalByShop = selectedItemsForVoucher.reduce((map, item) => {
          const shopId = item.shopId?.toString();
          if (shopId) map.set(shopId, (map.get(shopId) || 0) + item.subtotal);
          return map;
        }, new Map());
        const getVoucherApplicableTotal = (voucher) => {
          const shopId = voucher.shopId?.toString();
          return shopId ? (subtotalByShop.get(shopId) || 0) : orderTotal;
        };

        const all = res.data || [];
        setAvailableVouchers(all);

        const usable = all.filter(v =>
          !v.isUsed && !v.isExpired && getVoucherApplicableTotal(v) > 0 && (!v.minOrderValue || getVoucherApplicableTotal(v) >= v.minOrderValue)
        );

        const productVouchers = usable.filter(v => v.discountType !== 'freeship');
        const shippingVouchers = usable.filter(v => v.discountType === 'freeship');

        const autoSelect = (list) => {
          if (list.length === 0) return null;
          return list.reduce((best, v) => {
            const applicableTotal = getVoucherApplicableTotal(v);
            const bestApplicableTotal = getVoucherApplicableTotal(best);
            const eff = v.discountType === 'percent'
              ? Math.min(applicableTotal * v.value / 100, v.maxDiscount || Infinity)
              : Math.min(v.value, applicableTotal);
            const bestEff = best.discountType === 'percent'
              ? Math.min(bestApplicableTotal * best.value / 100, best.maxDiscount || Infinity)
              : Math.min(best.value, bestApplicableTotal);
            return eff > bestEff ? v : best;
          }, list[0]);
        };

        const bestProduct = autoSelect(productVouchers);
        const bestShipping = autoSelect(shippingVouchers);

        if (bestProduct) {
          const applicableTotal = getVoucherApplicableTotal(bestProduct);
          const eff = bestProduct.discountType === 'percent'
            ? Math.min(applicableTotal * bestProduct.value / 100, bestProduct.maxDiscount || Infinity)
            : Math.min(bestProduct.value, applicableTotal);
          setSelectedProductCoupon(bestProduct);
          setProductCouponDiscount(Math.round(eff >= Infinity ? 0 : eff));
        }

        if (bestShipping) {
          setSelectedShippingCoupon(bestShipping);
        }
      }
    } catch (error) {
      console.error("Error fetching vouchers:", error);
    } finally {
      setLoadingVouchers(false);
    }
  };

  const handleSelectProductVoucher = async (voucher) => {
    try {
      setApplyingProductCoupon(true);
      const orderTotal = checkout?.summary?.subtotal || selectedCheckoutProducts.reduce((sum, item) => sum + (item.salePrice || 0) * (item.quantity || 1), 0);
      const cartItems = selectedCheckoutProducts.map(item => ({
        productId: item.productId,
        price: item.salePrice,
        quantity: item.quantity,
      }));
      const res = await validateVoucherApi({ code: voucher.code, orderTotal, cartItems });
      if (res.success) {
        // Chỉ lưu trạng thái FE — KHÔNG gọi applyVoucherApi ở đây!
        // applyVoucherApi sẽ được gọi bên trong createOrder khi đơn thực sự được tạo thành công.
        setSelectedProductCoupon(res.data.voucher);
        setProductCouponDiscount(res.data.discount);
        // Remove from available vouchers list
        setAvailableVouchers(prev => prev.filter(v => v._id !== voucher._id));
        showToast(`Áp dụng mã ${voucher.code} thành công! Giảm ${formatPrice(res.data.discount)}`, "success");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Không thể áp dụng mã này!", "error");
    } finally {
      setApplyingProductCoupon(false);
    }
  };

  const handleSelectShippingVoucher = async (voucher) => {
    try {
      setApplyingShippingCoupon(true);
      // Mark voucher as USED immediately to remove from wallet
      if (voucher._id) {
        await applyVoucherApi(voucher._id, null);
      }
      setSelectedShippingCoupon(voucher);
      // Remove from available vouchers list
      setAvailableVouchers(prev => prev.filter(v => v._id !== voucher._id));
      showToast(`Áp dụng voucher miễn phí vận chuyển thành công!`, "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Không thể áp dụng mã này!", "error");
    } finally {
      setApplyingShippingCoupon(false);
    }
  };

  const handleRemoveProductCoupon = () => {
    setSelectedProductCoupon(null);
    setProductCouponDiscount(0);
  };

  const handleRemoveShippingCoupon = () => {
    setSelectedShippingCoupon(null);
    setShippingCouponDiscount(0);
  };

  const handleAddNewAddress = async (formData) => {
    try {
      const res = await createAddressApi(formData);
      if (res.success) {
        await fetchAddresses();
        const newAddr = res.data;
        if (newAddr) selectAddress(newAddr);
        window.dispatchEvent(new Event("addresses-updated"));
      }
    } catch (error) {
      showToast("Không thể thêm địa chỉ. Vui lòng thử lại.", "error");
    }
  };

  // ── Selection helpers ──
  const getCheckoutItemId = (item) => item.cartItemId || item.productId;
  const getVariantLabel = (item) => [item.variantName, item.variantSize, item.variantSku]
    .filter(Boolean)
    .join(" · ");

  const handleToggleItem = (itemId) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      localStorage.setItem("checkout_selected_items", JSON.stringify([...next]));
      return next;
    });
  };

  const handleSelectShop = (shopId) => {
    const shopData = checkout?.shops?.find(s => s.shopId === shopId);
    const shopItems = shopData?.items || [];
    const shopItemIds = new Set(shopItems.map(item => getCheckoutItemId(item)));
    const allSelected = shopItems.length > 0 && shopItems.every(item => selectedItemIds.has(getCheckoutItemId(item)));

    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        shopItemIds.forEach(id => newSet.delete(id));
      } else {
        shopItems.forEach(item => newSet.add(getCheckoutItemId(item)));
      }
      localStorage.setItem("checkout_selected_items", JSON.stringify([...newSet]));
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allShopIds = (checkout?.shops || []).map(s => s.shopId);
    if (selectAll) {
      setSelectedItemIds(new Set());
      setSelectAll(false);
      localStorage.setItem("checkout_selected_items", JSON.stringify([]));
    } else {
      const allIds = (checkout?.shops || []).flatMap(shop => shop.items.map(item => getCheckoutItemId(item)));
      setSelectedItemIds(new Set(allIds));
      setSelectAll(true);
      localStorage.setItem("checkout_selected_items", JSON.stringify(allIds));
    }
  };

  // STEP 7: Shop groups từ backend preview
  const selectedShopItems = checkout?.shops || [];

  const selectAddress = (addr) => {
    pendingAddressIdRef.current = addr._id;  // capture immediately, bypasses React batch delay
    setSelectedAddressId(addr._id);
    setShippingInfo((prev) => ({
      ...prev,
      address: addr.formattedAddress || addr.street || "",
      provinceCode: addr.provinceCode ? String(addr.provinceCode) : null,
      provinceName: addr.provinceName || "",
      wardName: addr.wardName || "",
      selectedShippingByShop: {},   // clear so FE shows cheapest default until preview returns
    }));
    setCustomerInfo((prev) => ({
      ...prev,
      fullName: addr.fullName || prev.fullName,
      phone: addr.phone || prev.phone,
    }));

    // Trigger preview refetch immediately (debounced 200ms so rapid picks collapse to one call)
    if (shippingDebounceRef.current) clearTimeout(shippingDebounceRef.current);
    shippingDebounceRef.current = setTimeout(() => {
      fetchCheckoutPreview();
    }, 200);
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!selectedAddressId) {
      showToast("Vui lòng chọn địa chỉ giao hàng!", "warning");
      return;
    }
    const selectedAddr = addresses.find((a) => a._id === selectedAddressId);
    if (!selectedAddr) {
      showToast("Vui lòng chọn địa chỉ giao hàng!", "warning");
      return;
    }
    const addressText = selectedAddr.formattedAddress || selectedAddr.street || "";
    if (!addressText.trim()) {
      showToast("Địa chỉ này chưa có thông tin. Vui lòng chỉnh sửa địa chỉ trước!", "warning");
      return;
    }
    setShippingInfo((prev) => ({
      ...prev,
      address: addressText,
      provinceCode: selectedAddr.provinceCode ? String(selectedAddr.provinceCode) : prev.provinceCode,
      provinceName: selectedAddr.provinceName || prev.provinceName,
      wardName: selectedAddr.wardName || prev.wardName,
    }));
    setCustomerInfo((prev) => ({
      ...prev,
      fullName: selectedAddr.fullName || prev.fullName,
      phone: selectedAddr.phone || prev.phone,
    }));
    setStep(2);
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    const shopIds = (checkout?.shops || []).map(s => s.shopId);
    const missingShops = shopIds.filter(shopId => !shippingInfo.selectedShippingByShop?.[shopId]);
    if (missingShops.length > 0) {
      showToast("Vui lòng chọn phương thức vận chuyển cho tất cả các shop!", "warning");
      return;
    }
    setStep(3);
  };

  const handlePlaceOrder = async () => {
    if (!checkout) {
      showToast("Dữ liệu checkout chưa sẵn sàng. Vui lòng đợi!", "warning");
      return;
    }

    // Validate address
    if (!shippingInfo.address?.trim()) {
      showToast("Vui lòng chọn địa chỉ giao hàng trước!", "warning");
      setStep(1);
      return;
    }
    if (!customerInfo.fullName?.trim()) {
      showToast("Vui lòng nhập họ tên người nhận!", "warning");
      setStep(1);
      return;
    }
    if (!customerInfo.phone?.trim()) {
      showToast("Vui lòng nhập số điện thoại!", "warning");
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      // ── STEP 11: shippingFee per shop (uses FE-selected method, consistent with preview) ──
      const shippingFeesByShop = computedShippingFeesByShop;

      // ── STEP 11: Chuẩn bị items theo mode ──
      const orderItems = isBuyNow
        ? [{ productId: buyNowItem?.productId, quantity: Math.max(1, Number(buyNowItem?.quantity) || 1), variantId: buyNowItem?.variant?.variantId || null }]
        : selectedCheckoutProducts.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          }));

      // ── STEP 11: Chuẩn bị shippingProvider (provider info) ──
      const shippingProviderMap = {};
      for (const shop of (checkout.shops || [])) {
        const sel = shippingInfo.selectedShippingByShop?.[shop.shopId];
        if (sel) {
          const method = shop.shippingMethods?.find(f =>
            f.provider.code?.toLowerCase() === sel.code?.toLowerCase() &&
            f.serviceType === sel.serviceType
          );
          if (method) {
            shippingProviderMap[shop.shopId] = method.provider;
          }
        }
      }

      const shippingAddress = {
        fullName: customerInfo.fullName,
        phone: customerInfo.phone,
        address: shippingInfo.address,
        provinceCode: shippingInfo.provinceCode ? Number(shippingInfo.provinceCode) : null,
        provinceName: shippingInfo.provinceName || '',
        wardName: shippingInfo.wardName || '',
        note: shippingInfo.note || '',
      };

      const orderPayload = {
        mode: isBuyNow ? 'BUY_NOW' : 'CART',
        shippingAddress,
        paymentMethod: effectivePaymentMethod,
        useWalletBalance: walletDiscountAmount > 0,
        walletAmount: walletDiscountAmount,
        shippingProvider: shippingProviderMap,
        shippingFeesByShop,
        couponCode: selectedProductCoupon?.code || null,
        selectedShippingCoupon: selectedShippingCoupon ? true : null,
        // Dùng checkout preview items
        ...(isBuyNow
          ? { items: orderItems }
          : { cartItemIds: [...selectedItemIds] }),
      };

      if (effectivePaymentMethod === "PAYOS") {
        const res = await createPayOSPaymentWithCartApi(orderPayload);
        if (res.success && res.data.checkoutUrl) {
          window.location.href = res.data.checkoutUrl;
        } else {
          showToast(res.message || "Không thể tạo thanh toán PayOS!", "error");
        }
      } else {
        const res = await createOrderApi(orderPayload);
        if (res.success) {
          // Refresh wallet balance if paid via WALLET so FE shows correct balance on return
          if ((effectivePaymentMethod === "WALLET" || walletDiscountAmount > 0) && res.data.walletBalance !== undefined) {
            setWalletBalance(res.data.walletBalance);
            setUseWalletBalance(false);
          }
          const orders = res.data.orders || [res.data].filter(Boolean);
          const orderNumbers = orders.map((order) => order?.orderNumber).filter(Boolean);
          if (orderNumbers.length > 0) {
            localStorage.setItem("checkout_created_orders", JSON.stringify({
              orderNumbers,
              orders,
              timestamp: Date.now(),
            }));
            navigate(`/order-success/${encodeURIComponent(orderNumbers.join(","))}`);
          } else {
            showToast("Đặt hàng thành công nhưng không lấy được mã đơn.", "info");
          }
        } else {
          showToast(res.message || "Đặt hàng thất bại!", "error");
        }
      }
    } catch (error) {
      showToast(error.message || "Có lỗi xảy ra!", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatAddress = (addr) => {
    return [addr.street, addr.wardName, addr.provinceName].filter(Boolean).join(", ");
  };

  if (loading || loadingCheckout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#95520B] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#9E8E7E] text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  const buyNowQuantity = Math.max(1, Number(buyNowItem?.quantity) || 1);

  // STEP 7: Products from unified checkout data (no more groupedCart / buyNowProduct)
  const selectedCheckoutProducts = checkout?.items || [];

  // Step 10: Summary from backend (STEP 10 — backend computes totals)
  // FE still computes local voucher discounts as user selections change
  const backendSubtotal = checkout?.summary?.subtotal || selectedCheckoutProducts.reduce((sum, item) => sum + (item.salePrice || 0) * (item.quantity || 1), 0);
  const selectedSubtotal = backendSubtotal;

  // shippingFee: computed from FE-selected shipping method per shop (authoritative), falls back to backend default
  const shippingFee = checkout?.shops
    ? checkout.shops.reduce((sum, shop) => sum + (computedShippingFeesByShop[shop.shopId] || 0), 0)
    : 0;

  // ── Global computed values (must be after all useMemo / useRef) ──
  const totalProductCouponDiscount = Object.values(shopProductCoupons).reduce((sum, v) => sum + (v.discount || 0), 0) + productCouponDiscount;
  const totalBeforeShipping = selectedSubtotal - totalProductCouponDiscount;
  const effectiveShippingFee = selectedShippingCoupon ? 0 : shippingFee;
  const grandTotal = Math.max(0, totalBeforeShipping + effectiveShippingFee);
  const availableWalletBalance = Math.max(0, Number(walletBalance) || 0);
  const walletCoversOrder = availableWalletBalance >= grandTotal && grandTotal > 0;
  const walletDiscountAmount = useWalletBalance ? Math.min(availableWalletBalance, grandTotal) : 0;
  const amountToPay = Math.max(0, grandTotal - walletDiscountAmount);
  const effectivePaymentMethod = walletDiscountAmount > 0 && amountToPay === 0 ? "WALLET" : paymentMethod;
  const selectedPaymentMethodForUi = useWalletBalance && walletCoversOrder ? "WALLET" : paymentMethod;

  // Tìm fee item đầu tiên đang được chọn (để hiển thị ở step 3)
  // Với per-shop shipping: lấy shop đầu tiên có selection
  const selectedProviderData = null;

  // Helper: get shop data from checkout by shopId
  const getShopData = (shopId) => {
    return checkout?.shops?.find(s => s.shopId === shopId) || null;
  };

  // Helper: get selected shipping option label for a shop
  const getSelectedShippingLabel = (shopId) => {
    const sel = shippingInfo.selectedShippingByShop?.[shopId];
    if (!sel) return null;
    const shopData = getShopData(shopId);
    const method = shopData?.shippingMethods?.find(
      f => f.provider.code?.toLowerCase() === sel.code?.toLowerCase() && f.serviceType === sel.serviceType
    );
    if (!method) return null;
    return { label: `${method.provider.name} · ${method.serviceName}`, fee: method.fee };
  };

  const modalShippingShopId = shippingModal.shopId;
  const modalShop = checkout?.shops?.find(s => s.shopId === modalShippingShopId);
  const modalShippingFees = modalShop?.shippingMethods || [];
  const modalShippingSel = shippingInfo.selectedShippingByShop?.[modalShippingShopId];

  const selectedAddr = addresses.find(a => a._id === selectedAddressId);

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-32">
      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E0] px-4 sm:px-8 h-[58px] flex items-center justify-between">
        <button onClick={() => navigate(isBuyNow ? `/product/${buyNowItem?.productId}` : "/cart")} className="text-[#6B5C4C] hover:text-[#1C1108]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-[15px] font-bold text-[#1C1108]">Checkout</h1>
        <div className="w-6" />
      </div>

      <div className="max-w-[900px] mx-auto my-5 px-4 sm:px-6">
        <div className="grid lg:grid-cols-3 gap-5 items-start">

          {/* LEFT — address + shop blocks */}
          <div className="lg:col-span-2 space-y-4">

            {/* ── Address card ── */}
            <div className={cardClass}>
              <div className="px-5 pt-4 pb-3 border-b border-[#EDE8E0] bg-[#FAF7F4]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#95520B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <h2 className="text-[14px] font-extrabold text-[#1C1108]">Địa chỉ giao hàng</h2>
                  </div>
                  <button onClick={() => setShowAddressPicker(true)} className="text-[12px] text-[#95520B] font-medium hover:underline">Đổi địa chỉ</button>
                </div>
              </div>

              {loadingCheckout ? (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="w-5 h-5 border-2 border-[#D5C9BC] border-t-[#95520B] rounded-full animate-spin" />
                  <span className="text-[13px] text-[#9E8E7E]">Đang tải checkout...</span>
                </div>
              ) : checkoutError ? (
                <div className="p-4 text-center">
                  <p className="text-[13px] text-red-500 mb-3">{checkoutError}</p>
                  <button onClick={fetchCheckoutPreview} className="px-4 py-2 bg-[#95520B] text-white text-[13px] font-semibold rounded-[8px]">Thử lại</button>
                </div>
              ) : selectedCheckoutAddress ? (
                <div onClick={() => setShowAddressPicker(true)} className="p-4 flex items-start gap-3 cursor-pointer hover:bg-[#fff8f0] transition-colors">
                  <div className="w-5 h-5 rounded-full border-2 border-[#95520B] bg-[#95520B] flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-2 bg-white rounded-full" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[13.5px] text-[#1C1108]">{selectedCheckoutAddress.fullName}</p>
                      <span className="text-[#9E8E7E]">·</span>
                      <p className="text-[13px] text-[#6B5C4C]">{selectedCheckoutAddress.phone}</p>
                      {selectedCheckoutAddress.isDefault && <span className="px-1.5 py-0.5 bg-[#95520B] text-white text-[10px] font-bold rounded-full">Mặc định</span>}
                    </div>
                    <p className="text-[12.5px] text-[#6B5C4C] mt-1">{selectedCheckoutAddress.street}{selectedCheckoutAddress.wardName ? `, ${selectedCheckoutAddress.wardName}` : ''}{selectedCheckoutAddress.provinceName ? `, ${selectedCheckoutAddress.provinceName}` : ''}</p>
                  </div>
                  <svg className="w-4 h-4 text-[#9E8E7E] shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-[13px] text-red-500 mb-3">Vui lòng chọn địa chỉ giao hàng</p>
                  <button onClick={() => navigate("/addresses")} className="px-4 py-2 bg-[#95520B] text-white text-[13px] font-semibold rounded-[8px]">Chọn địa chỉ</button>
                </div>
              )}
            </div>

            {/* ── Shop blocks (Shopee style — from checkout.shops) ── */}
            {checkout && checkout.shops && checkout.shops.map((shop) => {
              const shopId = shop.shopId;
              const shopSel = shippingInfo.selectedShippingByShop?.[shopId];
              const selectedFee = shopSel && shop.shippingMethods
                ? shop.shippingMethods.find(f =>
                    f.provider.code?.toLowerCase() === shopSel.code?.toLowerCase() &&
                    f.serviceType === shopSel.serviceType
                  )
                : (shop.shippingMethods?.[0] || null);
              const shopProductSubtotal = shop.items.reduce((sum, item) => sum + (item.salePrice || 0) * (item.quantity || 1), 0);
              const shopShippingFee = selectedFee?.fee || shop.shippingFee || 0;
              const shopCouponData = shopProductCoupons[shopId];
              const shopDiscount = shopCouponData?.discount || 0;
              const shopTotal = Math.max(0, shopProductSubtotal + shopShippingFee - shopDiscount);

              return (
                <div key={shopId} className={cardClass}>
                  <div className="px-5 pt-4 pb-3 border-b border-[#EDE8E0] bg-[#FAF7F4]">
                    <div className="flex items-center gap-2">
                      {shop.shopAvatar ? (
                        <img src={shop.shopAvatar} alt={shop.shopName} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#D5C9BC] flex items-center justify-center">
                          <span className="text-[10px] font-bold text-[#6B5C4C]">{shop.shopName.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <span className="font-bold text-[13px] text-[#1C1108]">{shop.shopName}</span>
                    </div>
                  </div>

                  <div className="divide-y divide-[#EDE8E0]">
                    {shop.items.map((item) => (
                      <div key={getCheckoutItemId(item)} className="flex gap-3 p-4">
                        <img src={item.image || "/placeholder.png"} alt={item.name} className="w-16 h-16 object-cover rounded-[8px] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#1C1108] line-clamp-2">{item.name}</p>
                          {getVariantLabel(item) && <p className="text-[11px] text-[#9E8E7E] mt-0.5">Phân loại: {getVariantLabel(item)}</p>}
                          {item.discountPercent > 0 && <p className="text-[11.5px] text-[#A8896A] mt-0.5">Giảm {item.discountPercent}%</p>}
                          <div className="flex items-center justify-between mt-1.5">
                            <div>
                              <span className="text-[13px] font-bold text-[#95520B]">{formatPrice(item.salePrice)}</span>
                              {item.originalPrice > item.salePrice && (
                                <span className="text-[11px] text-[#9E8E7E] line-through ml-1">{formatPrice(item.originalPrice)}</span>
                              )}
                            </div>
                            <span className="text-[12px] text-[#9E8E7E]">×{item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="px-4 py-3 border-t border-[#EDE8E0]">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#9E8E7E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      <input type="text" value={shopNotes[shopId] || ""} onChange={(e) => setShopNotes(prev => ({ ...prev, [shopId]: e.target.value }))} className="flex-1 text-[12.5px] text-[#6B5C4C] placeholder-[#9E8E7E] focus:outline-none bg-transparent" placeholder="Lời nhắn cho shop..." />
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t border-[#EDE8E0] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[12.5px] text-[#6B5C4C]">
                      <svg className="w-4 h-4 text-[#9E8E7E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                      <span>Giao hàng</span>
                    </div>
                    <button onClick={() => openShippingModal(shopId)} className="text-[12.5px] font-semibold text-[#95520B] hover:underline flex items-center gap-1">
                      {!shopSel ? (
                        <span className="text-red-500">Chọn phương thức giao hàng</span>
                      ) : (
                        <><span>{selectedFee?.provider.name} – {selectedFee?.serviceName}</span><span className="font-bold">{formatPrice(selectedFee?.fee || 0)}</span></>
                      )}
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>

                  <div className="px-4 py-3 border-t border-[#EDE8E0] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[12.5px] text-[#6B5C4C]">
                      <svg className="w-4 h-4 text-[#9E8E7E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      <span>Voucher của {shop.shopName}</span>
                    </div>
                    {shopCouponData ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-[#16a34a]">{shopCouponData.coupon.code} · -{formatPrice(shopDiscount)}</span>
                        <button onClick={() => handleRemoveShopProductCoupon(shopId)} className="text-[#9E8E7E] hover:text-red-500"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                    ) : (
                      <button onClick={() => openShopVoucherModal(shopId)} className="text-[12.5px] font-semibold text-[#95520B] hover:underline flex items-center gap-1">
                        Chọn voucher<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    )}
                  </div>

                  <div className="px-4 py-3 border-t border-[#EDE8E0] flex items-center justify-end gap-3 bg-[#FAF7F4]">
                    <span className="text-[12px] text-[#6B5C4C]">Tổng số tiền:</span>
                    <span className="text-[15px] font-extrabold text-[#95520B]">{formatPrice(shopTotal)}</span>
                  </div>
                </div>
              );
            })}

            {/* ── Platform voucher ── */}
            <div className={cardClass}>
              <div className="px-5 py-4 border-b border-[#EDE8E0] bg-[#FAF7F4]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#95520B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    <span className="text-[13px] font-bold text-[#1C1108]">Mã giảm giá Furni</span>
                  </div>
                  <button onClick={() => setShowProductVoucherModal(true)} className="text-[12px] text-[#95520B] font-medium hover:underline">
                    {selectedProductCoupon || selectedShippingCoupon ? "Thay đổi" : "Chọn voucher"}
                  </button>
                </div>
                {(selectedProductCoupon || selectedShippingCoupon) && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="w-7 h-7 bg-[#95520B] rounded-lg flex items-center justify-center"><svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></div>
                    {selectedProductCoupon && <div><p className="font-bold text-[12px] text-[#95520B]">{selectedProductCoupon.code}</p><p className="text-[11px] text-[#6B5C4C]">Giảm {formatPrice(productCouponDiscount)}</p></div>}
                    {selectedShippingCoupon && <div><p className="font-bold text-[12px] text-blue-600">{selectedShippingCoupon.code}</p><p className="text-[11px] text-blue-500">Miễn phí vận chuyển</p></div>}
                    <button onClick={() => { setSelectedProductCoupon(null); setSelectedShippingCoupon(null); }} className="ml-auto text-[#9E8E7E] hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Payment method ── */}
            <div className={cardClass}>
              <div className="px-5 py-4 border-b border-[#EDE8E0] bg-[#FAF7F4]">
                <h2 className="text-[14px] font-extrabold text-[#1C1108]">Phương thức thanh toán</h2>
              </div>
              <div className="p-4 space-y-2.5">
                {walletBalance !== null && availableWalletBalance > 0 && grandTotal > 0 && (
                  <div
                    onClick={() => {
                      const next = !useWalletBalance;
                      setUseWalletBalance(next);
                      if (next && walletCoversOrder) setPaymentMethod("WALLET");
                      if (!next && paymentMethod === "WALLET") setPaymentMethod("COD");
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-[10px] border-2 cursor-pointer transition-all ${useWalletBalance ? "border-[#16a34a] bg-[#f0fdf4]" : "border-[#EDE8E0] bg-white hover:border-[#D5C9BC]"}`}
                  >
                    <div className={`w-5 h-5 ${walletCoversOrder ? "rounded-full" : "rounded"} border-2 flex items-center justify-center flex-shrink-0 ${useWalletBalance ? "border-[#16a34a] bg-[#16a34a]" : "border-[#D5C9BC]"}`}>
                      {useWalletBalance && (walletCoversOrder
                        ? <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        : <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[13px] text-[#1C1108]">{walletCoversOrder ? "Thanh toán bằng ví SORA" : "Sử dụng số dư ví SORA"}</p>
                      <p className="text-[11.5px] text-[#9E8E7E]">
                        Số dư: {formatPrice(availableWalletBalance)}
                        {useWalletBalance ? ` - Giảm ${formatPrice(walletDiscountAmount)}` : ""}
                      </p>
                    </div>
                  </div>
                )}
                <div onClick={() => { setPaymentMethod("COD"); if (walletCoversOrder) setUseWalletBalance(false); }} className={`flex items-center gap-3 p-3.5 rounded-[10px] border-2 cursor-pointer transition-all ${selectedPaymentMethodForUi === "COD" ? "border-[#95520B] bg-[#fff8f0]" : "border-[#EDE8E0] bg-white hover:border-[#D5C9BC]"}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedPaymentMethodForUi === "COD" ? "border-[#95520B] bg-[#95520B]" : "border-[#D5C9BC]"}`}>{selectedPaymentMethodForUi === "COD" && <div className="w-2.5 h-2.5 bg-white rounded-full" />}</div>
                  <div className="flex-1"><p className="font-semibold text-[13px] text-[#1C1108]">Thanh toán khi nhận hàng (COD)</p><p className="text-[11.5px] text-[#9E8E7E]">Trả tiền mặt khi nhận được hàng</p></div>
                </div>
                <div onClick={() => { setPaymentMethod("PAYOS"); if (walletCoversOrder) setUseWalletBalance(false); }} className={`flex items-center gap-3 p-3.5 rounded-[10px] border-2 cursor-pointer transition-all ${selectedPaymentMethodForUi === "PAYOS" ? "border-[#95520B] bg-[#fff8f0]" : "border-[#EDE8E0] bg-white hover:border-[#D5C9BC]"}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedPaymentMethodForUi === "PAYOS" ? "border-[#95520B] bg-[#95520B]" : "border-[#D5C9BC]"}`}>{selectedPaymentMethodForUi === "PAYOS" && <div className="w-2.5 h-2.5 bg-white rounded-full" />}</div>
                  <div className="flex-1"><p className="font-semibold text-[13px] text-[#1C1108]">Thanh toán online qua PayOS</p><p className="text-[11.5px] text-[#9E8E7E]">Ví điện tử, Ngân hàng, QR Code</p></div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — order summary sidebar */}
          <div className="lg:col-span-1">
            <div className={`${cardClass} sticky top-5`}>
              <div className="px-5 pt-4 pb-3 border-b border-[#EDE8E0] bg-[#FAF7F4]">
                <h2 className="text-[14px] font-extrabold text-[#1C1108]">Đơn hàng</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  {selectedCheckoutProducts.slice(0, 3).map((item) => (
                    <div key={getCheckoutItemId(item)} className="flex gap-2 items-center">
                      <img src={item.image || "/placeholder.png"} alt={item.name} className="w-10 h-10 object-cover rounded-[6px]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#1C1108] line-clamp-1">{item.name}</p>
                        {getVariantLabel(item) && <p className="text-[10px] text-[#9E8E7E]">Phân loại: {getVariantLabel(item)}</p>}
                        <p className="text-[10.5px] text-[#9E8E7E]">×{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                  {selectedCheckoutProducts.length > 3 && <p className="text-[11.5px] text-[#9E8E7E] text-center py-1">+{selectedCheckoutProducts.length - 3} sản phẩm khác</p>}
                </div>

                <div className="space-y-2.5 text-[13px] border-t border-[#EDE8E0] pt-4">
                  <div className="flex justify-between"><span className="text-[#6B5C4C]">Tạm tính</span><span className="font-semibold text-[#1C1108]">{formatPrice(selectedSubtotal)}</span></div>
                  {productCouponDiscount > 0 && <div className="flex justify-between text-[#16a34a]"><span>Giảm giá</span><span className="font-semibold">-{formatPrice(productCouponDiscount)}</span></div>}
                  {selectedShippingCoupon && <div className="flex justify-between text-blue-600"><span>Miễn phí ship</span><span className="font-semibold">-{formatPrice(shippingFee)}</span></div>}
                  <div className="flex justify-between"><span className="text-[#6B5C4C]">Phí vận chuyển</span><span className="font-semibold text-[#1C1108]">{effectiveShippingFee === 0 ? <span className="text-[#16a34a]">Miễn phí</span> : formatPrice(effectiveShippingFee)}</span></div>
                  {walletDiscountAmount > 0 && <div className="flex justify-between text-[#16a34a]"><span>Ví SORA</span><span className="font-semibold">-{formatPrice(walletDiscountAmount)}</span></div>}
                  <div className="border-t border-[#EDE8E0] pt-3 flex justify-between items-center">
                    <span className="font-bold text-[#1C1108]">Tổng thanh toán</span>
                    <span className="font-extrabold text-[18px] text-[#95520B]">{formatPrice(amountToPay)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11.5px] text-[#9E8E7E] bg-[#dcfce7] rounded-[8px] p-3">
                  <svg className="w-4 h-4 text-[#16a34a] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  <span>Thanh toán an toàn & bảo mật</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Shipping modal ── */}
      {shippingModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeShippingModal} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-[16px] sm:rounded-[16px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE8E0]">
              <h3 className="text-[15px] font-bold text-[#1C1108]">Chọn phương thức vận chuyển</h3>
              <button onClick={closeShippingModal} className="text-[#9E8E7E] hover:text-[#1C1108]"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {modalShippingFees.length === 0 ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <div className="w-5 h-5 border-2 border-[#D5C9BC] border-t-[#95520B] rounded-full animate-spin" />
                  <span className="text-[13px] text-[#9E8E7E]">Đang tải...</span>
                </div>
              ) : (
                modalShippingFees.map((fee) => {
                  const isSelected = modalShippingSel?.code?.toLowerCase() === fee.provider.code?.toLowerCase() && modalShippingSel?.serviceType === fee.serviceType;
                  return (
                    <div key={`${fee.provider.code}-${fee.serviceType}`} onClick={() => { setShippingInfo(prev => ({ ...prev, selectedShippingByShop: { ...prev.selectedShippingByShop, [modalShippingShopId]: { code: fee.provider.code, serviceType: fee.serviceType } } })); closeShippingModal(); }} className={`p-4 rounded-[10px] border-2 cursor-pointer transition-all ${isSelected ? "border-[#95520B] bg-[#fff8f0]" : "border-[#EDE8E0] bg-white hover:border-[#D5C9BC]"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${isSelected ? "border-[#95520B] bg-[#95520B]" : "border-[#D5C9BC]"}`}>{isSelected && <div className="w-2 bg-white rounded-full" />}</div>
                        <div className="flex-1">
                          <p className="font-semibold text-[13px] text-[#1C1108]">{fee.provider.name} – {fee.serviceName}</p>
                          {fee.estimatedDays && <p className="text-[11.5px] text-[#9E8E7E] mt-0.5">Giao hàng: {typeof fee.estimatedDays === 'object' ? `${fee.estimatedDays.min}–${fee.estimatedDays.max}` : fee.estimatedDays} ngày</p>}
                        </div>
                        <span className="font-bold text-[14px] text-[#95520B]">{formatPrice(fee.fee)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Shop voucher modal ── */}
      {shopVoucherModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeShopVoucherModal} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-[16px] sm:rounded-[16px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE8E0]">
              <h3 className="text-[15px] font-bold text-[#1C1108]">Voucher của {checkout?.shops?.find(s => s.shopId === shopVoucherModal.shopId)?.shopName || 'shop'}</h3>
              <button onClick={closeShopVoucherModal} className="text-[#9E8E7E] hover:text-[#1C1108]"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {availableVouchers.filter(v => !v.isUsed && !v.isExpired && v.discountType !== 'freeship' && String(v.shopId || '') === String(shopVoucherModal.shopId)).length === 0 ? (
                <p className="text-center text-[13px] text-[#9E8E7E] py-6">Không có voucher nào của {checkout?.shops?.find(s => s.shopId === shopVoucherModal.shopId)?.shopName || 'shop'} này</p>
              ) : (
                availableVouchers.filter(v => !v.isUsed && !v.isExpired && v.discountType !== 'freeship' && String(v.shopId || '') === String(shopVoucherModal.shopId)).map(v => (
                  <div key={v._id || v.code} onClick={() => handleSelectShopProductVoucher(v, shopVoucherModal.shopId)} className="flex items-center gap-3 p-4 rounded-[10px] border-2 border-[#EDE8E0] bg-white hover:border-[#95520B] cursor-pointer transition-all mb-2">
                    <div className="w-10 h-10 bg-[#95520B] rounded-lg flex items-center justify-center shrink-0"><span className="text-white font-extrabold text-[13px]">%</span></div>
                    <div className="flex-1">
                      <p className="font-bold text-[13px] text-[#1C1108]">{v.code}</p>
                      <p className="text-[11.5px] text-[#6B5C4C]">{v.discountType === 'percent' ? `Giảm ${v.value}%` : `Giảm ${formatPrice(v.value)}`}{v.minOrderValue ? ` • Đơn từ ${formatPrice(v.minOrderValue)}` : ''}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Address picker modal ── */}
      {showAddressPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddressPicker(false)} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-[16px] sm:rounded-[16px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE8E0]">
              <h3 className="text-[15px] font-bold text-[#1C1108]">Chọn địa chỉ giao hàng</h3>
              <button onClick={() => setShowAddressPicker(false)} className="text-[#9E8E7E] hover:text-[#1C1108]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {addresses.map((addr) => {
                const isSelected = addr._id === selectedAddressId;
                return (
                  <div
                    key={addr._id}
                    onClick={() => {
                      selectAddress(addr);
                      setShowAddressPicker(false);
                    }}
                    className={`p-4 rounded-[10px] border-2 cursor-pointer transition-all ${
                      isSelected ? "border-[#95520B] bg-[#fff8f0]" : "border-[#EDE8E0] bg-white hover:border-[#D5C9BC]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? "border-[#95520B] bg-[#95520B]" : "border-[#D5C9BC]"
                      }`}>
                        {isSelected && <div className="w-2 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-[13px] text-[#1C1108]">{addr.fullName}</p>
                          <span className="text-[#9E8E7E]">·</span>
                          <p className="text-[12.5px] text-[#6B5C4C]">{addr.phone}</p>
                          {addr.isDefault && (
                            <span className="px-1.5 py-0.5 bg-[#95520B] text-white text-[10px] font-bold rounded-full">Mặc định</span>
                          )}
                        </div>
                        <p className="text-[12.5px] text-[#6B5C4C]">
                          {addr.street}{addr.wardName ? `, ${addr.wardName}` : ''}{addr.provinceName ? `, ${addr.provinceName}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {addresses.length === 0 && !loadingAddresses && (
                <p className="text-center text-[13px] text-[#9E8E7E] py-8">Chưa có địa chỉ nào</p>
              )}
              {loadingAddresses && (
                <div className="flex items-center justify-center py-10 gap-3">
                  <div className="w-5 h-5 border-2 border-[#D5C9BC] border-t-[#95520B] rounded-full animate-spin" />
                  <span className="text-[13px] text-[#9E8E7E]">Đang tải...</span>
                </div>
              )}
            </div>
            <div className="px-4 py-4 border-t border-[#EDE8E0]">
              <button
                onClick={() => { setShowAddressPicker(false); navigate("/addresses"); }}
                className="w-full py-2.5 rounded-[8px] text-[13px] font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #95520B 0%, #7a4318 100%)" }}
              >
                + Thêm địa chỉ mới
              </button>
            </div>
          </div>
        </div>
      )}

      <AddressModal isOpen={showAddressModal} onClose={() => setShowAddressModal(false)} onSave={handleAddNewAddress} />

      <VoucherModal
        isOpen={showProductVoucherModal}
        onClose={() => setShowProductVoucherModal(false)}
        availableVouchers={availableVouchers.filter(v => !v.shopId && v.discountType !== 'freeship')}
        selectedVoucher={selectedProductCoupon || selectedShippingCoupon}
        onSelectVoucher={(voucher) => {
          if (voucher.discountType === 'freeship') handleSelectShippingVoucher(voucher);
          else handleSelectProductVoucher(voucher);
        }}
      />

      {/* ── Sticky bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EDE8E0] shadow-[0_-4px_16px_rgba(0,0,0,0.09)] z-40">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 h-[64px] flex items-center gap-4">
          <div className="flex-1">
            <span className="text-[12px] text-[#9E8E7E]">Tổng thanh toán</span>
            <p className="font-extrabold text-[20px] text-[#95520B]">{formatPrice(amountToPay)}</p>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={!selectedAddressId || selectedCheckoutProducts.length === 0 || submitting || (checkout?.shops || []).some(shop => !shippingInfo.selectedShippingByShop?.[shop.shopId])}
            className={`h-[44px] px-8 text-[14px] font-semibold rounded-[8px] text-white transition-all ${!selectedAddressId || selectedCheckoutProducts.length === 0 || submitting || (checkout?.shops || []).some(shop => !shippingInfo.selectedShippingByShop?.[shop.shopId]) ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-[0.98]"}`}
            style={{ background: "linear-gradient(135deg, #95520B 0%, #7a4318 100%)" }}
          >
            {submitting ? "Đang xử lý..." : "Đặt hàng"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
