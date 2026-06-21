import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContext.jsx";
import { getCartApi, getCategoriesApi, getMyPointsApi } from "../../utils/api";

export default function Header() {
  const { auth, logout, token } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const navigate = useNavigate();
  const { user } = auth;

  useEffect(() => {
    fetchCartCount();
    fetchCategories();
    if (token) {
      fetchLoyaltyPoints();
    }

    const handleCartUpdate = () => fetchCartCount();
    window.addEventListener("cart-updated", handleCartUpdate);

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdate);
    };
  }, [token]);

  const fetchCartCount = async () => {
    if (!token) {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const total = cart.reduce((sum, i) => sum + i.quantity, 0);
      setCartCount(total);
      return;
    }

    try {
      const res = await getCartApi();
      if (res.success && res.data) {
        setCartCount(res.data.totalQuantity || 0);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    }
  };

  const fetchLoyaltyPoints = async () => {
    try {
      const res = await getMyPointsApi();
      if (res.success) {
        setLoyaltyPoints(res.data.points || 0);
      }
    } catch (error) {
      console.error("Error fetching loyalty points:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getCategoriesApi();
      if (res.success) {
        setCategories(res.data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#8B4513] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="font-bold text-xl text-[#8B4513]">Sora</span>
          </Link>

          {/* SEARCH */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-full bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
                placeholder="Tìm kiếm sản phẩm..."
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8B4513]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            </div>
          </form>

          {/* RIGHT */}
          <div className="flex items-center gap-2">

            {/* Navigation - Desktop */}
            <nav className="hidden lg:flex items-center gap-6 mr-4">
              <Link to="/" className="text-[#8B4513] font-semibold hover:text-[#A0522D] transition">
                Home
              </Link>
              <Link to="/products" className="text-gray-600 hover:text-[#8B4513] transition font-medium">
                Sản phẩm
              </Link>
              <Link to="/best-sellers" className="text-gray-600 hover:text-[#8B4513] transition font-medium">
                Shop
              </Link>
              <button 
                onClick={() => document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-gray-600 hover:text-[#8B4513] transition font-medium"
              >
                Liên hệ
              </button>
              <button 
                onClick={() => document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-gray-600 hover:text-[#8B4513] transition font-medium"
              >
                Về chúng tôi
              </button>
            </nav>

            {/* Notifications */}
            <button className="p-2 hover:bg-gray-100 rounded-full transition relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-gray-600">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Notification dot */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User */}
            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="p-2 hover:bg-gray-100 rounded-full transition flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-gray-600">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-xl overflow-hidden border z-50">
                  {!auth.isAuthenticated ? (
                    <>
                      <div className="px-4 py-3 border-b">
                        <p className="text-sm text-gray-500">Chào mừng đến với Sora</p>
                      </div>
                      <Link to="/login" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50" onClick={() => setOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-[#8B4513]">
                          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Đăng nhập
                      </Link>
                      <Link to="/register" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50" onClick={() => setOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-[#8B4513]">
                          <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Đăng ký
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-3 bg-[#FAF8F5] border-b">
                        <p className="font-semibold text-gray-800">{user.fullName}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        {loyaltyPoints > 0 && (
                          <Link to="/loyalty" className="inline-flex items-center gap-1 mt-1 text-sm text-purple-600 font-medium hover:text-purple-700">
                            💎 {loyaltyPoints.toLocaleString('vi-VN')} điểm
                          </Link>
                        )}
                      </div>
                      <Link to="/profile" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-gray-500">
                          <path d="M10 9H5a1 1 0 00-1 1v9a1 1 0 001 1h5m6-1v-4a1 1 0 00-1-1h-3m4 4h-1m1-4h.01M17 3H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2z" />
                        </svg>
                        Hồ sơ
                      </Link>
                      <Link to="/orders" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-gray-500">
                          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Đơn hàng
                      </Link>
                      <Link to="/wishlist" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-gray-500">
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Yêu thích
                      </Link>
                      <Link to="/my-reviews" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-gray-500">
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Đánh giá
                      </Link>
                      <Link to="/loyalty" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-purple-500">
                          <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                        Tích điểm
                      </Link>
                      <Link to="/coupons" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-orange-500">
                          <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Mã giảm giá
                      </Link>

                      {user.role === "customer" && (
                        <Link to="/vendor/register" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 " onClick={() => setOpen(false)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-green-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72L4.318 3.44A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72m-13.5 8.65h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .415.336.75.75.75z" />
                          </svg>
                          Đăng ký bán hàng
                        </Link>
                      )}

                      {user.role === "vendor" && (
                        <Link to="/vendor/dashboard" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-[#8B4513]">
                            <path d="M3 9l1-5h16l1 5M4 9v11a1 1 0 001 1h14a1 1 0 001-1V9M9 21v-6h6v6" />
                          </svg>
                          Quản lý cửa hàng
                        </Link>
                      )}
                      {user.role === "admin" && (
                        <Link to="/admin" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-gray-500">
                            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Quản trị
                        </Link>
                      )}
                      <button
                        onClick={() => { handleLogout(); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                          <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Đăng xuất
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* CART */}
            <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-gray-600">
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#8B4513] text-white text-xs px-2 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Toggle */}
            <button className="lg:hidden p-2 hover:bg-gray-100 rounded-full" onClick={() => setOpen(!open)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                {open ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {open && (
          <nav className="lg:hidden py-4 border-t">
            <div className="flex flex-col gap-2">
              <Link to="/" className="px-4 py-2 text-[#8B4513] font-semibold" onClick={() => setOpen(false)}>Home</Link>
              <Link to="/products" className="px-4 py-2 text-gray-600 hover:text-[#8B4513]" onClick={() => setOpen(false)}>Sản phẩm</Link>
              <Link to="/best-sellers" className="px-4 py-2 text-gray-600 hover:text-[#8B4513]" onClick={() => setOpen(false)}>Shop</Link>
              <Link to="/contact" className="px-4 py-2 text-gray-600 hover:text-[#8B4513]" onClick={() => setOpen(false)}>Liên hệ</Link>
              <Link to="/about" className="px-4 py-2 text-gray-600 hover:text-[#8B4513]" onClick={() => setOpen(false)}>Về chúng tôi</Link>
            </div>
          </nav>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </header>
  );
}
