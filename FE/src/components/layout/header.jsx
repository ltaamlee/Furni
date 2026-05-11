import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContext.jsx";

export default function Header() {
  const { user, logout, token } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  // load cart từ localStorage
  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const total = cart.reduce((sum, i) => sum + i.quantity, 0);
    setCartCount(total);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-20">

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
            className="w-full px-4 py-2 border rounded-full bg-gray-50 focus:ring"
            placeholder="Tìm kiếm sản phẩm..."
          />
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">

          {/* CART */}
          <Link to="/cart" className="relative">
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 rounded-full">
                {cartCount}
              </span>
            )}
          </Link>

          {/* USER */}
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="px-3 py-2 rounded-full hover:bg-gray-100"
            >
              {user ? user.fullName || "User" : "Tài khoản"}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-xl overflow-hidden border">

                {!user ? (
                  <>
                    <Link to="/login" className="block px-4 py-2 hover:bg-gray-100">
                      Đăng nhập
                    </Link>
                    <Link to="/register" className="block px-4 py-2 hover:bg-gray-100">
                      Đăng ký
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">
                      Hồ sơ
                    </Link>
                    <Link to="/orders" className="block px-4 py-2 hover:bg-gray-100">
                      Đơn hàng
                    </Link>
                    <button
                      onClick={handleLogout}
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
    </header>
  );
}