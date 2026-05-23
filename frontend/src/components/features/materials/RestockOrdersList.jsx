import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsApi } from '@/api/materials';
import { useAuthStore } from '@stores/authStore';
import { format } from 'date-fns';

const STATUS_TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'received', label: 'Received' },
  { key: 'cancelled', label: 'Cancelled' },
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

// draftAmount  — controlled string from parent (so all rows share the same budget math)
// maxAmount    — GH₵ ceiling this vendor can be assigned (grandTotal minus other vendors' drafts)
// isDisabled   — budget fully allocated and this vendor has 0 draft
function VendorPayRow({ row, orderId, onPay, isPaying, draftAmount, onDraftChange, maxAmount, isDisabled }) {
  const [expanded, setExpanded] = useState(false);
  const isPaid = row.paymentStatus === 'paid';
  const numVal = parseFloat(draftAmount) || 0;
  const isOverMax = numVal > maxAmount + 0.001; // tolerance for float rounding

  const handlePay = () => {
    if (isOverMax || numVal < 0) return;
    onPay(orderId, { vendorId: row.vendorId, amount: numVal });
    setExpanded(false);
  };

  const handleToggle = () => {
    if (isDisabled) return;
    setExpanded(s => !s);
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-opacity ${isDisabled ? 'opacity-40 border-gray-200' : 'border-gray-200'}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isDisabled}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left disabled:cursor-not-allowed disabled:hover:bg-white"
      >
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
          {row.vendor.companyName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{row.vendor.companyName}</p>
          {row.vendor.contactName && <p className="text-xs text-gray-500">{row.vendor.contactName}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isPaid ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Paid · GH₵{parseFloat(row.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          ) : isDisabled ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Budget full</span>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Unpaid</span>
          )}
          {!isDisabled && (
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {expanded && !isDisabled && (
        <div className="px-3 py-3 border-t border-gray-100 bg-gray-50 space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-gray-600">Amount Paid (GH₵)</label>
                <span className="text-xs text-gray-400">
                  max <span className="font-semibold text-gray-600">GH₵{maxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </span>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draftAmount}
                onChange={e => onDraftChange(row.vendorId, e.target.value)}
                placeholder="0.00"
                autoFocus
                className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                  isOverMax
                    ? 'border-red-400 bg-red-50 focus:ring-red-400'
                    : 'border-gray-300 focus:ring-gray-900'
                }`}
              />
            </div>
            <button
              onClick={handlePay}
              disabled={isPaying || isOverMax || numVal < 0}
              className="px-4 py-1.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 shrink-0"
            >
              {isPaying ? '…' : 'Save'}
            </button>
          </div>
          {isOverMax && (
            <p className="text-xs text-red-600 font-medium">
              Exceeds available balance by GH₵{(numVal - maxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function OrderDetailPanel({ order, onClose, onReceive, isReceiving, isAdmin, onEditClick, onCancel, isCancelling, onDelete, isDeleting, onMarkPaid, isMarkingPaid, onPayVendor, isPayingVendor }) {
  const [confirming, setConfirming] = useState(false);
  const [cancelConfirming, setCancelConfirming] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  // draftAmounts: live input values keyed by vendorId (strings so the input is uncontrolled-friendly)
  const [draftAmounts, setDraftAmounts] = useState(
    () => Object.fromEntries((order.vendors || []).map(v => [v.vendorId, String(parseFloat(v.amountPaid) || '')]))
  );

  // Re-sync after a payment saves (order.vendors updates via setSelectedOrder in parent)
  useEffect(() => {
    setDraftAmounts(
      Object.fromEntries((order.vendors || []).map(v => [v.vendorId, String(parseFloat(v.amountPaid) || '')]))
    );
  }, [order.vendors]);

  const orderedBy = order.user?.fullName || order.user?.username || '—';
  const receivedBy = order.receivedUser?.fullName || order.receivedUser?.username || '—';
  const grandTotal = parseFloat(order.totalCost);
  const isPending = order.status === 'pending';
  const hasMultiVendors = order.vendors?.length > 0;

  // Budget math — updates live as the user types into any row
  const totalAllocated = (order.vendors || []).reduce(
    (sum, v) => sum + (parseFloat(draftAmounts[v.vendorId]) || 0), 0
  );
  const remaining = grandTotal - totalAllocated;

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
            {order.status !== 'cancelled' && !hasMultiVendors && paymentBadge(order.paymentStatus)}
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

          {/* Vendors */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {hasMultiVendors ? `Vendors (${order.vendors.length}) — tap to record payment` : 'Vendor'}
            </p>
            {hasMultiVendors ? (
              <div className="space-y-2">
                {/* ── Balance bar ── */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order total</span>
                    <span className="font-semibold text-gray-900">
                      GH₵{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Allocated</span>
                    <span className={`font-semibold ${totalAllocated > grandTotal ? 'text-red-600' : 'text-gray-700'}`}>
                      GH₵{totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1">
                    <span className={`font-medium text-xs ${remaining < 0 ? 'text-red-600' : remaining === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {remaining < 0 ? 'Over budget' : remaining === 0 ? 'Fully allocated' : 'Remaining'}
                    </span>
                    <span className={`font-bold text-xs ${remaining < 0 ? 'text-red-600' : remaining === 0 ? 'text-emerald-600' : 'text-amber-700'}`}>
                      {remaining < 0
                        ? `−GH₵${Math.abs(remaining).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : `GH₵${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>
                </div>

                {/* ── Per-vendor rows ── */}
                {order.vendors.map(row => {
                  const thisVendorDraft = parseFloat(draftAmounts[row.vendorId]) || 0;
                  // Max this vendor can receive = budget not claimed by the other vendors
                  const otherAllocated = totalAllocated - thisVendorDraft;
                  const maxAmount = Math.max(0, grandTotal - otherAllocated);
                  // Gray out if budget is gone and this vendor has nothing entered
                  const isDisabled = remaining <= 0.001 && thisVendorDraft === 0;
                  return (
                    <VendorPayRow
                      key={row.vendorId}
                      row={row}
                      orderId={order.orderId}
                      onPay={onPayVendor}
                      isPaying={isPayingVendor}
                      draftAmount={draftAmounts[row.vendorId] ?? ''}
                      onDraftChange={(vendorId, val) =>
                        setDraftAmounts(prev => ({ ...prev, [vendorId]: val }))
                      }
                      maxAmount={maxAmount}
                      isDisabled={isDisabled}
                    />
                  );
                })}
              </div>
            ) : order.vendor ? (
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

        {/* Footer — received orders: legacy single-vendor pay + admin correction */}
        {order.status === 'received' && (
          <div className="px-6 py-4 border-t border-gray-100 space-y-2">
            {/* Legacy: single vendor, no RestockOrderVendor rows yet */}
            {!hasMultiVendors && order.vendor && order.paymentStatus !== 'paid' && !deleteConfirming && (
              <button
                onClick={() => onMarkPaid(order.orderId)}
                disabled={isMarkingPaid}
                className="w-full py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isMarkingPaid ? 'Processing…' : 'Mark as Paid to Vendor'}
              </button>
            )}
            {isAdmin && !deleteConfirming && (
              <button
                onClick={() => onEditClick(order)}
                className="w-full py-2 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Edit Order (Admin Correction)
              </button>
            )}
            {isAdmin && !deleteConfirming && (
              <button
                onClick={() => setDeleteConfirming(true)}
                className="w-full py-2 text-sm font-medium border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
              >
                Delete Order
              </button>
            )}
            {isAdmin && deleteConfirming && (
              <div className="space-y-2">
                <p className="text-sm text-center text-gray-600">
                  Delete this order? Stock for the {order.items.length} item{order.items.length !== 1 ? 's' : ''} will be removed and the COGS expense will be reversed.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteConfirming(false)}
                    className="flex-1 py-2.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => onDelete(order.orderId)}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer — cancelled orders: admin delete only */}
        {order.status === 'cancelled' && isAdmin && (
          <div className="px-6 py-4 border-t border-gray-100 space-y-2">
            {!deleteConfirming ? (
              <button
                onClick={() => setDeleteConfirming(true)}
                className="w-full py-2 text-sm font-medium border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
              >
                Delete Order
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-center text-gray-600">
                  Delete this cancelled order? This removes the record permanently.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteConfirming(false)}
                    className="flex-1 py-2.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => onDelete(order.orderId)}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirming(false)}
                      className="flex-1 py-2.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => onReceive(order.orderId)}
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
    mutationFn: (orderId) => materialsApi.receiveRestockOrder(orderId),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries(['restockOrders']);
      queryClient.invalidateQueries(['materials']);
      queryClient.invalidateQueries(['ap-ar']);
      setSelectedOrder(prev =>
        prev?.orderId === orderId
          ? {
              ...prev,
              status: 'received',
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

  const vendorPayMutation = useMutation({
    mutationFn: ({ orderId, vendorId, amount }) => materialsApi.payRestockOrderVendor(orderId, { vendorId, amount }),
    onSuccess: (res, { orderId, vendorId, amount }) => {
      queryClient.invalidateQueries(['restockOrders']);
      const updated = res?.data?.data;
      setSelectedOrder(prev => {
        if (!prev || prev.orderId !== orderId) return prev;
        return {
          ...prev,
          vendors: prev.vendors.map(v =>
            v.vendorId === vendorId
              ? { ...v, amountPaid: amount, paymentStatus: parseFloat(amount) > 0 ? 'paid' : 'unpaid' }
              : v
          ),
        };
      });
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

  const deleteMutation = useMutation({
    mutationFn: (orderId) => materialsApi.deleteRestockOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries(['restockOrders']);
      queryClient.invalidateQueries(['materials']);
      queryClient.invalidateQueries(['expenses']);
      queryClient.invalidateQueries(['ap-ar']);
      setSelectedOrder(null);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Could not delete order';
      alert(msg);
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
                    <td className="px-4 py-3 text-gray-600">
                      {order.vendors?.length > 0
                        ? order.vendors.length === 1
                          ? order.vendors[0].vendor.companyName
                          : `${order.vendors[0].vendor.companyName} +${order.vendors.length - 1}`
                        : order.vendor?.companyName || <span className="text-gray-300">—</span>}
                    </td>
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
                      {order.status !== 'cancelled' && order.vendors?.length > 0
                        ? (() => {
                            const paid = order.vendors.filter(v => v.paymentStatus === 'paid').length;
                            const total = order.vendors.length;
                            return paid === total
                              ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">All Paid</span>
                              : paid > 0
                                ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{paid}/{total} Paid</span>
                                : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Unpaid</span>;
                          })()
                        : order.status !== 'cancelled' && paymentBadge(order.paymentStatus)}
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
          onReceive={(orderId) => receiveMutation.mutate(orderId)}
          isReceiving={receiveMutation.isPending}
          isAdmin={isAdmin}
          onEditClick={(order) => setEditingOrder(order)}
          onCancel={(orderId) => cancelMutation.mutate(orderId)}
          isCancelling={cancelMutation.isPending}
          onDelete={(orderId) => deleteMutation.mutate(orderId)}
          isDeleting={deleteMutation.isPending}
          onMarkPaid={(orderId) => markPaidMutation.mutate(orderId)}
          isMarkingPaid={markPaidMutation.isPending}
          onPayVendor={(orderId, { vendorId, amount }) => vendorPayMutation.mutate({ orderId, vendorId, amount })}
          isPayingVendor={vendorPayMutation.isPending}
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
