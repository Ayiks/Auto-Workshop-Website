import { format } from 'date-fns';
import Button from '@components/common/Button';
import Card from '@components/common/Card';

export default function Invoice({ invoice, onRecordPayment }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        {/* Invoice Header */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
              <p className="text-sm text-gray-600 mt-2">Invoice #: {invoice.invoiceNumber}</p>
              <p className="text-sm text-gray-600">
                Date: {format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg font-semibold ${
              invoice.paymentStatus === 'paid'
                ? 'bg-success-100 text-success-700'
                : invoice.paymentStatus === 'partial'
                ? 'bg-warning-100 text-warning-700'
                : 'bg-danger-100 text-danger-700'
            }`}>
              {invoice.paymentStatus.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Client & Vehicle Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">CLIENT INFORMATION</h3>
            <div className="text-sm space-y-1">
              <p className="font-medium text-gray-900">{invoice.job.clientName}</p>
              <p className="text-gray-600">{invoice.job.clientPhone}</p>
              {invoice.job.clientEmail && <p className="text-gray-600">{invoice.job.clientEmail}</p>}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">VEHICLE INFORMATION</h3>
            <div className="text-sm space-y-1">
              {invoice.job.vehicleMake && (
                <p className="text-gray-900">
                  {invoice.job.vehicleMake} {invoice.job.vehicleModel}
                </p>
              )}
              {invoice.job.vehicleRegNumber && (
                <p className="text-gray-600">Reg: {invoice.job.vehicleRegNumber}</p>
              )}
              <p className="text-gray-600 capitalize">Type: {invoice.job.jobType}</p>
            </div>
          </div>
        </div>

        {/* Problem Description */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">PROBLEM</h3>
          <p className="text-sm text-gray-900 font-medium">{invoice.job.problemType}</p>
          <p className="text-sm text-gray-600 mt-1">{invoice.job.problemDescription}</p>
        </div>

        {/* Materials Table */}
        {invoice.job.materials && invoice.job.materials.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">MATERIALS</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3">Item</th>
                  <th className="text-center py-2 px-3">Type</th>
                  <th className="text-right py-2 px-3">Qty</th>
                  <th className="text-right py-2 px-3">Unit Price</th>
                  <th className="text-right py-2 px-3">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.job.materials.map((material, index) => (
                  <tr key={index}>
                    <td className="py-2 px-3">{material.materialName}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        material.isExternal
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {material.isExternal ? 'External' : 'Inventory'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">{material.quantity}</td>
                    <td className="py-2 px-3 text-right">GH₵{parseFloat(material.unitPrice).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">GH₵{parseFloat(material.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Materials Cost:</span>
                <span className="font-medium">GH₵{parseFloat(invoice.materialsCost).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Labour Cost:</span>
                <span className="font-medium">GH₵{parseFloat(invoice.labourCost).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                <span>Total Amount:</span>
                <span>GH₵{parseFloat(invoice.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-success-600">
                <span>Amount Paid:</span>
                <span className="font-semibold">GH₵{parseFloat(invoice.amountPaid).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-danger-600">
                <span>Balance Due:</span>
                <span>GH₵{parseFloat(invoice.amountDue).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">PAYMENT HISTORY</h3>
            <div className="space-y-2">
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-900">
                      {format(new Date(payment.paymentDate), 'MMM dd, yyyy HH:mm')}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded uppercase">
                      {payment.paymentMethod}
                    </span>
                    {payment.receipt && (
                      <span className="text-xs text-gray-500">
                        Receipt: {payment.receipt.receiptNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    GH₵{parseFloat(payment.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3 print:hidden">
          <Button variant="secondary" onClick={handlePrint}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Invoice
          </Button>
          {invoice.paymentStatus !== 'paid' && onRecordPayment && (
            <Button variant="success" onClick={onRecordPayment}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Record Payment
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}