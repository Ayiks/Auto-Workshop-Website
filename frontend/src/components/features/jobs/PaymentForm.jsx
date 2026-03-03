import { useState } from 'react';
import Modal from '@components/common/Modal';
import Input, { Textarea } from '@components/common/Input';
import Select from '@components/common/Select';
import Button from '@components/common/Button';

export default function PaymentForm({ isOpen, onClose, invoice, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    amount: invoice?.amountDue || '',
    paymentMethod: 'cash',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (parseFloat(formData.amount) > parseFloat(invoice?.amountDue || 0)) {
      newErrors.amount = 'Amount cannot exceed balance due';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        invoiceId: invoice.id,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        notes: formData.notes.trim(),
      });
    }
  };

  const isFullPayment = parseFloat(formData.amount) === parseFloat(invoice?.amountDue || 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        {/* Invoice Info */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
            <div>
              <p className="text-gray-600">Invoice Number</p>
              <p className="font-semibold text-gray-900">{invoice?.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-gray-600">Client</p>
              <p className="font-semibold text-gray-900">{invoice?.job?.clientName}</p>
            </div>
            <div>
              <p className="text-gray-600">Total Amount</p>
              <p className="font-semibold text-gray-900">GH₵{parseFloat(invoice?.totalAmount || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Already Paid</p>
              <p className="font-semibold text-success-600">GH₵{parseFloat(invoice?.amountPaid || 0).toFixed(2)}</p>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <p className="text-gray-600">Balance Due</p>
              <p className="text-lg sm:text-xl font-bold text-danger-600">GH₵{parseFloat(invoice?.amountDue || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Payment Amount */}
        <div>
          <Input
            label="Payment Amount (GH₵)"
            name="amount"
            type="number"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0.01"
            max={invoice?.amountDue}
            required
            disabled={isLoading}
            error={errors.amount}
          />
          <div className="mt-2 flex gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, amount: invoice?.amountDue })}
              className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
            >
              Full Amount
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, amount: (parseFloat(invoice?.amountDue || 0) / 2).toFixed(2) })}
              className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
            >
              Half Amount
            </button>
          </div>
        </div>

        {/* Payment Method */}
        <Select
          label="Payment Method"
          name="paymentMethod"
          value={formData.paymentMethod}
          onChange={handleChange}
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'momo', label: 'Mobile Money' },
            { value: 'cheque', label: 'Cheque' },
          ]}
          required
          disabled={isLoading}
        />

        {/* Notes */}
        <Textarea
          label="Notes (Optional)"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add any notes about this payment..."
          rows={3}
          disabled={isLoading}
        />

        {/* Payment Preview */}
        {formData.amount > 0 && (
          <div className={`rounded-lg p-3 sm:p-4 ${isFullPayment ? 'bg-success-50 border border-success-200' : 'bg-warning-50 border border-warning-200'}`}>
            <p className="text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              {isFullPayment ? '✓ Full Payment - Invoice will be marked as PAID' : 'Partial Payment'}
            </p>
            <div className="text-xs sm:text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Receiving:</span>
                <span className="font-semibold">GH₵{parseFloat(formData.amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">New Balance:</span>
                <span className="font-semibold">
                  GH₵{(parseFloat(invoice?.amountDue || 0) - parseFloat(formData.amount || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="success" loading={isLoading}>
            Confirm Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}