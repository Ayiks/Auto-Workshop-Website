import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@api/jobs';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';
import Card from '@components/common/Card';
import RecordPaymentModal from '@components/features/invoices/RecordPaymentModal';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  invoiced: 'bg-gray-50 text-gray-700',
};

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  invoiced: 'Invoiced',
};

const PAYMENT_STATUS_COLORS = {
  unpaid: 'bg-red-50 text-red-700',
  partial: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
};

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
};

export default function JobDetailsWithInvoice({ 
  isOpen, 
  onClose, 
  job, 
  onEdit, 
  onDelete, 
  onUpdateStatus, 
  onComplete,
  onRefresh 
}) {
  const queryClient = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Generate invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: invoicesApi.generateInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      onRefresh();
      alert('Invoice generated successfully! You can now print it for the client.');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to generate invoice');
    },
  });

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  if (!job) return null;

  const materialsCost = job.materials?.reduce((sum, m) => sum + parseFloat(m.subtotal), 0) || 0;
  const labourCost = parseFloat(job.labourCost || 0);
  const totalCost = materialsCost + labourCost;

  const hasInvoice = job.invoice;
  const canGenerateInvoice = job.status === 'pending' && !hasInvoice;
  const canEdit = job.status === 'pending' && !hasInvoice;
  const canStart = job.status === 'pending' && hasInvoice;
  const canComplete = job.status === 'in_progress';
  const canRecordPayment = hasInvoice && job.invoice.paymentStatus !== 'paid';

  const handleGenerateInvoice = () => {
    if (window.confirm('Generate invoice for this job? The invoice will be given to the client and inventory will be deducted.')) {
      generateInvoiceMutation.mutate({
        jobId: job.id,
      });
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Job #${job.id}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Printable Area */}
          <div className="print-content space-y-6">
            {/* Print Styles */}
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                .print-content, .print-content * {
                  visibility: visible;
                }
                .print-content {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Job #{job.id}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Created: {format(new Date(job.createdAt), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[job.status]}`}>
                  {STATUS_LABELS[job.status]}
                </span>
                {hasInvoice && (
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${PAYMENT_STATUS_COLORS[job.invoice.paymentStatus]}`}>
                    {PAYMENT_STATUS_LABELS[job.invoice.paymentStatus]}
                  </span>
                )}
              </div>
            </div>

            {/* Invoice Header */}
            {hasInvoice && (
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Invoice #{job.invoice.invoiceNumber}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Issued: {format(new Date(job.invoice.invoiceDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {job.invoice.fullyPaidDate && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">Fully Paid</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(job.invoice.fullyPaidDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Invoice Warning */}
            {!hasInvoice && (
              <Card className="border border-amber-200 bg-amber-50">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">Invoice Required</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Generate an invoice for this job before starting work. This will deduct inventory and create a client invoice.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Client Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Card */}
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Client</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">{job.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{job.clientPhone || 'N/A'}</p>
                  </div>
                  {job.clientEmail && (
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{job.clientEmail}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Vehicle Card */}
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle</h3>
                <div className="space-y-3">
                  {job.vehicleMake && job.vehicleModel && (
                    <div>
                      <p className="text-sm text-gray-600">Make & Model</p>
                      <p className="font-medium text-gray-900">{job.vehicleMake} {job.vehicleModel}</p>
                    </div>
                  )}
                  {job.vehicleRegNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Registration</p>
                      <p className="font-medium text-gray-900">{job.vehicleRegNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Problem Type</p>
                    <p className="font-medium text-gray-900 capitalize">{job.problemType.replace('_', ' ')}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Problem Description */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Problem Description</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{job.problemDescription}</p>
              </div>
            </Card>

            {/* Materials Table */}
            {job.materials && job.materials.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Materials & Services</h3>
                  <span className="text-sm text-gray-500">{job.materials.length} items</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3 px-4 text-left font-medium text-gray-700">Item</th>
                        <th className="py-3 px-4 text-right font-medium text-gray-700">Qty</th>
                        <th className="py-3 px-4 text-right font-medium text-gray-700">Price</th>
                        <th className="py-3 px-4 text-right font-medium text-gray-700">Amount</th>
                        <th className="py-3 px-4 text-center font-medium text-gray-700">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {job.materials.map((material, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-900">{material.materialName}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{material.quantity}</td>
                          <td className="py-3 px-4 text-right text-gray-700">GH₵{parseFloat(material.unitPrice).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900">GH₵{parseFloat(material.subtotal).toFixed(2)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              material.isExternal 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {material.isExternal ? 'External' : 'Inventory'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td colSpan="3" className="py-3 px-4 text-right font-medium text-gray-900">
                          Labour Cost
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          GH₵{labourCost.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Cost Summary */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {hasInvoice ? 'Invoice Summary' : 'Cost Summary'}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-600">Materials Cost</span>
                  <span className="font-medium text-gray-900">GH₵{materialsCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-600">Labour Cost</span>
                  <span className="font-medium text-gray-900">GH₵{labourCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold py-3 border-t border-gray-200">
                  <span className="text-gray-900">Total Amount</span>
                  <span className="text-gray-900">GH₵{totalCost.toFixed(2)}</span>
                </div>

                {hasInvoice && (
                  <>
                    <div className="flex justify-between text-sm py-2 border-t border-gray-200">
                      <span className="text-green-600">Amount Paid</span>
                      <span className="font-medium text-green-600">GH₵{parseFloat(job.invoice.amountPaid).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold py-3 border-t border-gray-200">
                      <span className="text-gray-900">Amount Due</span>
                      <span className="text-red-600">GH₵{parseFloat(job.invoice.amountDue).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Payment History */}
            {hasInvoice && job.invoice.payments && job.invoice.payments.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
                <div className="space-y-3">
                  {job.invoice.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">GH₵{parseFloat(payment.amount).toFixed(2)}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(payment.paymentDate), 'MMM d, yyyy')} • {payment.paymentMethod}
                        </p>
                      </div>
                      <span className="text-green-600 font-medium">Paid</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Assigned To */}
            {job.user && (
              <div className="text-sm text-gray-600">
                <span>Assigned to: </span>
                <span className="font-medium text-gray-900">{job.user.fullName || job.user.username}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-3 border-t border-gray-200 pt-6 no-print">
            <div className="flex gap-2">
              {canEdit && onDelete && (
                <Button
                  variant="danger"
                  onClick={onDelete}
                  size="sm"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  }
                >
                  Delete
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {/* Generate Invoice */}
              {canGenerateInvoice && (
                <Button
                  variant="primary"
                  onClick={handleGenerateInvoice}
                  loading={generateInvoiceMutation.isPending}
                  size="sm"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  Generate Invoice
                </Button>
              )}

              {/* Start Job */}
              {canStart && onUpdateStatus && (
                <Button
                  variant="primary"
                  onClick={() => onUpdateStatus(job.id, 'in_progress')}
                  size="sm"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                >
                  Start Job
                </Button>
              )}

              {/* Complete Job */}
              {canComplete && onComplete && (
                <Button
                  variant="success"
                  onClick={() => onComplete(job.id)}
                  size="sm"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                  }
                >
                  Complete
                </Button>
              )}

              {/* Record Payment */}
              {canRecordPayment && (
                <Button
                  variant="success"
                  onClick={() => setShowPaymentModal(true)}
                  size="sm"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                >
                  Record Payment
                </Button>
              )}

              {/* Print Invoice */}
              {hasInvoice && (
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  size="sm"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  }
                >
                  Print
                </Button>
              )}

              {/* Edit Job */}
              {canEdit && onEdit && (
                <Button
                  variant="outline"
                  onClick={onEdit}
                  size="sm"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  }
                >
                  Edit
                </Button>
              )}

              <Button variant="secondary" onClick={onClose} size="sm">
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
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