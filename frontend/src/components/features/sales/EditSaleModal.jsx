// src/components/features/sales/EditSaleModal.jsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { materialsApi } from '@api/materials';
import { boothServicesApi } from '@api/boothService';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';
import Select from '@components/common/Select';

export default function EditSaleModal({ isOpen, onClose, sale, onSubmit, isLoading }) {
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [reverseInventory, setReverseInventory] = useState(true);
  const [errors, setErrors] = useState({});

  // Fetch materials
  const { data: materialsData } = useQuery({
    queryKey: ['materials', { status: 'active' }],
    queryFn: () => materialsApi.getMaterials({ status: 'active' }),
    enabled: isOpen,
  });

  // Fetch booth service
  const { data: serviceData } = useQuery({
    queryKey: ['services', 'booth'],
    queryFn: () => servicesApi.getBoothService(),
    enabled: isOpen,
  });

  const materials = materialsData?.data || [];
  const boothService = serviceData?.data;

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && sale) {
      // Map existing sale items to form format
      const formattedItems = sale.items.map(item => ({
        id: Date.now() + Math.random(),
        itemType: item.itemType,
        materialId: item.materialId || '',
        serviceId: item.serviceId || '',
        quantity: item.quantity || 1,
        unitPrice: parseFloat(item.unitPrice),
        subtotal: parseFloat(item.subtotal),
      }));
      setItems(formattedItems);
      setPaymentMethod(sale.paymentMethod);
      setReverseInventory(true);
      setErrors({});
    }
  }, [isOpen, sale]);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now(),
        itemType: 'material',
        materialId: '',
        serviceId: '',
        quantity: 1,
        unitPrice: 0,
        subtotal: 0,
      },
    ]);
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(
      items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // When item type changes
          if (field === 'itemType') {
            if (value === 'material') {
              updated.materialId = '';
              updated.serviceId = '';
              updated.quantity = 1;
              updated.unitPrice = 0;
              updated.subtotal = 0;
            } else if (value === 'booth') {
              updated.materialId = '';
              updated.serviceId = boothService?.id || '';
              updated.quantity = 1;
              updated.unitPrice = boothService?.price || 0;
              updated.subtotal = boothService?.price || 0;
            }
          }

          // When material is selected
          if (field === 'materialId' && value) {
            const material = materials.find(m => m.id === parseInt(value));
            if (material) {
              updated.unitPrice = material.sellingPrice;
              updated.subtotal = material.sellingPrice * updated.quantity;
            }
          }

          // Recalculate subtotal when quantity changes
          if (field === 'quantity') {
            updated.subtotal = updated.unitPrice * parseInt(value || 0);
          }

          return updated;
        }
        return item;
      })
    );
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
  };

  const validate = () => {
    const newErrors = {};

    if (items.length === 0) {
      newErrors.items = 'Please add at least one item';
    }

    for (const item of items) {
      if (item.itemType === 'material' && !item.materialId) {
        newErrors.items = 'Please select a material for all items';
        break;
      }
      if (item.quantity <= 0) {
        newErrors.items = 'Quantity must be greater than 0';
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    const formattedItems = items.map(item => ({
      itemType: item.itemType,
      materialId: item.itemType === 'material' ? parseInt(item.materialId) : undefined,
      serviceId: item.itemType === 'booth' ? item.serviceId : undefined,
      quantity: item.itemType === 'material' ? parseInt(item.quantity) : undefined,
    }));

    onSubmit({
      items: formattedItems,
      paymentMethod,
      reverseInventory,
    });
  };

  const totalAmount = calculateTotal();
  const hoursSinceSale = sale ? (new Date() - new Date(sale.saleDate)) / (1000 * 60 * 60) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Sale"
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Warning if sale is old */}
        {hoursSinceSale > 12 && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-warning-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-warning-900">Old Sale Warning</p>
                <p className="text-sm text-warning-700 mt-1">
                  This sale is {Math.floor(hoursSinceSale)} hours old. Consider creating a reversal instead of editing.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Reversal Option */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reverseInventory}
              onChange={(e) => setReverseInventory(e.target.checked)}
              className="mt-0.5 rounded text-primary-600 focus:ring-primary-500"
            />
            <div>
              <p className="text-sm font-medium text-primary-900">Reverse Inventory Changes</p>
              <p className="text-sm text-primary-700 mt-1">
                When enabled, the system will restore the old items to inventory before applying the new changes. Uncheck only if you've manually adjusted inventory.
              </p>
            </div>
          </label>
        </div>

        {/* Items Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Sale Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              disabled={isLoading}
            >
              Add Item
            </Button>
          </div>

          {errors.items && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-700">{errors.items}</p>
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
              <p className="text-gray-500">No items added. Click "Add Item" to start.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-600">Item #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-danger-600 hover:text-danger-800"
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {/* Item Type */}
                    <Select
                      name={`itemType-${item.id}`}
                      value={item.itemType}
                      onChange={(e) => updateItem(item.id, 'itemType', e.target.value)}
                      options={[
                        { value: 'material', label: 'Material' },
                        { value: 'booth', label: 'Booth Service' },
                      ]}
                      disabled={isLoading}
                      className="col-span-1"
                    />

                    {/* Material or Service */}
                    {item.itemType === 'material' ? (
                      <>
                        <Select
                          name={`material-${item.id}`}
                          value={item.materialId}
                          onChange={(e) => updateItem(item.id, 'materialId', e.target.value)}
                          options={materials.map(m => ({
                            value: m.id,
                            label: `${m.name} (Stock: ${m.quantity})`,
                          }))}
                          placeholder="Select material"
                          required
                          disabled={isLoading}
                          className="col-span-2"
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          min="1"
                          required
                          disabled={isLoading}
                          placeholder="Qty"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </>
                    ) : (
                      <div className="col-span-3 flex items-center px-3 py-2 bg-success-50 border border-success-200 rounded-lg">
                        <span className="text-sm text-success-800">
                          Booth Service - GH₵{boothService?.price || 0}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-right">
                    <span className="text-sm text-gray-600">Subtotal: </span>
                    <span className="text-sm font-semibold text-gray-900">
                      GH₵{parseFloat(item.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method */}
        <Select
          label="Payment Method"
          name="paymentMethod"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'momo', label: 'Mobile Money (Momo)' },
            { value: 'cheque', label: 'Cheque' },
          ]}
          required
          disabled={isLoading}
        />

        {/* Total */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
            <span className="text-2xl font-bold text-primary-700">
              GH₵{totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
          >
            Update Sale
          </Button>
        </div>
      </form>
    </Modal>
  );
}