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
  const [loading, setLoading] = useState(false);
  const email = location.state?.email;
  const type = location.state?.type || 'reset'; // 'registration' or 'reset'

  useEffect(() => {
    if (!email) navigate('/login');
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Mã OTP phải gồm 6 chữ số');
      return;
    }

    setLoading(true);
    try {
      const response = await instance.post('/verify-otp', { email, otp: code });
      setLoading(false);

      if (type === 'registration') {
        // Registration flow: auto-login and redirect to homepage
        const token = response.data?.token;
        const user = response.data?.user;

        if (token) {
          localStorage.setItem('accessToken', token);
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

          <div className="text-center mb-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-sm text-stone-600 mb-1">Mã OTP đã gửi tới:</p>
            <p className="font-semibold text-lg text-amber-800">{email}</p>
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

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate(type === 'registration' ? '/register' : '/forgot-password')}
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