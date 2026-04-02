export default function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  actionText,
  className = '' 
}) {
  return (
    <div className={`text-center py-8 sm:py-12 px-4 ${className}`}>
      {icon && (
        <div className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base sm:text-lg text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action && actionText && (
        <button
          onClick={action}
          className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent shadow-sm text-xs sm:text-sm rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}