import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsApi } from '@/api/materials';
import { useAuthStore } from '@stores/authStore';
import { format } from 'date-fns';

const STATUS_TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'received', label: 'Received' },
];

const statusBadge = (status) => {
  if (status === 'pending') return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>;
  if (status === 'received') return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Received</span>;
  if (status === 'cancelled') return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Cancelled</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{status}</span>;
};

const paymentBadge = (paymentStatus) => {
  if (paymentStatus === 'paid') return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Paid</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Unpaid</span>;
};

function OrderDetailPanel({ order, onClose, onReceive, isReceiving, isAdmin, onEditClick, onCancel, isCancelling, onMarkPaid, isMarkingPaid }) {
  const [confirming, setConfirming] = useState(false);
  const [cancelConfirming, setCancelConfirming] = useState(false);
  const [markPaidOnReceive, setMarkPaidOnReceive] = useState(false);
  const orderedBy = order.user?.fullName || order.user?.username || '—';
  const receivedBy = order.receivedUser?.fullName || order.receivedUser?.username || '—';
  const grandTotal = parseFloat(order.totalCost);
  const isPending = order.status === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Restock Order</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Placed {order.reorderDate ? format(new Date(order.reorderDate), 'dd MMM yyyy · HH:mm') : '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(order.status)}
            {order.status !== 'cancelled' && paymentBadge(order.paymentStatus)}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Items list */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Items ({order.items.length})
            </p>
            <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
              {order.items.map((item) => {
                const unitLabel = item.materialUnit?.name || item.material?.baseUnit || '';
                return (
                  <div key={item.id} className="flex justify-between items-start px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.materialName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {parseFloat(item.quantityOrdered).toLocaleString()} {unitLabel}
                        {' · '}GH₵{parseFloat(item.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2 })} / unit
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 ml-4 shrink-0">
                      GH₵{parseFloat(item.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                );
              })}
              {/* Grand total row */}
              <div className="flex justify-between items-center px-4 py-3 bg-white rounded-b-xl">
                <p className="text-sm font-bold text-gray-700">Total</p>
                <p className="text-lg font-bold text-gray-900">
                  GH₵{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Vendor */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Vendor</p>
            {order.vendor ? (
              <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                  {order.vendor.companyName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{order.vendor.companyName}</p>
                  {order.vendor.contactName && <p className="text-xs text-gray-500">{order.vendor.contactName}</p>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No vendor assigned</p>
            )}
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ordered By</p>
              <p className="text-gray-700">{orderedBy}</p>
            </div>
            {order.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-gray-700">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Receipt info (for received orders) */}
          {order.status === 'received' && order.receivedDate && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Stock Received</p>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-800">{format(new Date(order.receivedDate), 'dd MMM yyyy · HH:mm')}</span>
                <span className="text-emerald-700 font-medium">{receivedBy}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer — received orders: Mark as Paid + admin correction */}
        {order.status === 'received' && (
          <div className="px-6 py-4 border-t border-gray-100 space-y-2">
            {order.paymentStatus !== 'paid' && (
              <button
                onClick={() => onMarkPaid(order.orderId)}
                disabled={isMarkingPaid}
                className="w-full py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isMarkingPaid ? 'Processing…' : 'Mark as Paid to Vendor'}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => onEditClick(order)}
                className="w-full py-2 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Edit Order (Admin Correction)
              </button>
            )}
          </div>
        )}

        {/* Footer — actions for pending orders */}
        {isPending && (
          <div className="px-6 py-4 border-t border-gray-100 space-y-2">
            {/* Admin: Edit + Cancel row */}
            {isAdmin && !confirming && !cancelConfirming && (
              <div className="flex gap-2">
                <button
                  onClick={() => { onEditClick(order); }}
                  className="flex-1 py-2 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Edit Order
                </button>
                <button
                  onClick={() => setCancelConfirming(true)}
                  className="flex-1 py-2 text-sm font-medium border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                >
                  Cancel Order
                </button>
              </div>
            )}

            {/* Cancel confirmation */}
            {cancelConfirming && (
              <div className="space-y-2">
                <p className="text-sm text-center text-gray-600">
                  Cancel this pending order? The {order.items.length} item{order.items.length !== 1 ? 's' : ''} will not be restocked.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCancelConfirming(false)}
                    className="flex-1 py-2.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => onCancel(order.orderId)}
                    disabled={isCancelling}
                    className="flex-1 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                  >
                    {isCancelling ? 'Cancelling…' : 'Yes, Cancel'}
                  </button>
                </div>
              </div>
            )}

            {/* Receive confirmation */}
            {!cancelConfirming && (
              !confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  className="w-full py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  Mark All as Received
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-center text-gray-600">
                    Confirm receipt of <strong>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</strong>?
                    Total expense of{' '}
                    <strong>GH₵{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> will be logged.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer select-none px-1">
                    <input
                      type="checkbox"
                      checked={markPaidOnReceive}
                      onChange={e => setMarkPaidOnReceive(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-600"
                    />
                    <span className="text-sm text-gray-600">Also mark as paid to vendor</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirming(false)}
                      className="flex-1 py-2.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => onReceive(order.orderId, markPaidOnReceive)}
                      disabled={isReceiving}
                      className="flex-1 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isReceiving ? 'Processing…' : 'Yes, Received'}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EditOrderModal({ order, onClose, onSave, isSaving }) {
  const [items, setItems] = useState(
    order.items.map(item => ({
      id: item.id,
      materialName: item.materialName,
      unitLabel: item.materialUnit?.name || item.material?.baseUnit || '',
      quantityOrdered: String(parseFloat(item.quantityOrdered)),
      unitCost: String(parseFloat(item.unitCost)),
    }))
  );

  const updateItem = (index, field, value) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const grandTotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantityOrdered) || 0;
    const cost = parseFloat(item.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  const handleSave = () => {
    const payload = items.map(item => ({
      id: item.id,
      quantityOrdered: parseFloat(item.quantityOrdered),
      unitCost: parseFloat(item.unitCost),
    }));
    onSave({ items: payload });
  };

  const isValid = items.every(item => {
    const qty = parseFloat(item.quantityOrdered);
    const cost = parseFloat(item.unitCost);
    return qty > 0 && cost >= 0;
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg mx-0 sm:mx-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">Edit Restock Order</h3>
            <p className="text-xs text-gray-400 mt-0.5">Adjust quantities and unit costs</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {order.status === 'received' && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-xs text-amber-700 leading-snug">
                This order has been received. Saving will adjust stock levels and update the expense record.
              </p>
            </div>
          )}
          {items.map((item, index) => {
            const lineTotal = (parseFloat(item.quantityOrdered) || 0) * (parseFloat(item.unitCost) || 0);
            return (
              <div key={item.id} className="border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">{item.materialName}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Qty{item.unitLabel ? ` (${item.unitLabel})` : ''}
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantityOrdered}
                      onChange={e => updateItem(index, 'quantityOrdered', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Unit Cost (GH₵)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.unitCost}
                      onChange={e => updateItem(index, 'unitCost', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                </div>
                <div className="mt-2 text-right text-xs text-gray-500">
                  Line total: <span className="font-semibold text-gray-700">
                    GH₵{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-600">Grand Total</span>
            <span className="text-lg font-bold text-gray-900">
              GH₵{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !isValid}
              className="flex-1 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RestockOrdersList() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['restockOrders'],
    queryFn: () => materialsApi.getRestockOrders({ status: 'all' }),
    staleTime: 30_000,
  });

  const receiveMutation = useMutation({
    mutationFn: ({ orderId, markAsPaid }) => materialsApi.receiveRestockOrder(orderId, { markAsPaid }),
    onSuccess: (_, { orderId, markAsPaid }) => {
      queryClient.invalidateQueries(['restockOrders']);
      queryClient.invalidateQueries(['materials']);
      queryClient.invalidateQueries(['ap-ar']);
      setSelectedOrder(prev =>
        prev?.orderId === orderId
          ? {
              ...prev,
              status: 'received',
              paymentStatus: markAsPaid ? 'paid' : prev.paymentStatus,
              receivedDate: new Date().toISOString(),
              items: prev.items.map(i => ({ ...i, status: 'received' })),
            }
          : prev
      );
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (orderId) => materialsApi.markRestockOrderPaid(orderId),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries(['restockOrders']);
      queryClient.invalidateQueries(['ap-ar']);
      setSelectedOrder(prev =>
        prev?.orderId === orderId ? { ...prev, paymentStatus: 'paid' } : prev
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ orderId, data }) => materialsApi.updateRestockOrder(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['restockOrders']);
      queryClient.invalidateQueries(['expenses']);
      setEditingOrder(null);
      setSelectedOrder(null);
    },
  });

  const adminCorrectMutation = useMutation({
    mutationFn: ({ orderId, data }) => materialsApi.adminEditReceivedOrder(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['restockOrders']);
      queryClient.invalidateQueries(['materials']);
      queryClient.invalidateQueries(['expenses']);
      setEditingOrder(null);
      setSelectedOrder(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (orderId) => materialsApi.cancelRestockOrder(orderId),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries(['restockOrders']);
      queryClient.invalidateQueries(['expenses']);
      setSelectedOrder(prev =>
        prev?.orderId === orderId ? { ...prev, status: 'cancelled' } : prev
      );
    },
  });

  const orders = data?.data?.data || data?.data || [];

  const filtered = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab);
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400 mb-1">No {activeTab === 'all' ? '' : activeTab} restock orders</p>
          {activeTab === 'pending' && <p className="text-xs text-gray-400">Use the "Restock" button to place an order.</p>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs text-gray-500 uppercase font-medium">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Items</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Vendor</th>
                <th className="px-4 py-3 text-left">Ordered By</th>
                <th className="px-4 py-3 text-left">Delivery</th>
                <th className="px-4 py-3 text-left">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((order, idx) => {
                const orderedBy = order.user?.fullName || order.user?.username || '—';
                const isPending = order.status === 'pending';
                const itemPreview = order.items.length === 1
                  ? order.items[0].materialName
                  : `${order.items[0].materialName} +${order.items.length - 1} more`;

                return (
                  <tr
                    key={order.orderId || idx}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {order.reorderDate ? format(new Date(order.reorderDate), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{itemPreview}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      GH₵{parseFloat(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order.vendor?.companyName || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-600">{orderedBy}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {statusBadge(order.status)}
                        {isPending && (
                          <span className="text-xs text-amber-600 font-medium">· Tap to receive</span>
                        )}
                      </div>
                      {order.status === 'received' && order.receivedDate && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {format(new Date(order.receivedDate), 'dd MMM yyyy')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {order.status !== 'cancelled' && paymentBadge(order.paymentStatus)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Panel */}
      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onReceive={(orderId, markAsPaid) => receiveMutation.mutate({ orderId, markAsPaid })}
          isReceiving={receiveMutation.isPending}
          isAdmin={isAdmin}
          onEditClick={(order) => setEditingOrder(order)}
          onCancel={(orderId) => cancelMutation.mutate(orderId)}
          isCancelling={cancelMutation.isPending}
          onMarkPaid={(orderId) => markPaidMutation.mutate(orderId)}
          isMarkingPaid={markPaidMutation.isPending}
        />
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={(data) =>
            editingOrder.status === 'received'
              ? adminCorrectMutation.mutate({ orderId: editingOrder.orderId, data })
              : updateMutation.mutate({ orderId: editingOrder.orderId, data })
          }
          isSaving={
            editingOrder.status === 'received'
              ? adminCorrectMutation.isPending
              : updateMutation.isPending
          }
        />
      )}
    </div>
  );
}
