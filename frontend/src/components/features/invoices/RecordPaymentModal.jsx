// src/components/features/invoices/RecordPaymentModal.jsx
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@api/jobs';
import { useAuthStore } from '@stores/authStore';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';
import { toast } from 'react-hot-toast';
import Input, { Textarea } from '@components/common/Input';
import Select from '@components/common/Select';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'momo', label: 'Mobile Money (Momo)' },
  { value: 'cheque', label: 'Cheque' },
];

export default function RecordPaymentModal({ isOpen, onClose, invoice }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'cash',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && invoice) {
      setFormData({
        amount: invoice.amountDue || '',
        paymentMethod: 'cash',
        notes: '',
      });
      setErrors({});
    }
  }, [isOpen, invoice]);

  // Record payment mutation
  const recordMutation = useMutation({
    mutationFn: paymentsApi.recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['invoice-stats']);
      queryClient.invalidateQueries(['payments']);
      onClose();
      toast.success('Payment recorded successfully');
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Failed to record payment'),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validate = () => {
    const newErrors = {};
    const amount = parseFloat(formData.amount);
    const amountDue = parseFloat(invoice?.amountDue || 0);

    if (!formData.amount || amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (amount > amountDue) {
      newErrors.amount = `Amount cannot exceed GH₵${amountDue.toFixed(2)}`;
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    recordMutation.mutate({
      invoiceId: invoice.id,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod,
      notes: formData.notes.trim() || undefined,
    });
  };

  if (!invoice) return null;

  const amountDue = parseFloat(invoice.amountDue || 0);
  const paymentAmount = parseFloat(formData.amount || 0);
  const remainingBalance = amountDue - paymentAmount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Invoice Info */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice:</span>
              <span className="font-mono font-medium text-gray-900">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Client:</span>
              <span className="font-medium text-gray-900">{invoice.job?.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium text-gray-900">GH₵{parseFloat(invoice.totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-success-600">
              <span>Amount Paid:</span>
              <span className="font-medium">GH₵{parseFloat(invoice.amountPaid).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-danger-600 border-t pt-1.5 sm:pt-2">
              <span className="font-semibold">Amount Due:</span>
              <span className="font-bold">GH₵{amountDue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Amount */}
        <Input
          label="Payment Amount (GH₵)"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          max={amountDue}
          value={formData.amount}
          onChange={handleChange}
          placeholder="Enter amount"
          required
          disabled={recordMutation.isPending}
          error={errors.amount}
        />

        {/* Quick Amount Buttons */}
        {/* <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
            Quick Select
          </label>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormData({ ...formData, amount: (amountDue * 0.25).toFixed(2) })}
              disabled={recordMutation.isPending}
            >
              25%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormData({ ...formData, amount: (amountDue * 0.5).toFixed(2) })}
              disabled={recordMutation.isPending}
            >
              50%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormData({ ...formData, amount: amountDue.toFixed(2) })}
              disabled={recordMutation.isPending}
            >
              Full Amount
            </Button>
          </div>
        </div> */}

        {/* Payment Method */}
        <Select
          label="Payment Method"
          name="paymentMethod"
          value={formData.paymentMethod}
          onChange={handleChange}
          options={PAYMENT_METHODS}
          required
          disabled={recordMutation.isPending}
          error={errors.paymentMethod}
        />

        {/* Notes */}
        <Textarea
          label="Notes (Optional)"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add payment notes..."
          rows={3}
          disabled={recordMutation.isPending}
        />

        {/* Payment Summary */}
        {paymentAmount > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 sm:p-4">
            <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Payment Amount:</span>
                <span className="font-medium text-gray-900">GH₵{paymentAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5 sm:pt-2">
                <span className="font-semibold text-gray-900">
                  {remainingBalance > 0 ? 'Remaining Balance:' : 'Invoice Status:'}
                </span>
                <span className={`font-bold ${
                  remainingBalance > 0 ? 'text-warning-600' : 'text-success-600'
                }`}>
                  {remainingBalance > 0 
                    ? `GH₵${remainingBalance.toFixed(2)}`
                    : 'Fully Paid'
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs sm:text-sm text-blue-700">
              A receipt will be automatically generated for this payment.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 sm:gap-3 border-t pt-3 sm:pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={recordMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={recordMutation.isPending}
          >
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}