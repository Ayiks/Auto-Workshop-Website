import { useState } from 'react';
import Button from '@components/common/Button';
import { toast } from 'react-hot-toast';

export default function BulkReorderModal({ selectedMaterials, onReorder, onClose, isLoading }) {

  // Safety check to prevent rendering with empty data
  if (!selectedMaterials || selectedMaterials.length === 0) return null;

  const [notes, setNotes] = useState('');

  // Initialize state
  const [orderItems, setOrderItems] = useState(
    selectedMaterials.map(m => {
        // 1. Build options for this specific material
        const options = [
            { id: 'base', name: m.baseUnit || 'Base', factor: 1, isBase: true },
            ...(m.alternateUnits?.map(u => ({
                id: u.unitId, 
                name: u.name, 
                factor: parseFloat(u.factor || 1), 
                isBase: false
            })) || [])
        ];

        return {
            id: m.id,
            name: m.name,
            currentStock: m.quantity,
            baseUnit: m.baseUnit,
            quantityOrdered: '', // Start empty
            unitCost: m.unitCost || 0,
            unitId: 'base', // Default to base
            options: options, // Store options for easy access
            baseCost: m.unitCost || 0 // Store original base cost
        };
    })
  );

  const handleItemChange = (id, field, value) => {
    setOrderItems(prev => prev.map(item => {
        if (item.id !== id) return item;

        // Create updated item
        const updatedItem = { ...item, [field]: value };

        // Logic: If Unit changes, auto-update price
        if (field === 'unitId') {
            const newUnit = item.options.find(u => String(u.id) === String(value));
            if (newUnit) {
                // Est. Price = BaseCost * Factor
                const newCost = (parseFloat(item.baseCost) * newUnit.factor);
                updatedItem.unitCost = newCost.toFixed(2);
            }
        }
        return updatedItem;
    }));
  };

  const removeRow = (id) => {
    setOrderItems(prev => prev.filter(item => item.id !== id));
    if (orderItems.length <= 1) onClose();
  };

  // --- FIX: Added ", 0" to reduce function to prevent toFixed crash ---
  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantityOrdered) || 0;
      const cost = parseFloat(item.unitCost) || 0;
      return sum + (qty * cost);
    }, 0); 
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 1. Filter and Format Items
    const validItems = orderItems
      .filter(item => item.quantityOrdered && parseFloat(item.quantityOrdered) > 0)
      .map(item => ({
        materialId: item.id, // Ensure we send materialId (Backend likely expects this or 'id')
        id: item.id,         // Sending both to be safe
        quantityOrdered: parseFloat(item.quantityOrdered),
        unitCost: parseFloat(item.unitCost),
        unitId: item.unitId === 'base' ? null : Number(item.unitId),
        notes: notes.trim() || "Bulk Restock"
      }));

    if (validItems.length === 0) {
      toast.error("Please enter a quantity for at least one item.");
      return;
    }

    // 2. DEBUG: Log the payload to console
    console.log("Submitting Bulk Order:", { items: validItems });

    // 3. Send to Parent
    onReorder(validItems); 
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-[80vh]">
      <div className="flex-1 overflow-y-auto p-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Material</th>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase w-24 sm:w-32">Unit</th>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase w-16 sm:w-24">Qty</th>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase w-20 sm:w-28">Cost</th>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-2 sm:px-3 py-2 sm:py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orderItems.map((item) => {
              const qty = parseFloat(item.quantityOrdered) || 0;
              const cost = parseFloat(item.unitCost) || 0;
              const rowTotal = qty * cost;

              return (
                <tr key={item.id}>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-900">
                    <div>{item.name}</div>
                    <div className="text-[10px] sm:text-xs text-gray-400">Stock: {item.currentStock} {item.baseUnit}</div>
                  </td>
                  
                  {/* Unit Selector */}
                  <td className="px-2 sm:px-3 py-1 sm:py-1.5">
                    <select
                        value={item.unitId}
                        onChange={(e) => handleItemChange(item.id, 'unitId', e.target.value)}
                        className="w-full text-xs sm:text-sm border-gray-300 rounded focus:ring-blue-500 py-0.5 sm:py-1"
                    >
                        {item.options.map(opt => (
                            <option key={opt.id} value={opt.id}>
                                {opt.name}
                            </option>
                        ))}
                    </select>
                  </td>

                  {/* Quantity */}
                  <td className="px-2 sm:px-3 py-1 sm:py-1.5">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={item.quantityOrdered}
                      onChange={(e) => handleItemChange(item.id, 'quantityOrdered', e.target.value)}
                      className="w-full px-1.5 sm:px-2 py-0.5 sm:py-1 border border-gray-300 rounded focus:ring-blue-500 text-xs sm:text-sm"
                      required
                    />
                  </td>
                  
                  {/* Cost */}
                  <td className="px-2 sm:px-3 py-1 sm:py-1.5">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitCost}
                      onChange={(e) => handleItemChange(item.id, 'unitCost', e.target.value)}
                      className="w-full px-1.5 sm:px-2 py-0.5 sm:py-1 border border-gray-300 rounded focus:ring-blue-500 text-xs sm:text-sm"
                    />
                  </td>

                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900 text-right font-medium">
                    GH₵{rowTotal.toFixed(2)}
                  </td>
                  
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right">
                    <button type="button" onClick={() => removeRow(item.id)} className="text-gray-400 hover:text-red-500">
                        <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-200 pt-3 sm:pt-4 mt-3 sm:mt-4 bg-gray-50 -mx-1 px-3 sm:px-4 py-3 sm:py-4 rounded-b-lg space-y-3">
        {/* Notes / Invoice Reference */}
        <div>
          <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Supplier / Invoice Reference <span className="font-normal normal-case text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. INV-2026-03, Supplier name…"
            className="w-full px-2 sm:px-3 py-1.5 border border-gray-300 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>

        {/* Per-item breakdown */}
        {orderItems.some(item => parseFloat(item.quantityOrdered) > 0) && (
          <div className="text-xs text-gray-500 divide-y divide-gray-200 border border-gray-200 rounded bg-white">
            {orderItems
              .filter(item => parseFloat(item.quantityOrdered) > 0)
              .map(item => {
                const qty = parseFloat(item.quantityOrdered) || 0;
                const cost = parseFloat(item.unitCost) || 0;
                const unit = item.options.find(o => String(o.id) === String(item.unitId));
                return (
                  <div key={item.id} className="flex justify-between items-center px-3 py-1.5">
                    <span className="text-gray-600">{item.name} <span className="text-gray-400">× {qty} {unit?.name || item.baseUnit}</span></span>
                    <span className="font-medium text-gray-800">GH₵{(qty * cost).toFixed(2)}</span>
                  </div>
                );
              })}
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-xs sm:text-sm font-medium text-gray-700">Items: {orderItems.length}</span>
          <div className="text-right">
            <span className="text-xs sm:text-sm text-gray-600 mr-2">Est. Total Cost:</span>
            <span className="text-lg sm:text-xl font-bold text-gray-900">GH₵{calculateTotal().toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 sm:gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" loading={isLoading} className="px-5 sm:px-8">Confirm Bulk Reorder</Button>
        </div>
      </div>
    </form>
  );
}