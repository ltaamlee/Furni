import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import instance from '../../utils/axios.customize';
import InputField from '../../components/common/inputFields';
import Button from '../../components/common/button';
import { AuthContext } from '../../components/context/authContext';

const VerifyPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useContext(AuthContext);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const email = location.state?.email;
  const type = location.state?.type || 'reset'; // 'registration', 'login', or 'reset'

  useEffect(() => {
    if (!email) navigate('/login');
  }, [email, navigate]);

  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      await instance.post('/resend-otp', { email });
      setSuccess('Đã gửi lại mã OTP!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi lại mã OTP');
      setTimeout(() => setError(''), 3000);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Mã OTP phải gồm 6 chữ số');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await instance.post('/verify-otp', { email, otp: code });
      setLoading(false);

      if (type === 'registration') {
        // Registration flow: auto-login and redirect to homepage
        const token = response.data?.token;
        const user = response.data?.user;

        if (token) {
          localStorage.setItem('access_token', token);
          localStorage.setItem('user', JSON.stringify(user));

          setAuth({
            isAuthenticated: true,
            user: {
              email: user?.email || email,
              name: user?.fullName || '',
              role: user?.role || 'customer',
            },
          });
        }

        // Redirect based on role
        const redirectUrl = user?.role === 'admin' ? '/admin' : '/';
        navigate(redirectUrl);
      } else if (type === 'login') {
        // Login flow: auto-login with new token and redirect to homepage
        const token = response.data?.token;
        const user = response.data?.user;

        if (token) {
          localStorage.setItem('access_token', token);
          localStorage.setItem('user', JSON.stringify(user));

          setAuth({
            isAuthenticated: true,
            user: {
              email: user?.email || email,
              name: user?.fullName || '',
              role: user?.role || 'customer',
            },
          });
        }

        // Redirect based on role
        const redirectUrl = user?.role === 'admin' ? '/admin' : '/';
        navigate(redirectUrl);
      } else {
        // Reset password flow: redirect to reset password page
        navigate('/reset-password', { state: { email, token: response.data?.token } });
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Mã OTP không hợp lệ');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2d1a10] px-4 py-10"
      style={{ backgroundImage: 'radial-gradient(ellipse at 70% 20%, #6b3a22 0%, #2d1a10 60%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/50 overflow-hidden p-8">
          <h1 className="text-3xl font-black text-amber-900 text-center mb-2">NTSorature</h1>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-stone-400 text-center mb-8">
            Xác thực OTP
          </p>

          {/* Success message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
              <p className="text-green-700 font-medium">{success}</p>
            </div>
          )}

          {/* Email info */}
          <div className="text-center mb-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-sm text-stone-600 mb-1">Mã OTP đã gửi tới:</p>
            <p className="font-semibold text-lg text-amber-800">{email}</p>
            {type === 'login' && (
              <p className="text-xs text-stone-500 mt-2">
                Tài khoản của bạn chưa được xác thực. Vui lòng nhập mã OTP để xác thực.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <InputField
              id="otp"
              type="text"
              label="Mã xác nhận OTP"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              error={error}
              maxLength={6}
              inputClassName="text-center text-2xl tracking-widest font-mono"
            />

            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Xác thực mã OTP
            </Button>
          </form>

          {/* Resend OTP */}
          <div className="mt-6 text-center">
            <p className="text-sm text-stone-500 mb-2">Không nhận được mã?</p>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resendLoading}
              className="text-sm text-amber-700 hover:text-amber-600 font-medium disabled:opacity-50"
            >
              {resendLoading ? 'Đang gửi...' : 'Gửi lại mã OTP'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate(type === 'registration' ? '/register' : '/login')}
              className="text-sm text-stone-500 hover:text-amber-600 font-medium"
            >
              ← Quay lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyPasswordPage;