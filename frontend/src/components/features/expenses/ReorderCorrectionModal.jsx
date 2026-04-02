import { useState, useEffect } from "react";
import Modal from "@components/common/Modal";
import Button from "@components/common/Button";
import { AlertTriangle, Hash, Calculator } from "lucide-react"; // Assuming you have lucide-react, or remove icons if not

export default function ReorderCorrectionModal({ isOpen, onClose, expense, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    newQuantity: "",
    newUnitCost: "",
  });

  // Calculate total dynamically for preview
  const calculatedTotal = (
    (parseFloat(formData.newQuantity) || 0) * (parseFloat(formData.newUnitCost) || 0)
  ).toFixed(2);

  useEffect(() => {
    if (expense && isOpen) {
      // Robust regex: Matches "(50 units)", "(50 qty)", or just "(50)"
      const quantityMatch = expense.description.match(/\((\d+(\.\d+)?)\s*(units|qty)?\)/i);
      const initialQty = quantityMatch ? quantityMatch[1] : "";
      
      // Estimate cost
      const estimatedCost = initialQty && parseFloat(initialQty) > 0
        ? (parseFloat(expense.amount) / parseFloat(initialQty)).toFixed(2) 
        : "";

      setFormData({
        newQuantity: initialQty,
        newUnitCost: estimatedCost,
      });
    }
  }, [expense, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      id: expense.id,
      newQuantity: parseFloat(formData.newQuantity),
      newUnitCost: parseFloat(formData.newUnitCost)
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Correct Material Reorder" size="md">
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
        
        {/* Warning Banner */}
        <div className="bg-amber-50 border-l-4 border-amber-400 p-2 sm:p-4 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              {/* SVG Icon for Warning */}
              <svg className="h-4 sm:h-5 w-4 sm:w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3">
              <h3 className="text-xs sm:text-sm font-medium text-amber-800">Inventory Impact</h3>
              <div className="mt-1 text-xs sm:text-sm text-amber-700">
                <p>
                  Updating these values will <strong>automatically adjust your stock levels</strong>. 
                  If you increase quantity here, stock will increase. If you decrease it, stock will decrease.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-y-3 sm:gap-y-6 gap-x-2 sm:gap-x-4 sm:grid-cols-2">
            {/* Quantity Input */}
            <div className="col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Correct Quantity</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-xs sm:text-sm font-bold">#</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 10"
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-6 sm:pl-8 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border-gray-300 border rounded-md"
                  value={formData.newQuantity}
                  onChange={(e) => setFormData({ ...formData, newQuantity: e.target.value })}
                />
              </div>
            </div>

            {/* Unit Cost Input */}
            <div className="col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Correct Unit Cost</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-xs sm:text-sm">GH₵</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:pl-12 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border-gray-300 border rounded-md"
                  value={formData.newUnitCost}
                  onChange={(e) => setFormData({ ...formData, newUnitCost: e.target.value })}
                />
              </div>
            </div>
        </div>

        {/* Live Calculation Preview */}
        <div className="bg-gray-50 p-2 sm:p-4 rounded-lg border border-gray-200 flex justify-between items-center">
            <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">New Total Expense</span>
                <span className="text-[9px] sm:text-xs text-gray-400">Qty × Cost</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900">
                GH₵ {calculatedTotal}
            </div>
        </div>

        <div className="pt-2 sm:pt-4 border-t border-gray-200 flex justify-end gap-2 sm:gap-3">
          <Button variant="outline" onClick={onClose} type="button" className="text-xs sm:text-sm">Cancel</Button>
          <Button variant="primary" type="submit" isLoading={isLoading} className="text-xs sm:text-sm">
            Confirm Correction
          </Button>
        </div>
      </form>
    </Modal>
  );
}