import { useState, useEffect } from 'react';
import Button from '@components/common/Button';

export default function ReorderModal({ material, onReorder, onClose, isLoading }) {
  
  // --- SAFETY CHECK 1: Don't render if no material data ---
  // This prevents crashes if the parent passes null while loading
  if (!material) return null;

  // 1. Prepare Unit Options (Base + Alternates)
  const unitOptions = [
    { 
      id: 'base', 
      name: material.baseUnit || 'Base Unit', 
      factor: 1, 
      isBase: true 
    },
    // Safe mapping with fallback for potential missing data
    ...(material.alternateUnits?.map(u => ({
      id: u.unitId || `alt-${Math.random()}`, // Fallback ID if unitId is missing
      name: u.name || 'Unknown Unit',
      factor: parseFloat(u.factor || 1),
      isBase: false
    })) || [])
  ];

  const [formData, setFormData] = useState({
    quantityOrdered: '',
    unitCost: material.unitCost || '',
    unitId: 'base',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  // Update state if material changes (e.g. if modal is reused)
  useEffect(() => {
    if (material) {
        setFormData(prev => ({
            ...prev,
            unitCost: material.unitCost || '',
            // Reset to base if material changes
            unitId: 'base' 
        }));
    }
  }, [material]);

  // --- SAFETY CHECK 2: Safe Compare ---
  // We use String() wrapper to prevent "toString() of undefined" crash
  const selectedUnit = unitOptions.find(u => String(u.id) === String(formData.unitId)) || unitOptions[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  const handleUnitChange = (e) => {
    const newUnitId = e.target.value;
    // Safe Find
    const newUnit = unitOptions.find(u => String(u.id) === String(newUnitId));
    
    if (newUnit) {
        // Auto-calculate expected price: BaseCost * Factor
        const baseCost = parseFloat(material.unitCost || 0);
        const estimatedCost = (baseCost * newUnit.factor).toFixed(2);

        setFormData(prev => ({
          ...prev,
          unitId: newUnitId,
          unitCost: estimatedCost
        }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.quantityOrdered || formData.quantityOrdered <= 0) {
      newErrors.quantityOrdered = 'Quantity must be greater than 0';
    }
    if (!formData.unitCost || formData.unitCost < 0) {
      newErrors.unitCost = 'Unit cost cannot be negative';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onReorder({
        quantityOrdered: Number(formData.quantityOrdered),
        unitCost: Number(formData.unitCost),
        // Convert 'base' string back to null for backend
        unitId: formData.unitId === 'base' ? null : Number(formData.unitId), 
        notes: formData.notes.trim(),
      });
    }
  };

  // Calculations
  const currentStock = Number(material.quantity || 0);
  const addedStockInBase = Number(formData.quantityOrdered || 0) * selectedUnit.factor;
  const newStockLevel = currentStock + addedStockInBase;
  const totalCost = Number(formData.quantityOrdered || 0) * Number(formData.unitCost || 0);
  const baseUnitCostCalc = selectedUnit.factor > 0 
    ? (Number(formData.unitCost) / selectedUnit.factor).toFixed(2) 
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Current Stock Info */}
      <div className="bg-gray-50 rounded-xl p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Current Stock ({material.baseUnit})</p>
            <p className="text-2xl font-bold text-gray-900">{currentStock}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Threshold</p>
            <p className="text-2xl font-bold text-red-600">{material.lowStockThreshold || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unit Selector */}
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">Unit of Measure</label>
            <select
                name="unitId"
                value={formData.unitId}
                onChange={handleUnitChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                disabled={isLoading}
            >
                {unitOptions.map(u => (
                    <option key={u.id} value={u.id}>
                        {u.name} {u.isBase ? '(Base Unit)' : `(x${u.factor} ${material.baseUnit})`}
                    </option>
                ))}
            </select>
        </div>

        {/* Quantity */}
        <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Quantity</label>
            <input
            type="number"
            step="0.01"
            name="quantityOrdered"
            value={formData.quantityOrdered}
            onChange={handleChange}
            placeholder="0.00"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.quantityOrdered ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
            />
             {errors.quantityOrdered && <p className="text-xs text-red-600 mt-1">{errors.quantityOrdered}</p>}
        </div>

        {/* Unit Cost */}
        <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
                Cost Per {selectedUnit.name}
            </label>
            <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">GH₵</span>
            <input
                type="number"
                name="unitCost"
                value={formData.unitCost}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.unitCost ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
            />
            </div>
        </div>
      </div>

      {/* Preview Section */}
      {Number(formData.quantityOrdered) > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
            <div className="flex justify-between items-center mb-2">
                <span className="text-green-800 font-medium">Conversion Preview:</span>
                <span className="text-green-800 font-bold bg-green-100 px-2 py-1 rounded">
                   + {addedStockInBase} {material.baseUnit}
                </span>
            </div>
            <p className="text-green-700 text-xs">
                Buying <strong>{formData.quantityOrdered} {selectedUnit.name}</strong> will increase your base stock to <strong>{newStockLevel} {material.baseUnit}</strong>.
            </p>
        </div>
      )}

      {/* Total Cost Display */}
      {totalCost > 0 && (
        <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
             <div>
                <p className="text-sm text-blue-900">Total Purchase Cost</p>
                <p className="text-xl font-bold text-blue-700">GH₵{totalCost.toFixed(2)}</p>
             </div>
             <div className="text-right">
                <p className="text-xs text-blue-600">Unit Cost (Base): GH₵{baseUnitCostCalc}</p>
             </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={2}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Invoice # or supplier notes..."
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isLoading} className="px-8">
          Confirm Restock
        </Button>
      </div>
    </form>
  );
}