import { useState, useEffect } from "react";

const VoucherModal = ({ isOpen, onClose, availableVouchers, onSelectVoucher, selectedVoucher }) => {
  const [loading, setLoading] = useState(false);
  const [platformTab, setPlatformTab] = useState("discount"); // "discount" | "freeship"
  const [shopTab, setShopTab] = useState("discount");       // "discount" | "freeship"

  useEffect(() => {
    if (isOpen) {
      setPlatformTab("discount");
      setShopTab("discount");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price) + " đ";
  };

  const platformVouchers = availableVouchers?.filter(v => !v.shopId) || [];
  const shopVouchers     = availableVouchers?.filter(v => !!v.shopId) || [];

  const platformDiscount = platformVouchers.filter(v => v.discountType !== 'freeship');
  const platformFreeship  = platformVouchers.filter(v => v.discountType === 'freeship');
  const shopDiscount     = shopVouchers.filter(v => v.discountType !== 'freeship');
  const shopFreeship     = shopVouchers.filter(v => v.discountType === 'freeship');

  const handleSelect = async (voucher) => {
    setLoading(true);
    try {
      await onSelectVoucher(voucher);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const renderVoucherCard = (voucher, isFreeship = false) => {
    const isSelected = selectedVoucher?.code === voucher.code;
    const gradient = isFreeship
      ? "from-blue-400 to-blue-600"
      : "from-rose-400 to-rose-600";
    const selectedBorder = isFreeship ? "border-blue-500 bg-blue-50" : "border-teal-500 bg-teal-50";
    const normalBorder  = isFreeship ? "border-gray-200 hover:border-blue-300" : "border-gray-200 hover:border-teal-300";

    return (
      <div
        key={voucher._id}
        onClick={() => !loading && handleSelect(voucher)}
        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
          isSelected ? selectedBorder + " shadow-md" : normalBorder + " bg-white hover:shadow-md"
        }`}
      >
        {isSelected && (
          <div className="absolute top-3 right-3">
            <div className={`w-6 h-6 ${isFreeship ? "bg-blue-500" : "bg-teal-500"} rounded-full flex items-center justify-center`}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <div className={`w-20 h-20 bg-gradient-to-br ${gradient} rounded-xl flex flex-col items-center justify-center text-white shadow-lg shrink-0`}>
            {isFreeship ? (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            ) : (
              <span className="text-lg font-bold">
                {voucher.discountType === 'percent' ? `-${voucher.value}%` : formatPrice(voucher.value)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm">{voucher.code}</p>
            {voucher.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{voucher.description}</p>
            )}

            <div className="mt-2 flex flex-wrap gap-2">
              {voucher.minOrderValue > 0 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                  Đơn tối thiểu {formatPrice(voucher.minOrderValue)}
                </span>
              )}
              {voucher.maxDiscount && !isFreeship && (
                <span className="px-2 py-0.5 bg-orange-50 text-orange-500 text-xs rounded">
                  Giảm tối đa {formatPrice(voucher.maxDiscount)}
                </span>
              )}
            </div>

            {voucher.endDate && (
              <p className="text-xs text-gray-400 mt-1.5">
                HSD: {new Date(voucher.endDate).toLocaleDateString('vi-VN')}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (title, count, vouchers, tabState, setTab) => {
    const discountVouchers = vouchers.filter(v => v.discountType !== 'freeship');
    const freeshipVouchers = vouchers.filter(v => v.discountType === 'freeship');
    const totalCount = vouchers.length;

    if (totalCount === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            title.includes("Sàn") ? "bg-indigo-50 text-indigo-500" : "bg-orange-50 text-orange-500"
          }`}>
            {totalCount}
          </span>
        </div>

        {/* Tab: Giảm giá / Miễn phí vận chuyển */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
          <button
            onClick={() => setTab("discount")}
            className={`flex-1 py-2 text-center font-medium transition-colors ${
              tabState === "discount"
                ? "bg-rose-50 text-rose-600"
                : "bg-white text-gray-400 hover:bg-gray-50"
            }`}
          >
            Giảm giá {discountVouchers.length > 0 && `(${discountVouchers.length})`}
          </button>
          <button
            onClick={() => setTab("freeship")}
            className={`flex-1 py-2 text-center font-medium transition-colors border-l border-gray-200 ${
              tabState === "freeship"
                ? "bg-blue-50 text-blue-600"
                : "bg-white text-gray-400 hover:bg-gray-50"
            }`}
          >
            Miễn phí vận chuyển {freeshipVouchers.length > 0 && `(${freeshipVouchers.length})`}
          </button>
        </div>

        <div className="space-y-3">
          {(tabState === "discount" ? discountVouchers : freeshipVouchers).map(v =>
            renderVoucherCard(v, tabState === "freeship")
          )}
        </div>
      </div>
    );
  };

  const hasAny = platformVouchers.length + shopVouchers.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Kho Voucher</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!hasAny && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Không có voucher nào khả dụng</p>
              <p className="text-gray-400 text-sm mt-1">Hãy nhận thêm voucher từ cửa hàng!</p>
            </div>
          )}

          {renderSection("Mã giảm giá của Sàn", platformVouchers.length, platformVouchers, platformTab, setPlatformTab)}
          {renderSection("Mã giảm giá của Shop", shopVouchers.length, shopVouchers, shopTab, setShopTab)}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default VoucherModal;
