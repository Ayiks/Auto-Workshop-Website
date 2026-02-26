export default function Select({
  label,
  name,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  error,
  className = '',
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-xs sm:text-sm text-gray-700 mb-1.5 sm:mb-2">
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-lg transition focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-xs sm:text-sm ${
          error ? 'border-danger-500' : 'border-gray-300'
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs sm:text-sm text-danger-600">{error}</p>}
    </div>
  );
}