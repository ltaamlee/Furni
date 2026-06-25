import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import instance from '../../utils/axios.customize'; 


const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16v16H4z" />
    <path d="m22 6-10 7L2 6" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MapPinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-stone-600 hover:text-stone-800 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-stone-600 hover:text-stone-800 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);


const RegisterPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    username: '',
    password: '',
    confirmPassword: '', 
    role: 'customer'
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
    if (generalError) setGeneralError('');
    if (message) setMessage('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ và tên.';
    
    if (!form.email.trim()) {
      newErrors.email = 'Vui lòng nhập email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Email không hợp lệ.';
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!/(84|0[3|5|7|8|9])+([0-9]{8})\b/.test(form.phone)) {
      newErrors.phone = 'Số điện thoại Việt Nam hợp lệ (gồm 10 số).';
    }

    if (!form.address.trim()) newErrors.address = 'Vui lòng nhập địa chỉ.';
    
    if (!form.username.trim()) newErrors.username = 'Vui lòng nhập tên đăng nhập.';

    if (!form.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (form.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      newErrors.password = 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số.';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp!';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setMessage('');

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const data = await instance.post('/auth/register', form);

      if (data.success) {
        setMessage('Đăng ký thành công! Đang chuyển hướng...');
        setTimeout(() => navigate('/verify-password', { state: { email: form.email, type: 'registration' } }), 1500);
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          const backendErrors = {};
          data.errors.forEach(err => {
            const fieldName = err.path || err.param;
            if (fieldName) backendErrors[fieldName] = err.msg;
          });
          setErrors(backendErrors);
        } else {
          const msg = data.message || '';
          const msgStr = typeof msg === 'string' ? msg : msg.join(', ');
          
          if (msgStr.toLowerCase().includes('email')) {
            setErrors({ email: msgStr });
          } else if (msgStr.toLowerCase().includes('tên đăng nhập') || msgStr.toLowerCase().includes('username')) {
            setErrors({ username: msgStr });
          } else {
            setGeneralError(msgStr || 'Đăng ký thất bại!');
          }
        }
      }
    } catch (err) {
      setGeneralError('Lỗi kết nối máy chủ, vui lòng thử lại sau!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2d1a10] py-8"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 70% 20%, #6b3a22 0%, #2d1a10 60%)'
      }}>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden mx-4">
        {/* Top bar */}
        <div className="h-1.5 bg-linear-to-r from-amber-900 via-amber-600 to-amber-800" />

        <div className="p-8 space-y-5">
          {/* Brand */}
          <div className="text-center select-none">
            <h1 className="text-3xl font-black tracking-tight text-amber-900" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              Sora
            </h1>
            <p className="mt-1 text-xs font-semibold tracking-[0.2em] uppercase text-stone-400">
              Đăng ký tài khoản
            </p>
          </div>

          {generalError && <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg font-medium">{generalError}</div>}
          {message && <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg font-medium">{message}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input icon={<UserIcon />} name="fullName" placeholder="Họ và tên (*)" onChange={handleChange} value={form.fullName} error={errors.fullName} />
            <Input icon={<MailIcon />} name="email" type="email" placeholder="Email (*)" onChange={handleChange} value={form.email} error={errors.email} />
            <Input icon={<PhoneIcon />} name="phone" placeholder="Số điện thoại (*)" onChange={handleChange} value={form.phone} error={errors.phone} />
            <Input icon={<MapPinIcon />} name="address" placeholder="Địa chỉ (*)" onChange={handleChange} value={form.address} error={errors.address} />
            <Input icon={<UserIcon />} name="username" placeholder="Tên đăng nhập (*)" onChange={handleChange} value={form.username} error={errors.username} />
            <Input icon={<LockIcon />} name="password" type="password" placeholder="Mật khẩu (*)" onChange={handleChange} value={form.password} error={errors.password} />
            <Input icon={<LockIcon />} name="confirmPassword" type="password" placeholder="Xác nhận mật khẩu (*)" onChange={handleChange} value={form.confirmPassword} error={errors.confirmPassword} />

            <button
              disabled={loading}
              className="w-full mt-5 bg-amber-900 hover:bg-amber-800 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Đang xử lý...' : 'Đăng ký ngay'}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-stone-500 pt-3 border-t border-stone-100">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-bold text-amber-900 hover:text-amber-700 hover:underline transition-colors">
              Đăng nhập tại đây
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const Input = ({ icon, error, type = "text", ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === "password";
  const inputType = isPasswordField ? (showPassword ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center border ${error ? 'border-red-400 focus-within:ring-red-500 bg-red-50/30' : 'border-stone-200 focus-within:ring-amber-700 bg-white'} rounded-xl px-3 py-2 focus-within:ring-2 transition-shadow`}>
        <div className="flex-shrink-0 flex items-center justify-center">
          {icon}
        </div>
        <input
          type={inputType}
          {...props}
          className={`w-full ml-2 outline-none text-[14px] bg-transparent ${error ? 'text-red-900 placeholder:text-red-400' : 'text-stone-700 placeholder:text-stone-400'}`}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="flex-shrink-0 ml-2 focus:outline-none flex items-center justify-center p-1 cursor-pointer text-stone-400 hover:text-stone-700"
            title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {error && <span className="text-[12.5px] text-red-600 font-medium ml-1.5">{error}</span>}
    </div>
  );
};

export default RegisterPage;