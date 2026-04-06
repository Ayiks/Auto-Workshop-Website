import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@api/customers';
import { messagingApi } from '@api/messaging';
import Button from '@components/common/Button';
import { Send, MessageSquare, Phone, Mail, Megaphone, Clock, CheckCircle, XCircle, History, ChevronDown, ChevronRight, Circle } from 'lucide-react';

const CHANNELS = [
  { value: 'sms',      label: 'SMS',      icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'whatsapp', label: 'WhatsApp', icon: <Phone className="w-4 h-4" /> },
  { value: 'email',    label: 'Email',    icon: <Mail className="w-4 h-4" /> },
];

const CHANNEL_COLORS = {
  sms:      'bg-blue-50 text-blue-700 border-blue-200',
  whatsapp: 'bg-green-50 text-green-700 border-green-200',
  email:    'bg-purple-50 text-purple-700 border-purple-200',
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Compose Tab ───────────────────────────────────────────────────────────────
function ComposeTab() {
  const [channels, setChannels] = useState(['sms']);
  const [purpose, setPurpose] = useState('transactional');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [selectMode, setSelectMode] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: customersData } = useQuery({
    queryKey: ['allCustomers'],
    queryFn: () => customersApi.getCustomers(),
  });
  const allCustomers = Array.isArray(customersData) ? customersData : (customersData?.data || []);

  const sendMutation = useMutation({
    mutationFn: messagingApi.bulkSend,
  });

  const toggleChannel = (val) =>
    setChannels(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]);

  const toggleCustomer = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleSend = () => {
    const customerIds = selectMode === 'all' ? allCustomers.map(c => c.id) : selectedIds;
    if (!customerIds.length || !message.trim() || !channels.length) return;
    if (channels.includes('email') && !subject.trim()) return;
    sendMutation.mutate({ customerIds, message, channels, subject, purpose }, {
      onSuccess: (data) => {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: ['messagingLogs'] });
      },
    });
  };

  const handleReset = () => {
    setResult(null);
    setMessage('');
    setSubject('');
    setSelectedIds([]);
  };

  const selectedCount = selectMode === 'all' ? allCustomers.length : selectedIds.length;

  if (result) {
    return (
      <div className="max-w-lg space-y-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Broadcast sent</h3>
          <p className="text-sm text-gray-500">Here's a summary of the delivery results.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Sent',    count: result.summary?.sent,    color: 'green' },
            { label: 'Failed',  count: result.summary?.failed,  color: 'red' },
            { label: 'Skipped', count: result.summary?.skipped, color: 'amber' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`text-center p-4 rounded-xl border bg-${color}-50 border-${color}-200`}>
              <p className={`text-3xl font-bold text-${color}-700`}>{count ?? 0}</p>
              <p className={`text-xs text-${color}-600 mt-0.5`}>{label}</p>
            </div>
          ))}
        </div>

        {result.results?.filter(r => r.status !== 'sent').length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Failed / Skipped</p>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
              {result.results.filter(r => r.status !== 'sent').map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-gray-700">{r.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status}{r.reason ? ` — ${r.reason}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button type="button" onClick={handleReset} className="bg-gray-900 text-white hover:bg-black w-full">
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-5">
      {/* Purpose */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Purpose</label>
        <div className="flex gap-2">
          {[
            { value: 'transactional', label: 'Transactional', icon: <MessageSquare className="w-3.5 h-3.5" /> },
            { value: 'marketing',     label: 'Marketing',     icon: <Megaphone className="w-3.5 h-3.5" /> },
          ].map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPurpose(value)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                purpose === value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Channels */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Send Via <span className="text-gray-400 font-normal normal-case">(select all channels)</span>
        </label>
        <div className="flex gap-2">
          {CHANNELS.map(({ value, label, icon }) => {
            const active = channels.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleChannel(value)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                  active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {icon} {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recipients */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recipients</label>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setSelectMode('all')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
              selectMode === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            All Customers ({allCustomers.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectMode('pick')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
              selectMode === 'pick' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            Select ({selectedIds.length})
          </button>
        </div>
        {selectMode === 'pick' && (
          <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
            {allCustomers.map((c) => {
              const fullName = `${c.firstName} ${c.lastName || ''}`.trim();
              const checked = selectedIds.includes(c.id);
              return (
                <label key={c.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 ${checked ? 'bg-gray-50' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleCustomer(c.id)}
                    className="w-3.5 h-3.5 rounded text-gray-900 border-gray-300" />
                  <span className="text-sm text-gray-700">{fullName}</span>
                  <span className="text-xs text-gray-400 ml-auto">{c.phone}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Subject — email only */}
      {channels.includes('email') && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Subject *</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Important update from your workshop"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>
      )}

      {/* Message */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Message * <span className="text-gray-400 font-normal normal-case">({message.length} chars)</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Type your message here…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
        />
      </div>

      {sendMutation.isError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {sendMutation.error?.message || 'Failed to send. Check your messaging configuration in Settings.'}
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-gray-500">
          Sending to <strong>{selectedCount}</strong> customer{selectedCount !== 1 ? 's' : ''} via{' '}
          <strong>{channels.map(c => c.toUpperCase()).join(', ') || '—'}</strong>
        </p>
        <Button
          type="button"
          onClick={handleSend}
          loading={sendMutation.isPending}
          disabled={!message.trim() || selectedCount === 0 || !channels.length || (channels.includes('email') && !subject.trim())}
          className="bg-gray-900 text-white hover:bg-black flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Send Broadcast
        </Button>
      </div>
    </div>
  );
}

// ── Channel status pill ───────────────────────────────────────────────────────
function StatusPill({ status, reason }) {
  const styles = {
    delivered: 'text-emerald-700',
    sent:      'text-green-700',
    failed:    'text-red-600',
    skipped:   'text-gray-400',
    pending:   'text-gray-400',
  };
  const icons = {
    delivered: <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />,
    sent:      <CheckCircle className="w-3 h-3" />,
    failed:    <XCircle className="w-3 h-3" />,
    skipped:   <span className="text-gray-300">—</span>,
    pending:   <span className="text-gray-300">…</span>,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${styles[status] || 'text-gray-500'}`}>
      {icons[status] || null}
      {status}
      {reason && status !== 'sent' && status !== 'delivered' && (
        <span className="text-gray-400 font-normal">({reason})</span>
      )}
    </span>
  );
}

// ── Expandable recipient list for one log entry ───────────────────────────────
function RecipientList({ logId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['messageRecipients', logId],
    queryFn: () => messagingApi.getRecipients(logId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 text-xs text-gray-400">
        <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
        Loading…
      </div>
    );
  }

  const rows = data?.data || [];
  if (!rows.length) {
    return <p className="px-4 py-3 text-xs text-gray-400">No recipient detail available.</p>;
  }

  // Group by customer name
  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.customerName]) grouped[r.customerName] = [];
    grouped[r.customerName].push(r);
  }

  return (
    <div className="border-t border-gray-100 divide-y divide-gray-50">
      {Object.entries(grouped).map(([name, channels]) => (
        <div key={name} className="flex items-center gap-3 px-4 py-2.5">
          <span className="text-xs text-gray-700 w-36 flex-shrink-0 truncate font-medium">{name}</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {channels.map((ch) => (
              <span key={ch.channel} className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                <span className="uppercase font-medium">{ch.channel}</span>
                <StatusPill status={ch.status} reason={ch.reason} />
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab() {
  const [expandedId, setExpandedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['messagingLogs'],
    queryFn: () => messagingApi.getLogs({ limit: 50 }),
  });

  const logs = data?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <History className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-900">No messages sent yet</p>
        <p className="text-xs text-gray-500 mt-1">Switch to the Compose tab to send your first broadcast.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl">
      {logs.map((log) => {
        const expanded = expandedId === log.id;
        return (
          <div key={log.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <div className="p-4 space-y-3">
              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-gray-800 leading-relaxed">
                  {log.message.length > 100 ? `${log.message.slice(0, 100)}…` : log.message}
                </p>
                <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  log.purpose === 'marketing' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {log.purpose === 'marketing' ? 'Marketing' : 'Transactional'}
                </span>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Channels */}
                <div className="flex gap-1.5">
                  {log.channels.map(ch => (
                    <span key={ch} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${CHANNEL_COLORS[ch] || 'bg-gray-100 text-gray-700'}`}>
                      {ch === 'sms' && <MessageSquare className="w-3 h-3" />}
                      {ch === 'whatsapp' && <Phone className="w-3 h-3" />}
                      {ch === 'email' && <Mail className="w-3 h-3" />}
                      {ch.toUpperCase()}
                    </span>
                  ))}
                </div>

                {/* Counts */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-green-700">
                    <CheckCircle className="w-3.5 h-3.5" /> {log.sentCount} sent
                  </span>
                  {log.failedCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="w-3.5 h-3.5" /> {log.failedCount} failed
                    </span>
                  )}
                  {log.skippedCount > 0 && (
                    <span className="text-amber-600">{log.skippedCount} skipped</span>
                  )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Sent by + time */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{timeAgo(log.createdAt)}</span>
                  {log.user && <span>· {log.user.fullName || log.user.username}</span>}
                </div>
              </div>

              {/* Expand toggle */}
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : log.id)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                {log.recipientCount} recipient{log.recipientCount !== 1 ? 's' : ''}
              </button>
            </div>

            {/* Expandable recipient list */}
            {expanded && <RecipientList logId={log.id} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Messaging() {
  const [tab, setTab] = useState('compose');

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Messaging</h1>
              <p className="text-sm text-gray-500 mt-0.5">Send SMS, WhatsApp, and email broadcasts to your customers</p>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-6">
            {[
              { value: 'compose', label: 'Compose', icon: <Send className="w-4 h-4" /> },
              { value: 'history', label: 'History',  icon: <History className="w-4 h-4" /> },
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === value
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {tab === 'compose' ? <ComposeTab /> : <HistoryTab />}
      </div>
    </div>
  );
}
