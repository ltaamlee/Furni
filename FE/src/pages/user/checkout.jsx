import { useState, useEffect, useContext, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../components/context/authContext";
import { useToast } from "../../components/context/ToastContext";
import AddressModal from "../../components/common/AddressModal";
import VoucherModal from "../../components/common/VoucherModal";
import {
  getCartApi,
  createOrderApi,
  calculateShippingFeesApi,
  createPayOSPaymentWithCartApi,
  getAddressesApi,
  getProductByIdApi,
  createAddressApi,
  validateVoucherApi,
  getAvailableVouchersApi,
  getShopShippingConfigApi,
  calculateShippingTiersApi,
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
  const [cart, setCart] = useState(null);
  const [shippingFees, setShippingFees] = useState([]);
  const [shippingFeesByShop, setShippingFeesByShop] = useState({}); // { [shopId]: FeeItem[] }
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [buyNowItem, setBuyNowItem] = useState(null);
  const [buyNowProduct, setBuyNowProduct] = useState(null);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const shippingDebounceRef = useRef(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Use ref for restored coupon so fetchCart closure always has the fresh value
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
      const shopItems = (cart?.products || [])
        .filter(item => selectedItemIds.has(item.product._id || item.product) && (item.shop?._id || item.shop) === shopId);
      const shopSubtotal = shopItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
      const res = await validateVoucherApi({
        code: voucher.code,
        orderTotal: shopSubtotal,
        cartItems: shopItems.map(item => ({
          productId: item.product._id || item.product,
          price: item.price,
          quantity: item.quantity,
        })),
      });
      if (res.success) {
        setShopProductCoupons(prev => ({ ...prev, [shopId]: { coupon: res.data.voucher, discount: res.data.discount } }));
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
          setBuyNowItem({ productId: buyNow.productId, quantity: qty });
          fetchBuyNowProduct(buyNow.productId, qty);
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

      // Restore coupon from cart page (store in ref so fetchCart closure can access it)
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

    if (!buyNowMode) fetchCart();
    else setLoading(false);
    fetchAddresses();
  }, []);

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

  // Buy Now: always start at step 1 — user manually proceeds
  useEffect(() => {
    if (isBuyNow && selectedAddressId && buyNowProduct && step === 1) {
      // Only auto-advance if all 3 are present AND the address was auto-selected (not manually changed)
      // For safety, let the user see step 1 and click "Tiếp tục"
    }
  }, [isBuyNow, selectedAddressId, step, buyNowProduct]);

  useEffect(() => {
    isBuyNowRef.current = isBuyNow;
  }, [isBuyNow]);

  // Keep selectAll in sync with selectedItemIds
  useEffect(() => {
    if (!cart) return;
    const availableProducts = cart.products.filter(item => item.shopIsActive !== false);
    if (availableProducts.length === 0) { setSelectAll(false); return; }
    const allSelected = availableProducts.every(item =>
      selectedItemIds.has(item.product._id || item.product)
    );
    setSelectAll(allSelected);
  }, [selectedItemIds, cart]);

  useEffect(() => {
    const selectedSubtotal = isBuyNow
      ? (buyNowProduct?.price || 0) * (buyNowItem?.quantity || 1)
      : (cart?.products || [])
          .filter((item) => selectedItemIds.has(item.product._id || item.product))
          .reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

    if (shippingInfo.provinceCode && selectedSubtotal > 0) {
      if (shippingDebounceRef.current) clearTimeout(shippingDebounceRef.current);
      shippingDebounceRef.current = setTimeout(() => fetchShippingFees(), 500);
    }
    return () => {
      if (shippingDebounceRef.current) clearTimeout(shippingDebounceRef.current);
    };
  }, [shippingInfo.provinceCode, selectedItemIds, isBuyNow, buyNowProduct, cart]);

  useEffect(() => {
    if (!cart || isBuyNow || !shippingInfo.provinceCode) return;
    const hasSelectedItems = (cart.products || []).some(
      (item) => selectedItemIds.has(item.product._id || item.product)
    );
    if (!hasSelectedItems) return;
    if (shippingDebounceRef.current) clearTimeout(shippingDebounceRef.current);
    shippingDebounceRef.current = setTimeout(() => fetchShippingFees(), 100);
  }, [cart, selectedItemIds, shippingInfo.provinceCode, isBuyNow]);

  const fetchCart = async () => {
    if (isBuyNowRef.current) { setLoading(false); return; }
    try {
      const res = await getCartApi();
      if (res.success && res.data.products?.length > 0) {
        setCart(res.data);

        // Re-validate coupon restored from cart page (ref guarantees fresh value in closure)
        const restored = restoredCouponRef.current;
        if (restored?.code) {
          restoredCouponRef.current = null; // consume it — only validate once
          const orderTotal = (res.data.products || [])
            .filter((item) => selectedItemIds.has(item.product._id || item.product))
            .reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
          try {
            const valRes = await validateVoucherApi({
              code: restored.code,
              orderTotal,
              cartItems: res.data.products
                .filter((item) => selectedItemIds.has(item.product._id || item.product))
                .map((item) => ({
                  productId: item.product._id || item.product,
                  price: item.price,
                  quantity: item.quantity
                })),
            });
            if (valRes.success) {
              if (restored.type === 'shipping') {
                setShippingCouponDiscount(valRes.data.discount || 0);
              } else {
                setProductCouponDiscount(valRes.data.discount || 0);
              }
            } else {
              // Coupon no longer valid — clear it
              if (restored.type === 'shipping') {
                setSelectedShippingCoupon(null);
                setShippingCouponDiscount(0);
              } else {
                setSelectedProductCoupon(null);
                setProductCouponDiscount(0);
              }
            }
          } catch (_) { /* ignore validation errors */ }
        }
      } else if (!isBuyNowRef.current) {
        navigate("/cart");
      }
    } catch (error) {
      if (!isBuyNowRef.current) navigate("/cart");
    } finally {
      setLoading(false);
    }
  };

  const fetchBuyNowProduct = async (productId, quantity = 1) => {
    try {
      const res = await getProductByIdApi(productId);
      if (res.success) {
        const product = res.data.product || res.data;
        const discount = product.discountPercent || product.discount || 0;
        const originalPrice = product.originalPrice || product.price || 0;
        const salePrice = product.salePrice || (discount > 0
          ? Math.round(originalPrice * (1 - discount / 100))
          : originalPrice);

        setBuyNowProduct({
          _id: product._id,
          name: product.name,
          image: product.images?.[0] || null,
          price: salePrice,
          originalPrice,
          discount,
          quantity: quantity || 1,
          weight: product.weight || 0,
          shop: product.shop?._id || product.shop,
          shopName: product.shop?.name || "Cửa hàng",
        });
      }
    } catch (error) {
      console.error("Error fetching buy now product:", error);
    }
  };

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
        const orderTotal = isBuyNow
          ? (buyNowProduct?.price || 0) * (buyNowItem?.quantity || 1)
          : (cart?.products || [])
              .filter((item) => selectedItemIds.has(item.product._id || item.product))
              .reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
        const selectedItemsForVoucher = isBuyNow
          ? [{
              shopId: buyNowProduct?.shop?._id || buyNowProduct?.shop,
              subtotal: orderTotal,
            }]
          : (cart?.products || [])
              .filter((item) => selectedItemIds.has(item.product._id || item.product))
              .map((item) => ({
                shopId: item.shop?._id || item.shop || item.product?.shop?._id || item.product?.shop,
                subtotal: (item.price || 0) * (item.quantity || 1),
              }));
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
      const orderTotal = isBuyNow
        ? (buyNowProduct?.price || 0) * (buyNowItem?.quantity || 1)
        : (cart?.products || [])
            .filter((item) => selectedItemIds.has(item.product._id || item.product))
            .reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
      const cartItems = isBuyNow
        ? [{
            productId: buyNowItem?.productId,
            price: buyNowProduct?.price || 0,
            quantity: buyNowItem?.quantity || 1,
          }]
        : (cart?.products || [])
            .filter((item) => selectedItemIds.has(item.product._id || item.product))
            .map((item) => ({
              productId: item.product._id || item.product,
              price: item.price,
              quantity: item.quantity,
            }));
      const res = await validateVoucherApi({ code: voucher.code, orderTotal, cartItems });
      if (res.success) {
        setSelectedProductCoupon(res.data.voucher);
        setProductCouponDiscount(res.data.discount);
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
      setSelectedShippingCoupon(voucher);
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
  const handleToggleItem = (productId) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      localStorage.setItem("checkout_selected_items", JSON.stringify([...next]));
      return next;
    });
    // Reset shipping cache since selection changed
    shippingCache.current = {};
    setShippingFees([]);
  };

  const handleSelectShop = (shopId) => {
    if (!cart) return;
    const shopItems = cart.products.filter(item =>
      (item.shop?._id || item.shop) === shopId && item.shopIsActive !== false
    );
    const shopItemIds = shopItems.map(item => item.product._id || item.product);
    const allSelected = shopItemIds.every(id => selectedItemIds.has(id));

    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        shopItemIds.forEach(id => newSet.delete(id));
      } else {
        shopItemIds.forEach(id => newSet.add(id));
      }
      localStorage.setItem("checkout_selected_items", JSON.stringify([...newSet]));
      return newSet;
    });
    shippingCache.current = {};
    setShippingFees([]);
  };

  const handleSelectAll = () => {
    if (!cart) return;
    if (selectAll) {
      setSelectedItemIds(new Set());
      setSelectAll(false);
      localStorage.setItem("checkout_selected_items", JSON.stringify([]));
    } else {
      const allIds = cart.products
        .filter(item => item.shopIsActive !== false)
        .map(item => item.product._id || item.product);
      setSelectedItemIds(new Set(allIds));
      setSelectAll(true);
      localStorage.setItem("checkout_selected_items", JSON.stringify(allIds));
    }
    shippingCache.current = {};
    setShippingFees([]);
  };

  // ── Group cart products by shop ──
  const groupedCart = useMemo(() => {
    if (!cart?.products) return [];
    const groups = {};
    cart.products.forEach(item => {
      const shopId = item.shop?._id || item.shop || 'unknown';
      const shopName = item.shop?.name || item.shopName || 'Cửa hàng';
      const shopAvatar = item.shop?.avatar || item.shopAvatar || null;
      if (!groups[shopId]) {
        groups[shopId] = { shopId, shopName, shopAvatar, items: [] };
      }
      groups[shopId].items.push(item);
    });
    return Object.values(groups);
  }, [cart]);

  const shippingCache = useRef({});

  const fetchShippingFees = async () => {
    if (!shippingInfo.provinceCode) return;
    if (isBuyNow && !buyNowProduct) return;
    try {
      // ── Bước 1: Thu thập danh sách shop cần tính phí ──
      // Mỗi shop có: id, config (providers, province, urban), weight, subtotal
      let shopGroups = []; // [{ id, enabledProviders, shopProvinceCode, isUrbanZone, weight, subtotal }]

      console.log('========== FETCH SHIPPING FEES ==========');
      console.log('🔵 shippingInfo.provinceCode (Tỉnh KHÁCH):', shippingInfo.provinceCode);
      console.log('🔵 shippingInfo.provinceName:', shippingInfo.provinceName);

      if (isBuyNow && buyNowProduct) {
        const shopId = buyNowProduct.shop;
        shopGroups = [{
          id: shopId,
          enabledProviders: null,
          shopProvinceCode: null,
          isUrbanZone: false,
          weight: (buyNowProduct.weight || 0) * (buyNowItem?.quantity || 1),
          subtotal: (buyNowProduct.price || 0) * (buyNowItem?.quantity || 1),
        }];
        // Lấy config shop
        try {
          const configRes = await getShopShippingConfigApi(shopId);
          console.log('📦 BuyNow - Shop Config Response:', configRes);
          if (configRes.success) {
            shopGroups[0].enabledProviders = configRes.data.shippingConfig?.enabledProviders || null;
            shopGroups[0].shopProvinceCode = configRes.data.shopProvinceCode || null;
            shopGroups[0].isUrbanZone = configRes.data.shippingConfig?.isUrbanZone || false;
          }
        } catch (_) { /* no config */ }
      } else if (cart?.products?.length > 0) {
        const selectedProducts = cart.products.filter(
          (item) => selectedItemIds.has(item.product._id || item.product) && item.shopIsActive !== false
        );
        // Nhóm theo shop
        const shopMap = {};
        for (const item of selectedProducts) {
          const shopId = item.shop?._id || item.shop || item.product?.shop?._id || item.product?.shop;
          if (!shopId) continue;
          const shopIdStr = shopId.toString();
          if (!shopMap[shopIdStr]) {
            shopMap[shopIdStr] = {
              id: shopIdStr,
              enabledProviders: null,
              shopProvinceCode: null,
              isUrbanZone: false,
              weight: 0,
              subtotal: 0,
            };
          }
          // Lấy weight từ item.weight (đã được BE trả về), fallback về item.product?.weight
          const itemWeight = item.weight || item.product?.weight || 0;
          shopMap[shopIdStr].weight += itemWeight * (item.quantity || 1);
          shopMap[shopIdStr].subtotal += (item.price || 0) * (item.quantity || 1);
        }
        shopGroups = Object.values(shopMap);

        // Fetch config cho mỗi shop song song
        await Promise.all(shopGroups.map(async (group) => {
          try {
            const configRes = await getShopShippingConfigApi(group.id);
            console.log(`📦 Shop [${group.id}] Config Response:`, configRes);
            if (configRes.success) {
              group.enabledProviders = configRes.data.shippingConfig?.enabledProviders || null;
              group.shopProvinceCode = configRes.data.shopProvinceCode || null;
              group.isUrbanZone = configRes.data.shippingConfig?.isUrbanZone || false;
            }
          } catch (_) { /* no config */ }
        }));
      }

      console.log('🏪 shopGroups sau khi xử lý:', JSON.stringify(shopGroups, null, 2));

      if (shopGroups.length === 0) return;

      // ── Bước 2: Gọi API tính phí cho MỖI shop ──
      const allShopFees = {}; // { [shopId]: FeeItem[] }
      await Promise.all(shopGroups.map(async (group) => {
        // Cache key: dựa trên province của khách + shop + weight + subtotal
        const cacheKey = `${shippingInfo.provinceCode}_${group.id}_${Math.round(group.weight)}_${group.subtotal}`;

        // Cache hit
        if (shippingCache.current[cacheKey]) {
          console.log(`⚡ Cache HIT cho shop [${group.id}]`);
          allShopFees[group.id] = shippingCache.current[cacheKey];
          return;
        }

        const normalizedProviders = group.enabledProviders
          ? group.enabledProviders.map(p => p.toLowerCase())
          : null;

        console.log('========================================');
        console.log(`📍 Gọi API cho Shop [${group.id}]`);
        console.log(`   - Tỉnh KHÁCH (provinceCode): ${shippingInfo.provinceCode} (${shippingInfo.provinceName})`);
        console.log(`   - Tỉnh SHOP (shopProvinceCode): ${group.shopProvinceCode || 'null'}`);
        console.log(`   - Weight: ${group.weight} kg`);
        console.log(`   - Weight (gram): ${Math.round(group.weight * 1000)}g`);
        console.log(`   - Subtotal: ${group.subtotal}đ`);
        console.log(`   - isUrbanZone: ${group.isUrbanZone}`);
        console.log(`   - Enabled Providers: ${JSON.stringify(normalizedProviders)}`);
        console.log('========================================');

        try {
          // provinceCode = tỉnh của KHÁCH (nơi giao hàng đến)
          // shopProvinceCode = tỉnh của SHOP (nơi hàng xuất phát)
          const res = await calculateShippingTiersApi({
            provinceCode: shippingInfo.provinceCode ? String(shippingInfo.provinceCode) : undefined,
            shopProvinceCode: group.shopProvinceCode ? String(group.shopProvinceCode) : undefined,
            weight: Math.max(1, Math.round(group.weight * 1000)), // Chuyển kg → gram
            enabledProviders: normalizedProviders ? normalizedProviders.join(',') : undefined,
            isUrbanZone: group.isUrbanZone ? 'true' : 'false',
          });

            console.log(`📥 API Response cho Shop [${group.id}]:`, res);

            if (res.success) {
              const rawTiers = res.data?.tiers || [];
              console.log(`🔍 Raw tiers từ API cho Shop [${group.id}]:`, JSON.stringify(rawTiers, null, 2));
              const transformed = rawTiers.map((tier) => {
                // Hiển thị phí thực tế
                console.log(`   Tier [${tier.tier}]: fee=${tier.fee}`);
                return {
                  provider: {
                    _id: tier.provider,
                    name: tier.providerName || PROVIDER_LABELS[tier.provider] || tier.provider,
                    code: tier.provider?.toUpperCase() || tier.provider,
                  },
                  serviceType: tier.tier,
                  serviceName: TIER_LABELS[tier.tier] || tier.tier,
                  fee: tier.fee,
                  estimatedDays: tier.estimatedDays || { min: 2, max: 5 },
                  isFree: false,
                  weight: Math.round(group.weight),
                  distanceLabel: tier.distanceLabel || '',
                  shopId: group.id,
                };
              });

              // Fallback nếu BE không trả tiers
              if (transformed.length === 0) {
                console.log(`⚠️ Không có tiers từ API cho Shop [${group.id}], dùng fallback!`);
                const fallbackProviders = normalizedProviders && normalizedProviders.length > 0
                  ? normalizedProviders
                  : ['ghtk', 'jt'];
                transformed.push(
                  { provider: { _id: fallbackProviders[0], name: PROVIDER_LABELS[fallbackProviders[0]] || fallbackProviders[0], code: fallbackProviders[0].toUpperCase() }, serviceType: 'economy', serviceName: 'Tiết Kiệm', fee: Math.round(group.subtotal * 0.15), estimatedDays: { min: 4, max: 7 }, isFree: false, weight: Math.round(group.weight), distanceLabel: '', shopId: group.id },
                  { provider: { _id: fallbackProviders[0], name: PROVIDER_LABELS[fallbackProviders[0]] || fallbackProviders[0], code: fallbackProviders[0].toUpperCase() }, serviceType: 'express', serviceName: 'Nhanh', fee: Math.round(group.subtotal * 0.2), estimatedDays: { min: 1, max: 3 }, isFree: false, weight: Math.round(group.weight), distanceLabel: '', shopId: group.id },
                );
              }

              console.log(`✅ Transformed fees cho Shop [${group.id}]:`, JSON.stringify(transformed, null, 2));

              shippingCache.current[cacheKey] = transformed;
              allShopFees[group.id] = transformed;
            } else {
              console.log(`❌ API failed cho Shop [${group.id}]:`, res.message);
              allShopFees[group.id] = [];
            }
          } catch (err) {
            console.error(`💥 Error gọi API cho Shop [${group.id}]:`, err);
            allShopFees[group.id] = [];
          }
      }));

      setShippingFeesByShop(allShopFees);

      // ── Bước 3: Trộn tất cả fees thành 1 list (thứ tự: economy rẻ nhất → express rẻ nhất) ──
      const flatFees = Object.values(allShopFees).flat();
      
      console.log('========================================');
      console.log('📋 TẤT CẢ PHÍ VẬN CHUYỂN (flatFees):', JSON.stringify(flatFees, null, 2));
      
      if (flatFees.length === 0) {
        console.log('⚠️ Không có phí vận chuyển nào!');
        return;
      }

      // Sắp xếp: economy trước, trong cùng tier thì fee thấp → cao
      flatFees.sort((a, b) => {
        if (a.serviceType === 'economy' && b.serviceType === 'express') return -1;
        if (a.serviceType === 'express' && b.serviceType === 'economy') return 1;
        return a.fee - b.fee;
      });

      console.log('📋 PHÍ SAU KHI SẮP XẾP (rẻ nhất → đắt nhất):');
      flatFees.forEach((fee, i) => {
        console.log(`   ${i + 1}. [${fee.serviceName}] ${fee.provider.name}: ${fee.fee.toLocaleString('vi-VN')}đ`);
      });
      console.log('========================================');

      setShippingFees(flatFees);

      // Auto-select cheapest provider per shop if none selected yet
      const currentSelection = shippingInfo.selectedShippingByShop || {};
      const shopIdsNeedingSelection = shopGroups
        .filter(g => !currentSelection[g.id])
        .map(g => g.id);

      if (shopIdsNeedingSelection.length > 0 && flatFees.length > 0) {
        const newSelection = { ...currentSelection };
        shopIdsNeedingSelection.forEach(shopId => {
          const shopFees = flatFees.filter(f => f.shopId === shopId);
          if (shopFees.length > 0) {
            const cheapest = shopFees[0]; // already sorted cheapest-first
            newSelection[shopId] = {
              code: cheapest.provider.code,
              serviceType: cheapest.serviceType,
            };
            console.log(`🎯 Auto-select cheapest for shop [${shopId}]: [${cheapest.serviceName}] ${cheapest.provider.name}: ${cheapest.fee.toLocaleString('vi-VN')}đ`);
          }
        });
        setShippingInfo(prev => ({
          ...prev,
          selectedShippingByShop: newSelection,
        }));
      }
    } catch (error) {
      console.error("💥 Error fetching shipping fees:", error);
    }
  };

  const selectAddress = (addr) => {
    setSelectedAddressId(addr._id);
    shippingCache.current = {}; // clear cache when address changes
    setShippingInfo((prev) => ({
      ...prev,
      address: addr.formattedAddress || addr.street || "",
      provinceCode: addr.provinceCode ? String(addr.provinceCode) : null,
      provinceName: addr.provinceName || "",
      wardName: addr.wardName || "",
      selectedShippingByShop: {},
    }));
    setShippingFees([]);
    setCustomerInfo((prev) => ({
      ...prev,
      fullName: addr.fullName || prev.fullName,
      phone: addr.phone || prev.phone,
    }));
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
    const shopIds = Object.keys(shippingFeesByShop);
    const missingShops = shopIds.filter(shopId => !shippingInfo.selectedShippingByShop?.[shopId]);
    if (missingShops.length > 0) {
      showToast("Vui lòng chọn phương thức vận chuyển cho tất cả các shop!", "warning");
      return;
    }
    setStep(3);
  };

  const handlePlaceOrder = async () => {
    try {
      // Validate address before submitting
      if (!shippingInfo.address || !shippingInfo.address.trim()) {
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
      const checkoutBuyNowQuantity = Math.max(1, Number(buyNowItem?.quantity) || 1);
      const checkoutBuyNowProduct = isBuyNow && buyNowProduct
        ? { productId: buyNowItem?.productId || buyNowProduct._id, quantity: checkoutBuyNowQuantity }
        : null;

      // selectedShippingByShop chứa { [shopId]: { code, serviceType } }
      if (paymentMethod === "PAYOS") {
        const payosData = {
          shippingAddress: {
            fullName: customerInfo.fullName,
            phone: customerInfo.phone,
            address: shippingInfo.address,
            provinceCode: shippingInfo.provinceCode,
            provinceName: shippingInfo.provinceName,
            wardName: shippingInfo.wardName,
            note: shippingInfo.note,
          },
          shippingProvider: shippingInfo.selectedShippingByShop,
          shippingServiceType: null,
          shippingFeesByShop: shopShippingFees,
          selectedProductIds: isBuyNow
            ? []
            : selectedCartProducts.map((item) => item.product._id || item.product),
          selectedProducts: isBuyNow
            ? []
            : selectedCartProducts.map((item) => ({
                productId: item.product._id || item.product,
                quantity: item.quantity,
              })),
          buyNowProduct: checkoutBuyNowProduct,
          couponCode: selectedProductCoupon?.code || null,
          selectedShippingCoupon: selectedShippingCoupon ? true : null,
        };

        const res = await createPayOSPaymentWithCartApi(payosData);
        if (res.success && res.data.checkoutUrl) {
          window.location.href = res.data.checkoutUrl;
        } else {
          showToast(res.message || "Không thể tạo thanh toán PayOS!", "error");
        }
      } else {
        const orderData = {
          shippingAddress: {
            fullName: customerInfo.fullName,
            phone: customerInfo.phone,
            address: shippingInfo.address,
            provinceCode: shippingInfo.provinceCode,
            provinceName: shippingInfo.provinceName,
            wardName: shippingInfo.wardName,
            note: shippingInfo.note,
          },
          paymentMethod,
          shippingProvider: shippingInfo.selectedShippingByShop,
          shippingServiceType: null,
          shippingFeesByShop: shopShippingFees,
          couponCode: selectedProductCoupon?.code || null,
          selectedShippingCoupon: selectedShippingCoupon ? true : null,
          selectedProductIds: isBuyNow
            ? []
            : selectedCartProducts.map((item) => item.product._id || item.product),
          selectedProducts: isBuyNow
            ? []
            : selectedCartProducts.map((item) => ({
                productId: item.product._id || item.product,
                quantity: item.quantity,
              })),
          buyNowProduct: checkoutBuyNowProduct,
        };

        const res = await createOrderApi(orderData);
        if (res.success) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#95520B] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#9E8E7E] text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  const selectedCartProducts =
    cart?.products?.filter(
      (item) =>
        selectedItemIds.has(item.product._id || item.product) &&
        item.shopIsActive !== false
    ) || [];

  const blockedSelectedProducts =
    cart?.products?.filter(
      (item) =>
        selectedItemIds.has(item.product._id || item.product) &&
        item.shopIsActive === false
    ) || [];

  const buyNowQuantity = Math.max(1, Number(buyNowItem?.quantity) || 1);

  const buyNowVirtualItem = buyNowProduct
    ? {
        product: buyNowProduct,
        quantity: buyNowQuantity,
        checkoutQuantity: buyNowQuantity,
        price: buyNowProduct.price,
        originalPrice: buyNowProduct.originalPrice || buyNowProduct.price,
        discount: buyNowProduct.discount || 0,
        name: buyNowProduct.name,
        image: buyNowProduct.image || "/placeholder.png",
        shopIsActive: true,
      }
    : null;

  const selectedCheckoutProducts = isBuyNow
    ? buyNowVirtualItem ? [buyNowVirtualItem] : []
    : selectedCartProducts.map((item) => ({ ...item, checkoutQuantity: item.quantity }));

  const selectedSubtotal = selectedCheckoutProducts.reduce(
    (sum, item) => sum + item.price * item.checkoutQuantity, 0
  );
  const selectedTotalQuantity = selectedCheckoutProducts.reduce(
    (sum, item) => sum + item.checkoutQuantity, 0
  );

  // shippingFees now contains items from ALL shops, each tagged with shopId
  // selectedShippingByShop: { [shopId]: { code, serviceType } }
  const shopShippingFees = Object.keys(shippingFeesByShop).reduce((map, shopId) => {
    const sel = shippingInfo.selectedShippingByShop?.[shopId];
    if (!sel) { map[shopId] = 0; return map; }
    const feeItem = shippingFeesByShop[shopId].find(
      (f) =>
        f.provider.code?.toLowerCase() === sel.code?.toLowerCase() &&
        f.serviceType === sel.serviceType
    );
    map[shopId] = feeItem?.fee || 0;
    return map;
  }, {});
  const shippingFee = Object.values(shopShippingFees).reduce((sum, f) => sum + f, 0);

  // ── Global computed values (must be after all useMemo / useRef) ──
  const totalProductCouponDiscount = Object.values(shopProductCoupons).reduce((sum, v) => sum + (v.discount || 0), 0) + productCouponDiscount;
  const totalBeforeShipping = selectedSubtotal - totalProductCouponDiscount;
  const effectiveShippingFee = selectedShippingCoupon ? 0 : shippingFee;
  const grandTotal = Math.max(0, totalBeforeShipping + effectiveShippingFee);

  // Tìm fee item đầu tiên đang được chọn (để hiển thị ở step 3)
  // Với per-shop shipping: lấy shop đầu tiên có selection
  const selectedProviderData = (() => {
    const shopIds = Object.keys(shippingInfo.selectedShippingByShop || {});
    if (shopIds.length === 0) return null;
    const firstShopId = shopIds[0];
    const sel = shippingInfo.selectedShippingByShop[firstShopId];
    return shippingFees.find(
      (f) =>
        f.shopId === firstShopId &&
        f.provider.code?.toLowerCase() === sel?.code?.toLowerCase() &&
        f.serviceType === sel?.serviceType
    );
  })();

  // Helper: get shopName from groupedCart by shopId
  const getShopName = (shopId) => {
    const shop = groupedCart.find(s => s.shopId === shopId);
    return shop?.shopName || "Cửa hàng";
  };

  // Helper: get selected shipping option label for a shop
  const getSelectedShippingLabel = (shopId) => {
    const sel = shippingInfo.selectedShippingByShop?.[shopId];
    if (!sel) return null;
    const shopFees = shippingFeesByShop[shopId] || [];
    const fee = shopFees.find(
      f => f.provider.code?.toLowerCase() === sel.code?.toLowerCase() && f.serviceType === sel.serviceType
    );
    if (!fee) return null;
    return `${fee.provider.name} – ${fee.serviceName} (${formatPrice(fee.fee)})`;
  };

  const modalShippingShopId = shippingModal.shopId;
  const modalShippingFees = modalShippingShopId ? (shippingFeesByShop[modalShippingShopId] || []) : [];
  const modalShippingSel = shippingInfo.selectedShippingByShop?.[modalShippingShopId];

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-28">
      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E0] px-4 sm:px-8 h-[58px] flex items-center justify-center">
        <h1 className="text-[15px] font-bold text-[#1C1108]">Checkout</h1>
      </div>

      {/* Step bar */}
      <StepsBar />

      {/* Main content */}
      <div className="max-w-[900px] mx-auto my-6 px-4 sm:px-6">
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">

            {/* STEP 1: Address */}
            {step === 1 && (
              <div className={cardClass}>
                <CardHdr title="Địa chỉ giao hàng" sub="Chọn hoặc thêm địa chỉ mới" />
                
                <div className="p-6">
                  <form onSubmit={handleStep1Submit} className="space-y-4">
                    {loadingAddresses ? (
                      <div className="flex items-center justify-center py-10 bg-[#FAF7F4] rounded-[10px]">
                        <div className="w-6 h-6 border-2 border-[#D5C9BC] border-t-[#95520B] rounded-full animate-spin mr-3" />
                        <span className="text-[13px] text-[#9E8E7E]">Đang tải địa chỉ...</span>
                      </div>
                    ) : addresses.length === 0 ? (
                      <div className="text-center py-10 bg-[#FAF7F4] rounded-[10px] border-2 border-dashed border-[#D5C9BC]">
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <svg className="w-7 h-7 text-[#9E8E7E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <p className="font-semibold text-[#1C1108] text-[14px] mb-1">Bạn chưa có địa chỉ nào</p>
                        <p className="text-[12.5px] text-[#9E8E7E] mb-4">Thêm địa chỉ giao hàng để tiếp tục</p>
                        <button type="button" onClick={() => navigate("/addresses")} className="px-5 py-2.5 bg-[#95520B] text-white text-[13px] font-semibold rounded-[8px] hover:opacity-90">
                          + Thêm địa chỉ mới
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {addresses.map((addr) => {
                          const isSelected = selectedAddressId === addr._id;
                          return (
                            <div
                              key={addr._id}
                              onClick={() => selectAddress(addr)}
                              className={`relative p-4 rounded-[10px] border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? "border-[#95520B] bg-[#fff8f0]"
                                  : "border-[#EDE8E0] bg-white hover:border-[#D5C9BC]"
                              }`}
                            >
                              {addr.isDefault && (
                                <span className="absolute top-3 right-3 px-2 py-0.5 bg-[#95520B] text-white text-[10px] font-bold rounded-full uppercase">Mặc định</span>
                              )}
                              <div className="flex items-start gap-3 pr-12">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                  isSelected ? "border-[#95520B] bg-[#95520B]" : "border-[#D5C9BC]"
                                }`}>
                                  {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-[14px] text-[#1C1108]">{addr.fullName}</p>
                                    <span className="text-[#9E8E7E]">·</span>
                                    <p className="text-[13px] text-[#6B5C4C]">{addr.phone}</p>
                                  </div>
                                  <p className="text-[13px] text-[#6B5C4C] mt-1">{formatAddress(addr)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Products summary (only in cart mode) */}
                    {!isBuyNow && cart && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[13px] font-bold text-[#1C1108]">
                            Sản phẩm đã chọn ({selectedItemIds.size})
                          </span>
                          <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-[12px] text-[#95520B] hover:underline font-medium"
                          >
                            {selectAll ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                          </button>
                        </div>

                        {selectedItemIds.size === 0 ? (
                          <div className="text-center py-6 bg-[#FAF7F4] rounded-[10px] border border-dashed border-[#D5C9BC]">
                            <p className="text-[13px] text-[#9E8E7E] mb-2">Chưa chọn sản phẩm nào</p>
                            <button
                              type="button"
                              onClick={() => navigate("/cart")}
                              className="text-[12px] text-[#95520B] hover:underline font-medium"
                            >
                              ← Quay lại giỏ hàng để chọn
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {groupedCart.map((shop) => {
                              const shopItemIds = shop.items.map(item => item.product._id || item.product);
                              const shopAllSelected = shopItemIds.every(id => selectedItemIds.has(id));
                              const shopPartialSelected = shopItemIds.some(id => selectedItemIds.has(id)) && !shopAllSelected;
                              const shopSubtotal = shop.items
                                .filter(item => selectedItemIds.has(item.product._id || item.product))
                                .reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

                              return (
                                <div key={shop.shopId} className="border border-[#EDE8E0] rounded-[10px] overflow-hidden">
                                  {/* Shop header */}
                                  <div className="bg-[#FAF7F4] px-4 py-2.5 border-b border-[#EDE8E0]">
                                    <div className="flex items-center gap-2.5">
                                      {/* Shop select checkbox */}
                                      <label
                                        onClick={(e) => { e.stopPropagation(); handleSelectShop(shop.shopId); }}
                                        className="cursor-pointer flex items-center gap-2 flex-1"
                                      >
                                        <div className="relative">
                                          <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all ${
                                            shopAllSelected
                                              ? 'bg-[#B86B05] border-[#B86B05]'
                                              : shopPartialSelected
                                              ? 'bg-[#B86B05] border-[#B86B05]'
                                              : 'border-[#D5C9BC] bg-white'
                                          }`}>
                                            {shopAllSelected && (
                                              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-2.5 h-2.5">
                                                <path d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                            {shopPartialSelected && (
                                              <div className="w-2 h-0.5 bg-white rounded-full" />
                                            )}
                                          </div>
                                        </div>
                                        {shop.shopAvatar ? (
                                          <img src={shop.shopAvatar} alt={shop.shopName} className="w-5 h-5 rounded-full object-cover" />
                                        ) : (
                                          <div className="w-5 h-5 rounded-full bg-[#D5C9BC] flex items-center justify-center">
                                            <span className="text-[8px] font-bold text-[#6B5C4C]">
                                              {shop.shopName.charAt(0).toUpperCase()}
                                            </span>
                                          </div>
                                        )}
                                        <span className="text-[12.5px] font-semibold text-[#1C1108]">{shop.shopName}</span>
                                        {shopPartialSelected && (
                                          <span className="text-[11px] text-[#9E8E7E]">({shopItemIds.filter(id => selectedItemIds.has(id)).length}/{shopItemIds.length})</span>
                                        )}
                                      </label>
                                      <span className="text-[11.5px] text-[#9E8E7E] ml-auto">{formatPrice(shopSubtotal)}</span>
                                    </div>
                                  </div>

                                  {/* Products in this shop */}
                                  {shop.items.map((item) => {
                                    const itemId = item.product._id || item.product;
                                    const isSelected = selectedItemIds.has(itemId);
                                    if (!isSelected) return null;
                                    return (
                                      <div key={itemId} className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#EDE8E0] last:border-b-0">
                                        <label
                                          onClick={(e) => { e.stopPropagation(); handleToggleItem(itemId); }}
                                          className="cursor-pointer shrink-0"
                                        >
                                          <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all ${
                                            isSelected ? 'bg-[#B86B05] border-[#B86B05]' : 'border-[#D5C9BC] bg-white'
                                          }`}>
                                            {isSelected && (
                                              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-2.5 h-2.5">
                                                <path d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </div>
                                        </label>
                                        <img
                                          src={item.product?.images?.[0] || item.image || "/placeholder.png"}
                                          alt={item.product?.name || item.name}
                                          className="w-12 h-12 object-cover rounded-[8px] shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[12.5px] font-medium text-[#1C1108] line-clamp-1">
                                            {item.product?.name || item.name}
                                          </p>
                                          {item.variant && (
                                            <p className="text-[11px] text-[#A8896A] mt-0.5">Phân loại: {item.variant}</p>
                                          )}
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[12px] font-semibold text-[#95520B]">{formatPrice(item.price)}</span>
                                            <span className="text-[11px] text-[#9E8E7E]">×{item.quantity}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}

                            {selectedItemIds.size > 0 && (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => navigate("/cart")}
                                  className="text-[12px] text-[#95520B] hover:underline font-medium"
                                >
                                  Chỉnh sửa giỏ hàng →
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* BuyNow product summary */}
                    {isBuyNow && buyNowProduct && (
                      <div className="mt-4">
                        <span className="text-[13px] font-bold text-[#1C1108] mb-2 block">Sản phẩm</span>
                        <div className="flex items-center gap-3 p-3 bg-[#FAF7F4] rounded-[10px] border border-[#EDE8E0]">
                          <img
                            src={buyNowProduct.image || "/placeholder.png"}
                            alt={buyNowProduct.name}
                            className="w-14 h-14 object-cover rounded-[8px] shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-semibold text-[#1C1108] line-clamp-1">{buyNowProduct.name}</p>
                            <p className="text-[11.5px] text-[#9E8E7E] mt-0.5">Shop: {buyNowProduct.shopName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[13px] font-bold text-[#95520B]">{formatPrice(buyNowProduct.price)}</span>
                              <span className="text-[11px] text-[#9E8E7E]">×{buyNowQuantity}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <BtnGhost onClick={() => navigate(isBuyNow ? `/product/${buyNowProduct?._id}` : "/cart")}>← Quay lại</BtnGhost>
                      <BtnPrimary onClick={handleStep1Submit} type="button" disabled={!selectedAddressId || selectedItemIds.size === 0} className="flex-1">Tiếp tục →</BtnPrimary>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* STEP 2: Shopee-style blocks */}
            {step === 2 && (
              <div className="space-y-4">

                {/* Address card */}
                <div className={cardClass}>
                  <div className="px-5 py-4 border-b border-[#EDE8E0] flex items-center justify-between bg-gradient-to-br from-[#3a1d06] to-[#7B440C] text-white">
                    <div>
                      <h2 className="text-[14px] font-extrabold">Địa chỉ giao hàng</h2>
                      <p className="text-[11.5px] opacity-80 mt-0.5">Xác nhận địa chỉ nhận hàng</p>
                    </div>
                    <button onClick={() => setStep(1)} className="text-[12px] font-medium text-white/80 hover:text-white border border-white/40 px-3 py-1 rounded-[6px] transition-colors">Thay đổi</button>
                  </div>
                  <div className="p-5">
                    {addresses.find(a => a._id === selectedAddressId) ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-[14px] text-[#1C1108]">{customerInfo.fullName}</span>
                          <span className="text-[#9E8E7E]">·</span>
                          <span className="text-[13px] text-[#6B5C4C]">{customerInfo.phone}</span>
                        </div>
                        <p className="text-[12.5px] text-[#6B5C4C]">{shippingInfo.address}, {shippingInfo.wardName}, {shippingInfo.provinceName}</p>
                      </div>
                    ) : (
                      <button onClick={() => setStep(1)} className="text-[13px] text-[#95520B] font-medium hover:underline">+ Thêm địa chỉ giao hàng</button>
                    )}
                  </div>
                </div>

                {/* ── Per-shop blocks (Shopee style) ── */}
                {groupedCart.map((shop) => {
                  const shopId = shop.shopId;
                  const shopItems = shop.items.filter(item =>
                    selectedItemIds.has(item.product._id || item.product) && item.shopIsActive !== false
                  );
                  if (shopItems.length === 0) return null;

                  const shopSel = shippingInfo.selectedShippingByShop?.[shopId];
                  const shopFees = shippingFeesByShop[shopId] || [];
                  const selectedFee = shopSel
                    ? shopFees.find(f => f.provider.code?.toLowerCase() === shopSel.code?.toLowerCase() && f.serviceType === shopSel.serviceType)
                    : null;

                  const shopProductSubtotal = shopItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
                  const shopShippingFee = selectedFee?.fee || 0;
                  const shopCouponData = shopProductCoupons[shopId];
                  const shopDiscount = shopCouponData?.discount || 0;
                  const shopTotal = Math.max(0, shopProductSubtotal + shopShippingFee - shopDiscount);

                  return (
                    <div key={shopId} className={cardClass}>
                      {/* Shop header */}
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

                      {/* Products */}
                      <div className="divide-y divide-[#EDE8E0]">
                        {shopItems.map((item) => (
                          <div key={item.product._id || item.product} className="flex gap-3 p-4">
                            <img
                              src={item.product?.images?.[0] || item.image || "/placeholder.png"}
                              alt={item.product?.name || item.name}
                              className="w-16 h-16 object-cover rounded-[8px] shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-[#1C1108] line-clamp-2">{item.product?.name || item.name}</p>
                              {item.variant && (
                                <p className="text-[11.5px] text-[#A8896A] mt-0.5">Phân loại: {item.variant}</p>
                              )}
                              <div className="flex items-center justify-between mt-1.5">
                                <span className="text-[13px] font-bold text-[#95520B]">{formatPrice(item.price)}</span>
                                <span className="text-[12px] text-[#9E8E7E]">×{item.quantity}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Message */}
                      <div className="px-4 py-3 border-t border-[#EDE8E0]">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#9E8E7E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <input
                            type="text"
                            value={shopNotes[shopId] || ""}
                            onChange={(e) => setShopNotes(prev => ({ ...prev, [shopId]: e.target.value }))}
                            className="flex-1 text-[12.5px] text-[#6B5C4C] placeholder-[#9E8E7E] focus:outline-none bg-transparent"
                            placeholder="Lời nhắn cho shop..."
                          />
                        </div>
                      </div>

                      {/* Shipping method */}
                      <div className="px-4 py-3 border-t border-[#EDE8E0] flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[12.5px] text-[#6B5C4C]">
                          <svg className="w-4 h-4 text-[#9E8E7E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          <span>Giao hàng</span>
                        </div>
                        <button
                          onClick={() => openShippingModal(shopId)}
                          className="text-[12.5px] font-semibold text-[#95520B] hover:underline flex items-center gap-1"
                        >
                          {!shopSel ? (
                            <span className="text-red-500">Chọn phương thức giao hàng</span>
                          ) : (
                            <>
                              <span>{selectedFee?.provider.name} – {selectedFee?.serviceName}</span>
                              <span className="font-bold">{formatPrice(selectedFee?.fee || 0)}</span>
                            </>
                          )}
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      {/* Voucher */}
                      <div className="px-4 py-3 border-t border-[#EDE8E0] flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[12.5px] text-[#6B5C4C]">
                          <svg className="w-4 h-4 text-[#9E8E7E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span>Voucher của shop</span>
                        </div>
                        {shopCouponData ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-[#16a34a]">{shopCouponData.coupon.code} · -{formatPrice(shopDiscount)}</span>
                            <button onClick={() => handleRemoveShopProductCoupon(shopId)} className="text-[#9E8E7E] hover:text-red-500">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => openShopVoucherModal(shopId)} className="text-[12.5px] font-semibold text-[#95520B] hover:underline flex items-center gap-1">
                            Chọn voucher shop
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        )}
                      </div>

                      {/* Shop total */}
                      <div className="px-4 py-3 border-t border-[#EDE8E0] flex items-center justify-end gap-3 bg-[#FAF7F4]">
                        <span className="text-[12px] text-[#6B5C4C]">Tổng số tiền:</span>
                        <span className="text-[15px] font-extrabold text-[#95520B]">{formatPrice(shopTotal)}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Global Shopee voucher */}
                <div className={cardClass}>
                  <div className="px-5 py-4 border-b border-[#EDE8E0] bg-[#FAF7F4]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#95520B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span className="text-[13px] font-bold text-[#1C1108]">Mã giảm giá Furni</span>
                      </div>
                      <button onClick={() => setShowProductVoucherModal(true)} className="text-[12px] text-[#95520B] font-medium hover:underline">
                        {selectedProductCoupon || selectedShippingCoupon ? "Thay đổi" : "Chọn voucher"}
                      </button>
                    </div>

                    {(selectedProductCoupon || selectedShippingCoupon) && (
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-[#95520B] rounded-lg flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          {selectedProductCoupon && (
                            <div>
                              <p className="font-bold text-[12px] text-[#95520B]">{selectedProductCoupon.code}</p>
                              <p className="text-[11px] text-[#6B5C4C]">Giảm {formatPrice(productCouponDiscount)}</p>
                            </div>
                          )}
                          {selectedShippingCoupon && (
                            <div>
                              <p className="font-bold text-[12px] text-blue-600">{selectedShippingCoupon.code}</p>
                              <p className="text-[11px] text-blue-500">Miễn phí vận chuyển</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {(selectedProductCoupon || selectedShippingCoupon) && (
                            <button
                              onClick={selectedShippingCoupon ? handleRemoveShippingCoupon : handleRemoveProductCoupon}
                              className="text-[#9E8E7E] hover:text-red-500"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Note */}
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#9E8E7E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <input
                        type="text"
                        value={shippingInfo.note}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, note: e.target.value }))}
                        className="flex-1 text-[12.5px] text-[#6B5C4C] placeholder-[#9E8E7E] focus:outline-none bg-transparent"
                        placeholder="Lưu ý cho đơn hàng..."
                      />
                    </div>
                  </div>
                </div>

                {/* Payment method */}
                <div className={cardClass}>
                  <div className="px-5 py-4 border-b border-[#EDE8E0] bg-[#FAF7F4]">
                    <h2 className="text-[14px] font-extrabold text-[#1C1108]">Phương thức thanh toán</h2>
                  </div>
                  <div className="p-4 space-y-2.5">
                    <div
                      onClick={() => setPaymentMethod("COD")}
                      className={`flex items-center gap-3 p-3.5 rounded-[10px] border-2 cursor-pointer transition-all ${
                        paymentMethod === "COD" ? "border-[#95520B] bg-[#fff8f0]" : "border-[#EDE8E0] bg-white hover:border-[#D5C9BC]"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === "COD" ? "border-[#95520B] bg-[#95520B]" : "border-[#D5C9BC]"}`}>
                        {paymentMethod === "COD" && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[13px] text-[#1C1108]">Thanh toán khi nhận hàng (COD)</p>
                        <p className="text-[11.5px] text-[#9E8E7E]">Trả tiền mặt khi nhận được hàng</p>
                      </div>
                    </div>

                    <div
                      onClick={() => setPaymentMethod("PAYOS")}
                      className={`flex items-center gap-3 p-3.5 rounded-[10px] border-2 cursor-pointer transition-all ${
                        paymentMethod === "PAYOS" ? "border-[#95520B] bg-[#fff8f0]" : "border-[#EDE8E0] bg-white hover:border-[#D5C9BC]"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === "PAYOS" ? "border-[#95520B] bg-[#95520B]" : "border-[#D5C9BC]"}`}>
                        {paymentMethod === "PAYOS" && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[13px] text-[#1C1108]">Thanh toán online qua PayOS</p>
                        <p className="text-[11.5px] text-[#9E8E7E]">Ví điện tử, Ngân hàng, QR Code</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <BtnGhost onClick={() => setStep(1)}>← Quay lại</BtnGhost>
                  <BtnPrimary
                    onClick={handleStep2Submit}
                    type="button"
                    disabled={Object.keys(shippingFeesByShop).some(shopId => !shippingInfo.selectedShippingByShop?.[shopId])}
                    className="flex-1"
                  >
                    Tiếp tục →
                  </BtnPrimary>
                </div>
              </div>
            )}

            {/* STEP 3: Confirm */}
            {step === 3 && (
              <div className={cardClass}>
                <CardHdr title="Xác nhận đơn hàng" sub="Kiểm tra kỹ thông tin trước khi đặt" />

                <div className="p-6 space-y-4">
                  {/* Address summary */}
                  <div className="bg-[#FAF7F4] rounded-[10px] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[13px] font-bold text-[#1C1108]">Người nhận</h4>
                      <button type="button" onClick={() => setStep(1)} className="text-[12px] text-[#95520B] hover:underline">Đổi</button>
                    </div>
                    <p className="font-semibold text-[13px] text-[#1C1108]">{customerInfo.fullName}</p>
                    <p className="text-[12.5px] text-[#6B5C4C]">{customerInfo.phone}</p>
                    <p className="text-[12.5px] text-[#6B5C4C] mt-1">{shippingInfo.address}, {shippingInfo.wardName}, {shippingInfo.provinceName}</p>
                  </div>

                  {/* Shipping summary — per shop */}
                  <div className="bg-[#FAF7F4] rounded-[10px] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[13px] font-bold text-[#1C1108]">Vận chuyển</h4>
                      <button type="button" onClick={() => setStep(2)} className="text-[12px] text-[#95520B] hover:underline">Đổi</button>
                    </div>
                    <div className="space-y-2">
                      {Object.keys(shippingFeesByShop).map((shopId) => {
                        const shopName = getShopName(shopId);
                        const label = getSelectedShippingLabel(shopId);
                        const fee = selectedShippingCoupon ? 0 : (shopShippingFees[shopId] || 0);
                        return (
                          <div key={shopId} className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-[12.5px] font-semibold text-[#6B5C4C]">{shopName}</p>
                              {label && <p className="text-[12px] text-[#1C1108]">{label}</p>}
                            </div>
                            <p className="text-[12.5px] font-bold text-[#95520B] shrink-0 ml-2">
                              {selectedShippingCoupon ? <span className="text-green-600">Miễn phí</span> : formatPrice(fee)}
                            </p>
                          </div>
                        );
                      })}
                      {/* Tổng phí vận chuyển */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#D5C9BC]">
                        <span className="text-[12.5px] font-bold text-[#1C1108]">Tổng vận chuyển</span>
                        <span className="text-[12.5px] font-bold text-[#95520B]">
                          {effectiveShippingFee === 0 ? <span className="text-green-600">Miễn phí</span> : formatPrice(effectiveShippingFee)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Products */}
                  <div className="bg-[#FAF7F4] rounded-[10px] p-4">
                    <h4 className="text-[13px] font-bold text-[#1C1108] mb-3">Sản phẩm ({selectedTotalQuantity})</h4>
                    <div className="space-y-3">
                      {selectedCheckoutProducts.map((item) => (
                        <div key={item.product._id || item.product} className="flex gap-3 bg-white rounded-[8px] p-2.5">
                          <img src={item.image || "/placeholder.png"} alt={item.name} className="w-14 h-14 object-cover rounded-[8px]" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#1C1108] line-clamp-1">{item.name}</p>
                            {item.variant && (
                                <p className="text-[11px] text-[#A8896A] mt-0.5">Phân loại: {item.variant}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.originalPrice && item.price < item.originalPrice ? (
                                <>
                                  <span className="text-[12px] font-bold text-[#95520B]">{formatPrice(item.price)}</span>
                                  <span className="text-[11px] text-[#9E8E7E] line-through">{formatPrice(item.originalPrice)}</span>
                                </>
                              ) : (
                                <span className="text-[12px] font-semibold text-[#95520B]">{formatPrice(item.price)}</span>
                              )}
                              <span className="text-[11px] text-[#9E8E7E] ml-auto">×{item.checkoutQuantity}</span>
                            </div>
                          </div>
                          <p className="font-bold text-[13px] text-[#1C1108]">{formatPrice(item.price * item.checkoutQuantity)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment summary */}
                  <div className="bg-[#FAF7F4] rounded-[10px] p-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[12.5px]">
                        <span className="text-[#6B5C4C]">Tạm tính</span>
                        <span className="font-medium text-[#1C1108]">{formatPrice(selectedSubtotal)}</span>
                      </div>
                      {totalProductCouponDiscount > 0 && (
                        <div className="flex justify-between text-[12.5px] text-green-600">
                          <span>Giảm giá voucher</span>
                          <span className="font-medium">-{formatPrice(totalProductCouponDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[12.5px]">
                        <span className="text-[#6B5C4C]">Phí vận chuyển</span>
                        <span className="font-medium text-[#1C1108]">
                          {effectiveShippingFee === 0 ? <span className="text-green-600">Miễn phí</span> : formatPrice(effectiveShippingFee)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-[#D5C9BC]">
                        <span className="text-[13px] font-bold text-[#1C1108]">Tổng thanh toán</span>
                        <span className="text-[15px] font-extrabold text-[#95520B]">{formatPrice(grandTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <BtnGhost onClick={() => setStep(2)}>← Quay lại</BtnGhost>
                    <BtnPrimary
                      onClick={handlePlaceOrder}
                      disabled={submitting || selectedCheckoutProducts.length === 0}
                      className="flex-1"
                    >
                      {submitting ? "Đang xử lý..." : paymentMethod === "PAYOS" ? "💳 Thanh toán PayOS" : "✓ Đặt hàng ngay"}
                    </BtnPrimary>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Order summary */}
          <div className="lg:col-span-1">
            <div className={`${cardClass} p-5 sticky top-6`}>
              <h3 className="text-[15px] font-bold text-[#1C1108] mb-4">Tóm tắt đơn hàng</h3>

              <div className="space-y-2 mb-4">
                {selectedCheckoutProducts.slice(0, 3).map((item) => (
                  <div key={item.product._id || item.product} className="flex gap-2 items-center">
                    <img src={item.image || "/placeholder.png"} alt={item.name} className="w-10 h-10 object-cover rounded-[6px]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#1C1108] line-clamp-1">{item.name}</p>
                        {item.variant && (
                          <p className="text-[10px] text-[#9E8E7E]">Phân loại: {item.variant}</p>
                        )}
                        <p className="text-[10.5px] text-[#9E8E7E]">×{item.checkoutQuantity}</p>
                      </div>
                  </div>
                ))}
                {selectedCheckoutProducts.length > 3 && (
                  <p className="text-[11.5px] text-[#9E8E7E] text-center py-1">+{selectedCheckoutProducts.length - 3} sản phẩm khác</p>
                )}
              </div>

              <div className="space-y-2.5 text-[13px] border-t border-[#EDE8E0] pt-4">
                <div className="flex justify-between">
                  <span className="text-[#6B5C4C]">Tạm tính</span>
                  <span className="font-semibold text-[#1C1108]">{formatPrice(selectedSubtotal)}</span>
                </div>

                {productCouponDiscount > 0 && (
                  <div className="flex justify-between text-[#16a34a]">
                    <span>Giảm giá</span>
                    <span className="font-semibold">-{formatPrice(productCouponDiscount)}</span>
                  </div>
                )}

                {selectedShippingCoupon && (
                  <div className="flex justify-between text-blue-600">
                    <span>Miễn phí ship</span>
                    <span className="font-semibold">-{formatPrice(shippingFee)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-[#6B5C4C]">Phí vận chuyển</span>
                  <span className="font-semibold text-[#1C1108]">
                    {effectiveShippingFee === 0 ? (
                      <span className="text-[#16a34a]">Miễn phí</span>
                    ) : formatPrice(effectiveShippingFee)}
                  </span>
                </div>

                <div className="border-t border-[#EDE8E0] pt-3 flex justify-between items-center">
                  <span className="font-bold text-[#1C1108]">Tổng thanh toán</span>
                  <span className="font-extrabold text-[18px] text-[#95520B]">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#EDE8E0]">
                <div className="flex items-center gap-2 text-[11.5px] text-[#9E8E7E] bg-[#dcfce7] rounded-[8px] p-3">
                  <svg className="w-4 h-4 text-[#16a34a] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Thanh toán an toàn & bảo mật</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping method modal */}
      {shippingModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeShippingModal} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-[16px] sm:rounded-[16px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE8E0]">
              <h3 className="text-[15px] font-bold text-[#1C1108]">Chọn phương thức vận chuyển</h3>
              <button onClick={closeShippingModal} className="text-[#9E8E7E] hover:text-[#1C1108]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {modalShippingFees.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-[#D5C9BC] border-t-[#95520B] rounded-full animate-spin mr-2.5" />
                  <span className="text-[13px] text-[#9E8E7E]">Đang tải...</span>
                </div>
              ) : (
                modalShippingFees.map((fee) => {
                  const isSelected =
                    modalShippingSel?.code?.toLowerCase() === fee.provider.code?.toLowerCase() &&
                    modalShippingSel?.serviceType === fee.serviceType;
                  return (
                    <div
                      key={`${fee.provider.code}-${fee.serviceType}`}
                      onClick={() => {
                        setShippingInfo(prev => ({
                          ...prev,
                          selectedShippingByShop: {
                            ...prev.selectedShippingByShop,
                            [modalShippingShopId]: { code: fee.provider.code, serviceType: fee.serviceType },
                          },
                        }));
                        closeShippingModal();
                      }}
                      className={`flex items-center gap-3 p-4 rounded-[10px] border-2 cursor-pointer transition-all ${
                        isSelected ? "border-[#95520B] bg-[#fff8f0]" : "border-[#EDE8E0] bg-white hover:border-[#D5C9BC]"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "border-[#95520B] bg-[#95520B]" : "border-[#D5C9BC]"
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[13px] text-[#1C1108]">{fee.serviceName}</span>
                            {fee.distanceLabel && (
                              <span className="px-2 py-0.5 bg-[#FAF7F4] text-[#6B5C4C] text-[11px] font-medium rounded-full">{fee.distanceLabel}</span>
                            )}
                          </div>
                          <span className="font-bold text-[15px] text-[#95520B]">{formatPrice(fee.fee)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11.5px] text-[#9E8E7E]">{fee.provider.name}</span>
                          <span className="text-[11px] text-[#D5C9BC]">·</span>
                          <span className="text-[11.5px] text-[#9E8E7E]">Giao {fee.estimatedDays?.min}–{fee.estimatedDays?.max} ngày</span>
                          {fee.weight > 0 && (
                            <>
                              <span className="text-[11px] text-[#D5C9BC]">·</span>
                              <span className="text-[11.5px] text-[#9E8E7E]">{fee.weight} kg</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shop voucher modal */}
      {shopVoucherModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeShopVoucherModal} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-[16px] sm:rounded-[16px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE8E0]">
              <h3 className="text-[15px] font-bold text-[#1C1108]">Voucher của shop</h3>
              <button onClick={closeShopVoucherModal} className="text-[#9E8E7E] hover:text-[#1C1108]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {availableVouchers.filter(v => {
                const shopId = shopVoucherModal.shopId;
                return !v.isUsed && !v.isExpired && v.discountType !== 'freeship' && (String(v.shopId || '') === String(shopId) || !v.shopId);
              }).length === 0 ? (
                <p className="text-center text-[13px] text-[#9E8E7E] py-6">Không có voucher nào cho shop này</p>
              ) : (
                availableVouchers
                  .filter(v => {
                    const shopId = shopVoucherModal.shopId;
                    return !v.isUsed && !v.isExpired && v.discountType !== 'freeship' && (String(v.shopId || '') === String(shopId) || !v.shopId);
                  })
                  .map(v => (
                    <div
                      key={v._id || v.code}
                      onClick={() => handleSelectShopProductVoucher(v, shopVoucherModal.shopId)}
                      className="flex items-center gap-3 p-4 rounded-[10px] border-2 border-[#EDE8E0] bg-white hover:border-[#95520B] cursor-pointer transition-all"
                    >
                      <div className="w-10 h-10 bg-[#95520B] rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-white font-extrabold text-[13px]">%</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[13px] text-[#1C1108]">{v.code}</p>
                        <p className="text-[11.5px] text-[#6B5C4C]">
                          {v.discountType === 'percent' ? `Giảm ${v.value}%` : `Giảm ${formatPrice(v.value)}`}
                          {v.minOrderValue ? ` • Đơn từ ${formatPrice(v.minOrderValue)}` : ''}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSave={handleAddNewAddress}
      />

      <VoucherModal
        isOpen={showProductVoucherModal}
        onClose={() => setShowProductVoucherModal(false)}
        availableVouchers={availableVouchers}
        selectedVoucher={selectedProductCoupon || selectedShippingCoupon}
        onSelectVoucher={(voucher) => {
          if (voucher.discountType === 'freeship') {
            handleSelectShippingVoucher(voucher);
          } else {
            handleSelectProductVoucher(voucher);
          }
        }}
      />
    </div>
  );
};

export default CheckoutPage;
