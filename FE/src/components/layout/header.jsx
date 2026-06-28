import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContext.jsx";
import {
  getCartApi,
  getCategoriesApi,
  getCustomerNotificationsApi,
  markAllCustomerNotificationsReadApi,
  markCustomerNotificationReadApi,
} from "../../utils/api.js";

export default function Header() {
  const { auth, setAuth, logout, token } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationFeedback, setNotificationFeedback] = useState("");
  const navigate = useNavigate();
  const { user } = auth;

  useEffect(() => {
    if (user?.role === "vendor" || user?.role === "admin") {
      setCartCount(0);
      return;
    }
    fetchCartCount();
    fetchCategories();

    const handleCartUpdate = () => fetchCartCount();
    const handleAvatarUpdate = (e) => {
      setAuth((prev) => ({
        ...prev,
        user: { ...prev.user, avatar: e.detail.avatar }
      }));
    };
    window.addEventListener("cart-updated", handleCartUpdate);
    window.addEventListener("avatar-updated", handleAvatarUpdate);

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdate);
      window.removeEventListener("avatar-updated", handleAvatarUpdate);
    };
  }, [!!token, user?.role]); // !!token as boolean — stable reference across renders

  const fetchCartCount = async () => {
    if (!token || user?.role === "vendor" || user?.role === "admin") {
      setCartCount(0);
      return;
    }
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

  const fetchNotifications = async ({ silent = false } = {}) => {
    if (!token || user?.role !== "customer") {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      if (!silent) setLoadingNotifications(true);
      const res = await getCustomerNotificationsApi({ limit: 8 });
      if (res.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      if (!silent) setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const refresh = () => fetchNotifications();
    const refreshSilent = () => fetchNotifications({ silent: true });
    let notificationStream = null;

    if (token && user?.role === "customer") {
      const apiBase = import.meta.env.VITE_BE_URL;
      notificationStream = new EventSource(`${apiBase}/api/user/notifications/stream?token=${encodeURIComponent(token)}`);
      notificationStream.addEventListener("notifications", (event) => {
        try {
          const data = JSON.parse(event.data);
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
          setLoadingNotifications(false);
        } catch (error) {
          console.error("Error parsing notification stream:", error);
        }
      });
      notificationStream.onerror = () => {
        refreshSilent();
      };
    }

    window.addEventListener("customer-notifications:changed", refresh);
    window.addEventListener("focus", refreshSilent);
    document.addEventListener("visibilitychange", refreshSilent);
    const timer = setInterval(refreshSilent, 30000);
    return () => {
      notificationStream?.close();
      window.removeEventListener("customer-notifications:changed", refresh);
      window.removeEventListener("focus", refreshSilent);
      document.removeEventListener("visibilitychange", refreshSilent);
      clearInterval(timer);
    };
  }, [!!token, user?.role]);

  useEffect(() => {
    if (!notificationFeedback) return;
    const timer = setTimeout(() => setNotificationFeedback(""), 1800);
    return () => clearTimeout(timer);
  }, [notificationFeedback]);

  const formatNotificationTime = (date) => {
    if (!date) return "";
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return new Date(date).toLocaleDateString("vi-VN");
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) return;
    if (!notification.isRead) {
      setNotifications((prev) => prev.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
      setNotificationFeedback("Đã đánh dấu đã đọc");
      await markCustomerNotificationReadApi(notification._id).catch(() => {});
      await fetchNotifications({ silent: true });
    }
    window.dispatchEvent(new CustomEvent("customer-notifications:changed"));
    setNotificationOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    setNotificationFeedback("Đã đọc tất cả thông báo");
    await markAllCustomerNotificationsReadApi().catch(() => {});
    await fetchNotifications({ silent: true });
    window.dispatchEvent(new CustomEvent("customer-notifications:changed"));
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
    <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-[#EDE8E0]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#95520B] rounded-lg flex items-center justify-center">
              <span className="text-white font-extrabold text-lg">S</span>
            </div>
            <span className="font-bold text-xl text-[#1C1108]">SORA</span>
          </Link>

          {/* SEARCH */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 pr-11 border border-[#D5C9BC] rounded-full bg-[#FAF7F4] focus:outline-none focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] text-sm placeholder:text-[#A8896A]"
                placeholder="Tìm kiếm sản phẩm..."
              />
              <button
                type="submit"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A8896A] hover:text-[#B86B05] transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            </div>
          </form>

          {/* RIGHT */}
          <div className="flex items-center gap-1.5">

            {/* Navigation - Desktop */}
            <nav className="hidden lg:flex items-center gap-1 mr-3">
              <Link to="/" className="px-3.5 py-2 text-[#6B5C4C] hover:text-[#B86B05] font-medium text-sm rounded-lg hover:bg-[#FAF7F4] transition-colors">
                Trang chủ
              </Link>
              <Link to="/products" className="px-3.5 py-2 text-[#6B5C4C] hover:text-[#B86B05] font-medium text-sm rounded-lg hover:bg-[#FAF7F4] transition-colors">
                Sản phẩm
              </Link>
              <Link to="/blog" className="px-3.5 py-2 text-[#6B5C4C] hover:text-[#B86B05] font-medium text-sm rounded-lg hover:bg-[#FAF7F4] transition-colors">
                Blog
              </Link>
              <button
                onClick={() => document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-3.5 py-2 text-[#6B5C4C] hover:text-[#B86B05] font-medium text-sm rounded-lg hover:bg-[#FAF7F4] transition-colors"
              >
                Liên hệ
              </button>
            </nav>

            {/* Notifications */}
            {user?.role !== "vendor" && user?.role !== "admin" && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (!auth.isAuthenticated) return navigate("/login");
                    const nextOpen = !notificationOpen;
                    setNotificationOpen(nextOpen);
                    setOpen(false);
                    if (nextOpen) fetchNotifications();
                  }}
                  className="relative p-2.5 hover:bg-[#FAF7F4] rounded-lg transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5.5 h-5.5 text-[#6B5C4C]">
                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#BF4343] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-4.5 text-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {notificationFeedback && !notificationOpen && (
                  <div className="absolute right-0 mt-2 w-56 px-3 py-2 bg-white shadow-xl rounded-lg border border-green-100 text-[12px] font-semibold text-green-700 z-50">
                    {notificationFeedback}
                  </div>
                )}

                {notificationOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white shadow-xl rounded-xl overflow-hidden border border-[#EDE8E0] z-50">
                    <div className="px-4 py-3 bg-[#FAF7F4] border-b border-[#EDE8E0] flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#1C1108]">Thông báo</p>
                        <p className="text-xs text-[#A8896A]">{unreadCount > 0 ? `${unreadCount} chưa đọc` : "Không có thông báo mới"}</p>
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllNotificationsRead} className="text-xs font-semibold text-[#95520B] hover:underline">
                          Đọc hết
                        </button>
                      )}
                    </div>
                    {notificationFeedback && (
                      <div className="px-4 py-2 bg-green-50 border-b border-green-100 text-[12px] font-semibold text-green-700">
                        {notificationFeedback}
                      </div>
                    )}
                    <div className="max-h-[360px] overflow-y-auto">
                      {loadingNotifications ? (
                        <div className="px-4 py-6 text-center text-sm text-[#9E8E7E]">Đang tải...</div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-[#9E8E7E]">Chưa có thông báo</div>
                      ) : notifications.map((notification) => (
                        <button
                          key={notification._id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-left px-4 py-3 border-b border-[#F1ECE5] hover:bg-[#FDFAF7] transition-colors ${notification.isRead ? "bg-white" : "bg-[#FFFCF5]"}`}
                        >
                          <div className="flex items-start gap-2">
                            {!notification.isRead && <span className="w-2 h-2 mt-1.5 rounded-full bg-[#BF4343] shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-bold text-[#1C1108] line-clamp-1">{notification.title}</p>
                              <p className="text-[12px] text-[#6B5C4C] mt-0.5 line-clamp-2">{notification.body}</p>
                              <p className="text-[11px] text-[#A8896A] mt-1">{formatNotificationTime(notification.createdAt)}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User */}
            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 p-2 hover:bg-[#FAF7F4] rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-[#B86B05] rounded-full flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-4.5 h-4.5">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-60 bg-white shadow-xl rounded-xl overflow-hidden border border-[#EDE8E0] z-50 fade-in">
                  {!auth.isAuthenticated ? (
                    <>
                      <div className="px-4 py-3.5 bg-[#FAF7F4] border-b border-[#EDE8E0]">
                        <p className="text-sm font-semibold text-[#1C1108]">Chào mừng đến với Furni</p>
                        <p className="text-xs text-[#A8896A] mt-0.5">Đăng nhập để trải nghiệm tốt hơn</p>
                      </div>
                      <Link to="/login" className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAF7F4] transition-colors" onClick={() => setOpen(false)}>
                        <div className="w-8 h-8 bg-[#B86B05]/10 rounded-lg flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#B86B05" strokeWidth="1.5" className="w-4 h-4">
                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-[#1C1108]">Đăng nhập</span>
                      </Link>
                      <Link to="/register" className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAF7F4] transition-colors" onClick={() => setOpen(false)}>
                        <div className="w-8 h-8 bg-[#B86B05]/10 rounded-lg flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#B86B05" strokeWidth="1.5" className="w-4 h-4">
                            <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-[#1C1108]">Đăng ký</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-3.5 bg-[#FAF7F4] border-b border-[#EDE8E0]">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-[#B86B05] rounded-full flex items-center justify-center overflow-hidden">
                            {user?.avatar ? (
                              <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-bold text-lg">{user?.fullName?.charAt(0)?.toUpperCase() || 'U'}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#1C1108] text-sm truncate">{user.fullName}</p>
                            <p className="text-xs text-[#A8896A] truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      {user.role === "customer" && (
                        <>
                          <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF7F4] transition-colors" onClick={() => setOpen(false)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#6B5C4C" strokeWidth="1.5" className="w-4.5 h-4.5">
                              <path d="M10 9H5a1 1 0 00-1 1v9a1 1 0 001 1h5m6-1v-4a1 1 0 00-1-1h-3m4 4h-1m1-4h.01M17 3H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2z" />
                            </svg>
                            <span className="text-sm text-[#1C1108]">Hồ sơ</span>
                          </Link>
                          <Link to="/orders" className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF7F4] transition-colors" onClick={() => setOpen(false)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#6B5C4C" strokeWidth="1.5" className="w-4.5 h-4.5">
                              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            <span className="text-sm text-[#1C1108]">Đơn hàng</span>
                          </Link>
                          <Link to="/wishlist" className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF7F4] transition-colors" onClick={() => setOpen(false)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#6B5C4C" strokeWidth="1.5" className="w-4.5 h-4.5">
                              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span className="text-sm text-[#1C1108]">Yêu thích</span>
                          </Link>
                          <Link to="/my-reviews" className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF7F4] transition-colors" onClick={() => setOpen(false)}>
                            <svg viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" className="w-4.5 h-4.5">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="text-sm text-[#1C1108]">Đánh giá</span>
                          </Link>

                          <div className="border-t border-[#EDE8E0] my-1" />
                          <Link to="/vendor/register" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 " onClick={() => setOpen(false)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-green-600">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72L4.318 3.44A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72m-13.5 8.65h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .415.336.75.75.75z" />
                            </svg>
                            Đăng ký bán hàng
                          </Link>
                        </>
                      )}
                      {user.role === "vendor" && (
                        <Link to="/vendor/dashboard" className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF7F4] transition-colors" onClick={() => setOpen(false)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#B86B05" strokeWidth="1.5" className="w-4.5 h-4.5">
                            <path d="M3 9l1-5h16l1 5M4 9v11a1 1 0 001 1h14a1 1 0 001-1V9M9 21v-6h6v6" />
                          </svg>
                          <span className="text-sm font-medium text-[#B86B05]">Quản lý cửa hàng</span>
                        </Link>
                      )}
                      {user.role === "admin" && (
                        <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF7F4] transition-colors" onClick={() => setOpen(false)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#6B5C4C" strokeWidth="1.5" className="w-4.5 h-4.5">
                            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm text-[#1C1108]">Quản trị</span>
                        </Link>
                      )}
                      <button
                        onClick={() => { handleLogout(); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[#BF4343] hover:bg-red-50 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4.5 h-4.5">
                          <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="text-sm font-medium">Đăng xuất</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* CART — only shown for customers */}
            {user?.role !== "vendor" && user?.role !== "admin" && (
              <Link to="/cart" className="relative p-2.5 hover:bg-[#FAF7F4] rounded-lg transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5.5 h-5.5 text-[#6B5C4C]">
                  <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#BF4343] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-4.5 text-center">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button className="lg:hidden p-2.5 hover:bg-[#FAF7F4] rounded-lg" onClick={() => setOpen(!open)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5.5 h-5.5 text-[#6B5C4C]">
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
          <nav className="lg:hidden py-4 border-t border-[#EDE8E0]">
            <div className="flex flex-col gap-1">
              <Link to="/" className="px-4 py-2.5 text-[#1C1108] font-medium" onClick={() => setOpen(false)}>Trang chủ</Link>
              <Link to="/products" className="px-4 py-2.5 text-[#6B5C4C] hover:text-[#B86B05]" onClick={() => setOpen(false)}>Sản phẩm</Link>
              <Link to="/blog" className="px-4 py-2.5 text-[#6B5C4C] hover:text-[#B86B05]" onClick={() => setOpen(false)}>Blog</Link>
              <button onClick={() => { document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' }); setOpen(false); }} className="px-4 py-2.5 text-[#6B5C4C] hover:text-[#B86B05] text-left" >Liên hệ</button>
            </div>
          </nav>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {(open || notificationOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setOpen(false);
            setNotificationOpen(false);
          }}
        />
      )}
    </header>
  );
}
