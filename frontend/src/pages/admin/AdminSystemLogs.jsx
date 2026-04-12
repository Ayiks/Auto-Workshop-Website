import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { adminApi } from '@api/admin';
import toast from 'react-hot-toast';

function ErrorDetailRow({ log, onResolve }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
          {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
        </td>
        <td className="px-4 py-3">
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
            (log.statusCode || 500) >= 500 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            {log.statusCode || '?'}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-400 text-xs font-mono">
          {log.method} {log.endpoint}
        </td>
        <td className="px-4 py-3 text-gray-300 text-xs max-w-60">
          <div className="flex items-start gap-1">
            <span className="truncate flex-1">{log.message}</span>
            {log.stack && (
              <button onClick={() => setExpanded(!expanded)} className="text-gray-600 hover:text-gray-400 shrink-0">
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-gray-500 text-xs">{log.businessId ? <span className="font-mono text-[10px]">{log.businessId.slice(0, 8)}…</span> : '—'}</td>
        <td className="px-4 py-3">
          {log.resolved ? (
            <span className="text-green-400 text-[11px] flex items-center gap-1">
              <CheckCircle size={11} /> Resolved
            </span>
          ) : (
            <span className="text-red-400 text-[11px]">Open</span>
          )}
        </td>
        <td className="px-4 py-3">
          {!log.resolved && (
            <button
              onClick={() => onResolve(log.id)}
              className="text-gray-500 hover:text-green-400 transition-colors"
              title="Mark as resolved"
            >
              <CheckCircle size={14} />
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-700/50 bg-gray-900/50">
          <td colSpan={7} className="px-4 py-3">
            <pre className="text-red-300 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-40">
              {log.stack}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminSystemLogs() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    resolved: 'false', statusCode: '', startDate: '', endDate: '', page: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-system-errors', filters],
    queryFn: () => adminApi.getSystemErrors({ ...filters, limit: 50 }),
    staleTime: 0,
  });

  const resolveMutation = useMutation({
    mutationFn: (id) => adminApi.resolveError(id),
    onSuccess: () => {
      toast.success('Error marked as resolved');
      queryClient.invalidateQueries({ queryKey: ['admin-system-errors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  const setFilter = (key, value) => setFilters((p) => ({ ...p, [key]: value, page: 1 }));
  const setPage = (page) => setFilters((p) => ({ ...p, page }));

  const unresolvedCount = logs.filter((l) => !l.resolved).length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">System Error Logs</h1>
          <p className="text-gray-500 text-sm mt-0.5">Server errors captured automatically</p>
        </div>
        {unresolvedCount > 0 && (
          <button
            onClick={() => {
              if (window.confirm(`Mark all ${unresolvedCount} visible unresolved errors as resolved?`)) {
                Promise.all(logs.filter((l) => !l.resolved).map((l) => resolveMutation.mutateAsync(l.id)))
                  .then(() => toast.success('All resolved'))
                  .catch(() => {});
              }
            }}
            className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm px-3 py-2 rounded-lg transition-colors"
          >
            Resolve All ({unresolvedCount})
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filters.resolved} onChange={(e) => setFilter('resolved', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">All</option>
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
        </select>
        <input
          type="number"
          placeholder="Status code (e.g. 500)"
          value={filters.statusCode}
          onChange={(e) => setFilter('statusCode', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-44"
        />
        <input type="date" value={filters.startDate} onChange={(e) => setFilter('startDate', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
        <input type="date" value={filters.endDate} onChange={(e) => setFilter('endDate', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                {['Time', 'Code', 'Endpoint', 'Message', 'Business', 'Status', 'Action'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="text-center py-12 text-gray-500">Loading...</td></tr>}
              {!isLoading && logs.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">
                  {filters.resolved === 'false' ? 'No unresolved errors — all clear!' : 'No errors found'}
                </td></tr>
              )}
              {logs.map((log) => (
                <ErrorDetailRow key={log.id} log={log} onResolve={(id) => resolveMutation.mutate(id)} />
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

      <p className="text-gray-600 text-xs">
        Click the expand icon on a row to see the full stack trace.
      </p>
    </div>
  );
}
