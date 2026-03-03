import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@stores/authStore";
import { settingsApi } from "@api/settings";

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Fetch business settings
  const { data: settingsData } = useQuery({
    queryKey: ["business-settings"],
    queryFn: settingsApi.getBusinessSettings,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const businessName = settingsData?.data?.name || "Gray Manager";

  const businessLogo = settingsData?.data?.logo;
  const businessInitials = businessName.split(" ").map(word => word.charAt(0)).join("").toUpperCase().slice(0, 2);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Grouped Navigation Structure
  // We keep the client's specific order but wrap them in logical categories
  const navSections = [
    {
      title: "Overview",
      items: [
        {
          name: "Dashboard",
          path: "/app/dashboard",
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
          show: true,
        }
      ]
    },
    {
      title: "Commerce",
      items: [
        {
          name: "Sales",
          path: "/app/sales",
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
          show: hasPermission("sales", "view") || hasPermission("sales", "create"),
        },
        {
          name: "Products",
          path: "/app/materials",
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
          show: hasPermission("materials", "view"),
        },
      ]
    },
    {
      title: "Financials",
      items: [
        {
          name: "Expenses",
          path: "/app/expenses",
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6L9 12.75l4.286-4.286L21 16.5m0 0h-5.25m5.25 0V11.25" /></svg>,
          show: hasPermission("expenses", "view"),
        },
        {
          name: "Revenue",
          path: "/app/finance",
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          show: hasPermission("reports", "view"),
        },
      ]
    },
    {
      title: "Workspace",
      items: [
        {
          name: "Jobs",
          path: "/app/jobs",
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
          show: hasPermission("jobs", "view") || hasPermission("jobs", "viewOwn"),
        },
      ]
    },
    {
      title: "Admin",
      items: [
        {
          name: "Users",
          path: "/app/users",
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
          show: hasPermission("users", "view"),
        },
        {
          name: "Bookings",
          path: "/app/bookings",
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
          show: user?.role === "admin" || user?.role === "sales",
        },
        {
          name: "Settings",
          path: "/app/settings",
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
          show: user?.role === "admin",
        },
      ]
    }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-20"
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20`}
      >
        {/* Logo Area */}
        <div className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4 border-b border-gray-100">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-black rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white font-bold text-xs sm:text-sm">{businessLogo ?? businessInitials}</span>
              </div>
              <h1 className="text-xs sm:text-sm text-gray-900 tracking-tight truncate">
                {businessName.toUpperCase()}
              </h1>
            </div>
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 p-1.5 sm:p-2 bg-black rounded-lg flex items-center justify-center mx-auto shadow-sm flex-shrink-0">
              <span className="text-white font-bold text-xs sm:text-sm">{businessLogo ?? businessInitials}</span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 sm:p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 sm:py-6 px-2 sm:px-3 space-y-4 sm:space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
          {navSections.map((section, idx) => {
            // Filter items based on permissions
            const visibleItems = section.items.filter(item => item.show);
            
            // Don't render empty sections
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx}>
                {isSidebarOpen && section.title && (
                  <h3 className="px-2 sm:px-3 text-[8px] sm:text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 sm:mb-2">
                    {section.title}
                  </h3>
                )}
                
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-all duration-200 ${
                        isActive(item.path)
                          ? "bg-gray-900 text-white shadow-md shadow-gray-900/10"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <div className={`${isActive(item.path) ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`}>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{item.icon}</svg>
                      </div>
                      
                      {isSidebarOpen && (
                        <span className="ml-2 sm:ml-3 truncate text-xs sm:text-sm">
                          {item.name}
                        </span>
                      )}
                      
                      {!isSidebarOpen && (
                         <div className="absolute left-full rounded-md px-2 py-1 ml-4 sm:ml-6 bg-gray-900 text-white text-xs invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 z-50 whitespace-nowrap">
                             {item.name}
                         </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Menu */}
        <div className="border-t border-gray-100 p-2 sm:p-3 bg-white">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center w-full rounded-lg sm:rounded-xl p-1.5 sm:p-2 transition-colors border border-transparent ${showUserMenu ? 'bg-gray-50 border-gray-200' : 'hover:bg-gray-50'}`}
            >
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                <span className="text-gray-700 text-xs sm:text-sm">
                  {user?.fullName?.charAt(0) || user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              
              {isSidebarOpen && (
                <div className="ml-2 sm:ml-3 flex-1 text-left overflow-hidden">
                  <p className="text-xs sm:text-sm text-gray-900 truncate">
                    {user?.fullName || user?.username}
                  </p>
                  <p className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-wide">
                    {user?.role}
                  </p>
                </div>
              )}
              
              {isSidebarOpen && (
                 <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              )}
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg sm:rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100 py-0.5 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}