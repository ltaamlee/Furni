import React from 'react';

/**
 * Button – reusable button component
 *
 * Props:
 *  children, onClick, type, variant ('primary' | 'outline' | 'ghost' | 'social'),
 *  loading, disabled, fullWidth, icon (ReactNode), className
 */
const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  className = '',
}) => {
  const base = `
    relative inline-flex items-center justify-center gap-2.5
    rounded-xl font-semibold text-sm tracking-wide
    transition-all duration-200 focus:outline-none
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-amber-900 to-amber-700
      text-white px-6 py-3.5
      shadow-md shadow-amber-900/30
      hover:from-amber-800 hover:to-amber-600
      hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-900/40
      active:translate-y-0 active:shadow-md
      focus-visible:ring-4 focus-visible:ring-amber-700/40
    `,
    outline: `
      border-2 border-stone-200 bg-white text-stone-700
      px-6 py-3.5
      hover:border-amber-700 hover:text-amber-800 hover:bg-amber-50
      focus-visible:ring-4 focus-visible:ring-amber-700/20
    `,
    ghost: `
      text-amber-800 px-4 py-2
      hover:bg-amber-50 rounded-lg
      focus-visible:ring-4 focus-visible:ring-amber-700/20
    `,
    social: `
      border-2 border-stone-200 bg-white text-stone-700
      px-5 py-3
      hover:border-amber-700 hover:bg-amber-50 hover:text-amber-800
      focus-visible:ring-4 focus-visible:ring-amber-700/20
    `,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <>
          <svg
            className="w-4 h-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
          </svg>
          <span>Đang xử lý...</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;