import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  ScrollText,
  Flag,
  Terminal,
  AlertTriangle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAdminAuthStore } from '@stores/adminAuthStore';

const navItems = [
  { section: 'Overview', items: [{ label: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true }] },
  {
    section: 'Platform',
    items: [
      { label: 'Businesses', path: '/admin/businesses', icon: Building2 },
      { label: 'Users', path: '/admin/users', icon: Users },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: ScrollText },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Feature Flags', path: '/admin/feature-flags', icon: Flag },
      { label: 'Query Runner', path: '/admin/query', icon: Terminal },
      { label: 'Error Logs', path: '/admin/system-errors', icon: AlertTriangle },
    ],
  },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { superAdmin, logout } = useAdminAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-gray-950 border-r border-gray-800 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800">
          {!collapsed && (
            <div>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-indigo-400" />
                <span className="text-indigo-400 font-bold text-sm tracking-widest uppercase">
                  System Control
                </span>
              </div>
              <p className="text-gray-600 text-xs mt-0.5 ml-6">Gray Manager Platform</p>
            </div>
          )}
          {collapsed && <Shield size={18} className="text-indigo-400 mx-auto" />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-500 hover:text-gray-300 transition-colors ml-auto"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navItems.map((section) => (
            <div key={section.section} className="mb-4">
              {!collapsed && (
                <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-widest px-2 mb-1">
                  {section.section}
                </p>
              )}
              {section.items.map(({ label, path, icon: Icon, exact }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={exact}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    } ${collapsed ? 'justify-center' : ''}`
                  }
                  title={collapsed ? label : undefined}
                >
                  <Icon size={17} className="shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-800 p-3">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="overflow-hidden">
                <p className="text-gray-300 text-xs font-medium truncate">{superAdmin?.fullName}</p>
                <p className="text-gray-600 text-[11px] truncate">{superAdmin?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="text-gray-500 hover:text-red-400 transition-colors ml-2 shrink-0"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex justify-center w-full text-gray-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
