export default function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  actionText,
  className = '' 
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && (
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action && actionText && (
        <button
          onClick={action}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}