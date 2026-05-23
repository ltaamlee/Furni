import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../components/context/authContext';
import { loginApi } from '../../utils/api';
import InputField from '../../components/common/inputFields';
import Button from '../../components/common/button';

// ── Icons ───────────────────────────────────────────────────────────────────

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);


const Alert = ({ type, message }) => {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium animate-fade-in
        ${isError
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-green-200 bg-green-50 text-green-700'
        }`}
    >
      {isError ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-.75 5a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0V7zm.75 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm4.53 7.47a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06L11 13.94l4.47-4.47a.75.75 0 0 1 1.06 0z" clipRule="evenodd"/>
        </svg>
      )}
      {message}
    </div>
  );
};


const Divider = ({ label }) => (
  <div className="flex items-center gap-4 my-1">
    <div className="flex-1 h-px bg-stone-200" />
    <span className="text-xs font-semibold tracking-widest uppercase text-stone-400">{label}</span>
    <div className="flex-1 h-px bg-stone-200" />
  </div>
);


const LoginPage = () => {
  const navigate = useNavigate();
  const { setAuth, setAppLoading } = useContext(AuthContext);

  const [form, setForm] = useState({ usernameOrEmail: '', password: '', rememberMe: false });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Trigger auth context to refresh (re-read token from localStorage)
  const refreshAuth = () => {
    setAppLoading(true);
    setTimeout(() => setAppLoading(false), 100);
  };

  // Field change handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    // Clear field error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Client-side validation
  const validate = () => {
    const newErrors = {};
    if (!form.usernameOrEmail.trim()) newErrors.usernameOrEmail = 'Vui lòng nhập tên đăng nhập hoặc email.';
    if (!form.password) newErrors.password = 'Vui lòng nhập mật khẩu.';
    else if (form.password.length < 6) newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    return newErrors;
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setAlert({ type: '', message: '' });

    try {
      const response = await loginApi(form.usernameOrEmail, form.password);
      const data = response;

      if (data.success) {
        localStorage.setItem('access_token', data.data.token);

        setAuth({
          isAuthenticated: true,
          user: {
            ...data.data.user
          },
        });

        refreshAuth();
        setAlert({ type: 'success', message: 'Đăng nhập thành công! Đang chuyển hướng...' });
        setTimeout(() => navigate('/'), 1000);
      } else {
        setAlert({ type: 'error', message: data.message || 'Đăng nhập thất bại!' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại!' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2d1a10] px-4 py-10"
      style={{ backgroundImage: 'radial-gradient(ellipse at 70% 20%, #6b3a22 0%, #2d1a10 60%)' }}>

      {/* Decorative grain overlay */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-linear-to-r from-amber-900 via-amber-600 to-amber-800" />

          <div className="px-8 pt-8 pb-10 flex flex-col gap-6">

            {/* Brand */}
            <div className="text-center select-none">
              <h1 className="text-3xl font-black tracking-tight text-amber-900"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                NTSorature
              </h1>
              <p className="mt-1 text-xs font-semibold tracking-[0.2em] uppercase text-stone-400">
                Đồ gỗ nội thất cao cấp
              </p>
            </div>

            {/* Alert */}
            <Alert type={alert.type} message={alert.message} />

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <InputField
                id="usernameOrEmail"
                name="usernameOrEmail"
                type="text"
                label="Tên đăng nhập hoặc Email"
                placeholder="Nhập tên đăng nhập hoặc email"
                value={form.usernameOrEmail}
                onChange={handleChange}
                error={errors.usernameOrEmail}
                required
                autoComplete="username"
                icon={<UserIcon />}
              />

              <InputField
                id="password"
                name="password"
                type="password"
                label="Mật khẩu"
                placeholder="Nhập mật khẩu"
                value={form.password}
                onChange={handleChange}
                error={errors.password}
                required
                autoComplete="current-password"
                icon={<LockIcon />}
              />

              {/* Remember me + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={form.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 rounded accent-amber-800 cursor-pointer"
                  />
                  <span className="text-sm text-stone-600 group-hover:text-stone-800 transition-colors">
                    Ghi nhớ đăng nhập
                  </span>
                </label>

                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-amber-800 hover:text-amber-600 transition-colors hover:underline underline-offset-2"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              <Button type="submit" variant="primary" fullWidth loading={loading}>
                Đăng nhập
              </Button>
            </form>

            {/* Divider */}
            <Divider label="hoặc đăng nhập với" />

            {/* Social login */}
            <Button
              variant="social"
              fullWidth
              icon={<GoogleIcon />}
              onClick={() => (window.location.href = '/oauth2/authorization/google')}
            >
              Tiếp tục với Google
            </Button>

            {/* Register */}
            <p className="text-center text-sm text-stone-500">
              Chưa có tài khoản?{' '}
              <Link
                to="/register"
                className="font-bold text-amber-900 hover:text-amber-700 transition-colors hover:underline underline-offset-2"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center text-xs text-stone-500/60 tracking-wide">
          © {new Date().getFullYear()} NTSorature · Bảo mật & Bảo hành
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
