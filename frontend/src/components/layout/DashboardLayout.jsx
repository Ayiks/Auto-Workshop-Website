// import { useState, useEffect, useRef } from 'react'; // Kept your imports
// import { Link, useLocation, useNavigate } from 'react-router-dom';
// import useAuthStore from '../../store/authStore';

// export default function DashboardLayout({ children }) {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [isDropdownOpen, setIsDropdownOpen] = useState(false);
//   const dropdownRef = useRef(null);

//   const location = useLocation();
//   const navigate = useNavigate();
//   const { user, logout } = useAuthStore();

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setIsDropdownOpen(false);
//       }
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   // ... (getNavItems logic remains the same) ...
//   const getNavItems = () => {
//     if (user?.role === 'admin') {
//       return [
//         { path: '/dashboard', label: 'Dashboard', icon: '📊' },
//         { path: '/materials', label: 'Materials', icon: '📦' },
//         { path: '/sales', label: 'Sales', icon: '💰' },
//         { path: '/reports', label: 'Reports', icon: '📈' },
//         { path: '/jobs', label: 'Jobs', icon: '🔧' },
//         { path: '/expenses', label: 'Expenses', icon: '💸' },
//       ];
//     }
//     // ... other roles ...
//     return [];
//   };

//   const navItems = getNavItems();

//   return (
//     // CHANGE 1: Use 'h-screen' (fixed height) and 'overflow-hidden' to stop window scrolling
//     <div className="h-screen bg-gray-50 flex overflow-hidden">
      
//       {/* Mobile Overlay */}
//       {isSidebarOpen && (
//         <div 
//           className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
//           onClick={() => setIsSidebarOpen(false)}
//         />
//       )}

//       {/* Sidebar */}
//       <aside className={`
//         fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
//         md:relative md:translate-x-0 flex flex-col
//         ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
//       `}>
//         <div className="p-6 flex justify-between items-center shrink-0">
//           <h1 className="text-xl font-extrabold text-gray-800">Auto Workshop</h1>
//           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500">
//             ✕
//           </button>
//         </div>
        
//         {/* CHANGE 2: Add overflow-y-auto here too, so if the menu is long, IT scrolls, not the page */}
//         <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
//           {navItems.map((item) => (
//             <Link
//               key={item.path}
//               to={item.path}
//               onClick={() => setIsSidebarOpen(false)}
//               className={`flex items-center p-3 rounded-xl transition-all text-sm font-medium ${
//                 location.pathname === item.path
//                   ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
//                   : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
//               }`}
//             >
//               <span className="mr-3 text-lg">{item.icon}</span>
//               {item.label}
//             </Link>
//           ))}
//         </nav>
//       </aside>

//       {/* Main Content Wrapper */}
//       <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
//         <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30 shrink-0">
//           <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg bg-gray-50 md:hidden">
//             <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
//           </button>

//           <div className="flex-1" />

//           <div className="relative" ref={dropdownRef}>
//             <button 
//               onClick={() => setIsDropdownOpen(!isDropdownOpen)}
//               className="flex items-center gap-3 p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
//             >
//               <div className="hidden md:block text-right">
//                 <p className="text-xs font-bold text-gray-800">{user?.fullName || user?.username}</p>
//                 <p className="text-[10px] text-gray-400 uppercase tracking-wider">{user?.role}</p>
//               </div>
//               <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">
//                 {(user?.username || "U").charAt(0).toUpperCase()}
//               </div>
//             </button>

//             {isDropdownOpen && (
//               <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in duration-150">
//                 <div className="px-4 py-2 border-b border-gray-50 md:hidden">
//                     <p className="text-sm font-bold text-gray-800">{user?.fullName}</p>
//                     <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
//                 </div>
//                 <button 
//                   onClick={handleLogout}
//                   className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
//                 >
//                   <span className="mr-2">🚪</span> Logout
//                 </button>
//               </div>
//             )}
//           </div>
//         </header>

//         {/* CHANGE 3: The <main> tag gets overflow-y-auto. This creates the internal scrollbar */}
//         <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in duration-500">
//           {children}
//         </main>

//       </div>
//     </div>
//   );
// }

import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Navigation items based on permissions
  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      show: true,
    },
    {
      name: 'Materials',
      path: '/materials',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      show: hasPermission('materials', 'view'),
    },
    {
      name: 'Sales',
      path: '/sales',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      show: hasPermission('sales', 'view') || hasPermission('sales', 'create'),
    },
    {
      name: 'Jobs',
      path: '/jobs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      show: hasPermission('jobs', 'view') || hasPermission('jobs', 'viewOwn'),
    },
    {
      name: 'Finance',
      path: '/finance',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      show: hasPermission('reports', 'view'),
    },
    {
      name: 'Users',
      path: '/users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      show: hasPermission('users', 'view'),
    },
    {
      name: 'Bookings',
      path: '/bookings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      show: user?.role === 'admin' || user?.role === 'sales',
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      show: user?.role === 'admin',
    },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {isSidebarOpen ? (
            <h1 className="text-xl font-bold text-primary-600">Auto Workshop</h1>
          ) : (
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AW</span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.filter(item => item.show).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 mx-2 rounded-lg transition mb-1 ${
                isActive(item.path)
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              {isSidebarOpen && <span className="ml-3 font-medium">{item.name}</span>}
            </Link>
          ))}
        </nav>

        {/* User Menu */}
        <div className="border-t border-gray-200 p-4">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center w-full hover:bg-gray-50 rounded-lg p-2 transition"
            >
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user?.fullName?.charAt(0) || user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              {isSidebarOpen && (
                <div className="ml-3 flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">{user?.fullName || user?.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              )}
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}