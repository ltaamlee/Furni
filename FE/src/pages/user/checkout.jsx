import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../components/context/authContext";
import AddressModal from "../../components/common/AddressModal";
import {
  getCartApi,
  createOrderApi,
  calculateShippingFeesApi,
  createPayOSPaymentWithCartApi,
  getAddressesApi,
  getProductByIdApi,
  createAddressApi,
} from "../../utils/api";

const CheckoutPage = () => {
  const { auth } = useContext(AuthContext);
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

  // Use a ref to track buyNow mode so fetchCart can read it without stale closure issues
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

  useEffect(() => {
    const handleAddressUpdate = () => fetchAddresses();
    window.addEventListener("addresses-updated", handleAddressUpdate);
    return () => window.removeEventListener("addresses-updated", handleAddressUpdate);
  }, []);

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
    }

    // Only fetch cart when NOT in buyNow mode
    if (!buyNowMode) {
      fetchCart();
    } else {
      // In buyNow mode, just mark loading done after a brief moment
      // (actual product load is async via fetchBuyNowProduct)
      setLoading(false);
    }
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

  useEffect(() => {
    if (!isBuyNow) return;
    setCustomerInfo((prev) => ({
      fullName: user?.fullName || prev.fullName,
      phone: user?.phone || prev.phone,
      email: user?.email || prev.email,
    }));
  }, [isBuyNow, user?.fullName, user?.phone, user?.email]);

  useEffect(() => {
    if (isBuyNow && selectedAddressId && buyNowProduct && step === 1) {
      setStep(2);
    }
  }, [isBuyNow, selectedAddressId, step, buyNowProduct]);

  // Keep ref in sync with state for any render-phase reads
  useEffect(() => {
    isBuyNowRef.current = isBuyNow;
  }, [isBuyNow]);

  // Call fetchShippingFees when province or selected items change (debounced 500ms)
  useEffect(() => {
    const selectedSubtotal = isBuyNow
      ? (buyNowProduct?.price || 0) * (buyNowItem?.quantity || 1)
      : (cart?.products || [])
          .filter((item) => selectedItemIds.has(item.product._id || item.product))
          .reduce(
            (sum, item) =>
              sum + (item.price || 0) * (item.quantity || 1),
            0
          );

    if (shippingInfo.provinceCode && selectedSubtotal > 0) {
      if (shippingDebounceRef.current) clearTimeout(shippingDebounceRef.current);
      shippingDebounceRef.current = setTimeout(() => {
        fetchShippingFees();
      }, 200);
    }

    return () => {
      if (shippingDebounceRef.current) clearTimeout(shippingDebounceRef.current);
    };
  }, [shippingInfo.provinceCode, selectedItemIds, isBuyNow, buyNowProduct]);

  const fetchCart = async () => {
    // Don't fetch cart in buyNow mode — that mode uses buyNowProduct only
    if (isBuyNowRef.current) {
      setLoading(false);
      return;
    }
    try {
      const res = await getCartApi();
      if (res.success && res.data.products?.length > 0) {
        setCart(res.data);
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
      console.error("Error creating address:", error);
      alert("Không thể thêm địa chỉ. Vui lòng thử lại.");
    }
  };

  // Cache shipping fees: key = "provinceCode_weight_orderTotal"
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

      // Miễn phí ship nếu đơn >= 500k — skip API, trả ngay
      const FREE_THRESHOLD = 500000;
      if (selectedOrderTotal >= FREE_THRESHOLD) {
        const freeFees = [
          {
            provider: { _id: 'default', name: 'Giao Hàng Tiết Kiệm', code: 'FREE', logo: '' },
            serviceType: 'economy',
            serviceName: 'Miễn Phí',
            fee: 0,
            estimatedDays: { min: 3, max: 5 },
            isFree: true,
            weight: 0,
          },
          {
            provider: { _id: 'default2', name: 'J&T Express', code: 'JT', logo: '' },
            serviceType: 'express',
            serviceName: 'Nhanh',
            fee: 0,
            estimatedDays: { min: 1, max: 2 },
            isFree: true,
            weight: 0,
          },
        ];
        setShippingFees(freeFees);
        return;
      }

      let totalWeight = 0;
      let shopId = null;

      if (isBuyNow && buyNowProduct) {
        totalWeight = (buyNowProduct.weight || 0) * (buyNowItem?.quantity || 1);
        shopId = buyNowProduct.shop;
      } else if (cart?.products?.length > 0) {
        const firstSelectedItem = cart.products.find((p) => selectedItemIds.has(p.product._id || p.product));
        if (firstSelectedItem) shopId = firstSelectedItem.shop?._id || firstSelectedItem.shop;
        totalWeight = cart.products.reduce((sum, item) => {
          if (!selectedItemIds.has(item.product._id || item.product)) return sum;
          return sum + (item.product?.weight || 0) * (item.quantity || 1);
        }, 0);
      }

      // Cache key: province + weight bucket (làm tròn weight / 500g)
      const weightBucket = Math.round(totalWeight / 500) * 500;
      const cacheKey = `${shippingInfo.provinceCode}_${weightBucket}_${selectedOrderTotal}`;
      if (shippingCache.current[cacheKey]) {
        setShippingFees(shippingCache.current[cacheKey]);
        return;
      }

      const res = await calculateShippingFeesApi({
        provinceCode: shippingInfo.provinceCode,
        orderTotal: selectedOrderTotal,
        totalWeight: Math.round(totalWeight),
        shopId,
      });

      if (res.success) {
        const fees = res.data.fees || [];
        shippingCache.current[cacheKey] = fees;
        setShippingFees(fees);
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
      alert("Vui lòng chọn địa chỉ giao hàng!");
      return;
    }
    setStep(2);
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (!shippingInfo.selectedProvider) {
      alert("Vui lòng chọn phương thức vận chuyển!");
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
        };

        const res = await createPayOSPaymentWithCartApi(payosData);
        if (res.success && res.data.checkoutUrl) {
          window.location.href = res.data.checkoutUrl;
        } else {
          alert(res.message || "Không thể tạo thanh toán PayOS!");
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
          const orders =
            res.data.orders ||
            (res.data.childOrders
              ? [res.data.parentOrder, ...res.data.childOrders].filter(Boolean)
              : [res.data.parentOrder].filter(Boolean));
          const firstOrderNumber = orders[0]?.orderNumber;
          if (firstOrderNumber) {
            navigate(`/order-success/${firstOrderNumber}`);
          } else {
            alert("Đặt hàng thành công nhưng không lấy được mã đơn!");
          }
        } else {
          alert(res.message || "Đặt hàng thất bại!");
        }
      }
    } catch (error) {
      alert(error.message || "Có lỗi xảy ra!");
    } finally {
      setSubmitting(false);
    }
  };

  const formatAddress = (addr) => {
    return [addr.street, addr.wardName, addr.provinceName].filter(Boolean).join(", ");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2d1a10]">
        <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin" />
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
        price:
          buyNowProduct.discount > 0
            ? Math.round(buyNowProduct.price * (1 - buyNowProduct.discount / 100))
            : buyNowProduct.price,
        originalPrice: buyNowProduct.originalPrice || buyNowProduct.price,
        discount: buyNowProduct.discount || 0,
        name: buyNowProduct.name,
        image: buyNowProduct.image || "/placeholder.png",
        shopIsActive: true,
      }
    : null;

  const selectedCheckoutProducts = isBuyNow
    ? buyNowVirtualItem
      ? [buyNowVirtualItem]
      : []
    : selectedCartProducts.map((item) => ({
        ...item,
        checkoutQuantity: item.quantity,
      }));

  const selectedSubtotal = selectedCheckoutProducts.reduce(
    (sum, item) => sum + item.price * item.checkoutQuantity,
    0
  );
  const selectedTotalQuantity = selectedCheckoutProducts.reduce(
    (sum, item) => sum + item.checkoutQuantity,
    0
  );

  const selectedProviderData = shippingFees.find(
    (f) =>
      f.provider.code === shippingInfo.selectedProvider?.code &&
      f.serviceType === shippingInfo.selectedProvider?.serviceType
  );
  const subtotal = selectedSubtotal;
  const shippingFee = selectedProviderData?.fee || 0;
  const total = subtotal + shippingFee;

  const stepLabels = ["Địa chỉ", "Vận chuyển", "Xác nhận"];

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{
        background: "linear-gradient(160deg, #3d2010 0%, #2d1a10 50%, #1a0e08 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="w-full max-w-5xl mx-auto">
        {/* Brand */}
        <div className="text-center mb-6 select-none">
          <h1
            className="text-3xl font-black tracking-tight text-amber-300"
            style={{ fontFamily: "'Georgia', 'Be Vietnam Pro', serif" }}
          >
            SORA FURNITURE
          </h1>
          <p className="mt-1 text-xs font-semibold tracking-[0.2em] uppercase text-amber-700">
            Thanh toán đơn hàng
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-lg mx-auto relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-[#3d2a1a]" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 transition-all duration-500"
              style={{
                width: step === 1 ? "0%" : step === 2 ? "50%" : "100%",
              }}
            />

            {stepLabels.map((label, index) => {
              const stepNumber = index + 1;
              const isActive = step === stepNumber;
              const isCompleted = step > stepNumber;
              return (
                <div key={label} className="flex flex-col items-center z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-lg ${
                      isActive
                        ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/40 scale-110"
                        : isCompleted
                        ? "bg-gradient-to-br from-green-400 to-green-600 text-white shadow-green-500/40"
                        : "bg-[#3d2a1a] text-amber-800 border-2 border-amber-900"
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span>{stepNumber}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-semibold transition-colors ${
                      isActive ? "text-amber-400" : isCompleted ? "text-green-400" : "text-amber-800"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">

            {/* STEP 1: Address */}
            {step === 1 && (
              <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700" />
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-inner">
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#1C1108]">Địa chỉ giao hàng</h3>
                      <p className="text-xs text-[#A8896A]">Chọn hoặc thêm địa chỉ mới để nhận hàng</p>
                    </div>
                  </div>

                  <form onSubmit={handleStep1Submit} className="space-y-4">
                    {loadingAddresses ? (
                      <div className="flex items-center justify-center py-12 bg-[#FAF7F4] rounded-2xl">
                        <div className="w-7 h-7 border-3 border-[#D5C9BC] border-t-amber-600 rounded-full animate-spin" />
                        <span className="ml-3 text-sm text-[#A8896A]">Đang tải địa chỉ...</span>
                      </div>
                    ) : addresses.length === 0 ? (
                      <div className="text-center py-12 bg-[#FAF7F4] rounded-2xl border-2 border-dashed border-[#D5C9BC]">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <p className="font-semibold text-[#1C1108] mb-1">Bạn chưa có địa chỉ nào</p>
                        <p className="text-sm text-[#A8896A] mb-4">Thêm địa chỉ giao hàng để tiếp tục</p>
                        <button
                          type="button"
                          onClick={() => navigate("/addresses")}
                          className="px-6 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors shadow-md"
                        >
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
                              role="button"
                              tabIndex={0}
                              onClick={() => selectAddress(addr)}
                              onKeyDown={(e) =>
                                (e.key === "Enter" || e.key === " ") && selectAddress(addr)
                              }
                              className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                                isSelected
                                  ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-200"
                                  : "border-[#EDE8E0] bg-white hover:border-amber-300 hover:shadow-md"
                              }`}
                            >
                              {addr.isDefault && (
                                <span className="absolute top-3 right-3 px-2.5 py-0.5 bg-amber-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wide shadow-sm">
                                  Mặc định
                                </span>
                              )}
                              <div className="flex items-start gap-3 pr-12">
                                <div
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                    isSelected ? "border-amber-500 bg-amber-500" : "border-[#D5C9BC] bg-white"
                                  }`}
                                >
                                  {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-sm text-[#1C1108]">{addr.fullName}</p>
                                    <span className="text-[#A8896A]">·</span>
                                    <p className="text-sm text-[#6B5C4C]">{addr.phone}</p>
                                  </div>
                                  <p className="text-sm text-[#6B5C4C] mt-1 leading-relaxed">{formatAddress(addr)}</p>
                                  {addr.street && addr.street !== addr.wardName && (
                                    <p className="text-xs text-[#A8896A] mt-0.5 italic">{addr.street}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => navigate(isBuyNow ? `/product/${buyNowProduct?._id}` : "/cart")}
                        className="px-6 py-3.5 rounded-xl border-2 border-[#EDE8E0] text-[#6B5C4C] font-semibold text-sm hover:border-amber-300 hover:text-amber-700 transition-all"
                      >
                        ← Quay lại
                      </button>
                      <button
                        type="submit"
                        disabled={!selectedAddressId}
                        className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                        style={{
                          background: "linear-gradient(135deg, #B86B05 0%, #95520B 100%)",
                          boxShadow: "0 4px 14px rgba(184, 107, 5, 0.35)",
                        }}
                      >
                        Tiếp tục →
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* STEP 2: Shipping + Payment */}
            {step === 2 && (
              <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700" />
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-inner">
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#1C1108]">Vận chuyển & Thanh toán</h3>
                      <p className="text-xs text-[#A8896A]">Chọn phương thức giao hàng và hình thức thanh toán</p>
                    </div>
                  </div>

                  <form onSubmit={handleStep2Submit} className="space-y-5">
                    {/* Shipping Methods */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-bold text-[#1C1108] flex items-center gap-2">
                          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Phương thức vận chuyển
                        </label>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium hover:underline flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Đổi địa chỉ
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {!shippingInfo.provinceCode ? (
                          <p className="text-sm text-[#A8896A] py-6 text-center bg-[#FAF7F4] rounded-2xl border border-[#EDE8E0]">
                            Vui lòng chọn địa chỉ giao hàng trước
                          </p>
                        ) : shippingFees.length === 0 ? (
                          <div className="flex items-center justify-center py-8 bg-[#FAF7F4] rounded-2xl border border-[#EDE8E0]">
                            <div className="w-6 h-6 border-3 border-[#D5C9BC] border-t-amber-600 rounded-full animate-spin mr-3" />
                            <span className="text-sm text-[#A8896A]">Đang tải phương thức vận chuyển...</span>
                          </div>
                        ) : (
                          shippingFees.map((fee) => {
                            const isSelected =
                              shippingInfo.selectedProvider?.code === fee.provider.code &&
                              shippingInfo.selectedProvider?.serviceType === fee.serviceType;
                            return (
                              <div
                                key={`${fee.provider.code}-${fee.serviceType}`}
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  setShippingInfo((prev) => ({
                                    ...prev,
                                    selectedProvider: {
                                      code: fee.provider.code,
                                      serviceType: fee.serviceType,
                                    },
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    setShippingInfo((prev) => ({
                                      ...prev,
                                      selectedProvider: {
                                        code: fee.provider.code,
                                        serviceType: fee.serviceType,
                                      },
                                    }));
                                  }
                                }}
                                className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                                  isSelected
                                    ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-200"
                                    : "border-[#EDE8E0] bg-white hover:border-amber-300"
                                }`}
                              >
                                <div
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                    isSelected ? "border-amber-500 bg-amber-500" : "border-[#D5C9BC]"
                                  }`}
                                >
                                  {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-[#1C1108]">{fee.provider.name}</span>
                                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                        {fee.serviceName}
                                      </span>
                                      {fee.isFree && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                          MIỄN PHÍ
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={`font-extrabold text-base ${
                                        fee.isFree ? "text-green-600" : "text-amber-600"
                                      }`}
                                    >
                                      {fee.isFree ? "0 đ" : formatPrice(fee.fee)}
                                    </span>
                                  </div>
                                  <div className="flex items-center flex-wrap gap-3 mt-1.5">
                                    <p className="text-xs text-[#A8896A] flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Giao {fee.estimatedDays.min}–{fee.estimatedDays.max} ngày
                                    </p>
                                    {fee.weight > 0 && (
                                      <p className="text-xs text-[#A8896A] flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                        </svg>
                                        {(fee.weight / 1000).toFixed(2)} kg
                                      </p>
                                    )}
                                    {fee.distanceLabel && (
                                      <p className="text-xs text-amber-600 font-semibold">{fee.distanceLabel}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Note */}
                    <div>
                      <label className="block text-sm font-bold text-[#1C1108] mb-1.5 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-[#A8896A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Ghi chú giao hàng
                        <span className="text-xs text-[#A8896A] font-normal">(tùy chọn)</span>
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.note}
                        onChange={(e) =>
                          setShippingInfo((prev) => ({ ...prev, note: e.target.value }))
                        }
                        className="w-full px-4 py-3 rounded-xl border-2 border-[#EDE8E0] bg-white text-sm text-[#1C1108] placeholder-[#A8896A] focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition"
                        placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-sm font-bold text-[#1C1108] mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Hình thức thanh toán
                      </label>
                      <div className="space-y-2.5">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setPaymentMethod("COD")}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPaymentMethod("COD")}
                          className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                            paymentMethod === "COD"
                              ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-200"
                              : "border-[#EDE8E0] bg-white hover:border-amber-300"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              paymentMethod === "COD" ? "border-amber-500 bg-amber-500" : "border-[#D5C9BC]"
                            }`}
                          >
                            {paymentMethod === "COD" && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">💵</span>
                              <div>
                                <p className="font-bold text-sm text-[#1C1108]">Thanh toán khi nhận hàng</p>
                                <p className="text-xs text-[#A8896A]">COD — Nhận hàng rồi trả tiền</p>
                              </div>
                            </div>
                          </div>
                          {paymentMethod === "COD" && (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                              Đang chọn
                            </span>
                          )}
                        </div>

                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setPaymentMethod("PAYOS")}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPaymentMethod("PAYOS")}
                          className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                            paymentMethod === "PAYOS"
                              ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-200"
                              : "border-[#EDE8E0] bg-white hover:border-amber-300"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              paymentMethod === "PAYOS" ? "border-amber-500 bg-amber-500" : "border-[#D5C9BC]"
                            }`}
                          >
                            {paymentMethod === "PAYOS" && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">💳</span>
                              <div>
                                <p className="font-bold text-sm text-[#1C1108]">Thanh toán online qua PayOS</p>
                                <p className="text-xs text-[#A8896A]">Ví điện tử, Ngân hàng, QR Code</p>
                              </div>
                            </div>
                          </div>
                          {paymentMethod === "PAYOS" && (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                              Đang chọn
                            </span>
                          )}
                        </div>
                      </div>

                      {paymentMethod === "PAYOS" && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                          <p className="text-xs text-blue-700 flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Bạn sẽ được chuyển đến cổng thanh toán PayOS an toàn. Sau khi thanh toán thành công, mã QR xác nhận sẽ hiển thị ngay trên trang.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-6 py-3.5 rounded-xl border-2 border-[#EDE8E0] text-[#6B5C4C] font-semibold text-sm hover:border-amber-300 hover:text-amber-700 transition-all"
                      >
                        ← Quay lại
                      </button>
                      <button
                        type="submit"
                        disabled={!shippingInfo.selectedProvider}
                        className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: "linear-gradient(135deg, #B86B05 0%, #95520B 100%)",
                          boxShadow: "0 4px 14px rgba(184, 107, 5, 0.35)",
                        }}
                      >
                        Xác nhận & Tiếp tục →
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* STEP 3: Review */}
            {step === 3 && (
              <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700" />
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-inner">
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#1C1108]">Xác nhận đơn hàng</h3>
                      <p className="text-xs text-[#A8896A]">Kiểm tra kỹ thông tin trước khi đặt hàng</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-[#FAF7F4] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-[#1C1108] flex items-center gap-2">
                          <span>👤</span> Người nhận
                        </h4>
                        <button type="button" onClick={() => setStep(1)} className="text-xs text-amber-600 hover:text-amber-700 font-semibold hover:underline">
                          Đổi
                        </button>
                      </div>
                      <p className="font-bold text-sm text-[#1C1108]">{customerInfo.fullName}</p>
                      <p className="text-sm text-[#6B5C4C] mt-0.5">{customerInfo.phone}</p>
                    </div>

                    <div className="bg-[#FAF7F4] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-[#1C1108] flex items-center gap-2">
                          <span>📍</span> Địa chỉ giao hàng
                        </h4>
                        <button type="button" onClick={() => setStep(1)} className="text-xs text-amber-600 hover:text-amber-700 font-semibold hover:underline">
                          Đổi
                        </button>
                      </div>
                      <p className="text-sm text-[#6B5C4C]">{shippingInfo.address}</p>
                      <p className="text-sm text-[#6B5C4C]">{[shippingInfo.wardName, shippingInfo.provinceName].filter(Boolean).join(", ")}</p>
                      {shippingInfo.note && (
                        <p className="text-xs text-[#A8896A] italic mt-1.5 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Ghi chú: {shippingInfo.note}
                        </p>
                      )}
                    </div>

                    <div className="bg-[#FAF7F4] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-[#1C1108] flex items-center gap-2">
                          <span>🚚</span> Vận chuyển & Thanh toán
                        </h4>
                        <button type="button" onClick={() => setStep(2)} className="text-xs text-amber-600 hover:text-amber-700 font-semibold hover:underline">
                          Đổi
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-[#6B5C4C]">
                            {selectedProviderData?.provider.name} – {selectedProviderData?.serviceName}
                          </p>
                          <p className="text-sm font-bold text-amber-600">
                            {selectedProviderData?.isFree ? "Miễn phí" : formatPrice(selectedProviderData?.fee)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[#A8896A]">
                            Dự kiến giao: {selectedProviderData?.estimatedDays?.min}–{selectedProviderData?.estimatedDays?.max} ngày
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#EDE8E0]">
                          <span>{paymentMethod === "PAYOS" ? "💳" : "💵"}</span>
                          <span className="text-sm font-semibold text-[#1C1108]">
                            {paymentMethod === "PAYOS"
                              ? "Thanh toán online qua PayOS"
                              : "Thanh toán khi nhận hàng (COD)"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#FAF7F4] rounded-2xl p-4">
                      <h4 className="text-sm font-bold text-[#1C1108] mb-3 flex items-center gap-2">
                        <span>🛒</span> Sản phẩm đặt mua
                        <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                          {selectedTotalQuantity} sản phẩm
                        </span>
                      </h4>
                      <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                        {selectedCheckoutProducts.map((item) => (
                          <div
                            key={item.product._id || item.product}
                            className="flex gap-3 items-center bg-white rounded-xl p-2.5 shadow-sm"
                          >
                            <img
                              src={item.image || "/placeholder.png"}
                              alt={item.name}
                              className="w-14 h-14 object-cover rounded-xl flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#1C1108] line-clamp-1">{item.name}</p>
                              <div className="flex items-center flex-wrap gap-1.5 mt-1">
                                {item.originalPrice && item.discount > 0 ? (
                                  <>
                                    <span className="text-xs font-bold text-amber-600">{formatPrice(item.price)}</span>
                                    <span className="text-xs text-[#A8896A] line-through">{formatPrice(item.originalPrice)}</span>
                                    <span className="px-1.5 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded">-{item.discount}%</span>
                                  </>
                                ) : (
                                  <span className="text-xs font-semibold text-amber-600">{formatPrice(item.price)}</span>
                                )}
                                <span className="text-xs text-[#A8896A] ml-auto">×{item.checkoutQuantity}</span>
                              </div>
                            </div>
                            <p className="font-extrabold text-sm text-[#1C1108] whitespace-nowrap">
                              {formatPrice(item.price * item.checkoutQuantity)}
                            </p>
                          </div>
                        ))}
                      </div>

                      {blockedSelectedProducts.length > 0 && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-semibold text-amber-700">
                            ⚠️ Một số sản phẩm thuộc shop tạm nghỉ nên không thể thanh toán:
                          </p>
                          <div className="mt-1.5 space-y-1">
                            {blockedSelectedProducts.map((item) => (
                              <p key={item.product._id || item.product} className="text-xs text-amber-700 line-clamp-1 pl-2">
                                • {item.name}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-5">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-3.5 rounded-xl border-2 border-[#EDE8E0] text-[#6B5C4C] font-semibold text-sm hover:border-amber-300 hover:text-amber-700 transition-all"
                    >
                      ← Quay lại
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={submitting || selectedCheckoutProducts.length === 0}
                      className="flex-1 py-4 rounded-xl font-bold text-sm text-white transition-all shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background:
                          paymentMethod === "PAYOS"
                            ? "linear-gradient(135deg, #1a56db 0%, #1e40af 100%)"
                            : "linear-gradient(135deg, #B86B05 0%, #95520B 100%)",
                        boxShadow:
                          paymentMethod === "PAYOS"
                            ? "0 4px 14px rgba(29, 86, 219, 0.4)"
                            : "0 4px 14px rgba(184, 107, 5, 0.35)",
                      }}
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Đang xử lý...
                        </span>
                      ) : paymentMethod === "PAYOS" ? (
                        <span className="flex items-center justify-center gap-2">
                          <span>💳</span> Thanh toán ngay qua PayOS
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <span>✓</span> Đặt hàng ngay
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl shadow-black/20 p-5 sticky top-6">
              <h3 className="text-base font-bold text-[#1C1108] mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Tóm tắt đơn hàng
              </h3>

              <div className="space-y-2 mb-4">
                {selectedCheckoutProducts.slice(0, 3).map((item) => (
                  <div key={item.product._id || item.product} className="flex gap-2 items-center">
                    <img
                      src={item.image || "/placeholder.png"}
                      alt={item.name}
                      className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#1C1108] line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-[#A8896A]">×{item.checkoutQuantity}</p>
                    </div>
                  </div>
                ))}
                {selectedCheckoutProducts.length > 3 && (
                  <p className="text-xs text-[#A8896A] text-center py-1">
                    +{selectedCheckoutProducts.length - 3} sản phẩm khác
                  </p>
                )}
              </div>

              <div className="space-y-2.5 text-sm border-t border-[#EDE8E0] pt-4">
                <div className="flex justify-between">
                  <span className="text-[#6B5C4C]">Tạm tính</span>
                  <span className="font-semibold text-[#1C1108]">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B5C4C]">Phí vận chuyển</span>
                  <span className="font-semibold text-[#1C1108]">
                    {shippingFee === 0 ? (
                      <span className="text-green-600">Miễn phí</span>
                    ) : (
                      formatPrice(shippingFee)
                    )}
                  </span>
                </div>
                {selectedProviderData?.isFree && (
                  <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Miễn phí vận chuyển!
                  </p>
                )}
                {!selectedProviderData?.isFree && subtotal > 0 && (
                  <p className="text-xs text-orange-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Mua thêm {formatPrice(500000 - subtotal)} để miễn phí ship!
                  </p>
                )}
                <div className="border-t border-[#EDE8E0] pt-3 flex justify-between items-center">
                  <span className="font-bold text-[#1C1108]">Tổng thanh toán</span>
                  <span className="font-extrabold text-xl text-amber-600">{formatPrice(total)}</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#EDE8E0]">
                <div className="flex items-center gap-2 text-xs text-[#A8896A] bg-green-50 rounded-xl p-3">
                  <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Thanh toán an toàn &amp; bảo mật 100%</span>
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
    </div>
  );
};

export default CheckoutPage;
