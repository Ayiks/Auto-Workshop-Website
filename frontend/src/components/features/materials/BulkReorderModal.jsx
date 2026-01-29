import { useState } from 'react';
import Button from '@components/common/Button';

export default function BulkReorderModal({ selectedMaterials, onReorder, onClose, isLoading }) {
  // Initialize state with the selected materials, adding default order fields
  const [orderItems, setOrderItems] = useState(
    selectedMaterials.map(m => ({
      id: m.id,
      name: m.name,
      currentStock: m.quantity,
      quantityOrdered: '',
      unitCost: m.unitCost || 0,
    }))
  );

  const handleItemChange = (id, field, value) => {
    setOrderItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeRow = (id) => {
    setOrderItems(prev => prev.filter(item => item.id !== id));
    if (orderItems.length <= 1) onClose(); // Close if list becomes empty
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => {
      return sum + (Number(item.quantityOrdered || 0) * Number(item.unitCost || 0));
    }, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 1. Prepare the array (This part is fine)
    const validItems = orderItems
      .filter(item => item.quantityOrdered && Number(item.quantityOrdered) > 0)
      .map(item => ({
        id: item.id, 
        quantityOrdered: Number(item.quantityOrdered),
        unitCost: Number(item.unitCost),
        notes: "Bulk Restock"
      }));

    if (validItems.length === 0) {
      alert("Please enter a quantity for at least one item.");
      return;
    }

    // 2. THE FIX: Wrap the array in an object with the key 'items'
    onReorder(validItems); 
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-[80vh]">
      <div className="flex-1 overflow-y-auto p-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Order Qty</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Unit Cost</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orderItems.map((item) => {
              const rowTotal = Number(item.quantityOrdered || 0) * Number(item.unitCost || 0);
              return (
                <tr key={item.id}>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.currentStock}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      min=""
                      placeholder="Qty"
                      value={item.quantityOrdered}
                      onChange={(e) => handleItemChange(item.id, 'quantityOrdered', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitCost === 0 ? '' : item.unitCost}
                      onChange={(e) => handleItemChange(item.id, 'unitCost', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {rowTotal.toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right">
                    <button 
                      type="button" 
                      onClick={() => removeRow(item.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Footer Summary */}
      <div className="border-t border-gray-200 pt-4 mt-4 bg-gray-50 -mx-1 px-4 py-4 rounded-b-lg">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-700">Total Items: {orderItems.length}</span>
          <div className="text-right">
            <span className="text-sm text-gray-600 mr-2">Est. Total Cost:</span>
            <span className="text-xl font-bold text-gray-900">GH₵{calculateTotal().toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isLoading} className="px-8">
            Confirm Reorder
          </Button>
        </div>
      </div>
    </form>
  );
}