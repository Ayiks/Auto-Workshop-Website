// src/components/common/PhoneInput.jsx
import { useState, useEffect } from 'react';

export const COUNTRIES = [
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+1',   flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
];

// Sort longer codes first so +233 is tried before a hypothetical +2
const SORTED = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);

export const parsePhone = (value) => {
  if (!value) return { code: '+233', number: '' };
  const str = String(value);
  for (const c of SORTED) {
    if (str.startsWith(c.code)) {
      return { code: c.code, number: str.slice(c.code.length) };
    }
  }
  // Starts with + but unknown country — keep raw in the number field
  return { code: '+233', number: str };
};

/**
 * PhoneInput — country-code picker + local number input.
 *
 * Props:
 *   value       {string}   full phone string e.g. "+233241234567"
 *   onChange    {fn}       called with full phone string on every change
 *   disabled    {boolean}
 *   placeholder {string}
 *   error       {string}   error message to show below the input
 *   className   {string}   wrapper class overrides
 *   inputCls    {string}   extra classes for the text input
 */
export default function PhoneInput({
  value = '',
  onChange,
  disabled = false,
  placeholder = 'Local number',
  error = '',
  className = '',
  inputCls = '',
}) {
  const [countryCode, setCountryCode] = useState(() => parsePhone(value).code);
  const [localNumber, setLocalNumber] = useState(() => parsePhone(value).number);

  // Sync when parent updates value (e.g. form reset or prefill from API)
  useEffect(() => {
    const { code, number } = parsePhone(value);
    setCountryCode(code);
    setLocalNumber(number);
  }, [value]);

  const emit = (code, number) => onChange && onChange(code + number);

  const handleCodeChange = (e) => {
    const code = e.target.value;
    setCountryCode(code);
    emit(code, localNumber);
  };

  const handleNumberChange = (e) => {
    const num = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
    setLocalNumber(num);
    emit(countryCode, num);
  };

  const ring = error
    ? 'border-red-300 focus-within:ring-2 focus-within:ring-red-200 focus-within:border-red-400'
    : 'border-gray-300 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500';

  const bg = disabled ? 'bg-gray-50' : 'bg-white';

  return (
    <div className={className}>
      <div className={`flex rounded-lg border overflow-hidden transition-all ${ring} ${bg}`}>
        {/* Country Code */}
        <select
          value={countryCode}
          onChange={handleCodeChange}
          disabled={disabled}
          aria-label="Country code"
          className={`shrink-0 border-r border-gray-200 pl-2 pr-1 py-2 text-xs sm:text-sm font-medium text-gray-700 focus:outline-none cursor-pointer disabled:text-gray-400 disabled:cursor-default ${bg}`}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code}
            </option>
          ))}
        </select>

        {/* Number */}
        <input
          type="tel"
          value={localNumber}
          onChange={handleNumberChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm text-gray-900 bg-transparent focus:outline-none disabled:text-gray-500 placeholder:text-gray-400 ${inputCls}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Validate a full phone string (countryCode + localNumber). */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 9; // e.g. +233 + 8 digits = 11 total digits
};
