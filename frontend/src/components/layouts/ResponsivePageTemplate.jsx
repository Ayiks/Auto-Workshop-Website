// src/components/layouts/ResponsivePageTemplate.jsx
/**
 * Template for creating responsive pages
 * Copy this structure when creating new pages
 */
import React from 'react';
import { useResponsive } from '@hooks/useResponsive';
import { RESPONSIVE_SPACING } from '@utils/responsiveHelpers';

export default function ResponsivePageTemplate() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER SECTION - Full width, sticky on all devices */}
      <header className="sticky top-0 z-10 bg-white shadow-sm md:shadow-md">
        <div className={`container mx-auto ${RESPONSIVE_SPACING.container}`}>
          <div className="py-3 sm:py-4 md:py-5">
            <h1 className={RESPONSIVE_SPACING.heading}>Page Title</h1>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT SECTION */}
      <main className={`${RESPONSIVE_SPACING.section}`}>
        <div className={`container mx-auto ${RESPONSIVE_SPACING.container}`}>
          
          {/* CONTENT GRID - Responsive at all breakpoints */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            
            {/* SIDEBAR - Hidden on mobile, visible on md and up */}
            <aside className="hidden md:block md:col-span-1">
              <div className="bg-white p-4 sm:p-6 rounded-lg md:rounded-xl shadow-sm sticky top-[4rem] md:top-20">
                <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Filters</h2>
                {/* Sidebar content */}
              </div>
            </aside>

            {/* MAIN CONTENT - Full width on mobile, wider on desktop */}
            <section className="md:col-span-2">
              <div className="space-y-4 sm:space-y-6 md:space-y-8">
                
                {/* CARD COMPONENT - Responsive internally */}
                <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg md:rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6">
                    Card Title
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    Card content with responsive text sizing
                  </p>
                </div>

                {/* RESPONSIVE DATA TABLE/LIST */}
                <div className="bg-white rounded-lg md:rounded-xl shadow-sm overflow-hidden">
                  {/* Mobile-friendly: Stack view */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {[1, 2, 3].map(item => (
                      <div key={item} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-sm">Item {item}</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Status</span>
                        </div>
                        <p className="text-xs text-gray-600">Item description</p>
                      </div>
                    ))}
                  </div>

                  {/* Desktop-friendly: Table view */}
                  <table className="hidden md:table w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[1, 2, 3].map(item => (
                        <tr key={item} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">Item {item}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* FOOTER SECTION - Responsive flex layout */}
      <footer className="bg-white border-t border-gray-200 mt-16 sm:mt-20 md:mt-24">
        <div className={`container mx-auto ${RESPONSIVE_SPACING.container}`}>
          <div className="py-8 sm:py-10 md:py-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 sm:gap-8">
            {[1, 2, 3, 4].map(col => (
              <div key={col}>
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4">Section {col}</h4>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-600">
                  <li><a href="#" className="hover:text-gray-900">Link 1</a></li>
                  <li><a href="#" className="hover:text-gray-900">Link 2</a></li>
                  <li><a href="#" className="hover:text-gray-900">Link 3</a></li>
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 py-6 sm:py-8 text-center text-xs sm:text-sm text-gray-600">
            <p>&copy; 2026 Gray Manager. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
