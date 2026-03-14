import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { customersApi } from '@api/customers';
import { useAuthStore } from '@stores/authStore';
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';
import CustomerForm from './CustomerForm';
import LoadingSpinner from '@components/common/LoadingSpinner';

const CONTACT_BADGE = {
  email:    { label: 'Email',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  sms:      { label: 'SMS',      cls: 'bg-green-50 text-green-700 border-green-200' },
  whatsapp: { label: 'WhatsApp', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function CustomersManager() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const canEdit   = ['admin', 'manager'].includes(user?.role);
  const canDelete = user?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // --- Data Fetching ---
  const { data, isLoading } = useQuery({
    queryKey: ['allCustomers'],
    queryFn: () => customersApi.getCustomers(),
    keepPreviousData: true,
  });

  const customers = useMemo(() => {
    const all = Array.isArray(data) ? data : (data?.data || []);
    if (!searchTerm) return all;
    const q = searchTerm.toLowerCase();
    return all.filter(c => {
      const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      return name.includes(q) || (c.phone || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
    }).slice(0, 100);
  }, [data, searchTerm]);

  // --- Create mutation ---
  const createMutation = useMutation({
    mutationFn: customersApi.createCustomer,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['allCustomers']);
      setIsFormOpen(false);
      const id = res?.data?.id || res?.id;
      if (id) navigate(`/app/customers/${id}`);
    },
    onError: (err) => alert(err.response?.data?.error?.message || 'Failed to create customer'),
  });

  const deleteMutation = useMutation({
    mutationFn: customersApi.deleteCustomer,
    onSuccess: () => queryClient.invalidateQueries(['allCustomers']),
    onError: (err) => alert(err.response?.data?.error?.message || 'Failed to delete customer'),
  });

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this customer? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Customer Database</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {customers.length} customer{customers.length !== 1 ? 's' : ''}{searchTerm ? ' found' : ' total'}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone or email..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsFormOpen(true)}
              className="bg-gray-900 text-white hover:bg-black shrink-0"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {customers.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">No customers found</p>
          <p className="text-xs text-gray-500 mt-1">Adjust your search or add a new customer.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/30">
                <th className="text-left px-4 sm:px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Customer</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">Contact</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Vehicle</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Jobs</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Preferred</th>
                <th className="px-4 sm:px-6 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  canDelete={canDelete}
                  canEdit={canEdit}
                  onRowClick={() => navigate(`/app/customers/${customer.id}`)}
                  onRemind={(e) => { e.stopPropagation(); navigate(`/app/customers/${customer.id}`, { state: { tab: 'Reminders' } }); }}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Customer Modal */}
      {isFormOpen && (
        <Modal isOpen onClose={() => setIsFormOpen(false)} title="Add New Customer" size="md">
          <div className="p-1">
            <CustomerForm
              onSubmit={(formData) => createMutation.mutate(formData)}
              onCancel={() => setIsFormOpen(false)}
              isLoading={createMutation.isPending}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

function CustomerRow({ customer, canDelete, canEdit, onRowClick, onRemind, onDelete }) {
  const fullName = `${customer.firstName} ${customer.lastName || ''}`.trim();
  const vehicles = customer.vehicles || [];
  const primaryVehicle = vehicles[0];
  const contactBadge = CONTACT_BADGE[customer.preferredContact];

  const lastVisitLabel = customer.lastVisit
    ? new Date(customer.lastVisit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <tr
      onClick={onRowClick}
      className="hover:bg-gray-50 cursor-pointer transition-colors group"
    >
      {/* Customer name + avatar */}
      <td className="px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold uppercase">
            {customer.firstName?.[0]}{customer.lastName?.[0] || ''}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-medium text-gray-900">{fullName}</span>
              {!customer.isProfileComplete && (
                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  Incomplete
                </span>
              )}
            </div>
            {/* Phone visible on mobile (since Contact col is hidden) */}
            <p className="text-xs text-gray-500 sm:hidden">{customer.phone}</p>
          </div>
        </div>
      </td>

      {/* Contact */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <p className="text-xs font-medium text-gray-700">{customer.phone}</p>
        {customer.email && <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[180px]">{customer.email}</p>}
      </td>

      {/* Primary vehicle */}
      <td className="px-4 py-3 hidden md:table-cell">
        {primaryVehicle ? (
          <div>
            <p className="text-xs text-gray-700">
              {[primaryVehicle.year, primaryVehicle.make, primaryVehicle.model].filter(Boolean).join(' ') || 'Unknown'}
            </p>
            {primaryVehicle.regNumber && (
              <span className="text-[10px] font-mono font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded uppercase">
                {primaryVehicle.regNumber}
              </span>
            )}
            {vehicles.length > 1 && (
              <p className="text-[10px] text-gray-400 mt-0.5">+{vehicles.length - 1} more</p>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-gray-400 italic">No vehicle</span>
        )}
      </td>

      {/* Job count + last visit */}
      <td className="px-4 py-3 hidden lg:table-cell">
        {customer.jobCount > 0 ? (
          <div>
            <p className="text-xs font-medium text-gray-700">{customer.jobCount} job{customer.jobCount !== 1 ? 's' : ''}</p>
            {lastVisitLabel && <p className="text-[11px] text-gray-400 mt-0.5">{lastVisitLabel}</p>}
          </div>
        ) : (
          <span className="text-[11px] text-gray-400 italic">No jobs</span>
        )}
      </td>

      {/* Preferred contact badge */}
      <td className="px-4 py-3 hidden lg:table-cell">
        {contactBadge ? (
          <span className={`text-[10px] font-medium border px-2 py-0.5 rounded-full ${contactBadge.cls}`}>
            {contactBadge.label}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 sm:px-6 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEdit && (
            <button
              onClick={onRemind}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Send Reminder"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          )}
          {canDelete && (
            <button
              onClick={(e) => onDelete(e, customer.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
