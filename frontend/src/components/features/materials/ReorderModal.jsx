import { useState } from 'react';
import Button from '@components/common/Button';

export default function ReorderModal({ material, onReorder, onClose, isLoading }) {
  const [formData, setFormData] = useState({
    quantityOrdered: '',
    unitCost: material?.unitCost || '',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.quantityOrdered || formData.quantityOrdered <= 0) {
      newErrors.quantityOrdered = 'Quantity must be greater than 0';
    }

    if (!formData.unitCost || formData.unitCost <= 0) {
      newErrors.unitCost = 'Unit cost must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onReorder({
        quantityOrdered: parseInt(formData.quantityOrdered),
        unitCost: parseFloat(formData.unitCost),
        notes: formData.notes.trim(),
      });
    }
  };

  const totalCost = (formData.quantityOrdered || 0) * (formData.unitCost || 0);
  const newStockLevel = (material?.quantity || 0) + parseInt(formData.quantityOrdered || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Current Stock Info */}
      <div className="bg-gray-50 rounded-xl p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Current Stock</p>
            <p className="text-2xl font-bold text-gray-900">{material?.quantity || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Threshold</p>
            <p className="text-2xl font-bold text-red-600">{material?.lowStockThreshold || 0}</p>
          </div>
        </div>
      </div>

      {/* Quantity to Order */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Quantity to Order</label>
        <input
          type="number"
          step="0.1"
          name="quantityOrdered"
          value={formData.quantityOrdered}
          onChange={handleChange}
          placeholder="Enter quantity"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.quantityOrdered ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isLoading}
        />
        {errors.quantityOrdered && (
          <p className="text-sm text-red-600 mt-2">{errors.quantityOrdered}</p>
        )}
      </div>

      {/* Unit Cost */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Unit Cost (GH₵)</label>
        <div className="relative">
          <span className="absolute left-3 top-3 text-gray-500">GH₵</span>
          <input
            type="number"
            name="unitCost"
            value={formData.unitCost}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.unitCost ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
        </div>
        {errors.unitCost && (
          <p className="text-sm text-red-600 mt-2">{errors.unitCost}</p>
        )}
      </div>

      {/* Total Cost Display */}
      {totalCost > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Total Cost</p>
              <p className="text-2xl font-bold text-blue-700">GH₵{totalCost.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Cost of Goods</p>
              <p className="text-sm text-gray-700">Will be recorded as COGS</p>
            </div>
          </div>
        </div>
      )}

      {/* New Stock Preview */}
      {formData.quantityOrdered > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">New Stock Level</p>
              <p className={`text-2xl font-bold ${
                newStockLevel > material?.lowStockThreshold ? 'text-green-700' : 'text-amber-700'
              }`}>
                {newStockLevel} units
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Status</p>
              <p className={`text-sm font-medium ${
                newStockLevel > material?.lowStockThreshold ? 'text-green-700' : 'text-amber-700'
              }`}>
                {newStockLevel > material?.lowStockThreshold ? 'Healthy' : 'Still Low'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Notes (Optional)</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add any notes about this reorder..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isLoading}
          className="px-6"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          className="px-8 shadow-sm"
        >
          Confirm Reorder
        </Button>
      </div>
    </form>
  );
}