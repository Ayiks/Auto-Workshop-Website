import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { adminApi } from '@api/admin';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'REORDER', 'PAYMENT', 'IMPERSONATE'];

function exportCSV(logs) {
  const headers = ['ID', 'Time', 'Business', 'User', 'Action', 'Entity', 'Entity ID', 'Description', 'IP'];
  const rows = logs.map((l) => [
    l.id,
    format(new Date(l.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    l.business?.name || l.businessId,
    l.user?.username || l.userId,
    l.action,
    l.entity,
    l.entityId || '',
    `"${(l.description || '').replace(/"/g, '""')}"`,
    l.ipAddress || '',
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAuditLogs() {
  const [filters, setFilters] = useState({
    businessId: '', userId: '', action: '', entity: '', startDate: '', endDate: '', page: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', filters],
    queryFn: () => adminApi.getAuditLogs({ ...filters, limit: 50 }),
    staleTime: 0,
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  const setFilter = (key, value) => setFilters((p) => ({ ...p, [key]: value, page: 1 }));
  const setPage = (page) => setFilters((p) => ({ ...p, page }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Audit Logs</h1>
          <p className="text-gray-500 text-sm mt-0.5">All user actions across all businesses</p>
        </div>
        <button
          onClick={() => logs.length && exportCSV(logs)}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm px-3 py-2 rounded-lg transition-colors"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <input
          type="text"
          placeholder="Business ID"
          value={filters.businessId}
          onChange={(e) => setFilter('businessId', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          placeholder="User ID"
          value={filters.userId}
          onChange={(e) => setFilter('userId', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <select value={filters.action} onChange={(e) => setFilter('action', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">All Actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          type="text"
          placeholder="Entity (e.g. sale)"
          value={filters.entity}
          onChange={(e) => setFilter('entity', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilter('startDate', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilter('endDate', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                {['Time', 'Business', 'User', 'Action', 'Entity', 'Description', 'IP'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="text-center py-12 text-gray-500">Loading...</td></tr>}
              {!isLoading && logs.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-500">No logs found</td></tr>}
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs max-w-[100px] truncate" title={log.business?.name}>
                    {log.business?.name || <span className="font-mono text-gray-600 text-[10px]">{log.businessId?.slice(0, 8)}…</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{log.user?.username || log.userId}</td>
                  <td className="px-4 py-3">
                    <span className="bg-indigo-500/10 text-indigo-300 text-[11px] px-2 py-0.5 rounded font-mono">{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{log.entity}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate" title={log.description}>
                    {log.description}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-[11px] font-mono">{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
