import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { adminApi } from '@api/admin';
import UserManagePanel from '@components/admin/UserManagePanel';

const ROLES = ['admin', 'sales', 'mechanic', 'sprayer', 'bodyworks'];

export default function AdminUsers() {
  const [filters, setFilters] = useState({ search: '', role: '', isActive: '', page: 1 });
  const [selectedUser, setSelectedUser] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-all-users', filters],
    queryFn: () => adminApi.getAllUsers({ ...filters, limit: 25 }),
    staleTime: 0,
  });

  const users = data?.data || [];
  const pagination = data?.pagination;

  const setFilter = (key, value) => setFilters((p) => ({ ...p, [key]: value, page: 1 }));
  const setPage = (page) => setFilters((p) => ({ ...p, page }));

  return (
    <div className="p-6 space-y-5">
      {selectedUser && (
        <UserManagePanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          invalidateKeys={[['admin-all-users', filters], ['admin-stats']]}
        />
      )}

      <div>
        <h1 className="text-white text-xl font-bold">All Users</h1>
        <p className="text-gray-500 text-sm mt-0.5">Cross-tenant user management</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-56"
          />
        </div>
        <select value={filters.role} onChange={(e) => setFilter('role', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.isActive} onChange={(e) => setFilter('isActive', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">All</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {['ID', 'Username', 'Full Name', 'Role', 'Business', 'Email Verified', 'Status', 'Last Login', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="text-center py-12 text-gray-500">Loading...</td></tr>}
            {!isLoading && users.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-gray-500">No users found</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                <td className="px-4 py-3 text-gray-500 text-xs">{u.id}</td>
                <td className="px-4 py-3 text-white font-mono text-xs">{u.username}</td>
                <td className="px-4 py-3 text-gray-300 text-sm">{u.fullName || '—'}</td>
                <td className="px-4 py-3">
                  <span className="bg-gray-700 text-gray-300 text-[11px] px-2 py-0.5 rounded-full capitalize">{u.role}</span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs max-w-28 truncate" title={u.business?.name}>
                  {u.business?.name || <span className="text-gray-600 italic">none</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${u.isEmailVerified ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-400'}`}>
                    {u.isEmailVerified ? 'Verified' : 'Unverified'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {u.lastLogin ? format(new Date(u.lastLogin), 'MMM d, yyyy') : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedUser(u)}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Settings2 size={13} />
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <p className="text-gray-500 text-xs">
              {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(pagination.page - 1)} disabled={pagination.page === 1}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage(pagination.page + 1)} disabled={pagination.page === pagination.pages}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
