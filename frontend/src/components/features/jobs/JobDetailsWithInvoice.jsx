import { useState, Fragment } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoicesApi, paymentsApi } from '@api/jobs';
import JobPhotos from './JobPhotos';
import Invoice from './Invoice';
import { settingsApi } from '@api/settings';
import Modal from '@components/common/Modal';
import { toast } from 'react-hot-toast';
import Button from '@components/common/Button';
import Card from '@components/common/Card';
import RecordPaymentModal from '@components/features/invoices/RecordPaymentModal';
import { useAuthStore } from '@stores/authStore';
import { format } from 'date-fns';

// ... existing STATUS_STYLES and STATUS_LABELS ...
const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200 ring-1 ring-amber-100',
  in_progress: 'bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-100',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-100',
  invoiced: 'bg-purple-50 text-purple-700 border border-purple-200 ring-1 ring-purple-100',
};

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  invoiced: 'Invoiced',
};

export default function JobDetailsWithInvoice({ 
  isOpen, 
  onClose, 
  job, 
  onEdit, 
  onDelete, 
  onRefresh 
}) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [voidConfirmId, setVoidConfirmId] = useState(null);

  // 1. FETCH BUSINESS SETTINGS (Dynamic Header)
  const { data: settingsResp } = useQuery({
    queryKey: ['business-settings'],
    queryFn: settingsApi.getBusinessSettings,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
  const settings = settingsResp?.data; // actual object: { name, logo, address, phone, email }

  // --- MUTATIONS ---
  const generateInvoiceMutation = useMutation({
    mutationFn: invoicesApi.generateInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      onRefresh();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to generate invoice'),
  });

  const voidPaymentMutation = useMutation({
    mutationFn: (id) => paymentsApi.voidPayment(id),
    onSuccess: () => {
      setVoidConfirmId(null);
      queryClient.invalidateQueries(['jobs']);
      onRefresh();
      toast.success('Payment voided');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to void payment'),
  });

  const handlePrint = () => {
    // For invoiced jobs, trigger Invoice.jsx's new-window print by clicking its Print button
    const invoicePrintBtn = document.querySelector('.invoice-print-btn');
    if (invoicePrintBtn) { invoicePrintBtn.click(); return; }
    window.print();
  };

  if (!job) return null;

  // --- CALCULATIONS ---
  const materialsCost = job.materials?.reduce((sum, m) => sum + parseFloat(m.subtotal), 0) || 0;
  const labourCost = parseFloat(job.labourCost || 0);
  const miscellaneousCost = parseFloat(job.miscellaneousCost || 0);

  const totalCost = job.invoice
    ? parseFloat(job.invoice.totalAmount)
    : materialsCost + labourCost + miscellaneousCost;

  // --- FLAGS ---
  const hasInvoice = !!job.invoice;
  const canGenerateInvoice = !hasInvoice && job.status !== 'cancelled';
  const canEdit = job.status !== 'cancelled';
  const canRecordPayment = hasInvoice && job.invoice.paymentStatus !== 'paid';

  // Sort payments by date (newest first)
  const sortedPayments = job.invoice?.payments
    ? [...job.invoice.payments].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
    : [];

  // Composite invoice object for print template: Invoice.jsx expects invoice.job.* shape
  const invoiceForPrint = hasInvoice ? { ...job.invoice, job } : null;

  const handleGenerateInvoice = () => {
    if (window.confirm('Approve Job? This will generate an Invoice.')) {
      generateInvoiceMutation.mutate({ jobId: job.id });
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={<span className="font-mono">Job #{job.jobCardNumber || job.id}</span>}
        size="2xl"
      >
        <div className="flex flex-col h-full">
          
          {/* --- Scrollable Content Area --- */}
          <div className="flex-1 overflow-y-auto p-1 print-p-0">
            <div className="print-content space-y-6">
              
              {/* PRINT CSS — invoice template when invoice exists, estimate layout otherwise */}
              <style>{hasInvoice ? `
                @media print {
                  .no-print { display: none !important; }
                  .print-content { display: none !important; }
                  .print-only-invoice { display: block !important; }
                }
              ` : `
                @media print {
                  body * { visibility: hidden; }
                  .print-content, .print-content * { visibility: visible; }
                  .print-content { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; }
                  .no-print { display: none !important; }
                  .print-header { display: block !important; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                  table { border-collapse: collapse; width: 100%; }
                  th, td { border: 1px solid #ddd; padding: 8px; }
                  tr.payment-row { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; }
                }
              `}</style>

              {/* DYNAMIC PRINT HEADER (Using Business Settings) */}
              <div className="hidden print-header">
                <div className="flex justify-between items-end">
                  <div>
                    {settings?.logo && (
                        <img src={settings.logo} alt="Logo" className="h-12 mb-2 object-contain" />
                    )}
                    <h1 className="text-3xl font-bold uppercase tracking-widest">
                      {hasInvoice ? 'TAX INVOICE' : 'ESTIMATE'}
                    </h1>
                    <p className="text-sm mt-1">Ref: #{job.jobCardNumber || job.id}</p>
                    {hasInvoice && <p className="text-sm">Inv #: {job.invoice.invoiceNumber}</p>}
                  </div>
                  <div className="text-right">
                    <h2 className="font-bold text-xl">{settings?.name || 'Auto Service Center'}</h2>
                    <p className="text-sm whitespace-pre-line">{settings?.address || 'Loading address...'}</p>
                    <p className="text-sm mt-1">{settings?.phone}</p>
                    <p className="text-sm">{settings?.email}</p>
                  </div>
                </div>
              </div>

              {/* SCREEN HEADER (Visible on Screen) */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-gray-100 no-print">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Job Order Details</h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Created on {format(new Date(job.createdAt), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2">
                  <span className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[job.status]}`}>
                    {STATUS_LABELS[job.status]}
                  </span>
                </div>
              </div>

              {/* INVOICE BANNER */}
              {hasInvoice ? (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 shadow-sm no-print">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white rounded-md shadow-sm text-indigo-600">
                      <svg className="w-5 sm:w-6 h-5 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Invoice Generated</h3>
                      <p className="text-base sm:text-lg font-mono font-semibold text-gray-900">#{job.invoice.invoiceNumber}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                     <div className="text-xs text-gray-500 uppercase">Balance Due</div>
                     <div className={`text-lg sm:text-xl font-bold ${job.invoice.amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        GH₵{parseFloat(job.invoice.amountDue).toFixed(2)}
                     </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3 no-print">
                  <svg className="w-4.5 sm:w-5 h-4.5 sm:h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-amber-800">Pending Approval</h4>
                    <p className="text-xs sm:text-sm text-amber-700 mt-1">Print Estimate for client approval. Generate Invoice to lock inventory.</p>
                  </div>
                </div>
              )}

              {/* CLIENT & VEHICLE GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                <Card className="shadow-sm border-gray-200">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2 mb-2 sm:mb-3">Client</h3>
                  <dl className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium">{job.clientName}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd className="font-medium">{job.clientPhone || '—'}</dd></div>
                  </dl>
                </Card>
                <Card className="shadow-sm border-gray-200">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2 mb-2 sm:mb-3">Vehicle</h3>
                  <dl className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between"><dt className="text-gray-500">Vehicle</dt><dd className="font-medium">{job.vehicleMake} {job.vehicleModel}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Reg #</dt><dd className="font-mono bg-gray-100 px-2 rounded">{job.vehicleRegNumber || '—'}</dd></div>
                  </dl>
                </Card>
              </div>

              {/* MATERIALS TABLE */}
              <div className="border border-gray-200 rounded-lg overflow-hidden mt-4 sm:mt-6">
                 <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="py-1.5 sm:py-2 px-2 sm:px-4 text-left font-semibold text-gray-700">Description</th>
                      <th className="py-1.5 sm:py-2 px-2 sm:px-4 text-center font-semibold text-gray-700">Qty</th>
                      <th className="py-1.5 sm:py-2 px-2 sm:px-4 text-right font-semibold text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {job.materials?.map((material, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 sm:py-2 px-2 sm:px-4">
                          <div className="font-medium text-gray-900">{material.materialName}</div>
                          <div className="text-xs text-gray-500">@ GH₵{parseFloat(material.unitPrice).toFixed(2)}</div>
                        </td>
                        <td className="py-1.5 sm:py-2 px-2 sm:px-4 text-center text-gray-600">{material.quantity}</td>
                        <td className="py-1.5 sm:py-2 px-2 sm:px-4 text-right font-medium text-gray-900">GH₵{parseFloat(material.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50/20">
                      <td className="py-1.5 sm:py-2 px-2 sm:px-4 font-medium text-blue-900" colSpan="2">Labour Charges</td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-4 text-right font-medium text-blue-900">GH₵{labourCost.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-blue-50/20">
                      <td className="py-1.5 sm:py-2 px-2 sm:px-4 font-medium text-blue-900" colSpan="2">Miscellaneous</td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-4 text-right font-medium text-blue-900">GH₵{miscellaneousCost.toFixed(2)}</td>
                    </tr>
                  </tbody>
                 </table>
              </div>

              {/* TOTALS SECTION */}
              <div className="flex justify-end mt-2 sm:mt-4">
                <div className="w-full sm:w-1/2">
                  <div className="flex justify-between items-center py-2 border-t-2 border-gray-900">
                    <span className="text-sm sm:text-base font-bold uppercase">Total</span>
                    <span className="text-xl sm:text-2xl font-bold">GH₵{totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 2. PAYMENT HISTORY (The Ledger) */}
              {hasInvoice && sortedPayments.length > 0 && (
                <div className="mt-6 sm:mt-8">
                   <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 sm:mb-3 border-b border-gray-200 pb-1">Payment History</h3>
                   <div className="border border-gray-200 rounded-md overflow-hidden">
                     <table className="w-full text-xs sm:text-sm text-left">
                       <thead className="bg-gray-50 text-gray-500">
                         <tr>
                           <th className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium">Date</th>
                           <th className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium">Method</th>
                           <th className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium text-right">Amount</th>
                           {isAdmin && <th className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium no-print" />}
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                         {sortedPayments.map((payment) => (
                           <Fragment key={payment.id}>
                             <tr className="payment-row">
                               <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">{format(new Date(payment.paymentDate), 'MMM d, yyyy')}</td>
                               <td className="px-2 sm:px-4 py-1.5 sm:py-2 capitalize text-xs sm:text-sm">
                                 {payment.paymentMethod}
                               </td>
                               <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-mono font-medium text-gray-900 text-xs sm:text-sm">
                                 GH₵{parseFloat(payment.amount).toFixed(2)}
                               </td>
                               {isAdmin && (
                                 <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right no-print">
                                   <button
                                     onClick={() => setVoidConfirmId(payment.id)}
                                     className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                   >
                                     Void
                                   </button>
                                 </td>
                               )}
                             </tr>
                             {/* Inline void confirmation */}
                             {isAdmin && voidConfirmId === payment.id && (
                               <tr className="bg-red-50 no-print">
                                 <td colSpan={isAdmin ? 4 : 3} className="px-2 sm:px-4 py-2 sm:py-3">
                                   <div className="flex items-center justify-between gap-3">
                                     <p className="text-xs text-red-700">
                                       Void this payment of <strong>GH₵{parseFloat(payment.amount).toFixed(2)}</strong>? The invoice balance will be recalculated.
                                     </p>
                                     <div className="flex gap-2 shrink-0">
                                       <button
                                         onClick={() => setVoidConfirmId(null)}
                                         className="text-xs px-2.5 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50"
                                       >
                                         Cancel
                                       </button>
                                       <button
                                         onClick={() => voidPaymentMutation.mutate(payment.id)}
                                         disabled={voidPaymentMutation.isPending}
                                         className="text-xs px-2.5 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                       >
                                         {voidPaymentMutation.isPending ? 'Voiding…' : 'Confirm Void'}
                                       </button>
                                     </div>
                                   </div>
                                 </td>
                               </tr>
                             )}
                           </Fragment>
                         ))}
                         {/* Balance Row */}
                         <tr className="bg-gray-50 font-bold border-t border-gray-200">
                           <td colSpan={2} className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-gray-600 text-xs sm:text-sm">Balance Due:</td>
                           <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-red-600 text-xs sm:text-sm">GH₵{parseFloat(job.invoice.amountDue).toFixed(2)}</td>
                           {isAdmin && <td className="no-print" />}
                         </tr>
                       </tbody>
                     </table>
                   </div>
                </div>
              )}

              {/* TERMS / DISCLAIMER */}
              <div className="mt-8 sm:mt-12 pt-3 sm:pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
                 {hasInvoice ? (
                   <p>Thank you for your business. Please retain this invoice for warranty purposes.</p>
                 ) : (
                   <p>Estimate valid for 30 days. Not a contract until approved.</p>
                 )}
                 {settings?.terms && <p className="mt-1 italic">{settings.terms}</p>}
              </div>

            </div>

            {/* PRINT-ONLY INVOICE TEMPLATE (hidden on screen, shown when printing an invoiced job) */}
            {invoiceForPrint && (
              <div className="print-only-invoice hidden">
                <Invoice invoice={invoiceForPrint} businessSettings={settings} />
              </div>
            )}
          </div>

          {/* --- JOB PHOTOS (No Print) --- */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-gray-100 no-print">
            <JobPhotos jobId={job.id} canEdit={canEdit} allowedCaptions={['after', 'other']} />
          </div>

          {/* --- FOOTER ACTIONS (No Print) --- */}
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 bg-white no-print">
            <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3">
              <div>
                {canEdit && onDelete && (
                  <Button variant="danger" onClick={onDelete} size="sm">
                    Delete
                  </Button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                <Button variant="secondary" onClick={onClose} size="sm">Close</Button>
                
                {canEdit && onEdit && <Button variant="outline" onClick={onEdit} size="sm">Edit</Button>}

                {!hasInvoice && (
                   <Button variant="outline" onClick={handlePrint} size="sm">Print Estimate</Button>
                )}

                {hasInvoice && (
                   <Button variant="outline" onClick={handlePrint} size="sm">Print Invoice</Button>
                )}

                {canGenerateInvoice && (
                  <Button variant="primary" onClick={handleGenerateInvoice} loading={generateInvoiceMutation.isPending} size="sm">
                    Generate Invoice
                  </Button>
                )}

                {canRecordPayment && (
                   <Button variant="success" onClick={() => setShowPaymentModal(true)} size="sm">
                    Record Payment
                   </Button>
                )}
              </div>
            </div>
          </div>

        </div>
      </Modal>

      {hasInvoice && (
        <RecordPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          invoice={job.invoice}
        />
      )}
    </>
  );
}