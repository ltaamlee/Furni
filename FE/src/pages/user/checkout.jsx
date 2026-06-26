import { useState, useEffect, useContext, useRef } from "react";
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
  bgLight: "#FAF7F4",
  bgCard: "#FFFFFF",
  success: "#16a34a",
  successBg: "#dcfce7",
  error: "#dc2626",
  errorBg: "#fef2f2",
  warning: "#d97706",
  warningBg: "#fffbeb",
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
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [buyNowItem, setBuyNowItem] = useState(null);
  const [buyNowProduct, setBuyNowProduct] = useState(null);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const shippingDebounceRef = useRef(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [shopShippingConfig, setShopShippingConfig] = useState(null); // { enabledProviders, freeShippingThreshold }

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
    selectedProvider: null,
  });

  const [paymentMethod, setPaymentMethod] = useState("COD");

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

        const all = res.data || [];
        setAvailableVouchers(all);

        const usable = all.filter(v =>
          !v.isUsed && !v.isExpired && (!v.minOrderValue || orderTotal >= v.minOrderValue)
        );

        const productVouchers = usable.filter(v => v.discountType !== 'freeship');
        const shippingVouchers = usable.filter(v => v.discountType === 'freeship');

        const autoSelect = (list) => {
          if (list.length === 0) return null;
          return list.reduce((best, v) => {
            const eff = v.discountType === 'percent'
              ? Math.min(orderTotal * v.value / 100, v.maxDiscount || Infinity)
              : v.value;
            const bestEff = best.discountType === 'percent'
              ? Math.min(orderTotal * best.value / 100, best.maxDiscount || Infinity)
              : best.value;
            return eff > bestEff ? v : best;
          }, list[0]);
        };

        const bestProduct = autoSelect(productVouchers);
        const bestShipping = autoSelect(shippingVouchers);

        if (bestProduct) {
          const eff = bestProduct.discountType === 'percent'
            ? Math.min(orderTotal * bestProduct.value / 100, bestProduct.maxDiscount || Infinity)
            : bestProduct.value;
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
      const res = await validateVoucherApi({ code: voucher.code, orderTotal });
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

  const shippingCache = useRef({});

  const fetchShippingFees = async () => {
    if (!shippingInfo.provinceCode) return;
    if (isBuyNow && !buyNowProduct) return;
    try {
      const selectedOrderTotal = isBuyNow
        ? (buyNowProduct?.price || 0) * (buyNowItem?.quantity || 1)
        : (cart?.products || [])
            .filter((item) => selectedItemIds.has(item.product._id || item.product))
            .reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

      if (selectedOrderTotal === 0) return;

      // Determine shopId
      let shopId = null;
      if (isBuyNow && buyNowProduct) {
        shopId = buyNowProduct.shop;
      } else if (cart?.products?.length > 0) {
        const firstSelectedItem = cart.products.find((p) => selectedItemIds.has(p.product._id || p.product));
        if (firstSelectedItem) shopId = firstSelectedItem.shop?._id || firstSelectedItem.shop;
      }

      // Fetch shop's shipping config once per shopId
      let enabledProviders = null;
      if (shopId) {
        try {
          const configRes = await getShopShippingConfigApi(shopId);
          if (configRes.success) {
            enabledProviders = configRes.data.shippingConfig?.enabledProviders || null;
            const shopThreshold = configRes.data.shippingConfig?.freeShippingThreshold;
            // Override FREE_THRESHOLD with shop's setting if set
            if (shopThreshold !== undefined && shopThreshold !== null) {
              if (selectedOrderTotal >= shopThreshold) {
                const freeFees = [
                  { provider: { _id: 'default', name: 'Giao Hàng Tiết Kiệm', code: 'GHTK' }, serviceType: 'economy', serviceName: 'Miễn Phí', fee: 0, estimatedDays: { min: 3, max: 5 }, isFree: true, weight: 0 },
                  { provider: { _id: 'default2', name: 'J&T Express', code: 'JT' }, serviceType: 'express', serviceName: 'Nhanh', fee: 0, estimatedDays: { min: 1, max: 2 }, isFree: true, weight: 0 },
                ];
                setShippingFees(freeFees);
                return;
              }
            }
          }
        } catch (_) { /* shop might not have config yet, fall through */ }
      }

      // Use shop's freeShippingThreshold or default 500k
      const FREE_THRESHOLD = 500000;
      if (selectedOrderTotal >= FREE_THRESHOLD) {
        const freeFees = [
          { provider: { _id: 'default', name: 'Giao Hàng Tiết Kiệm', code: 'GHTK' }, serviceType: 'economy', serviceName: 'Miễn Phí', fee: 0, estimatedDays: { min: 3, max: 5 }, isFree: true, weight: 0 },
          { provider: { _id: 'default2', name: 'J&T Express', code: 'JT' }, serviceType: 'express', serviceName: 'Nhanh', fee: 0, estimatedDays: { min: 1, max: 2 }, isFree: true, weight: 0 },
        ];
        setShippingFees(freeFees);
        return;
      }

      let totalWeight = 0;
      if (isBuyNow && buyNowProduct) {
        totalWeight = (buyNowProduct.weight || 0) * (buyNowItem?.quantity || 1);
      } else if (cart?.products?.length > 0) {
        totalWeight = cart.products.reduce((sum, item) => {
          if (!selectedItemIds.has(item.product._id || item.product)) return sum;
          return sum + (item.product?.weight || 0) * (item.quantity || 1);
        }, 0);
      }

      const weightBucket = Math.round(totalWeight / 500) * 500;
      const cacheKey = `${shippingInfo.provinceCode}_${weightBucket}_${selectedOrderTotal}_${shopId || 'all'}`;
      if (shippingCache.current[cacheKey]) {
        setShippingFees(shippingCache.current[cacheKey]);
        return;
      }

      // Gọi API tính phí ship - sử dụng calculate-tiers để filter theo enabledProviders của shop
      const res = await calculateShippingTiersApi({
        provinceCode: shippingInfo.provinceCode,
        orderTotal: selectedOrderTotal,
        weight: Math.round(totalWeight),
        enabledProviders: enabledProviders ? enabledProviders.join(',') : null,
      });

      if (res.success) {
        // Backend trả về res.data.tiers, transform để match frontend format
        const rawTiers = res.data.tiers || [];
        
        const transformedFees = rawTiers.map((fee) => ({
          provider: {
            _id: fee.provider,
            name: fee.providerName || PROVIDER_LABELS[fee.provider] || fee.provider,
            code: fee.provider?.toUpperCase() || fee.provider,
          },
          serviceType: fee.tier === 'economy' ? 'economy' : 'express',
          serviceName: fee.tier === 'economy' ? 'Tiết kiệm' : 'Nhanh',
          fee: fee.fee,
          estimatedDays: fee.estimatedDays || { min: 2, max: 5 },
          isFree: fee.isFree || fee.fee === 0,
          weight: Math.round(totalWeight),
        }));
        
        // Nếu không có tiers, tạo fallback dựa trên enabledProviders
        if (transformedFees.length === 0) {
          const defaultProviders = enabledProviders && enabledProviders.length > 0
            ? enabledProviders
            : ['ghtk', 'jt'];
          const fallbackFees = defaultProviders.map((p, idx) => ({
            provider: { _id: p, name: PROVIDER_LABELS[p] || p, code: p.toUpperCase() },
            serviceType: idx === 0 ? 'economy' : 'express',
            serviceName: idx === 0 ? 'Tiết kiệm' : 'Nhanh',
            fee: Math.round(selectedOrderTotal * (idx === 0 ? 0.15 : 0.2)),
            estimatedDays: idx === 0 ? { min: 4, max: 7 } : { min: 1, max: 3 },
            isFree: false,
            weight: Math.round(totalWeight),
          }));
          shippingCache.current[cacheKey] = fallbackFees;
          setShippingFees(fallbackFees);
          return;
        }
        
        shippingCache.current[cacheKey] = transformedFees;
        setShippingFees(transformedFees);
      }
    } catch (error) {
      console.error("Error fetching shipping fees:", error);
    }
  };

  const selectAddress = (addr) => {
    setSelectedAddressId(addr._id);
    setShippingInfo((prev) => ({
      ...prev,
      address: addr.street || "",
      provinceCode: addr.provinceCode ? String(addr.provinceCode) : null,
      provinceName: addr.provinceName || "",
      wardName: addr.wardName || "",
      selectedProvider: null,
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
    setStep(2);
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (!shippingInfo.selectedProvider) {
      showToast("Vui lòng chọn phương thức vận chuyển!", "warning");
      return;
    }
    setStep(3);
  };

  const handlePlaceOrder = async () => {
    try {
      setSubmitting(true);

      const selectedProviderData = shippingFees.find(
        (f) =>
          f.provider.code === shippingInfo.selectedProvider?.code &&
          f.serviceType === shippingInfo.selectedProvider?.serviceType
      );

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
          shippingProvider: shippingInfo.selectedProvider?.code,
          shippingServiceType: shippingInfo.selectedProvider?.serviceType,
          shippingFee: selectedProviderData?.fee || 0,
          selectedProductIds: isBuyNow
            ? []
            : selectedCartProducts.map((item) => item.product._id || item.product),
          selectedProducts: isBuyNow
            ? []
            : selectedCartProducts.map((item) => ({
                productId: item.product._id || item.product,
                quantity: item.quantity,
              })),
          buyNowProduct: isBuyNow
            ? { productId: buyNowProduct._id, quantity: buyNowProduct.quantity }
            : null,
          couponCode: selectedProductCoupon?.code || null,
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
          shippingProvider: shippingInfo.selectedProvider?.code,
          shippingServiceType: shippingInfo.selectedProvider?.serviceType,
          shippingFee: selectedProviderData?.fee || 0,
          couponCode: selectedProductCoupon?.code || null,
        };

        if (isBuyNow && buyNowProduct) {
          orderData.isBuyNow = true;
          orderData.buyNowProductId = buyNowProduct._id;
          orderData.buyNowQuantity = buyNowProduct.quantity;
        } else {
          orderData.selectedProductIds = selectedCartProducts.map(
            (item) => item.product._id || item.product
          );
        }

        const res = await createOrderApi(orderData);
        if (res.success) {
          const orders = res.data.orders || [res.data].filter(Boolean);
          const firstOrderNumber = orders[0]?.orderNumber;
          if (firstOrderNumber) {
            navigate(`/order-success/${firstOrderNumber}`);
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

  const selectedProviderData = shippingFees.find(
    (f) =>
      f.provider.code === shippingInfo.selectedProvider?.code &&
      f.serviceType === shippingInfo.selectedProvider?.serviceType
  );
  const shippingFee = selectedProviderData?.fee || 0;
  const effectiveShippingFee = selectedShippingCoupon ? 0 : shippingFee;
  const total = Math.max(0, selectedSubtotal + effectiveShippingFee - productCouponDiscount);

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E0] px-4 sm:px-8 h-[58px] flex items-center justify-center">
        <h1 className="text-[15px] font-bold text-[#1C1108]">Thanh toán</h1>
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

                    <div className="flex gap-3 pt-2">
                      <BtnGhost onClick={() => navigate(isBuyNow ? `/product/${buyNowProduct?._id}` : "/cart")}>← Quay lại</BtnGhost>
                      <BtnPrimary onClick={handleStep1Submit} type="button" disabled={!selectedAddressId} className="flex-1">Tiếp tục →</BtnPrimary>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* STEP 2: Shipping */}
            {step === 2 && (
              <div className={cardClass}>
                <CardHdr title="Phương thức vận chuyển" sub="Chọn cách giao hàng phù hợp" />

                <div className="p-6 space-y-5">
                  {/* Shipping methods */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <SectionTitle>Vận chuyển</SectionTitle>
                      <button type="button" onClick={() => setStep(1)} className="text-[12px] text-[#95520B] hover:underline font-medium">Đổi địa chỉ</button>
                    </div>

                    <div className="space-y-2.5">
                      {!shippingInfo.provinceCode ? (
                        <p className="text-[13px] text-[#9E8E7E] py-6 text-center bg-[#FAF7F4] rounded-[10px]">Vui lòng chọn địa chỉ giao hàng trước</p>
                      ) : shippingFees.length === 0 ? (
                        <div className="flex items-center justify-center py-8 bg-[#FAF7F4] rounded-[10px]">
                          <div className="w-5 h-5 border-2 border-[#D5C9BC] border-t-[#95520B] rounded-full animate-spin mr-2.5" />
                          <span className="text-[12.5px] text-[#9E8E7E]">Đang tải phương thức...</span>
                        </div>
                      ) : (
                        shippingFees.map((fee) => {
                          const isSelected = shippingInfo.selectedProvider?.code === fee.provider.code && shippingInfo.selectedProvider?.serviceType === fee.serviceType;
                          return (
                            <div
                              key={`${fee.provider.code}-${fee.serviceType}`}
                              onClick={() => setShippingInfo((prev) => ({ ...prev, selectedProvider: { code: fee.provider.code, serviceType: fee.serviceType } }))}
                              className={`flex items-start gap-3 p-4 rounded-[10px] border-2 cursor-pointer transition-all ${
                                isSelected ? "border-[#95520B] bg-[#fff8f0]" : "border-[#EDE8E0] bg-white hover:border-[#D5C9BC]"
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                isSelected ? "border-[#95520B] bg-[#95520B]" : "border-[#D5C9BC]"
                              }`}>
                                {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[13px] text-[#1C1108]">{fee.provider.name}</span>
                                    <span className="px-2 py-0.5 bg-[#FAF7F4] text-[#6B5C4C] text-[11px] font-medium rounded-full">{fee.serviceName}</span>
                                    {fee.isFree && (
                                      <span className="px-2 py-0.5 bg-[#dcfce7] text-[#16a34a] text-[11px] font-bold rounded-full">MIỄN PHÍ</span>
                                    )}
                                  </div>
                                  <span className={`font-bold text-[15px] ${fee.isFree ? "text-[#16a34a]" : "text-[#95520B]"}`}>
                                    {fee.isFree ? "0 đ" : formatPrice(fee.fee)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <p className="text-[11.5px] text-[#9E8E7E]">Giao {fee.estimatedDays.min}–{fee.estimatedDays.max} ngày</p>
                                  {fee.weight > 0 && (
                                    <p className="text-[11.5px] text-[#9E8E7E]">{(fee.weight / 1000).toFixed(2)} kg</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Voucher */}
                  <div>
                    <SectionTitle>Voucher</SectionTitle>
                    
                    <button
                      type="button"
                      onClick={() => setShowProductVoucherModal(true)}
                      className="w-full px-4 py-3 border-2 border-dashed border-[#D5C9BC] rounded-[10px] text-[13px] text-[#6B5C4C] hover:border-[#95520B] hover:text-[#95520B] transition-all flex items-center justify-center gap-2 bg-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {selectedProductCoupon || selectedShippingCoupon ? "Thay đổi voucher" : availableVouchers.length > 0 ? "Chọn voucher" : "Không có voucher"}
                    </button>

                    {/* Applied coupons badges */}
                    {selectedProductCoupon && (
                      <div className="mt-2.5 flex items-center justify-between bg-[#fff8f0] border border-[#95520B] rounded-[10px] p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-[#95520B] rounded-lg flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-bold text-[12px] text-[#95520B]">{selectedProductCoupon.code}</p>
                            <p className="text-[11.5px] text-[#6B5C4C]">Giảm {formatPrice(productCouponDiscount)}</p>
                          </div>
                        </div>
                        <button onClick={handleRemoveProductCoupon} className="text-[#9E8E7E] hover:text-[#dc2626] p-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )}

                    {selectedShippingCoupon && (
                      <div className="mt-2 flex items-center justify-between bg-blue-50 border border-blue-300 rounded-[10px] p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-bold text-[12px] text-blue-700">{selectedShippingCoupon.code}</p>
                            <p className="text-[11.5px] text-blue-600">Miễn phí vận chuyển</p>
                          </div>
                        </div>
                        <button onClick={handleRemoveShippingCoupon} className="text-[#9E8E7E] hover:text-[#dc2626] p-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Note */}
                  <div>
                    <SectionTitle>Ghi chú</SectionTitle>
                    <input
                      type="text"
                      value={shippingInfo.note}
                      onChange={(e) => setShippingInfo((prev) => ({ ...prev, note: e.target.value }))}
                      className={inputClass}
                      placeholder="Ví dụ: Giao giờ hành chính..."
                    />
                  </div>

                  {/* Payment method */}
                  <div>
                    <SectionTitle>THANH TOÁN ĐƠN HÀNG</SectionTitle>
                    <div className="space-y-2.5">
                      <div
                        onClick={() => setPaymentMethod("COD")}
                        className={`flex items-center gap-3 p-4 rounded-[10px] border-2 cursor-pointer transition-all ${
                          paymentMethod === "COD" ? "border-[#95520B] bg-[#fff8f0]" : "border-[#EDE8E0] bg-white hover:border-[#D5C9BC]"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "COD" ? "border-[#95520B] bg-[#95520B]" : "border-[#D5C9BC]"}`}>
                          {paymentMethod === "COD" && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-[13px] text-[#1C1108]">Thanh toán khi nhận hàng (COD)</p>
                        </div>
                      </div>

                      <div
                        onClick={() => setPaymentMethod("PAYOS")}
                        className={`flex items-center gap-3 p-4 rounded-[10px] border-2 cursor-pointer transition-all ${
                          paymentMethod === "PAYOS" ? "border-[#95520B] bg-[#fff8f0]" : "border-[#EDE8E0] bg-white hover:border-[#D5C9BC]"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "PAYOS" ? "border-[#95520B] bg-[#95520B]" : "border-[#D5C9BC]"}`}>
                          {paymentMethod === "PAYOS" && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-[13px] text-[#1C1108]">Thanh toán online qua PayOS</p>
                          <p className="text-[11.5px] text-[#9E8E7E]">Ví điện tử, Ngân hàng, QR Code</p>
                        </div>
                      </div>
                    </div>

                    {paymentMethod === "PAYOS" && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-[8px]">
                        <p className="text-[12px] text-blue-700">Bạn sẽ được chuyển đến cổng thanh toán PayOS an toàn.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <BtnGhost onClick={() => setStep(1)}>← Quay lại</BtnGhost>
                    <BtnPrimary onClick={handleStep2Submit} type="button" disabled={!shippingInfo.selectedProvider} className="flex-1">Tiếp tục →</BtnPrimary>
                  </div>
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

                  {/* Shipping summary */}
                  <div className="bg-[#FAF7F4] rounded-[10px] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[13px] font-bold text-[#1C1108]">Vận chuyển</h4>
                      <button type="button" onClick={() => setStep(2)} className="text-[12px] text-[#95520B] hover:underline">Đổi</button>
                    </div>
                    <p className="text-[13px] text-[#6B5C4C]">{selectedProviderData?.provider.name} – {selectedProviderData?.serviceName}</p>
                    <p className="text-[12px] text-[#9E8E7E]">Dự kiến: {selectedProviderData?.estimatedDays?.min}–{selectedProviderData?.estimatedDays?.max} ngày</p>
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
                  <span className="font-extrabold text-[18px] text-[#95520B]">{formatPrice(total)}</span>
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
