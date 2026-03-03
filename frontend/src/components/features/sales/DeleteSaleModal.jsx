// src/components/features/sales/DeleteSaleModal.jsx
import { useState } from 'react';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';
import { Textarea } from '@components/common/Input';

export default function DeleteSaleModal({ isOpen, onClose, sale, onConfirm, isLoading }) {
  const [reverseInventory, setReverseInventory] = useState(true);
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm({
      reverseInventory,
      reason: reason.trim() || undefined,
    });
  };

  const handleClose = () => {
    setReverseInventory(true);
    setReason('');
    onClose();
  };

  if (!sale) return null;

  const materialItems = sale.items?.filter(item => item.itemType === 'material') || [];
  const hasInventoryItems = materialItems.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Sale"
    >
      <div className="space-y-6">
        {/* Warning */}
        <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 sm:w-6 h-5 sm:h-6 text-danger-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-xs sm:text-sm font-medium text-danger-900">Permanent Action</p>
              <p className="text-xs sm:text-sm text-danger-700 mt-1">
                This action cannot be undone. The sale and its receipt will be permanently deleted from the system.
              </p>
            </div>
          </div>
        </div>

        {/* Sale Details */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-2">
          <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Sale Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div>
              <span className="text-gray-600 text-xs sm:text-sm">Receipt Number:</span>
              <p className="font-mono text-gray-900 text-xs sm:text-sm">{sale.receipt?.receiptNumber || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600 text-xs sm:text-sm">Total Amount:</span>
              <p className="font-semibold text-gray-900 text-xs sm:text-sm">GH₵{parseFloat(sale.totalAmount).toFixed(2)}</p>
            </div>
            <div>
              <span className="text-gray-600 text-xs sm:text-sm">Payment Method:</span>
              <p className="capitalize text-gray-900 text-xs sm:text-sm">{sale.paymentMethod}</p>
            </div>
            <div>
              <span className="text-gray-600 text-xs sm:text-sm">Items:</span>
              <p className="text-gray-900 text-xs sm:text-sm">{sale.items?.length || 0} item(s)</p>
            </div>
          </div>
        </div>

        {/* Inventory Items */}
        {hasInventoryItems && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <h4 className="text-xs sm:text-sm font-semibold text-blue-900 mb-2">Materials to be Restored:</h4>
            <div className="space-y-1">
              {materialItems.map((item, index) => (
                <div key={index} className="text-xs sm:text-sm text-blue-800">
                  • {item.materialName} - Qty: {item.quantity}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory Reversal Option */}
        {hasInventoryItems && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 sm:p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reverseInventory}
                onChange={(e) => setReverseInventory(e.target.checked)}
                className="mt-0.5 rounded text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="text-xs sm:text-sm font-medium text-primary-900">Restore Inventory</p>
                <p className="text-xs sm:text-sm text-primary-700 mt-1">
                  Return sold materials back to inventory. Uncheck only if you've manually adjusted stock.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Reason */}
        <Textarea
          label="Reason for Deletion (Optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter the reason for deleting this sale..."
          rows={3}
          disabled={isLoading}
        />

        {/* Confirmation */}
        <div className="bg-gray-100 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-700">
            <strong>What will happen:</strong>
          </p>
          <ul className="text-xs sm:text-sm text-gray-700 mt-2 space-y-1 list-disc list-inside">
            <li>Sale record will be permanently deleted</li>
            <li>Receipt will be marked as deleted (audit trail)</li>
            {hasInventoryItems && reverseInventory && (
              <li className="text-success-700 font-medium">Materials will be restored to inventory</li>
            )}
            {hasInventoryItems && !reverseInventory && (
              <li className="text-warning-700 font-medium">Inventory will NOT be affected</li>
            )}
            <li>Action will be logged in audit trail</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 sm:gap-3 border-t pt-3 sm:pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            loading={isLoading}
          >
            Delete Sale
          </Button>
        </div>
      </div>
    </Modal>
  );
}