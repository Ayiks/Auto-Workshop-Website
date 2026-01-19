export default function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  min,
  max,
  step,
  className = '',
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={`w-full px-4 py-2.5 border rounded-lg transition focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
          error ? 'border-danger-500' : 'border-gray-300'
        }`}
      />
      {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
    </div>
  );
}

// Textarea variant
export function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  rows = 4,
  className = '',
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`w-full px-4 py-2.5 border rounded-lg transition focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
          error ? 'border-danger-500' : 'border-gray-300'
        }`}
      />
      {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
    </div>
  );
}