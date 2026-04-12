import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { adminApi } from '@api/admin';
import toast from 'react-hot-toast';
import UserManagePanel from '@components/admin/UserManagePanel';

const TABS = ['Overview', 'Users', 'Audit Logs'];

export default function AdminBusinessDetail() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('Overview');
  const [subForm, setSubForm] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-business-detail', businessId],
    queryFn: () => adminApi.getBusinessDetail(businessId),
    staleTime: 0,
    onSuccess: (res) => {
      const b = res.data;
      setSubForm({
        plan: b.plan,
        subscriptionStatus: b.subscriptionStatus,
        paymentGatewayProvider: b.paymentGatewayProvider || '',
        paymentGatewayId: b.paymentGatewayId || '',
      });
    },
  });

  const business = data?.data;

  // Remove unused mutations — handled by UserManagePanel now
  const subMutation = useMutation({
    mutationFn: (form) => adminApi.updateSubscription(businessId, form),
    onSuccess: () => {
      toast.success('Subscription updated');
      queryClient.invalidateQueries({ queryKey: ['admin-business-detail', businessId] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
    },
    onError: (err) => toast.error(err.message),
  });


  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" /></div>;
  if (error) return <div className="p-6 text-red-400">{error.message}</div>;

  return (
    <div className="p-6 space-y-5">
      {selectedUser && (
        <UserManagePanel
          user={{ ...selectedUser, business: { id: businessId, name: business.name } }}
          onClose={() => setSelectedUser(null)}
          invalidateKeys={[['admin-business-detail', businessId]]}
        />
      )}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/businesses')} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-white text-xl font-bold">{business.name}</h1>
          <p className="text-gray-500 text-xs font-mono mt-0.5">{business.id}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? 'text-indigo-400 border-indigo-400' : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Business Info */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
            <h2 className="text-white text-sm font-semibold">Business Info</h2>
            {[
              ['Name', business.name],
              ['ID', <span className="font-mono text-xs">{business.id}</span>],
              ['Created', format(new Date(business.createdAt), 'MMM d, yyyy')],
              ['Status', business.isActive ? <span className="text-green-400">Active</span> : <span className="text-red-400">Inactive</span>],
              ['Total Users', business._count?.users],
              ['Total Jobs', business._count?.jobs],
              ['Total Sales', business._count?.sales],
              ['Total Invoices', business._count?.invoices],
              ['Total Customers', business._count?.customers],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-700/50 last:border-0">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className="text-gray-200 text-sm">{value}</span>
              </div>
            ))}
          </div>

          {/* Subscription Editor */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
            <h2 className="text-white text-sm font-semibold">Subscription Management</h2>
            {subForm && (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Plan</label>
                  <select value={subForm.plan} onChange={(e) => setSubForm((p) => ({ ...p, plan: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Subscription Status</label>
                  <select value={subForm.subscriptionStatus} onChange={(e) => setSubForm((p) => ({ ...p, subscriptionStatus: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Payment Gateway Provider</label>
                  <input type="text" value={subForm.paymentGatewayProvider}
                    onChange={(e) => setSubForm((p) => ({ ...p, paymentGatewayProvider: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. paystack, stripe" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Payment Gateway ID</label>
                  <input type="text" value={subForm.paymentGatewayId}
                    onChange={(e) => setSubForm((p) => ({ ...p, paymentGatewayId: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Customer ID on gateway" />
                </div>
                <button
                  onClick={() => subMutation.mutate(subForm)}
                  disabled={subMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {subMutation.isPending ? 'Saving...' : 'Update Subscription'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'Users' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                {['Username', 'Full Name', 'Role', 'Email', 'Verified', 'Status', 'Last Login', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {business.users?.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No users found</td></tr>
              )}
              {business.users?.map((u) => (
                <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="px-4 py-3 text-white font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3 text-gray-300">{u.fullName || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-700 text-gray-300 text-[11px] px-2 py-0.5 rounded-full">{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${u.isEmailVerified ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-400'}`}>
                      {u.isEmailVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {u.lastLogin ? format(new Date(u.lastLogin), 'MMM d, yyyy') : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="flex items-center gap-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Settings2 size={13} />
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Logs Tab */}
      {tab === 'Audit Logs' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                {['Time', 'User', 'Action', 'Entity', 'Description'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {business.recentAuditLogs?.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No audit logs</td></tr>
              )}
              {business.recentAuditLogs?.map((log) => (
                <tr key={log.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{log.user?.username || log.userId}</td>
                  <td className="px-4 py-3"><span className="bg-indigo-500/10 text-indigo-300 text-[11px] px-2 py-0.5 rounded font-mono">{log.action}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{log.entity}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
