import React, { useState } from 'react';

/**
 * InputField
 *
 * Props:
 *  id, name, type, label, placeholder, value, onChange,
 *  error (string), required, autoComplete, icon
 */
const InputField = ({
  id,
  name,
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  autoComplete,
  icon,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-semibold tracking-wide text-stone-700 uppercase"
        >
          {label}
          {required && <span className="text-amber-700 ml-1">*</span>}
        </label>
      )}

      <div className="relative group">
        {/* Left icon */}
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-amber-700 transition-colors duration-200">
            {icon}
          </span>
        )}

        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={`
            w-full rounded-xl border-2 bg-stone-50 py-3.5 text-stone-800
            placeholder:text-stone-400 text-sm font-medium
            outline-none transition-all duration-200
            focus:bg-white focus:border-amber-700 focus:shadow-[0_0_0_4px_rgba(180,83,9,0.10)]
            ${icon ? 'pl-11 pr-4' : 'px-4'}
            ${isPassword ? 'pr-12' : ''}
            ${error ? 'border-red-400 bg-red-50 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.10)]' : 'border-stone-200'}
          `}
        />

        {/* Toggle password visibility */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-amber-700 transition-colors duration-200 focus:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Inline error message */}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500 font-medium mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-.75 5a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0V7zm.75 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default InputField;