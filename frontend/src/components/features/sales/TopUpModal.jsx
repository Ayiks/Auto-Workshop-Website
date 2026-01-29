import { useState, useEffect } from 'react';
import Modal from '@components/common/Modal'; // Using your common modal
import Button from '@components/common/Button';

export default function TopUpModal({ 
  isOpen, 
  onClose, 
  sale, 
  onSubmit, 
  isSubmitting 
}) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // 1. THE USE-EFFECT HOOK YOU REQUESTED
  // This runs every time the modal opens or the sale changes.
  useEffect(() => {
    if (isOpen && sale) {
      // Calculate remaining debt: Total - Paid
      const remaining = sale.totalAmount - sale.amountPaid;
      // Auto-fill the input
      setAmount(remaining.toFixed(2));
      setPaymentMethod('cash'); // Reset to default
    }
  }, [isOpen, sale]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("1. Modal Submit Clicked", { amount, paymentMethod }); // DEBUG LOG
    // Send the data back to Sales.jsx
    onSubmit({
      amount: parseFloat(amount),
      paymentMethod
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Payment for Receipt #${sale?.receipt?.receiptNumber}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        
        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800">
            <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-semibold">GH₵{parseFloat(sale?.totalAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between mt-1">
                <span>Already Paid:</span>
                <span className="font-semibold">GH₵{parseFloat(sale?.amountPaid || 0).toFixed(2)}</span>
            </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount to Pay (GH₵)
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Payment Method Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="cash">Cash</option>
            <option value="momo">Mobile Money</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            // Optional: style this button to look like a "Money" action
            className="bg-amber-600 hover:bg-amber-700 border-amber-600 text-white"
          >
            Process Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}