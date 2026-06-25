import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../components/context/authContext";
import AddressModal from "../../components/common/AddressModal";
import {
  getCartApi,
  createOrderApi,
  getShippingProvidersApi,
  calculateShippingFeesApi,
  createPayOSPaymentWithCartApi,
  getUserWalletApi,
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
  const [providers, setProviders] = useState([]);
  const [shippingFees, setShippingFees] = useState([]);
  const [walletAccounts, setWalletAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());

  // Saved addresses
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);

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
    fetchCart();
    fetchProviders();
    fetchWalletAccounts();
    fetchAddresses();

    // Listen for address updates from profile page
    const handleAddressUpdate = () => fetchAddresses();
    window.addEventListener('addresses-updated', handleAddressUpdate);

    // Handle "mua ngay" flow
    const buyNowRaw = localStorage.getItem("buy_now");
    if (buyNowRaw) {
      try {
        const buyNow = JSON.parse(buyNowRaw);
        if (Date.now() - buyNow.timestamp < 30 * 60 * 1000) {
          setIsBuyNow(true);
          setSelectedItemIds(new Set([buyNow.productId]));
          localStorage.setItem("checkout_selected_items", JSON.stringify([buyNow.productId]));
          fetchBuyNowProduct(buyNow.productId, buyNow.quantity);
        }
        localStorage.removeItem("buy_now");
      } catch (e) {
        console.error("Error parsing buy_now:", e);
      }
    } else {
      const savedSelected = localStorage.getItem("checkout_selected_items");
      if (savedSelected) {
        try {
          const parsed = JSON.parse(savedSelected);
          setSelectedItemIds(new Set(parsed));
        } catch (e) {
          console.error("Error parsing selected items:", e);
        }
      }
    }

    return () => window.removeEventListener('addresses-updated', handleAddressUpdate);
  }, []);

  // Auto-select default address and pre-fill customer info
  useEffect(() => {
    if (addresses.length === 0 || loadingAddresses) return;
    // Only auto-select if no address is currently selected
    if (selectedAddressId && addresses.some(a => a._id === selectedAddressId)) return;
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

  // Pre-fill customer info from user profile when buy_now flow starts
  useEffect(() => {
    if (!isBuyNow) return;
    setCustomerInfo((prev) => ({
      fullName: user?.fullName || prev.fullName,
      phone: user?.phone || prev.phone,
      email: user?.email || prev.email,
    }));
  }, [isBuyNow, user?.fullName, user?.phone, user?.email]);

  // Auto-advance to step 2 when "mua ngay" and address loaded
  useEffect(() => {
    if (isBuyNow && selectedAddressId && (buyNowProduct || !isBuyNow) && step === 1) {
      setStep(2);
    }
  }, [isBuyNow, selectedAddressId, step, buyNowProduct]);

  // Fetch shipping fees when province changes or when buyNowProduct is loaded
  useEffect(() => {
    console.log('[DEBUG] Shipping effect triggered:', { 
      provinceCode: shippingInfo.provinceCode, 
      hasCart: !!cart?.totalPrice, 
      hasBuyNow: !!buyNowProduct,
      isBuyNow,
      shippingFeesLength: shippingFees.length
    });
    if (shippingInfo.provinceCode && (cart?.totalPrice || buyNowProduct?.price)) {
      fetchShippingFees();
    }
  }, [shippingInfo.provinceCode, selectedAddressId, cart?.totalPrice, isBuyNow, buyNowProduct?.price, buyNowProduct?.shop]);

  const fetchCart = async () => {
    try {
      const res = await getCartApi();
      if (res.success && res.data.products?.length > 0) {
        setCart(res.data);
      } else if (!isBuyNow) {
        // Only navigate to cart for normal checkout; buy_now can proceed with empty/pre-loaded cart
        navigate("/cart");
      }
    } catch (error) {
      if (!isBuyNow) navigate("/cart");
      if (!isBuyNow) navigate("/cart");
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await getShippingProvidersApi();
      if (res.success) {
        setProviders(res.data.providers || []);
      }
    } catch (error) {
      console.error("Error fetching providers:", error);
    }
  };

  const fetchWalletAccounts = async () => {
    try {
      const res = await getUserWalletApi();
      if (res.success && res.data.wallet) {
        const accounts = res.data.wallet.accounts || [];
        setWalletAccounts(accounts);
        const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];
        if (defaultAccount) {
          setSelectedAccount(defaultAccount._id);
        }
      }
    } catch (error) {
      console.error("Error fetching wallet accounts:", error);
    }
  };

  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await getAddressesApi();
      if (res.success) {
        setAddresses(res.data || []);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAddNewAddress = async (formData) => {
    console.log('[Checkout] handleAddNewAddress called with:', {
      provinceCode: formData.provinceCode,
      provinceCodeType: typeof formData.provinceCode,
      wardName: formData.wardName,
    });
    try {
      const res = await createAddressApi(formData);
      if (res.success) {
        await fetchAddresses();
        // Auto-select the new address
        const newAddr = res.data;
        if (newAddr) {
          selectAddress(newAddr);
        }
        // Emit event for other components
        window.dispatchEvent(new Event('addresses-updated'));
      }
    } catch (error) {
      console.error("Error creating address:", error);
      alert("Không thể thêm địa chỉ. Vui lòng thử lại.");
    }
  };

  const fetchBuyNowProduct = async (productId, quantity) => {
    try {
      const res = await getProductByIdApi(productId);
      console.log('[DEBUG] getProductByIdApi response:', res.data);
      if (res.success) {
        const product = res.data.product;
        // Tính giá - API trả về price đã là sale price hoặc dùng salePrice
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
          shopName: product.shop?.name || 'Cửa hàng',
        });
        console.log('[DEBUG] buyNowProduct set:', { shop: product.shop?._id || product.shop, price: salePrice });
      }
    } catch (error) {
      console.error("Error fetching buy now product:", error);
    }
  };

  const fetchShippingFees = async () => {
    if (!shippingInfo.provinceCode) return;
    try {
      const shopId = buyNowProduct?.shop || cart?.products?.[0]?.shop;
      
      console.log('[DEBUG] fetchShippingFees called:', {
        provinceCode: shippingInfo.provinceCode,
        wardName: shippingInfo.wardName,
        shopId,
        orderTotal: isBuyNow ? (buyNowProduct?.price || 0) : (cart?.totalPrice || 0)
      });

      const res = await calculateShippingFeesApi({
        provinceCode: shippingInfo.provinceCode,
        orderTotal: isBuyNow
          ? (buyNowProduct?.price || 0)
          : (cart?.totalPrice || 0),
        shopId,
      });
      console.log('[DEBUG] Shipping API raw response:', res);
      console.log('[DEBUG] Shipping API response.data:', res.data);
      if (res.success) {
        console.log('[DEBUG] Setting shippingFees:', res.data.fees);
        setShippingFees(res.data.fees || []);
      } else {
        console.log('[DEBUG] API returned success: false');
      }
    } catch (error) {
      console.error("[DEBUG] Error fetching shipping fees:", error);
    }
  };

  const selectAddress = (addr) => {
    console.log('[DEBUG] selectAddress called:', addr);
    console.log('[DEBUG] addr.provinceCode:', addr.provinceCode, typeof addr.provinceCode);
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
  };

  const handleCustomerInfoSubmit = (e) => {
    e.preventDefault();
    if (!customerInfo.fullName || !customerInfo.phone || !customerInfo.email) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }
    setStep(2);
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    if (!selectedAddressId) {
      alert("Vui lòng chọn địa chỉ giao hàng!");
      return;
    }
    if (!shippingInfo.selectedProvider) {
      alert("Vui lòng chọn đơn vị vận chuyển!");
      return;
    }
    setStep(3);
  };

  const handlePlaceOrder = async () => {
    try {
      setSubmitting(true);
      const selectedProviderData = shippingFees.find(
        (f) => f.provider.code === shippingInfo.selectedProvider
      );

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
        paymentMethod: paymentMethod,
        shippingProvider: shippingInfo.selectedProvider,
        shippingFee: selectedProviderData?.fee || 0,
      };

      // Thêm thông tin mua ngay nếu đang trong flow mua ngay
      if (isBuyNow && buyNowProduct) {
        orderData.isBuyNow = true;
        orderData.buyNowProductId = buyNowProduct._id;
        orderData.buyNowQuantity = buyNowProduct.quantity;
      }

      if (paymentMethod === "COD") {
        const res = await createOrderApi(orderData);
        if (res.success) {
          // Backward-compat: cũ trả về parentOrder/childOrders, mới trả về orders[]
          const orders = res.data.orders || (res.data.childOrders ? [res.data.parentOrder, ...res.data.childOrders].filter(Boolean) : [res.data.parentOrder].filter(Boolean));
          const firstOrderNumber = orders[0]?.orderNumber;
          if (firstOrderNumber) {
            navigate(`/order-success/${firstOrderNumber}`);
          } else {
            alert("Đặt hàng thành công nhưng không lấy được mã đơn!");
          }
        } else {
          alert(res.message || "Đặt hàng thất bại!");
        }
      } else if (paymentMethod === "PAYOS") {
        const res = await createPayOSPaymentWithCartApi(orderData);
        if (res.success && res.data.checkoutUrl) {
          window.location.href = res.data.checkoutUrl;
        } else {
          alert(res.message || "Không thể tạo thanh toán PayOS!");
        }
      }
    } catch (error) {
      alert(error.message || "Có lỗi xảy ra!");
    } finally {
      setSubmitting(false);
    }
  };

  const getWalletIcon = (type) => {
    const icons = { bank: "🏦", momo: "📱", zalopay: "💚", vnpay: "🔵" };
    return icons[type] || "💳";
  };

  const getWalletTypeName = (type) => {
    const names = { bank: "Ngân hàng", momo: "MoMo", zalopay: "ZaloPay", vnpay: "VNPay" };
    return names[type] || type;
  };

  const formatAddress = (addr) => {
    const parts = [addr.street, addr.wardName, addr.provinceName].filter(Boolean);
    return parts.join(", ");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2d1a10]">
        <div className="w-10 h-10 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate totals based on mode (buy now vs cart)
  const selectedCartProducts =
    cart?.products?.filter((item) => selectedItemIds.has(item.product._id || item.product)) || [];

  const selectedSubtotal = isBuyNow && buyNowProduct
    ? buyNowProduct.price * buyNowProduct.quantity
    : selectedCartProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  const selectedTotalQuantity = isBuyNow && buyNowProduct
    ? buyNowProduct.quantity
    : selectedCartProducts.reduce((sum, item) => sum + item.quantity, 0);

  const selectedProviderData = shippingFees.find((f) => f.provider.code === shippingInfo.selectedProvider);
  const subtotal = selectedSubtotal;
  const shippingFee = selectedProviderData?.fee || 0;
  const total = subtotal + shippingFee;

  const stepLabels = ["Thông tin", "Vận chuyển", "Xác nhận"];
  const stepIcons = ["👤", "🚚", "📋"];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        backgroundImage: "radial-gradient(ellipse at 70% 20%, #6b3a22 0%, #2d1a10 60%)",
        backgroundColor: "#2d1a10",
      }}
    >
      <div className="w-full max-w-4xl">
        {/* Brand */}
        <div className="text-center mb-8 select-none">
          <h1
            className="text-3xl font-black tracking-tight text-amber-900"
            style={{ fontFamily: "'Georgia', 'Be Vietnam Pro', serif" }}
          >
            SORA FURNITURE
          </h1>
          <p className="mt-1 text-xs font-semibold tracking-[0.2em] uppercase text-stone-400">
            Đồ gỗ nội thất cao cấp
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-900 via-amber-600 to-amber-800" />

          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-extrabold text-[#1C1108]">THANH TOÁN ĐƠN HÀNG</h2>
              <p className="text-sm text-[#A8896A] mt-1">Hoàn tất đơn hàng của bạn</p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-10">
              {stepLabels.map((label, index) => {
                const stepNumber = index + 1;
                const isActive = step === stepNumber;
                const isCompleted = step > stepNumber;
                return (
                  <div key={label} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
                          isActive
                            ? "bg-[#B86B05] text-white shadow-lg shadow-[#B86B05]/30"
                            : isCompleted
                            ? "bg-green-500 text-white"
                            : "bg-[#FAF7F4] text-[#A8896A] border-2 border-[#EDE8E0]"
                        }`}
                      >
                        {isCompleted ? "✓" : stepIcons[index]}
                      </div>
                      <span className={`mt-2 text-xs font-semibold ${isActive ? "text-[#B86B05]" : isCompleted ? "text-green-600" : "text-[#A8896A]"}`}>
                        {label}
                      </span>
                    </div>
                    {index < stepLabels.length - 1 && (
                      <div className={`w-16 md:w-24 h-0.5 mx-2 ${isCompleted ? "bg-green-500" : "bg-[#EDE8E0]"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">

                {/* Step 1: Customer Info */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-[#B86B05]/10 rounded-xl flex items-center justify-center">
                        <span className="text-lg">👤</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#1C1108]">Thông tin khách hàng</h3>
                        <p className="text-xs text-[#A8896A]">Vui lòng điền đầy đủ thông tin</p>
                      </div>
                    </div>

                    <form onSubmit={handleCustomerInfoSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#1C1108] mb-1.5">Họ và tên *</label>
                        <input
                          type="text"
                          value={customerInfo.fullName}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, fullName: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-[#EDE8E0] bg-white text-sm text-[#1C1108] placeholder-[#A8896A] focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] transition"
                          placeholder="Nhập họ và tên"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#1C1108] mb-1.5">Số điện thoại *</label>
                        <input
                          type="tel"
                          value={customerInfo.phone}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-[#EDE8E0] bg-white text-sm text-[#1C1108] placeholder-[#A8896A] focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] transition"
                          placeholder="0xxx xxx xxx"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#1C1108] mb-1.5">Email *</label>
                        <input
                          type="email"
                          value={customerInfo.email}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-[#EDE8E0] bg-white text-sm text-[#1C1108] placeholder-[#A8896A] focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] transition"
                          placeholder="email@example.com"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-[#B86B05] hover:bg-[#9a5a04] text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-[#B86B05]/20 hover:shadow-xl hover:shadow-[#B86B05]/30 active:scale-[0.98]"
                      >
                        TIẾP TỤC
                      </button>
                    </form>
                  </div>
                )}

                {/* Step 2: Shipping & Payment */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-[#B86B05]/10 rounded-xl flex items-center justify-center">
                        <span className="text-lg">🚚</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#1C1108]">Vận chuyển & Thanh toán</h3>
                        <p className="text-xs text-[#A8896A]">Chọn đơn vị vận chuyển và phương thức thanh toán</p>
                      </div>
                    </div>

                    <form onSubmit={handleShippingSubmit} className="space-y-5">

                      {/* Saved Addresses */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-semibold text-[#1C1108]">Địa chỉ giao hàng</label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => navigate("/profile?tab=addresses")}
                              className="text-xs text-[#6B5C4C] hover:text-[#B86B05] font-medium"
                            >
                              Quản lý địa chỉ
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddressModal(true)}
                              className="text-xs text-[#B86B05] hover:underline font-medium flex items-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Thêm địa chỉ mới
                            </button>
                          </div>
                        </div>

                        {loadingAddresses ? (
                          <div className="flex items-center justify-center py-8 bg-[#FAF7F4] rounded-2xl">
                            <div className="w-6 h-6 border-2 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin" />
                          </div>
                        ) : addresses.length === 0 ? (
                          <div className="text-center py-8 bg-[#FAF7F4] rounded-2xl border-2 border-dashed border-[#D5C9BC]">
                            <div className="text-3xl mb-2">📍</div>
                            <p className="text-sm font-medium text-[#1C1108] mb-1">Chưa có địa chỉ nào</p>
                            <p className="text-xs text-[#A8896A] mb-3">Thêm địa chỉ giao hàng để tiếp tục</p>
                            <button
                              type="button"
                              onClick={() => navigate("/profile?tab=addresses")}
                              className="px-4 py-2 bg-[#B86B05] text-white text-sm font-semibold rounded-xl hover:bg-[#9a5a04] transition-colors"
                            >
                              Thêm địa chỉ
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
                                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && selectAddress(addr)}
                                  className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                                    isSelected
                                      ? "border-[#B86B05] bg-[#B86B05]/5 shadow-md shadow-[#B86B05]/10"
                                      : "border-[#EDE8E0] bg-white hover:border-[#D5C9BC] hover:shadow-sm"
                                  }`}
                                >
                                  {addr.isDefault && (
                                    <span className="absolute top-3 right-3 px-2 py-0.5 bg-[#B86B05] text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
                                      Mặc định
                                    </span>
                                  )}
                                  <div className="flex items-start gap-3 pr-8">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                      isSelected ? "border-[#B86B05] bg-[#B86B05]" : "border-[#D5C9BC]"
                                    }`}>
                                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-semibold text-sm text-[#1C1108]">{addr.fullName} · {addr.phone}</p>
                                      <p className="text-sm text-[#6B5C4C] mt-1 leading-relaxed">{formatAddress(addr)}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Note */}
                      <div>
                        <label className="block text-sm font-semibold text-[#1C1108] mb-1.5">Ghi chú (tùy chọn)</label>
                        <input
                          type="text"
                          value={shippingInfo.note}
                          onChange={(e) => setShippingInfo((prev) => ({ ...prev, note: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-[#EDE8E0] bg-white text-sm text-[#1C1108] placeholder-[#A8896A] focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] transition"
                          placeholder="Ghi chú cho đơn hàng, ví dụ: giao giờ hành chính..."
                        />
                      </div>

                      {/* Shipping Providers */}
                      <div>
                        <label className="block text-sm font-semibold text-[#1C1108] mb-3">Đơn vị vận chuyển</label>
                        <div className="space-y-2.5">
                          {!shippingInfo.provinceCode ? (
                            <p className="text-sm text-[#A8896A] py-4 text-center bg-[#FAF7F4] rounded-xl">
                              Vui lòng chọn địa chỉ giao hàng để xem đơn vị vận chuyển
                            </p>
                          ) : shippingFees.length === 0 ? (
                            <div className="flex items-center justify-center py-6 bg-[#FAF7F4] rounded-xl">
                              <div className="w-5 h-5 border-2 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin mr-2" />
                              <span className="text-sm text-[#A8896A]">Đang tải đơn vị vận chuyển...</span>
                            </div>
                          ) : (
                            shippingFees.map((fee) => {
                              const isSelected = shippingInfo.selectedProvider === fee.provider.code;
                              return (
                                <div
                                  key={fee.provider.code}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setShippingInfo((prev) => ({ ...prev, selectedProvider: fee.provider.code }))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      setShippingInfo((prev) => ({ ...prev, selectedProvider: fee.provider.code }));
                                    }
                                  }}
                                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                                    isSelected
                                      ? "border-[#B86B05] bg-[#B86B05]/5 shadow-md shadow-[#B86B05]/10"
                                      : "border-[#EDE8E0] hover:border-[#D5C9BC] bg-white"
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                    isSelected ? "border-[#B86B05] bg-[#B86B05]" : "border-[#D5C9BC]"
                                  }`}>
                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                      <span className="font-semibold text-sm text-[#1C1108]">{fee.provider.name}</span>
                                      <span className={`font-bold text-sm ${fee.isFree ? "text-green-600" : "text-[#1C1108]"}`}>
                                        {fee.isFree ? "MIỄN PHÍ" : formatPrice(fee.fee)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-[#A8896A] mt-0.5">
                                      Giao trong {fee.estimatedDays.min}-{fee.estimatedDays.max} ngày
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-sm font-semibold text-[#1C1108] mb-3">Phương thức thanh toán</label>
                        <div className="space-y-2.5">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setPaymentMethod("COD")}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPaymentMethod("COD")}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                              paymentMethod === "COD"
                                ? "border-[#B86B05] bg-[#B86B05]/5 shadow-md shadow-[#B86B05]/10"
                                : "border-[#EDE8E0] hover:border-[#D5C9BC] bg-white"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              paymentMethod === "COD" ? "border-[#B86B05] bg-[#B86B05]" : "border-[#D5C9BC]"
                            }`}>
                              {paymentMethod === "COD" && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <span className="font-semibold text-sm text-[#1C1108]">💵 COD — Thanh toán khi nhận hàng</span>
                          </div>

                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setPaymentMethod("PAYOS")}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPaymentMethod("PAYOS")}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                              paymentMethod === "PAYOS"
                                ? "border-[#B86B05] bg-[#B86B05]/5 shadow-md shadow-[#B86B05]/10"
                                : "border-[#EDE8E0] hover:border-[#D5C9BC] bg-white"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              paymentMethod === "PAYOS" ? "border-[#B86B05] bg-[#B86B05]" : "border-[#D5C9BC]"
                            }`}>
                              {paymentMethod === "PAYOS" && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <span className="font-semibold text-sm text-[#1C1108]">💳 PayOS — Thanh toán qua Ví / Ngân hàng</span>
                          </div>
                        </div>

                        {/* Saved Wallets */}
                        {paymentMethod === "PAYOS" && (
                          <div className="mt-4 p-4 bg-[#FAF7F4] rounded-2xl">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-[#1C1108]">Tài khoản thanh toán đã lưu</h4>
                              <button
                                onClick={() => navigate("/wallet")}
                                className="text-xs text-[#B86B05] hover:underline flex items-center gap-1 font-medium"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Thêm mới
                              </button>
                            </div>

                            {walletAccounts.length === 0 ? (
                              <div className="text-center py-4">
                                <p className="text-sm text-[#A8896A] mb-2">Chưa có tài khoản thanh toán nào</p>
                                <button
                                  onClick={() => navigate("/wallet")}
                                  className="text-sm text-[#B86B05] font-medium hover:underline"
                                >
                                  Thêm tài khoản ngay
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {walletAccounts.map((account) => (
                                  <label
                                    key={account._id}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                      selectedAccount === account._id
                                        ? "bg-white border-2 border-[#B86B05] shadow-sm"
                                        : "bg-white border border-[#EDE8E0] hover:border-[#D5C9BC]"
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                      selectedAccount === account._id ? "border-[#B86B05] bg-[#B86B05]" : "border-[#D5C9BC]"
                                    }`}>
                                      {selectedAccount === account._id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </div>
                                    <input type="radio" name="savedAccount" value={account._id} checked={selectedAccount === account._id}
                                      onChange={(e) => setSelectedAccount(e.target.value)} className="hidden" />
                                    <span className="text-lg">{getWalletIcon(account.type)}</span>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-[#1C1108]">{account.accountHolder}</p>
                                      <p className="text-xs text-[#A8896A]">
                                        {getWalletTypeName(account.type)} • ****{account.accountNumber.slice(-4)}
                                      </p>
                                    </div>
                                    {account.isDefault && (
                                      <span className="px-2 py-0.5 bg-[#B86B05] text-white text-xs rounded-full font-medium">Mặc định</span>
                                    )}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {paymentMethod === "PAYOS" && (
                          <p className="mt-3 text-xs text-[#A8896A]">
                            💡 Bạn sẽ được chuyển đến cổng thanh toán PayOS để hoàn tất.
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="flex-1 px-4 py-3.5 rounded-xl border-2 border-[#EDE8E0] text-[#6B5C4C] font-semibold hover:border-[#D5C9BC] hover:text-[#1C1108] transition-all"
                        >
                          ← Quay lại
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-[#B86B05] hover:bg-[#9a5a04] text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-[#B86B05]/20 hover:shadow-xl hover:shadow-[#B86B05]/30 active:scale-[0.98]"
                        >
                          Tiếp tục
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step 3: Review */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-[#B86B05]/10 rounded-xl flex items-center justify-center">
                        <span className="text-lg">📋</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#1C1108]">Xác nhận đặt hàng</h3>
                        <p className="text-xs text-[#A8896A]">Kiểm tra thông tin trước khi xác nhận</p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#FAF7F4] rounded-2xl">
                      <h4 className="font-semibold text-sm text-[#1C1108] mb-2 flex items-center gap-2">👤 Thông tin khách hàng</h4>
                      <p className="text-sm text-[#6B5C4C]">{customerInfo.fullName}</p>
                      <p className="text-sm text-[#6B5C4C]">{customerInfo.phone} · {customerInfo.email}</p>
                    </div>

                    <div className="p-4 bg-[#FAF7F4] rounded-2xl">
                      <h4 className="font-semibold text-sm text-[#1C1108] mb-2 flex items-center gap-2">🚚 Địa chỉ giao hàng</h4>
                      <p className="text-sm text-[#6B5C4C]">{shippingInfo.address}</p>
                      <p className="text-sm text-[#6B5C4C]">{[shippingInfo.wardName, shippingInfo.provinceName].filter(Boolean).join(", ")}</p>
                      {shippingInfo.note && <p className="text-xs text-[#A8896A] italic mt-1">Ghi chú: {shippingInfo.note}</p>}
                    </div>

                    <div className="p-4 bg-[#FAF7F4] rounded-2xl">
                      <h4 className="font-semibold text-sm text-[#1C1108] mb-2 flex items-center gap-2">📦 Đơn vị vận chuyển</h4>
                      <p className="text-sm text-[#6B5C4C]">{selectedProviderData?.provider.name}</p>
                      <p className="text-xs text-[#A8896A]">
                        Dự kiến giao: {selectedProviderData?.estimatedDays.min}-{selectedProviderData?.estimatedDays.max} ngày
                      </p>
                    </div>

                    <div className="p-4 bg-[#FAF7F4] rounded-2xl">
                      <h4 className="font-semibold text-sm text-[#1C1108] mb-2 flex items-center gap-2">💳 Phương thức thanh toán</h4>
                      <p className="text-sm text-[#6B5C4C]">
                        {paymentMethod === "COD" ? "💵 COD — Thanh toán khi nhận hàng" : "💳 PayOS — Thanh toán qua Ví / Ngân hàng"}
                      </p>
                      {paymentMethod === "PAYOS" && selectedAccount && (() => {
                        const acc = walletAccounts.find((a) => a._id === selectedAccount);
                        return acc ? (
                          <div className="mt-2 p-2 bg-white rounded-xl flex items-center gap-2">
                            <span>{getWalletIcon(acc.type)}</span>
                            <span className="text-xs text-[#6B5C4C]">
                              {acc.accountHolder} — {getWalletTypeName(acc.type)} ****{acc.accountNumber.slice(-4)}
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>

                    <div className="p-4 bg-[#FAF7F4] rounded-2xl">
                      <h4 className="font-semibold text-sm text-[#1C1108] mb-3 flex items-center gap-2">🛒 Sản phẩm ({selectedTotalQuantity})</h4>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto">
                        {selectedCartProducts.map((item) => (
                          <div key={item.product._id || item.product} className="flex gap-3 items-center">
                            <img src={item.image || "/placeholder.png"} alt={item.name} className="w-14 h-14 object-cover rounded-xl" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1C1108] line-clamp-1">{item.name}</p>
                              <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                                {item.originalPrice && item.discount > 0 ? (
                                  <>
                                    <span className="text-xs font-bold text-[#B86B05]">{formatPrice(item.price)}</span>
                                    <span className="text-xs text-[#A8896A] line-through">{formatPrice(item.originalPrice)}</span>
                                    <span className="px-1 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded">-{item.discount}%</span>
                                  </>
                                ) : (
                                  <span className="text-xs font-semibold text-[#B86B05]">{formatPrice(item.price)}</span>
                                )}
                                <span className="text-xs text-[#A8896A] ml-auto">x{item.quantity}</span>
                              </div>
                            </div>
                            <p className="font-bold text-sm text-[#1C1108]">{formatPrice(item.price * item.quantity)}</p>
                          </div>
                        ))}
                      </div>
                      {selectedCartProducts.length === 0 && (
                        <p className="text-sm text-[#A8896A] text-center py-4">Không có sản phẩm nào được chọn</p>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="flex-1 px-4 py-3.5 rounded-xl border-2 border-[#EDE8E0] text-[#6B5C4C] font-semibold hover:border-[#D5C9BC] hover:text-[#1C1108] transition-all"
                      >
                        ← Quay lại
                      </button>
                      <button
                        onClick={handlePlaceOrder}
                        disabled={submitting}
                        className="flex-1 bg-[#B86B05] hover:bg-[#9a5a04] text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-[#B86B05]/20 hover:shadow-xl hover:shadow-[#B86B05]/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? "Đang xử lý..." : paymentMethod === "PAYOS" ? "Thanh toán ngay" : "Đặt hàng"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-[#FAF7F4] rounded-2xl p-6 sticky top-24">
                  <h3 className="text-base font-bold text-[#1C1108] mb-5">Tóm tắt đơn hàng</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B5C4C]">Tạm tính ({selectedTotalQuantity} sản phẩm)</span>
                      <span className="font-semibold text-[#1C1108]">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B5C4C]">Phí vận chuyển</span>
                      <span className="font-semibold text-[#1C1108]">
                        {shippingFee === 0 ? <span className="text-green-600">Miễn phí</span> : formatPrice(shippingFee)}
                      </span>
                    </div>
                    {selectedProviderData?.isFree && (
                      <p className="text-xs text-green-600 font-medium">✓ Miễn phí vận chuyển!</p>
                    )}
                    {!selectedProviderData?.isFree && subtotal < 500000 && (
                      <p className="text-xs text-orange-500">Mua thêm {formatPrice(500000 - subtotal)} để được miễn phí ship!</p>
                    )}
                    <div className="border-t border-[#EDE8E0] pt-3 flex justify-between">
                      <span className="font-bold text-[#1C1108]">Tổng cộng</span>
                      <span className="font-extrabold text-xl text-[#B86B05]">{formatPrice(total)}</span>
                    </div>
                  </div>

                  {selectedItemIds.size > 0 && selectedItemIds.size < (cart?.products?.length || 0) && (
                    <div className="mt-4 p-3 bg-white rounded-xl">
                      <p className="text-xs text-[#6B5C4C]">💡 Chỉ {selectedItemIds.size} sản phẩm đã chọn từ giỏ hàng</p>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-[#EDE8E0]">
                    <div className="flex items-center gap-2 text-xs text-[#A8896A]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Thanh toán an toàn & bảo mật</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Modal */}
      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSave={handleAddNewAddress}
      />
    </div>
  );
};

export default CheckoutPage;
