import { useState, useEffect, useRef } from 'react'; // Kept your imports
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ... (getNavItems logic remains the same) ...
  const getNavItems = () => {
    if (user?.role === 'admin') {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/materials', label: 'Materials', icon: '📦' },
        { path: '/sales', label: 'Sales', icon: '💰' },
        { path: '/reports', label: 'Reports', icon: '📈' },
        { path: '/jobs', label: 'Jobs', icon: '🔧' },
        { path: '/expenses', label: 'Expenses', icon: '💸' },
      ];
    }
    // ... other roles ...
    return [];
  };

  const navItems = getNavItems();

  return (
    // CHANGE 1: Use 'h-screen' (fixed height) and 'overflow-hidden' to stop window scrolling
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex justify-between items-center shrink-0">
          <h1 className="text-xl font-extrabold text-gray-800">Auto Workshop</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500">
            ✕
          </button>
        </div>
        
        {/* CHANGE 2: Add overflow-y-auto here too, so if the menu is long, IT scrolls, not the page */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center p-3 rounded-xl transition-all text-sm font-medium ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg bg-gray-50 md:hidden">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>

          <div className="flex-1" />

          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
            >
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-gray-800">{user?.fullName || user?.username}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">
                {(user?.username || "U").charAt(0).toUpperCase()}
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in duration-150">
                <div className="px-4 py-2 border-b border-gray-50 md:hidden">
                    <p className="text-sm font-bold text-gray-800">{user?.fullName}</p>
                    <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                >
                  <span className="mr-2">🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* CHANGE 3: The <main> tag gets overflow-y-auto. This creates the internal scrollbar */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </main>

      </div>
    </div>
  );
}