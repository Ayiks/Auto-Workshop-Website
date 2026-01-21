// src/components/features/sales/SaleForm.jsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { materialsApi } from '@api/materials';
import Button from '@components/common/Button';
import Select from '@components/common/Select';
import Input from '@components/common/Input';
import { format } from 'date-fns';

export default function SaleForm({ onSubmit, onCancel, isLoading }) {
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch materials for selection
  const { data: materialsData } = useQuery({
    queryKey: ['materials', { status: 'active' }],
    queryFn: () => materialsApi.getMaterials({ status: 'active' }),
  });

  const materials = materialsData?.data || [];
  const activeMaterials = materials.filter(m => m.quantity > 0);

  // Add booth service toggle
  const [includeBoothService, setIncludeBoothService] = useState(false);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now(),
        itemType: 'material',
        materialId: '',
        quantity: 0,
        unitPrice: 0,
        subtotal: 0,
      },
    ]);
  };

  const removeItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // Auto-fill price and calculate subtotal when material is selected
          if (field === 'materialId' && value) {
            const material = materials.find((m) => m.id === parseInt(value));
            if (material) {
              updated.unitPrice = material.sellingPrice;
              updated.subtotal = material.sellingPrice * updated.quantity;
              updated.maxQuantity = material.quantity;
              updated.materialName = material.name;
            }
          }

          // Recalculate subtotal when quantity changes
          if (field === 'quantity') {
            updated.subtotal = updated.unitPrice * parseFloat(value || 0);
          }

          return updated;
        }
        return item;
      })
    );
  };

  // Calculate totals
  const itemsTotal = items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
  const boothServicePrice = 150;
  const grandTotal = itemsTotal + (includeBoothService ? boothServicePrice : 0);

  // Check if date is in the future
  const isFutureDate = new Date(saleDate) > new Date();
  
  // Check if date is more than 30 days in the past
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isOldDate = new Date(saleDate) < thirtyDaysAgo;

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate date
    if (isFutureDate) {
      alert('Cannot create a sale with a future date');
      return;
    }

    // Validate
    if (items.length === 0 && !includeBoothService) {
      alert('Please add at least one item or select booth service');
      return;
    }

    // Validate quantities
    for (const item of items) {
      if (item.itemType === 'material') {
        if (!item.materialId) {
          alert('Please select a material for all items');
          return;
        }
        if (item.quantity <= 0) {
          alert('Quantity must be greater than 0');
          return;
        }
        if (item.quantity > item.maxQuantity) {
          alert(`Not enough stock for ${item.materialName}. Available: ${item.maxQuantity}`);
          return;
        }
      }
    }

    // Prepare sale data
    const saleItems = [
      ...items.map((item) => ({
        itemType: 'material',
        materialId: Number(item.materialId),
        quantity: parseFloat(item.quantity),
      })),
    ];

    if (includeBoothService) {
      saleItems.push({
        itemType: 'booth',
      });
    }

    onSubmit({
      items: saleItems,
      paymentMethod,
      saleDate: new Date(saleDate).toISOString(), // Send as ISO string
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Sale Date Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 max-w-md">
            <label htmlFor="saleDate" className="block text-sm font-medium text-gray-900 mb-2">
              Sale Date
            </label>
            <Input
              id="saleDate"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-2">
              {saleDate === format(new Date(), 'yyyy-MM-dd') 
                ? 'Recording sale for today'
                : 'Backdating sale record'
              }
            </p>
          </div>

          {/* Date Warning */}
          {isOldDate && (
            <div className="ml-4 bg-warning-50 border border-warning-200 rounded-lg p-3 max-w-xs">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-warning-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-warning-900">Old Date</p>
                  <p className="text-xs text-warning-700 mt-1">
                    This sale is more than 30 days old. Make sure this is intentional.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sale Items Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sale Items</h3>
            <p className="text-sm text-gray-500 mt-1">Add materials to this sale</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addItem}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Item
          </Button>
        </div>

        {items.length === 0 && !includeBoothService ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500">No items added yet</p>
            <p className="text-sm text-gray-400 mt-1">Click "Add Item" to start</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-12 gap-3 items-center">
                  {/* Item Number */}
                  <div className="col-span-1">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-300 text-sm font-medium text-gray-700">
                      {index + 1}
                    </span>
                  </div>

                  {/* Material Selection */}
                  <div className="col-span-4">
                    <Select
                      name={`material-${item.id}`}
                      value={item.materialId}
                      onChange={(e) => updateItem(item.id, 'materialId', e.target.value)}
                      options={activeMaterials.map((m) => ({
                        value: m.id.toString(),
                        label: `${m.name}`,
                      }))}
                      placeholder="Select material"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-3">
                    <div className="relative">
                      <Input
                        name={`quantity-${item.id}`}
                        type="number"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        min="0"
                        max={item.maxQuantity}
                        required
                        disabled={isLoading}
                        className="pr-12"
                      />
                      {item.maxQuantity && (
                        <span className="absolute right-3 top-2.5 text-xs text-gray-400">
                          /{item.maxQuantity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-2">
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500 mr-1.5">GH₵</span>
                      <Input
                        name={`price-${item.id}`}
                        type="number"
                        value={item.unitPrice}
                        disabled
                        step="0.01"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Subtotal & Actions */}
                  <div className="col-span-2 flex items-center justify-between">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        GH₵{parseFloat(item.subtotal || 0).toFixed(2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booth Service - Commented out as per original */}
      {/* <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="checkbox"
                id="boothService"
                checked={includeBoothService}
                onChange={(e) => setIncludeBoothService(e.target.checked)}
                className="sr-only peer"
                disabled={isLoading}
              />
              <label
                htmlFor="boothService"
                className="flex items-center justify-center w-6 h-6 border-2 border-gray-300 rounded-md peer-checked:bg-blue-500 peer-checked:border-blue-500 peer-checked:text-white transition-colors cursor-pointer"
              >
                {includeBoothService && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </label>
            </div>
            <div>
              <label htmlFor="boothService" className="block text-sm font-medium text-gray-900 cursor-pointer">
                Include Booth Service
              </label>
              <p className="text-sm text-gray-500 mt-0.5">Fixed price service for booth usage</p>
            </div>
          </div>
          <span className="text-lg font-semibold text-gray-900">GH₵{boothServicePrice.toFixed(2)}</span>
        </div>
      </div> */}

      {/* Totals & Payment */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Totals */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Items Subtotal</span>
            <span className="font-medium text-gray-900">GH₵{itemsTotal.toFixed(2)}</span>
          </div>
          {includeBoothService && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Booth Service</span>
              <span className="font-medium text-gray-900">GH₵{boothServicePrice.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-gray-900">Grand Total</span>
              <span className="text-blue-600">GH₵{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-900 mb-3">Payment Method</label>
          <div className="grid grid-cols-3 gap-3">
            {['cash', 'momo', 'cheque'].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  paymentMethod === method
                    ? method === 'cash'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : method === 'momo'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {method === 'momo' ? 'Mobile Money' : method.charAt(0).toUpperCase() + method.slice(1)}
              </button>
            ))}
          </div>
        </div>

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
            disabled={isFutureDate}
            className="px-8 shadow-sm"
          >
            Complete Sale • GH₵{grandTotal.toFixed(2)}
          </Button>
        </div>
      </div>
    </form>
  );
}