import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContext.jsx";
import { getCartApi } from "../../utils/api";

export default function Header() {
  const { auth, logout, token } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const { user } = auth;

  // Load cart count
  useEffect(() => {
    fetchCartCount();

    // Listen for cart updates
    const handleCartUpdate = () => fetchCartCount();
    window.addEventListener("cart-updated", handleCartUpdate);

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdate);
    };
  }, []);

  const fetchCartCount = async () => {
    if (!token) {
      // Fallback to localStorage
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-20">

          {/* LOGO */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-linear-to-br from-yellow-700 to-orange-700 rounded-xl flex items-center justify-center text-white font-bold">
              FU
            </div>
            <div>
              <h1 className="font-bold text-xl">Furni</h1>
              <p className="text-xs text-gray-500">Nội Thất Cao Cấp</p>
            </div>
          </Link>

          {/* SEARCH */}
          <div className="hidden md:block flex-1 max-w-lg mx-8">
            <input
              className="w-full px-4 py-2 border rounded-full bg-gray-50 focus:ring focus:ring-green-500"
              placeholder="Tìm kiếm sản phẩm..."
            />
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-4">

            {/* Best Sellers Link */}
            <Link to="/best-sellers" className="hidden md:flex items-center gap-1 px-3 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition">
              <span>🔥</span>
              <span className="font-medium">Nổi bật</span>
            </Link>

            {/* CART */}
            <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-lg">
              🛒
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* USER */}
            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
              >
                <span>👤</span>
                <span className="hidden md:inline">{user ? user.fullName || "User" : "Tài khoản"}</span>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-xl overflow-hidden border z-50">
                  {!user ? (
                    <>
                      <Link to="/login" className="block px-4 py-3 hover:bg-gray-100" onClick={() => setOpen(false)}>
                        Đăng nhập
                      </Link>
                      <Link to="/register" className="block px-4 py-3 hover:bg-gray-100" onClick={() => setOpen(false)}>
                        Đăng ký
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-3 bg-gray-50 border-b">
                        <p className="font-medium text-gray-800">{user.fullName}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setOpen(false)}>
                        Hồ sơ
                      </Link>
                      <Link to="/orders" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setOpen(false)}>
                        Đơn hàng
                      </Link>
                      <button
                        onClick={() => { handleLogout(); setOpen(false); }}
                        className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50"
                      >
                        Đăng xuất
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Categories Nav */}
        <nav className="flex items-center gap-6 py-2 border-t overflow-x-auto">
          <Link to="/" className="text-sm font-medium text-gray-600 hover:text-green-600 whitespace-nowrap">
            Trang chủ
          </Link>
          <Link to="/best-sellers" className="text-sm font-medium text-orange-600 hover:text-orange-700 whitespace-nowrap">
            🔥 Nổi bật
          </Link>
          <Link to="/category/all" className="text-sm font-medium text-gray-600 hover:text-green-600 whitespace-nowrap">
            Tất cả sản phẩm
          </Link>
          {/* Categories will be loaded dynamically */}
        </nav>
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
