import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { remindersApi } from '@api/reminders';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';

const REMINDER_TYPES = [
  { value: 'manual',          label: 'General Message' },
  { value: 'post_job',        label: 'Post-Job Follow-up' },
  { value: 'service_due',     label: 'Service Due' },
  { value: 'invoice_overdue', label: 'Invoice Overdue' },
];

const CHANNEL_OPTIONS = [
  { value: 'email',    label: 'Email' },
  { value: 'sms',      label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

const STATUS_STYLES = {
  sent:    'bg-green-50 text-green-700 border-green-200',
  failed:  'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function ReminderModal({ customer, onClose }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('send'); // 'send' | 'history'
  const [form, setForm] = useState({
    type: 'manual',
    channel: 'email',
    message: '',
    scheduledFor: new Date().toISOString().slice(0, 16), // datetime-local format
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['reminders', customer.id],
    queryFn: () => remindersApi.getReminders({ customerId: customer.id }),
    enabled: tab === 'history',
  });
  // remindersApi returns the array directly (axios interceptor already unwraps response.data)
  const reminders = historyData || [];

  const createMutation = useMutation({
    mutationFn: remindersApi.createReminder,
    onSuccess: () => {
      queryClient.invalidateQueries(['reminders', customer.id]);
      alert('Reminder sent successfully.');
      onClose();
    },
    onError: (err) => alert(err.response?.data?.error?.message || 'Failed to send reminder'),
  });

  const deleteMutation = useMutation({
    mutationFn: remindersApi.deleteReminder,
    onSuccess: () => queryClient.invalidateQueries(['reminders', customer.id]),
    onError: (err) => alert(err.response?.data?.error?.message || 'Failed to cancel reminder'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.scheduledFor) return;
    createMutation.mutate({
      customerId: customer.id,
      type: form.type,
      channel: form.channel,
      message: form.message || undefined,
      scheduledFor: new Date(form.scheduledFor).toISOString(),
    });
  };

  const inputClass = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black';
  const customerName = `${customer.firstName} ${customer.lastName || ''}`.trim();

  return (
    <Modal isOpen onClose={onClose} title={`Reminder — ${customerName}`} size="md">
      <div className="p-1">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 mb-4 gap-4">
          {[{ id: 'send', label: 'Send Reminder' }, { id: 'history', label: 'History' }].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`pb-2 text-xs font-semibold border-b-2 transition-colors ${
                tab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'send' ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  className={`${inputClass} appearance-none`}
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                >
                  {REMINDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
                <select
                  className={`${inputClass} appearance-none`}
                  value={form.channel}
                  onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}
                >
                  {CHANNEL_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Schedule</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={form.scheduledFor}
                onChange={e => setForm(p => ({ ...p, scheduledFor: e.target.value }))}
                required
              />
              <p className="text-[10px] text-gray-400 mt-1">Set to now or a future time. Past times send immediately.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message (Optional)</label>
              <textarea
                className={inputClass}
                rows={3}
                placeholder="Leave blank to use the default message for the selected type..."
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" type="button" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                variant="primary"
                type="submit"
                size="sm"
                loading={createMutation.isPending}
                className="bg-gray-900 hover:bg-black text-white"
              >
                Send Reminder
              </Button>
            </div>
          </form>
        ) : (
          historyLoading ? (
            <p className="text-xs text-gray-400 py-4 text-center">Loading history...</p>
          ) : reminders.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4 text-center">No reminders on record for this customer.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-800 capitalize">
                        {REMINDER_TYPES.find(t => t.value === r.type)?.label || r.type}
                      </span>
                      <span className="text-[10px] text-gray-400 capitalize">· {r.channel}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[r.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {r.status}
                    </span>
                    {r.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => window.confirm('Cancel this reminder?') && deleteMutation.mutate(r.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Cancel"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Modal>
  );
}
