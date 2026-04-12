import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, ChevronLeft, ChevronRight, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { adminApi } from '@api/admin';
import toast from 'react-hot-toast';

const planBadge = (plan) => (
  <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${plan === 'pro' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-700 text-gray-400'}`}>
    {plan}
  </span>
);

const subscriptionBadge = (status) => {
  const styles = { active: 'bg-green-500/20 text-green-300', pending: 'bg-amber-500/20 text-amber-300', cancelled: 'bg-red-500/20 text-red-300' };
  return <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[status] || 'bg-gray-700 text-gray-400'}`}>{status}</span>;
};

export default function AdminBusinesses() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ search: '', plan: '', subscriptionStatus: '', isActive: '', page: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-businesses', filters],
    queryFn: () => adminApi.getBusinesses({ ...filters, limit: 20 }),
    staleTime: 0,
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => adminApi.toggleBusinessStatus(id),
    onSuccess: (res) => {
      const { isActive } = res.data;
      toast.success(`Business ${isActive ? 'activated' : 'deactivated'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const businesses = data?.data || [];
  const pagination = data?.pagination;

  const setFilter = (key, value) => setFilters((p) => ({ ...p, [key]: value, page: 1 }));
  const setPage = (page) => setFilters((p) => ({ ...p, page }));

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-white text-xl font-bold">Businesses</h1>
        <p className="text-gray-500 text-sm mt-0.5">All registered businesses on the platform</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search businesses..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-56"
          />
        </div>
        <select value={filters.plan} onChange={(e) => setFilter('plan', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
        <select value={filters.subscriptionStatus} onChange={(e) => setFilter('subscriptionStatus', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={filters.isActive} onChange={(e) => setFilter('isActive', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">Active & Inactive</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {['Name', 'Plan', 'Subscription', 'Users', 'Created', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">Loading...</td></tr>
            )}
            {!isLoading && businesses.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">No businesses found</td></tr>
            )}
            {businesses.map((b) => (
              <tr key={b.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{b.name}</p>
                  <p className="text-gray-500 text-[11px] font-mono mt-0.5 truncate max-w-[160px]">{b.id}</p>
                </td>
                <td className="px-4 py-3">{planBadge(b.plan)}</td>
                <td className="px-4 py-3">{subscriptionBadge(b.subscriptionStatus)}</td>
                <td className="px-4 py-3 text-gray-300">{b._count?.users ?? 0}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(b.createdAt), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${b.isActive ? 'bg-green-500/20 text-green-300' : 'bg-gray-700 text-gray-500'}`}>
                    {b.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/admin/businesses/${b.id}`)}
                      className="text-gray-400 hover:text-indigo-400 transition-colors"
                      title="View details"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`${b.isActive ? 'Deactivate' : 'Activate'} "${b.name}"?`)) {
                          toggleMutation.mutate(b.id);
                        }
                      }}
                      className={`transition-colors ${b.isActive ? 'text-green-400 hover:text-red-400' : 'text-gray-500 hover:text-green-400'}`}
                      title={b.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {b.isActive ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <p className="text-gray-500 text-xs">
              {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(pagination.page - 1)} disabled={pagination.page === 1}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage(pagination.page + 1)} disabled={pagination.page === pagination.pages}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
