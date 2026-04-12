import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Terminal, AlertTriangle, ChevronUp, ChevronDown, X } from 'lucide-react';
import { adminApi } from '@api/admin';

const MAX_HISTORY = 5;

function ConfirmModal({ sql, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-400" />
          <h2 className="text-white font-semibold">Execute Query</h2>
        </div>
        <p className="text-gray-400 text-sm mb-3">You are about to execute the following query against the live database:</p>
        <pre className="bg-gray-900 rounded-lg p-3 text-green-400 text-xs font-mono overflow-x-auto mb-4 max-h-40">
          {sql}
        </pre>
        <p className="text-amber-400 text-xs mb-4">This action is logged and cannot be undone. Only SELECT is permitted.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm py-2 rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm py-2 rounded-lg transition-colors">Execute</button>
        </div>
      </div>
    </div>
  );
}

function ResultsTable({ rows }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  if (!rows || rows.length === 0) return <p className="text-gray-500 text-sm">Query returned 0 rows.</p>;

  const columns = Object.keys(rows[0]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey] ?? '';
        const bv = b[sortKey] ?? '';
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : rows;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-900">
            {columns.map((col) => (
              <th
                key={col}
                onClick={() => handleSort(col)}
                className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase tracking-wide cursor-pointer hover:text-gray-200 whitespace-nowrap select-none"
              >
                <div className="flex items-center gap-1">
                  {col}
                  {sortKey === col ? (
                    sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/20">
              {columns.map((col) => (
                <td key={col} className="px-4 py-2.5 text-gray-300 text-xs font-mono max-w-[200px] truncate" title={String(row[col] ?? '')}>
                  {row[col] === null ? <span className="text-gray-600 italic">null</span> : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminQueryRunner() {
  const [sql, setSql] = useState('SELECT id, name, plan, "subscription_status", "is_active", "created_at"\nFROM businesses\nORDER BY created_at DESC\nLIMIT 10;');
  const [showConfirm, setShowConfirm] = useState(false);
  const [results, setResults] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [history, setHistory] = useState([]);
  const textareaRef = useRef(null);

  const queryMutation = useMutation({
    mutationFn: () => adminApi.runQuery(sql),
    onSuccess: (res) => {
      setResults(res);
      setQueryError(null);
      setHistory((prev) => {
        const next = [sql, ...prev.filter((q) => q !== sql)].slice(0, MAX_HISTORY);
        try { sessionStorage.setItem('adminQueryHistory', JSON.stringify(next)); } catch {}
        return next;
      });
    },
    onError: (err) => {
      setQueryError(err.message);
      setResults(null);
    },
  });

  const loadHistory = () => {
    try {
      const h = sessionStorage.getItem('adminQueryHistory');
      if (h) setHistory(JSON.parse(h));
    } catch {}
  };

  // Load history on first render
  useState(() => { loadHistory(); });

  const handleExecute = () => {
    if (!sql.trim()) return;
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    queryMutation.mutate();
  };

  return (
    <div className="p-6 space-y-5">
      {showConfirm && (
        <ConfirmModal sql={sql} onConfirm={handleConfirm} onCancel={() => setShowConfirm(false)} />
      )}

      <div className="flex items-center gap-2">
        <Terminal size={18} className="text-indigo-400" />
        <div>
          <h1 className="text-white text-xl font-bold">Query Runner</h1>
          <p className="text-gray-500 text-sm mt-0.5">Execute raw SQL against the production database</p>
        </div>
      </div>

      {/* Warning bar */}
      <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
        <AlertTriangle size={15} className="text-amber-400 shrink-0" />
        <p className="text-amber-300 text-sm">
          <strong>WARNING:</strong> Queries run against the live production database. All executions are permanently logged.
          Only <code className="bg-amber-500/20 px-1 rounded">SELECT</code> statements are permitted.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Editor area */}
        <div className="lg:col-span-3 space-y-3">
          <textarea
            ref={textareaRef}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            rows={10}
            spellCheck={false}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-green-400 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-y leading-relaxed"
            placeholder="SELECT * FROM businesses LIMIT 10;"
          />
          <button
            onClick={handleExecute}
            disabled={queryMutation.isPending || !sql.trim()}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
          >
            {queryMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Terminal size={14} />
            )}
            {queryMutation.isPending ? 'Running...' : 'Run Query'}
          </button>
        </div>

        {/* History */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Query History</p>
            {history.length > 0 && (
              <button onClick={() => setHistory([])} className="text-gray-600 hover:text-gray-400">
                <X size={12} />
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-gray-600 text-xs italic">No recent queries</p>
          ) : (
            <div className="space-y-2">
              {history.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setSql(q)}
                  className="w-full text-left text-gray-400 text-xs font-mono bg-gray-900 hover:bg-gray-700 rounded-lg px-2.5 py-2 truncate transition-colors"
                  title={q}
                >
                  {q.split('\n')[0].slice(0, 50)}{q.length > 50 ? '…' : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {queryError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          <strong>Error:</strong> {queryError}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="bg-green-500/20 text-green-300 text-xs font-semibold px-3 py-1 rounded-full">
              {results.rowCount} {results.rowCount === 1 ? 'row' : 'rows'} returned
            </span>
          </div>
          <ResultsTable rows={results.data} />
        </div>
      )}
    </div>
  );
}
