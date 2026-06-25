import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import InputField from '../../components/common/inputFields';
import Button from '../../components/common/button';

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
      <span>{message}</span>
    </div>
  );
};

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAlert({ type: '', message: '' });

    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return;
    }

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmailValid) {
      setError('Email không hợp lệ.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();

      if (data.success) {
        setAlert({ type: 'success', message: `Mã xác nhận OTP đã được gửi tới ${email}.` });
        setTimeout(() => {
          navigate('/verify-password', { state: { email: email.trim(), type: 'reset' } });
        }, 1500);
      } else {
        setAlert({ type: 'error', message: data.message || 'Yêu cầu thất bại!' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Lỗi server, vui lòng thử lại sau!' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2d1a10] px-4 py-10"
      style={{ backgroundImage: 'radial-gradient(ellipse at 70% 20%, #6b3a22 0%, #2d1a10 60%)' }}>
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          <div className="h-1.5 w-full bg-linear-to-r from-amber-900 via-amber-600 to-amber-800" />
          <div className="px-8 pt-8 pb-10 flex flex-col gap-6">
            <div className="text-center select-none">
              <h1 className="text-3xl font-black tracking-tight text-amber-900" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                Sora
              </h1>
              <p className="mt-1 text-xs font-semibold tracking-[0.2em] uppercase text-stone-400">
                Khôi phục mật khẩu
              </p>
            </div>

            <Alert type={alert.type} message={alert.message} />

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <InputField
                id="email"
                name="email"
                type="email"
                label="Email"
                placeholder="Nhập email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
                required
                autoComplete="email"
              />

              <p className="text-sm text-stone-500">
                Nhập email để nhận mã xác nhận.
              </p>

              <Button type="submit" variant="primary" fullWidth loading={loading}>
                Gửi mã xác nhận
              </Button>
            </form>

            <div className="flex items-center justify-between text-sm text-stone-600">
              <Link to="/login" className="font-semibold text-amber-800 hover:text-amber-600 hover:underline underline-offset-2">
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;