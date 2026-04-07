import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { remindersApi } from '@api/reminders';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';
import { toast } from 'react-hot-toast';

const REMINDER_TYPES = [
  { value: 'manual',            label: 'General Message' },
  { value: 'post_job',          label: 'Post-Job Follow-up' },
  { value: 'service_due',       label: 'Service Due' },
  { value: 'invoice_overdue',   label: 'Invoice Overdue' },
  { value: 'follow_up',         label: 'Follow up on job' },
  { value: 'oil_coolant_change', label: 'Oil / Coolant change' },
  { value: 'general_check',     label: 'General check' },
  { value: 'how_was_job',       label: 'How was the job?' },
];

const CHANNELS = [
  { value: 'email',    label: 'Email' },
  { value: 'sms',      label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

const STATUS_STYLES = {
  sent:    'bg-green-50 text-green-700 border-green-200',
  failed:  'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

const inputClass = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black';

export default function ReminderModal({ customer, onClose }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('send');
  const [form, setForm] = useState({
    type: 'manual',
    channels: ['email'],
    message: '',
    scheduledFor: new Date().toISOString().slice(0, 16),
  });
  const [editingReminder, setEditingReminder] = useState(null);

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['reminders', customer.id],
    queryFn: () => remindersApi.getReminders({ customerId: customer.id }),
    enabled: tab === 'history',
  });
  const reminders = historyData || [];

  const createMutation = useMutation({
    mutationFn: remindersApi.createReminder,
    onSuccess: () => {
      queryClient.invalidateQueries(['reminders', customer.id]);
      toast.success('Reminder scheduled');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || err.message || 'Failed to schedule reminder'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => remindersApi.updateReminder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['reminders', customer.id]);
      setEditingReminder(null);
      toast.success('Reminder updated');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || err.message || 'Failed to update reminder'),
  });

  const deleteMutation = useMutation({
    mutationFn: remindersApi.deleteReminder,
    onSuccess: () => {
      queryClient.invalidateQueries(['reminders', customer.id]);
      toast.success('Reminder cancelled');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || err.message || 'Failed to cancel reminder'),
  });

  const toggleChannel = (val) =>
    setForm(p => ({
      ...p,
      channels: p.channels.includes(val) ? p.channels.filter(c => c !== val) : [...p.channels, val],
    }));

  // Fan-out: create one reminder per selected channel
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.scheduledFor || !form.channels.length) return;
    const base = {
      customerId: customer.id,
      type: form.type,
      message: form.message || undefined,
      scheduledFor: new Date(form.scheduledFor).toISOString(),
    };
    for (const channel of form.channels) {
      createMutation.mutate({ ...base, channel });
    }
  };

  const handleEditSave = () => {
    if (!editingReminder) return;
    updateMutation.mutate({
      id: editingReminder.id,
      data: {
        type: editingReminder.type,
        channel: editingReminder.channel,
        scheduledFor: new Date(editingReminder.scheduledFor).toISOString(),
        message: editingReminder.message || undefined,
      },
    });
  };

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
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Send Via</label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(({ value, label }) => {
                  const active = form.channels.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleChannel(value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                        active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Message <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                className={inputClass}
                rows={3}
                placeholder="Leave blank to use the default message for the selected type…"
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
                disabled={!form.channels.length}
                className="bg-gray-900 hover:bg-black text-white"
              >
                Schedule
              </Button>
            </div>
          </form>
        ) : (
          historyLoading ? (
            <p className="text-xs text-gray-400 py-4 text-center">Loading history…</p>
          ) : reminders.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4 text-center">No reminders on record for this customer.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium text-gray-800">
                        {REMINDER_TYPES.find(t => t.value === r.type)?.label || r.type}
                      </span>
                      <span className="text-[10px] text-gray-400 capitalize">· {r.channel}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(r.scheduledFor).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[r.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {r.status}
                    </span>
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => setEditingReminder({
                        ...r,
                        scheduledFor: new Date(r.scheduledFor).toISOString().slice(0, 16),
                      })}
                      className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {r.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => window.confirm('Cancel this reminder?') && deleteMutation.mutate(r.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Cancel"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Edit reminder inline panel */}
        {editingReminder && (
          <div className="mt-4 border-t border-gray-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Edit Reminder</h4>
              <button type="button" onClick={() => setEditingReminder(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕ Cancel</button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                className={`${inputClass} appearance-none`}
                value={editingReminder.type}
                onChange={e => setEditingReminder(p => ({ ...p, type: e.target.value }))}
              >
                {REMINDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEditingReminder(p => ({ ...p, channel: value }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                      editingReminder.channel === value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Scheduled For</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={editingReminder.scheduledFor}
                onChange={e => setEditingReminder(p => ({ ...p, scheduledFor: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                className={inputClass}
                rows={2}
                value={editingReminder.message || ''}
                onChange={e => setEditingReminder(p => ({ ...p, message: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" size="sm" onClick={() => setEditingReminder(null)}>Cancel</Button>
              <Button
                type="button"
                size="sm"
                loading={updateMutation.isPending}
                onClick={handleEditSave}
                className="bg-gray-900 hover:bg-black text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
