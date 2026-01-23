import { useState } from 'react';
import Button from '@components/common/Button';

export default function MaterialForm({ material, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    name: material?.name || '',
    quantity: material?.quantity,
    unitCost: material?.unitCost || '',
    sellingPrice: material?.sellingPrice || '',
    lowStockThreshold: material?.lowStockThreshold || 3,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null,
      }));
    }    
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Material name is required';
    }

    if (formData.unitCost <= 0) {
      newErrors.unitCost = 'Unit cost must be greater than 0';
    }

    if (formData.sellingPrice <= 0) {
      newErrors.sellingPrice = 'Selling price must be greater than 0';
    }

    if (parseFloat(formData.sellingPrice) <= parseFloat(formData.unitCost)) {
      newErrors.sellingPrice = 'Selling price should be greater than unit cost';
    }

    if (formData.lowStockThreshold < 0) {
      newErrors.lowStockThreshold = 'Cannot be negative';
    }

    if (!material && formData.quantity < 0) {
      newErrors.quantity = 'Cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const profit = formData.sellingPrice - formData.unitCost;
  const margin = profit > 0 ? (profit / formData.unitCost) * 100 : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Material Name */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Material Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Engine Oil 5W-30"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-2">{errors.name}</p>
        )}
      </div>

      {/* Quantity and Threshold */}
      <div className="grid grid-cols-2 gap-4">
        {/* Quantity (only for new materials) */}
  <div>
    <label className="block text-sm font-medium text-gray-900 mb-2">
      {material ? 'Current Quantity' : 'Initial Quantity'}
    </label>
    <input
      type="number"
      step="any"
      name="quantity"
      value={formData.quantity}
      onChange={handleChange}
      className={`w-full px-4 py-3 border rounded-lg ...`}
      disabled={isLoading}
    />
  </div>

        {/* Low Stock Threshold */}
       <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Low Stock Threshold</label>
          <input
            type="number"
            step="any"
            name="lowStockThreshold"
            value={formData.lowStockThreshold}
            onChange={handleChange}
            placeholder="3"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.lowStockThreshold ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          {errors.lowStockThreshold && (
            <p className="text-sm text-red-600 mt-2">{errors.lowStockThreshold}</p>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-2 gap-4">
        {/* Unit Cost */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Unit Cost (GH₵)</label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500 pointer-events-none">
              GH₵&nbsp;
            </span>
            <input
              type="number"
              name="unitCost"
              value={formData.unitCost}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.unitCost ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
          </div>
          {errors.unitCost && (
            <p className="text-sm text-red-600 mt-2">{errors.unitCost}</p>
          )}
        </div>

        {/* Selling Price */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Selling Price (GH₵)</label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500 pointer-events-none">
              GH₵&nbsp;
            </span>
            <input
              type="number"
              name="sellingPrice"
              value={formData.sellingPrice}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.sellingPrice ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
          </div>
          {errors.sellingPrice && (
            <p className="text-sm text-red-600 mt-2">{errors.sellingPrice}</p>
          )}
        </div>
      </div>

      {/* Profit Margin Display */}
      {formData.unitCost > 0 && formData.sellingPrice > 0 && (
        <div className={`rounded-lg p-4 ${
          margin > 30 ? 'bg-green-50 border border-green-200' :
          margin > 15 ? 'bg-amber-50 border border-amber-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Profit Margin</p>
              <p className={`text-sm font-semibold ${
                margin > 30 ? 'text-green-700' :
                margin > 15 ? 'text-amber-700' :
                'text-red-700'
              }`}>
                {margin.toFixed(1)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Profit per unit</p>
              <p className="text-sm font-bold text-gray-900">GH₵ {profit.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
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
          {material ? 'Update Material' : 'Add Material'}
        </Button>
      </div>
    </form>
  );
}