import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { customersApi } from '@api/customers';
import { messagingApi } from '@api/messaging';
import CustomersManager from '@components/features/settings/CustomersManager';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';
import { Send, MessageSquare, Phone, Mail, Megaphone } from 'lucide-react';

const CHANNELS = [
  { value: 'sms',      label: 'SMS',       icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'whatsapp', label: 'WhatsApp',  icon: <Phone className="w-4 h-4" /> },
  { value: 'email',    label: 'Email',     icon: <Mail className="w-4 h-4" /> },
];

export default function Customers() {
  const [showBroadcast, setShowBroadcast] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Customers</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage customer records, vehicles and reminders</p>
          </div>
          <button
            onClick={() => setShowBroadcast(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Broadcast</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <CustomersManager />
      </div>

      {showBroadcast && (
        <BroadcastModal onClose={() => setShowBroadcast(false)} />
      )}
    </div>
  );
}

function BroadcastModal({ onClose }) {
  const [channels, setChannels] = useState(['sms']);
  const [purpose, setPurpose] = useState('transactional');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [selectMode, setSelectMode] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);

  const { data: customersData } = useQuery({
    queryKey: ['allCustomers'],
    queryFn: () => customersApi.getCustomers(),
  });
  const allCustomers = Array.isArray(customersData) ? customersData : (customersData?.data || []);

  const sendMutation = useMutation({
    mutationFn: messagingApi.bulkSend,
    onSuccess: (data) => setResult(data),
  });

  const toggleChannel = (val) =>
    setChannels(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]);

  const toggleCustomer = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleSend = () => {
    const customerIds = selectMode === 'all' ? allCustomers.map(c => c.id) : selectedIds;
    if (!customerIds.length || !message.trim() || !channels.length) return;
    if (channels.includes('email') && !subject.trim()) return;
    sendMutation.mutate({ customerIds, message, channels, subject, purpose });
  };

  const selectedCount = selectMode === 'all' ? allCustomers.length : selectedIds.length;

  return (
    <Modal isOpen onClose={onClose} title="Broadcast Message" size="lg">
      {result ? (
        /* Results view */
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Sent',    count: result.summary?.sent,    color: 'green' },
              { label: 'Failed',  count: result.summary?.failed,  color: 'red' },
              { label: 'Skipped', count: result.summary?.skipped, color: 'amber' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`text-center p-3 rounded-lg border bg-${color}-50 border-${color}-200`}>
                <p className={`text-2xl font-bold text-${color}-700`}>{count ?? 0}</p>
                <p className={`text-xs text-${color}-600`}>{label}</p>
              </div>
            ))}
          </div>

          {result.results?.filter(r => r.status !== 'sent').length > 0 && (
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {result.results.filter(r => r.status !== 'sent').map((r, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="text-gray-700">{r.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${r.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status} {r.reason ? `— ${r.reason}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Button onClick={onClose} className="w-full bg-gray-900 text-white hover:bg-black">Done</Button>
        </div>
      ) : (
        /* Compose view */
        <div className="space-y-5">
          {/* Message Purpose */}
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Send Via <span className='text-xs text-gray-300'>(Select all channels you want to sent the message through)</span></label>
            
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
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {allCustomers.map((c) => {
                  const fullName = `${c.firstName} ${c.lastName || ''}`.trim();
                  const checked = selectedIds.includes(c.id);
                  return (
                    <label key={c.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 ${checked ? 'bg-gray-50' : ''}`}>
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

          {/* Subject (email only) */}
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
              rows={4}
              placeholder="Type your message here…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
            />
          </div>

          {sendMutation.isError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {sendMutation.error?.message || 'Failed to send. Check your messaging configuration.'}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-500">
              Sending to <strong>{selectedCount}</strong> customer{selectedCount !== 1 ? 's' : ''} via <strong>{channels.join(', ').toUpperCase() || '—'}</strong>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="border-gray-300 text-gray-700">Cancel</Button>
              <Button
                type="button"
                onClick={handleSend}
                loading={sendMutation.isPending}
                disabled={!message.trim() || selectedCount === 0 || !channels.length || (channels.includes('email') && !subject.trim())}
                className="bg-gray-900 text-white hover:bg-black"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
