import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { format } from 'date-fns';

export default function Invoice() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const printRef = useRef();

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/invoices/${id}`);
      setInvoice(response.invoice);
      setPaymentMethod(response.invoice.paymentMethod || 'cash');
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      await api.put(`/invoices/${id}/payment`, {
        paymentStatus: 'paid',
        paymentMethod,
      });
      alert('Invoice marked as paid!');
      fetchInvoice();
      setShowPaymentModal(false);
    } catch (error) {
      alert(error.error?.message || 'Failed to update payment status');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Invoice not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Action Buttons */}
        <div className="flex justify-between items-center print:hidden">
          <Link to="/jobs" className="btn-secondary">
            ← Back to Jobs
          </Link>
          <div className="flex space-x-2">
            {invoice.paymentStatus === 'unpaid' && (
              <button onClick={() => setShowPaymentModal(true)} className="btn-success">
                💰 Mark as Paid
              </button>
            )}
            <button onClick={handlePrint} className="btn-primary">
              🖨️ Print Invoice
            </button>
          </div>
        </div>

        {/* Invoice */}
        <div ref={printRef} className="card print:shadow-none">
          {/* Payment Status Banner */}
          {invoice.paymentStatus === 'paid' && (
            <div className="bg-green-100 border-2 border-green-500 text-green-800 p-4 rounded-lg mb-4 print:hidden">
              <p className="font-bold">✓ PAID</p>
              <p className="text-sm">Payment received on {format(new Date(invoice.paidDate), 'MMM dd, yyyy')}</p>
            </div>
          )}
          {invoice.paymentStatus === 'unpaid' && (
            <div className="bg-yellow-100 border-2 border-yellow-500 text-yellow-800 p-4 rounded-lg mb-4 print:hidden">
              <p className="font-bold">⏳ UNPAID</p>
              <p className="text-sm">Awaiting payment from client</p>
            </div>
          )}

          {/* Header */}
          <div className="border-b-2 border-gray-200 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">INVOICE</h1>
                <p className="text-lg text-gray-600 mt-1">{invoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-primary-600">Auto Workshop</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Accra, Ghana<br />
                  +233 XX XXX XXXX<br />
                  info@autoworkshop.com
                </p>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-bold text-gray-700 mb-2">Bill To:</h3>
              <p className="font-medium">{invoice.job.clientName}</p>
              {invoice.job.clientPhone && <p className="text-sm text-gray-600">{invoice.job.clientPhone}</p>}
              {invoice.job.clientEmail && <p className="text-sm text-gray-600">{invoice.job.clientEmail}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Invoice Date:</span> {format(new Date(invoice.invoiceDate), 'MMMM dd, yyyy')}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Job ID:</span> #{invoice.jobId}
              </p>
            </div>
          </div>

          {/* Vehicle Info */}
          {(invoice.job.carMake || invoice.job.carModel || invoice.job.carRegNumber) && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-bold text-gray-700 mb-2">Vehicle Information:</h3>
              <p className="text-gray-800">
                {invoice.job.carMake} {invoice.job.carModel}
                {invoice.job.carRegNumber && ` • Registration: ${invoice.job.carRegNumber}`}
              </p>
            </div>
          )}

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 font-bold">Description</th>
                  <th className="text-center py-3 font-bold">Qty</th>
                  <th className="text-right py-3 font-bold">Unit Price</th>
                  <th className="text-right py-3 font-bold">Amount (GH₵)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Materials */}
                {invoice.job.materials && invoice.job.materials.map((material) => (
                  <tr key={material.id}>
                    <td className="py-3">{material.materialName}</td>
                    <td className="py-3 text-center">{material.quantity}</td>
                    <td className="py-3 text-right">
                      {parseFloat(material.unitPrice).toFixed(2)}
                    </td>
                    <td className="py-3 text-right">
                      {parseFloat(material.subtotal).toFixed(2)}
                    </td>
                  </tr>
                ))}
                
                {/* Materials Subtotal */}
                <tr className="bg-gray-100 font-medium">
                  <td colSpan="3" className="py-3 text-right">Materials Subtotal:</td>
                  <td className="py-3 text-right">
                    {parseFloat(invoice.materialsCost).toFixed(2)}
                  </td>
                </tr>
                
                {/* Workmanship/Labour */}
                <tr className="bg-gray-100 font-medium">
                  <td colSpan="3" className="py-3 text-right">Workmanship / Labour Charges:</td>
                  <td className="py-3 text-right">
                    {parseFloat(invoice.labourCost).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t-2 border-gray-300 pt-4">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Materials Cost:</span>
                  <span className="font-medium">GH₵ {parseFloat(invoice.materialsCost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Labour Cost:</span>
                  <span className="font-medium">GH₵ {parseFloat(invoice.labourCost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-gray-300">
                  <span className="text-xl font-bold">TOTAL:</span>
                  <span className="text-xl font-bold text-primary-600">
                    GH₵ {parseFloat(invoice.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-bold text-gray-700 mb-2">Notes:</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-1">Generated by {invoice.createdBy?.fullName || invoice.createdBy?.username}</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .card, .card * {
            visibility: visible;
          }
          .card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none;
          }
        }
      `}</style>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Mark Invoice as Paid</h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded">
                <p className="font-bold text-lg">Total Amount: GH₵ {parseFloat(invoice.totalAmount).toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input"
                >
                  <option value="cash">Cash</option>
                  <option value="momo">Mobile Money (Momo)</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  ⚠️ This will mark the invoice as paid and update the job status.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleMarkAsPaid}
                  className="flex-1 btn-success"
                >
                  Confirm Payment
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}