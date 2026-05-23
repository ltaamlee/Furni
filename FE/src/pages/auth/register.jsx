import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// ── Icons ───────────────────────────────────────────────────────────────

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16v16H4z" />
    <path d="m22 6-10 7L2 6" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// ── Register Page ─────────────────────────────────────────────────────────

const RegisterPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    username: '',
    password: '',
    role: 'customer'
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`${import.meta.env.VITE_BE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (data.success) {
        setMessage('Đăng ký thành công! Kiểm tra email để xác thực OTP.');
        setTimeout(() => navigate('/verify-password', { state: { email: form.email, type: 'registration' } }), 1500);
      } else {
        setMessage(data.message || 'Đăng ký thất bại!');
      }
    } catch (err) {
      setMessage('Lỗi server, vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2d1a10]"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 70% 20%, #6b3a22 0%, #2d1a10 60%)'
      }}>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Top bar */}
        <div className="h-1.5 bg-linear-to-r from-amber-900 via-amber-600 to-amber-800" />

        <div className="p-8 space-y-5">

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

          {/* Message */}
          {message && (
            <div className="text-sm text-center text-amber-800 bg-amber-50 p-2 rounded-lg">
              {message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">

            <Input icon={<UserIcon />} name="fullName" placeholder="Họ và tên" onChange={handleChange} />
            <Input icon={<MailIcon />} name="email" placeholder="Email" onChange={handleChange} />
            <Input icon={<UserIcon />} name="phone" placeholder="Số điện thoại" onChange={handleChange} />
            <Input icon={<UserIcon />} name="address" placeholder="Địa chỉ" onChange={handleChange} />
            <Input icon={<UserIcon />} name="username" placeholder="Tên đăng nhập" onChange={handleChange} />
            <Input icon={<LockIcon />} name="password" type="password" placeholder="Mật khẩu" onChange={handleChange} />

            <button
              disabled={loading}
              className="w-full bg-amber-900 hover:bg-amber-800 text-white font-semibold py-2.5 rounded-xl transition"
            >
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-stone-500">
            Đã có tài khoản?{' '}
            <Link to="/login"
              className="font-bold text-amber-900 hover:underline">
              Đăng nhập
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};


const Input = ({ icon, ...props }) => (
  <div className="flex items-center border border-stone-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-amber-700">
    {icon}
    <input
      {...props}
      className="w-full ml-2 outline-none text-sm"
    />
  </div>
);

export default RegisterPage;