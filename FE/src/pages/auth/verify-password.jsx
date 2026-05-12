import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import instance from '../../utils/axios.customize';
import InputField from '../../components/common/inputFields';
import Button from '../../components/common/button';

const VerifyPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const email = location.state?.email;

  useEffect(() => {
    if (!email) navigate('/forgot-password');
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Mã OTP phải 6 chữ số');
      return;
    }

    setLoading(true);
    try {
      const response = await instance.post('/auth/verify-otp', { email, otp: code });
      setLoading(false);
      navigate('/reset-password', { state: { email, token: response.token } });
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Mã OTP không hợp lệ');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2d1a10] px-4 py-10"
      style={{ backgroundImage: 'radial-gradient(ellipse at 70% 20%, #6b3a22 0%, #2d1a10 60%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/50 overflow-hidden p-8">
          <h1 className="text-3xl font-black text-amber-900 text-center mb-2">NTFurniture</h1>
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
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-stone-500 hover:text-amber-600 font-medium"
            >
              ← Quay lại nhập email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyPasswordPage;