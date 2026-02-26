export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`animate-spin rounded-full border-b-2 border-primary-600 ${sizes[size]}`}></div>
      {text && <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600">{text}</p>}
    </div>
  );
}

// Fullscreen loading overlay
export function LoadingOverlay({ text = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 sm:p-6 shadow-xl mx-4">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
}