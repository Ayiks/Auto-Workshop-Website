// import { useEffect } from 'react';

// export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
//   // Close on ESC key
//   useEffect(() => {
//     const handleEsc = (e) => {
//       if (e.key === 'Escape') onClose();
//     };
//     if (isOpen) {
//       document.addEventListener('keydown', handleEsc);
//       document.body.style.overflow = 'hidden';
//     }
//     return () => {
//       document.removeEventListener('keydown', handleEsc);
//       document.body.style.overflow = 'unset';
//     };
//   }, [isOpen, onClose]);

//   if (!isOpen) return null;

//   const sizes = {
//     sm: 'max-w-md',
//     md: 'max-w-2xl',
//     lg: 'max-w-4xl',
//     xl: 'max-w-6xl',
//   };

//   return (
//     <div className="fixed inset-0 z-50 overflow-y-auto">
//       {/* Backdrop */}
//       <div
//         className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
//         onClick={onClose}
//       ></div>

//       {/* Modal */}
//       <div className="flex min-h-full items-center justify-center p-4">
//         <div
//           className={`relative bg-white rounded-xl shadow-xl w-full ${sizes[size]} animate-fade-in`}
//           onClick={(e) => e.stopPropagation()}
//         >
//           {/* Header */}
//           <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
//             <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
//             <button
//               onClick={onClose}
//               className="text-gray-400 hover:text-gray-600 transition"
//             >
//               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </button>
//           </div>

//           {/* Body */}
//           <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
//             {children}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import { useEffect, useState } from 'react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const [isVisible, setIsVisible] = useState(false);

  // Handle ESC key and body scroll
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      setIsVisible(true);
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isVisible) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full mx-4',
  };

  return (
    <>
      {/* Modern Backdrop with Blur */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      </div>

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className={`relative w-full transform transition-all duration-300 ease-out ${
              sizes[size]
            } ${
              isOpen
                ? 'translate-y-0 opacity-100 scale-100'
                : 'translate-y-4 opacity-0 scale-95'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Card */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              {title && (
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg sm:text-xl text-gray-900">{title}</h3>
                    <button
                      onClick={onClose}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                      aria-label="Close"
                    >
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Body */}
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-4 sm:p-6">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}