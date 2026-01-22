import Modal from "@components/common/Modal";
import Button from "@components/common/Button";

export default function RevertReorderModal({ isOpen, onClose, expense, onConfirm, isLoading }) {
  if (!expense) return null;

  // Try to parse quantity from description for display
  // Matches "(50 units)" or "(50 qty)"
  const quantityMatch = expense.description?.match(/\((\d+(\.\d+)?)\s*(units|qty)?\)/i);
  const quantity = quantityMatch ? quantityMatch[1] : "Unknown";

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Revert Material Purchase" 
      size="md"
    >
      <div className="space-y-6">
        {/* Danger Warning Banner */}
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              {/* Warning Icon */}
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Inventory Reduction Warning</h3>
              <div className="mt-1 text-sm text-red-700">
                <p>
                  This action cannot be undone. Doing this will <strong>remove {quantity} units</strong> from your inventory immediately.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Details Summary */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Order to be Reverted
          </h4>
          
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div className="col-span-2">
              <dt className="text-gray-500">Description</dt>
              <dd className="font-medium text-gray-900 mt-1">{expense.description}</dd>
            </div>
            
            <div>
              <dt className="text-gray-500">Amount Paid</dt>
              <dd className="font-medium text-gray-900 mt-1">GH₵ {parseFloat(expense.amount).toFixed(2)}</dd>
            </div>

            <div>
              <dt className="text-gray-500">Quantity to Remove</dt>
              <dd className="font-medium text-red-600 mt-1">-{quantity} units</dd>
            </div>

            <div>
              <dt className="text-gray-500">Date Recorded</dt>
              <dd className="font-medium text-gray-900 mt-1">
                {new Date(expense.expenseDate).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Keep Order
          </Button>
          <Button 
            variant="danger" 
            onClick={() => onConfirm(expense.id)} 
            isLoading={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
          >
            Revert & Reduce Stock
          </Button>
        </div>
      </div>
    </Modal>
  );
}