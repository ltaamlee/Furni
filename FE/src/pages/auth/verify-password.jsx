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
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const email = location.state?.email;
  const type = location.state?.type || 'reset'; 

  useEffect(() => {
    if (!email) navigate('/login');
  }, [email, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Gửi lại mã OTP
  const handleResendOTP = async () => {
    if (countdown > 0 || isResending) return; 
    setError('');
    setSuccessMsg('');
    setIsResending(true);
    
    try {
      const response = await instance.post('/auth/resend-otp', { email, type });

      if (response.success) {
        setSuccessMsg(response.message || 'Mã OTP mới đã được gửi đến email của bạn.');
        setCountdown(60); 
      } else {
        setError(response.message || 'Không thể gửi lại mã OTP lúc này.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setIsResending(false);
    }
  };

  // Xác thực mã OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (code.length !== 6) {
      setError('Mã OTP phải gồm đúng 6 chữ số');
      return;
    }

    setLoading(true);
    try {
      if (type === 'registration') {
        // XÁC THỰC ĐĂNG KÝ
        const response = await instance.post('/auth/verify-otp', { email, otp: code });
        
        if (response.success) {
          const token = response.data?.token;
          const user = response.data?.user;

          if (token) {
            localStorage.setItem('access_token', token);
            setAuth({
              isAuthenticated: true,
              user: { ...user },
            });
            navigate(user?.role === 'admin' ? '/admin' : '/');
          }
        } else {
          setError(response.message || 'Mã xác thực không hợp lệ.');
        }

      } else {
        const response = await instance.post('/auth/check-reset-otp', { email, otp: code });
        
        if (response.success) {
          navigate('/reset-password', { state: { email, otp: code } });
        } else {
          setError(response.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
        }
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2d1a10] px-4 py-10"
      style={{ backgroundImage: 'radial-gradient(ellipse at 70% 20%, #6b3a22 0%, #2d1a10 60%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          <div className="h-1.5 w-full bg-linear-to-r from-amber-900 via-amber-600 to-amber-800" />
          
          <div className="p-8">
            <div className="text-center select-none mb-6">
              <h1 className="text-3xl font-black tracking-tight text-amber-900" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                NTSorature
              </h1>
              <p className="mt-1 text-xs font-semibold tracking-[0.2em] uppercase text-stone-400">
                Xác thực OTP
              </p>
            </div>

            <div className="text-center mb-6 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
              <p className="text-sm text-stone-600 mb-1">Mã xác nhận 6 số đã được gửi tới:</p>
              <p className="font-semibold text-[15px] text-amber-900">{email}</p>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-[13.5px] rounded-lg border border-red-200 font-medium">{error}</div>}
            {successMsg && <div className="mb-4 p-3 bg-green-50 text-green-700 text-[13.5px] rounded-lg border border-green-200 font-medium">{successMsg}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <InputField
                id="otp"
                type="text"
                label="Mã xác nhận OTP"
                placeholder="• • • • • •"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                inputClassName="text-center text-3xl tracking-[0.5em] font-mono font-bold text-amber-950 placeholder:text-stone-300"
              />

              <Button type="submit" variant="primary" fullWidth loading={loading}>
                Xác thực mã OTP
              </Button>
            </form>

            <div className="mt-6 border-t border-stone-100 pt-5 text-center">
              <p className="text-sm text-stone-500 mb-2">Bạn chưa nhận được mã?</p>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={countdown > 0 || isResending}
                className={`text-[13.5px] font-semibold transition-colors ${
                  countdown > 0 
                    ? 'text-stone-400 cursor-not-allowed' 
                    : 'text-amber-800 hover:text-amber-600 hover:underline underline-offset-2'
                }`}
              >
                {isResending ? 'Đang gửi...' : countdown > 0 ? `Gửi lại mã sau ${countdown}s` : 'Gửi lại mã ngay'}
              </button>
            </div>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate(type === 'registration' ? '/register' : '/forgot-password')}
                className="text-sm text-stone-400 hover:text-amber-700 font-medium transition-colors"
              >
                ← Quay lại trang trước
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyPasswordPage;