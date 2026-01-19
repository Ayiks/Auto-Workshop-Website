// src/components/features/invoices/InvoiceDetails.jsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@api/jobs';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';
import Card from '@components/common/Card';
import RecordPaymentModal from '@components/features/invoices/RecordPaymentModal';
import { format } from 'date-fns';

const PAYMENT_STATUS_COLORS = {
  unpaid: 'danger',
  partial: 'warning',
  paid: 'success',
};

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Unpaid',
  partial: 'Partially Paid',
  paid: 'Paid',
};

export default function InvoiceDetails({ isOpen, onClose, invoice }) {
  const queryClient = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  if (!invoice) return null;

  const materialsCost = parseFloat(invoice.materialsCost || 0);
  const labourCost = parseFloat(invoice.labourCost || 0);
  const totalAmount = parseFloat(invoice.totalAmount || 0);
  const amountPaid = parseFloat(invoice.amountPaid || 0);
  const amountDue = parseFloat(invoice.amountDue || 0);

  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Invoice ${invoice.invoiceNumber}`}
        size="large"
      >
        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-mono">
                {invoice.invoiceNumber}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Date: {format(new Date(invoice.invoiceDate), 'MMMM d, yyyy')}
              </p>
              {invoice.fullyPaidDate && (
                <p className="text-sm text-success-600 mt-1">
                  Paid: {format(new Date(invoice.fullyPaidDate), 'MMMM d, yyyy')}
                </p>
              )}
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${PAYMENT_STATUS_COLORS[invoice.paymentStatus]}-100 text-${PAYMENT_STATUS_COLORS[invoice.paymentStatus]}-800`}>
              {PAYMENT_STATUS_LABELS[invoice.paymentStatus]}
            </span>
          </div>

          {/* Job Information */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Job ID:</span>
                <p className="font-medium text-gray-900">#{invoice.jobId}</p>
              </div>
              <div>
                <span className="text-gray-600">Job Type:</span>
                <p className="font-medium text-gray-900 capitalize">{invoice.job?.jobType}</p>
              </div>
            </div>
          </Card>

          {/* Client Information */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <p className="font-medium text-gray-900">{invoice.job?.clientName}</p>
              </div>
              <div>
                <span className="text-gray-600">Phone:</span>
                <p className="font-medium text-gray-900">{invoice.job?.clientPhone || 'N/A'}</p>
              </div>
              {invoice.job?.clientEmail && (
                <div className="col-span-2">
                  <span className="text-gray-600">Email:</span>
                  <p className="font-medium text-gray-900">{invoice.job.clientEmail}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Vehicle Information */}
          {(invoice.job?.vehicleMake || invoice.job?.vehicleModel) && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {invoice.job?.vehicleMake && (
                  <div>
                    <span className="text-gray-600">Make:</span>
                    <p className="font-medium text-gray-900">{invoice.job.vehicleMake}</p>
                  </div>
                )}
                {invoice.job?.vehicleModel && (
                  <div>
                    <span className="text-gray-600">Model:</span>
                    <p className="font-medium text-gray-900">{invoice.job.vehicleModel}</p>
                  </div>
                )}
                {invoice.job?.vehicleRegNumber && (
                  <div>
                    <span className="text-gray-600">Registration:</span>
                    <p className="font-medium text-gray-900">{invoice.job.vehicleRegNumber}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Materials & Services */}
          {invoice.job?.materials && invoice.job.materials.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Materials & Services</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 text-gray-900">Item</th>
                      <th className="text-right py-2 px-3 text-gray-900">Qty</th>
                      <th className="text-right py-2 px-3 text-gray-900">Unit Price</th>
                      <th className="text-right py-2 px-3 text-gray-900">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoice.job.materials.map((material, index) => (
                      <tr key={index}>
                        <td className="py-2 px-3 text-gray-900">
                          {material.materialName}
                          {material.isExternal && (
                            <span className="ml-2 text-xs text-warning-600">(External)</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-900">{material.quantity}</td>
                        <td className="py-2 px-3 text-right text-gray-900">
                          GH₵{parseFloat(material.unitPrice).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-gray-900">
                          GH₵{parseFloat(material.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2">
                      <td colSpan="3" className="py-2 px-3 text-right font-medium text-gray-900">
                        Labour Cost:
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-gray-900">
                        GH₵{labourCost.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Invoice Summary */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Materials Cost:</span>
                <span className="font-medium text-gray-900">GH₵{materialsCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Labour Cost:</span>
                <span className="font-medium text-gray-900">GH₵{labourCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span className="text-gray-900">Total Amount:</span>
                <span className="text-gray-900">GH₵{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-success-600">Amount Paid:</span>
                <span className="font-medium text-success-600">GH₵{amountPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-danger-600">Amount Due:</span>
                <span className="text-danger-600">GH₵{amountDue.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">GH₵{parseFloat(payment.amount).toFixed(2)}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(payment.paymentDate), 'MMM d, yyyy')} • {payment.paymentMethod}
                      </p>
                      {payment.receipt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Receipt: {payment.receipt.receiptNumber}
                        </p>
                      )}
                    </div>
                    <span className="text-success-600 font-medium">Paid</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-700">{invoice.notes}</p>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-3 border-t pt-4">
            <Button variant="outline" onClick={handlePrintInvoice}>
              Print Invoice
            </Button>
            <div className="flex gap-2">
              {invoice.paymentStatus !== 'paid' && (
                <Button
                  variant="primary"
                  onClick={() => setShowPaymentModal(true)}
                >
                  Record Payment
                </Button>
              )}
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={invoice}
      />
    </>
  );
}