import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import instance from '../../utils/axios.customize';
import InputField from '../../components/common/inputFields';
import Button from '../../components/common/button';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const email = location.state?.email;
  const otp = location.state?.otp;

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !otp) {
      navigate('/login');
    }
  }, [email, otp, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!form.newPassword || !form.confirmPassword) {
      setError('Vui lòng nhập đầy đủ mật khẩu mới và xác nhận.');
      return;
    }

    if (form.newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const response = await instance.post('/auth/reset-password', { 
        email, 
        otp, 
        newPassword: form.newPassword 
      });

      if (response.success) {
        setSuccessMsg('Đổi mật khẩu thành công! Đang chuyển về trang đăng nhập...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.message || 'Có lỗi xảy ra. Mã OTP có thể đã hết hạn.');
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
                Sora
              </h1>
              <p className="mt-1 text-xs font-semibold tracking-[0.2em] uppercase text-stone-400">
                Đặt lại mật khẩu
              </p>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-[13.5px] rounded-lg border border-red-200 font-medium">{error}</div>}
            {successMsg && <div className="mb-4 p-3 bg-green-50 text-green-700 text-[13.5px] rounded-lg border border-green-200 font-medium">{successMsg}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              <InputField
                id="newPassword"
                name="newPassword"
                type="password"
                label="Mật khẩu mới"
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                value={form.newPassword}
                onChange={handleChange}
              />

              <InputField
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label="Xác nhận mật khẩu mới"
                placeholder="Nhập lại mật khẩu mới"
                value={form.confirmPassword}
                onChange={handleChange}
              />

              <div className="pt-2">
                <Button type="submit" variant="primary" fullWidth loading={loading}>
                  Xác nhận đổi mật khẩu
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center border-t border-stone-100 pt-5">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-stone-400 hover:text-amber-700 font-medium transition-colors"
              >
                Hủy và quay lại đăng nhập
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;