import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@api/customers';
import { remindersApi } from '@api/reminders';
import { useAuthStore } from '@stores/authStore';
import CustomerForm from '@components/features/settings/CustomerForm';
import VehicleList from '@components/features/settings/VehicleList';
import CustomerJobHistory from '@components/features/settings/CustomerJobHistory';
import Button from '@components/common/Button';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '@components/common/LoadingSpinner';

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

const REMINDER_STATUS_STYLES = {
  sent:    'bg-green-50 text-green-700 border-green-200',
  failed:  'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

const CONTACT_BADGE = {
  email:    { label: 'Email',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  sms:      { label: 'SMS',      cls: 'bg-green-50 text-green-700 border-green-200' },
  whatsapp: { label: 'WhatsApp', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const TABS = ['Profile', 'Vehicles', 'Job History', 'Reminders'];

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const canEdit   = ['admin', 'manager'].includes(user?.role);
  const canDelete = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState(location.state?.tab || 'Profile');

  // --- Fetch customer ---
  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getCustomer(id),
    enabled: !!id,
  });

  const customer = data?.data || data;

  // --- Update ---
  const updateMutation = useMutation({
    mutationFn: (formData) => customersApi.updateCustomer(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer', id]);
      queryClient.invalidateQueries(['allCustomers']);
      toast.success('Customer updated');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to update customer'),
  });

  // --- Delete ---
  const deleteMutation = useMutation({
    mutationFn: () => customersApi.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['allCustomers']);
      navigate('/app/customers');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to delete customer'),
  });

  const handleDelete = () => {
    if (window.confirm('Delete this customer? This cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">Customer not found.</p>
          <button onClick={() => navigate('/app/customers')} className="mt-3 text-xs text-gray-400 underline">
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${customer.firstName} ${customer.lastName || ''}`.trim();
  const contactBadge = CONTACT_BADGE[customer.preferredContact];
  const lastVisitLabel = customer.lastVisit
    ? new Date(customer.lastVisit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-gray-50/50">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200">

        {/* Title row */}
        <div className="px-4 sm:px-6 pt-4 pb-3 flex items-start gap-3">
          <button
            onClick={() => navigate('/app/customers')}
            className="mt-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors shrink-0"
            title="Back to Customers"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-gray-900">{fullName}</h1>
              {!customer.isProfileComplete && (
                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  Incomplete
                </span>
              )}
              {contactBadge && (
                <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded-full ${contactBadge.cls}`}>
                  {contactBadge.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
              <span>{customer.phone}</span>
              {customer.email && <span>{customer.email}</span>}
              {(customer.jobCount || 0) > 0 && (
                <span>
                  <span className="font-semibold text-gray-700">{customer.jobCount}</span> job{customer.jobCount !== 1 ? 's' : ''}
                  {lastVisitLabel && <> · last {lastVisitLabel}</>}
                </span>
              )}
            </div>
          </div>

          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-4 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
                activeTab === tab
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-3xl mx-auto p-4 sm:p-6">

        {activeTab === 'Profile' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Customer Information</h3>
            <CustomerForm
              initialData={customer}
              onSubmit={(formData) => updateMutation.mutate(formData)}
              onCancel={() => navigate('/app/customers')}
              isLoading={updateMutation.isPending}
            />
          </div>
        )}

        {activeTab === 'Vehicles' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6">
            <VehicleList customerId={parseInt(id)} canEdit={canEdit} />
          </div>
        )}

        {activeTab === 'Job History' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6">
            <CustomerJobHistory customerId={parseInt(id)} defaultExpanded />
          </div>
        )}

        {activeTab === 'Reminders' && (
          <RemindersPanel customerId={parseInt(id)} canEdit={canEdit} />
        )}
      </div>
    </div>
  );
}

// ── Inline Reminders panel ────────────────────────────────────────────────────
function RemindersPanel({ customerId, canEdit }) {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState('send');
  const [form, setForm] = useState({
    type: 'manual',
    channel: 'email',
    message: '',
    scheduledFor: new Date().toISOString().slice(0, 16),
  });

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['reminders', customerId],
    queryFn: () => remindersApi.getReminders({ customerId }),
    enabled: subTab === 'history',
  });
  // remindersApi returns the array directly (axios interceptor already unwraps response.data)
  const reminders = historyData || [];

  const createMutation = useMutation({
    mutationFn: remindersApi.createReminder,
    onSuccess: () => {
      queryClient.invalidateQueries(['reminders', customerId]);
      setSubTab('history');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to schedule reminder'),
  });

  const deleteMutation = useMutation({
    mutationFn: remindersApi.deleteReminder,
    onSuccess: () => queryClient.invalidateQueries(['reminders', customerId]),
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to cancel reminder'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      customerId,
      type: form.type,
      channel: form.channel,
      message: form.message || undefined,
      scheduledFor: new Date(form.scheduledFor).toISOString(),
    });
  };

  const inputCls = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Sub-tabs */}
      <div className="flex border-b border-gray-100 px-5 pt-4 gap-5">
        {[{ id: 'send', label: 'Send Reminder' }, { id: 'history', label: 'History' }].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors -mb-px ${
              subTab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {subTab === 'send' ? (
          canEdit ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className={`${inputCls} appearance-none`}
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  >
                    {REMINDER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
                  <select
                    className={`${inputCls} appearance-none`}
                    value={form.channel}
                    onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))}
                  >
                    {CHANNEL_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Schedule</label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={form.scheduledFor}
                  onChange={(e) => setForm((p) => ({ ...p, scheduledFor: e.target.value }))}
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">Past times send immediately.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Message <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  className={inputCls}
                  rows={3}
                  placeholder="Leave blank to use the default message for the selected type..."
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="primary"
                  type="submit"
                  size="sm"
                  loading={createMutation.isPending}
                  className="bg-gray-900 hover:bg-black text-white"
                >
                  Schedule Reminder
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-gray-400 text-center py-6">You don't have permission to send reminders.</p>
          )
        ) : (
          isLoading ? (
            <p className="text-xs text-gray-400 text-center py-6">Loading history...</p>
          ) : reminders.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-6">No reminders on record for this customer.</p>
          ) : (
            <div className="space-y-2">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium text-gray-800">
                        {REMINDER_TYPES.find((t) => t.value === r.type)?.label || r.type}
                      </span>
                      <span className="text-[10px] text-gray-400 capitalize">· {r.channel}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded-full ${REMINDER_STATUS_STYLES[r.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {r.status}
                    </span>
                    {r.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => window.confirm('Cancel this reminder?') && deleteMutation.mutate(r.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Cancel reminder"
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
      </div>
    </div>
  );
}
