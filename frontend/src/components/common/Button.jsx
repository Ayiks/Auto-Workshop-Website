export default function Button  ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false, 
  icon, 
  onClick, 
  type = 'button',
  className = '',
  ...props 
})  {
  
  // 1. Core behavior and 2026 aesthetic (soft shadows, rounded-xl)
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed";

  // 2. Variants linked to your new index.css colors
  const variants = {
    primary: "bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow-primary-200 shadow-lg",
    success: "bg-success-600 text-white shadow-sm hover:bg-success-700",
    danger: "bg-danger-600 text-white shadow-sm hover:bg-danger-700",
    outline: "bg-transparent border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
  };

  // 3. Size scales - responsive padding
  const sizes = {
    sm: "px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs",
    md: "px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm",
    lg: "px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      // Note: No 'cursor' prop here; 'disabled:cursor-not-allowed' is in baseStyles
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Processing...</span>
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
