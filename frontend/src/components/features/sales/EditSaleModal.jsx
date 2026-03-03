import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { materialsApi } from '@api/materials';
import { servicesApi } from '@api/sales'; 
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';
import Select from '@components/common/Select';
import Input from '@components/common/Input'; 
// 1. Import the Customer Select component
import CustomerSelect from '@components/common/CustomerSelect';

export default function EditSaleModal({ isOpen, onClose, sale, onSubmit, isLoading }) {
  // --- State ---
  const [items, setItems] = useState([]);
  // 2. Add Customer State
  const [customer, setCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saleDate, setSaleDate] = useState('');
  const [saleTime, setSaleTime] = useState('');
  const [reverseInventory, setReverseInventory] = useState(true);
  const [errors, setErrors] = useState({});

  // --- Data Fetching ---
  const { data: materialsData } = useQuery({
    queryKey: ['materials', { status: 'active' }],
    queryFn: () => materialsApi.getMaterials({ status: 'active' }),
    enabled: isOpen,
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getServices(), 
    enabled: isOpen,
  });

  const materials = materialsData?.data || [];
  const services = servicesData?.data || [];

  // --- Initialization ---
  useEffect(() => {
    if (isOpen && sale) {
      // 3. Initialize Customer Data
      if (sale.customerId) {
        // It was a registered customer
        setCustomer({
          type: 'registered',
          id: sale.customerId,
          // Handle case where customer object might be nested or just flattened
          name: sale.customer 
            ? `${sale.customer.firstName} ${sale.customer.lastName}`.trim() 
            : (sale.customerName || 'Unknown Registered'),
          phone: sale.customer?.phone || ''
        });
      } else {
        // It was a walking customer
        setCustomer({
          type: 'walking',
          id: null,
          name: sale.customerName || 'Walking Customer',
          phone: ''
        });
      }

      // Map existing items
      const formattedItems = sale.items.map(item => ({
        id: Date.now() + Math.random(),
        itemType: item.itemType,
        materialId: item.materialId ? item.materialId.toString() : '',
        serviceId: item.serviceId ? item.serviceId.toString() : '',
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice || 0),
        subtotal: parseFloat(item.subtotal || 0),
      }));
      
      setItems(formattedItems);
      setPaymentMethod(sale.paymentMethod || 'cash');
      setReverseInventory(true);
      setErrors({});
      
      // Parse Date/Time
      if (sale.saleDate) {
        try {
          const saleDateObj = new Date(sale.saleDate);
          if (!isNaN(saleDateObj.getTime())) {
            setSaleDate(saleDateObj.toISOString().split('T')[0]);
            const hours = saleDateObj.getHours().toString().padStart(2, '0');
            const minutes = saleDateObj.getMinutes().toString().padStart(2, '0');
            setSaleTime(`${hours}:${minutes}`);
          }
        } catch (e) {
          const now = new Date();
          setSaleDate(now.toISOString().split('T')[0]);
          setSaleTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
        }
      }
    }
  }, [isOpen, sale]);

  // --- Handlers ---

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
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      if (field === 'itemType') {
        updated.materialId = '';
        updated.serviceId = '';
        updated.quantity = 1; 
        updated.unitPrice = 0;
        updated.subtotal = 0;
      }

      if (field === 'materialId') {
        const material = materials.find(m => m.id.toString() === value.toString());
        if (material) {
          updated.unitPrice = material.sellingPrice;
          updated.subtotal = material.sellingPrice * updated.quantity;
        }
      }

      if (field === 'serviceId') {
        const service = services.find(s => s.id.toString() === value.toString());
        if (service) {
          updated.unitPrice = service.price;
          updated.quantity = 1;
          updated.subtotal = service.price * 1;
        }
      }

      if (field === 'quantity') {
        const qty = parseFloat(value) || 0;
        updated.quantity = qty;
        updated.subtotal = updated.unitPrice * qty;
      }

      return updated;
    }));
  };

  const calculateTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
  }, [items]);

  // --- Validation ---
  const validate = () => {
    const newErrors = {};

    // 4. Validate Customer
    if (!customer || !customer.name) newErrors.customer = 'Customer is required';

    if (items.length === 0) newErrors.items = 'Please add at least one item';
    if (!saleDate) newErrors.saleDate = 'Sale date is required';
    if (!saleTime) newErrors.saleTime = 'Sale time is required';

    let hasItemErrors = false;
    items.forEach((item) => {
      if (item.itemType === 'material') {
        if (!item.materialId) hasItemErrors = true;
        if (item.quantity <= 0) hasItemErrors = true;
      } else if (item.itemType === 'booth') {
        if (!item.serviceId) hasItemErrors = true;
      }
    });

    if (hasItemErrors) newErrors.items = 'Please complete all item fields';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const combinedDateTime = new Date(`${saleDate}T${saleTime}`);

    const formattedItems = items.map(item => ({
      itemType: item.itemType,
      materialId: item.itemType === 'material' ? parseInt(item.materialId) : undefined,
      serviceId: item.itemType === 'booth' ? parseInt(item.serviceId) : undefined,
      quantity: parseFloat(item.quantity)
    }));

    onSubmit({
      // 5. Send Customer Data
      customerId: customer.type === 'registered' ? customer.id : null,
      customerName: customer.name,
      // Common Sale Data
      items: formattedItems,
      paymentMethod,
      saleDate: combinedDateTime.toISOString(),
      reverseInventory,
    });
  };

  const hoursSinceSale = sale ? (new Date() - new Date(sale.saleDate)) / (1000 * 60 * 60) : 0;
  const currentDate = new Date().toISOString().split('T')[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Sale"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-200px)]">
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          
          {hoursSinceSale > 12 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-900">Older Record</p>
                <p className="text-sm text-amber-700">
                  This sale is {Math.floor(hoursSinceSale)} hours old. Inventory changes will be applied retroactively.
                </p>
              </div>
            </div>
          )}

          {/* 6. Header Grid: Customer + Date + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Customer Column */}
            <div className="relative z-20"> 
               {/* z-20 ensures dropdown goes over other inputs */}
              <CustomerSelect 
                value={customer}
                onChange={setCustomer}
                label="Customer"
              />
              {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
            </div>

            {/* Date/Time Column */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Input
                type="date"
                label="Sale Date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                max={currentDate}
                error={errors.saleDate}
                disabled={isLoading}
                required
              />
              <Input
                type="time"
                label="Sale Time"
                value={saleTime}
                onChange={(e) => setSaleTime(e.target.value)}
                error={errors.saleTime}
                disabled
                required
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Sale Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                disabled={isLoading}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                Add Item
              </Button>
            </div>

            {errors.items && (
              <div className="mb-3 p-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded">
                {errors.items}
              </div>
            )}

            <div className="space-y-2 sm:space-y-3">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`p-2 sm:p-3 rounded-lg border transition-colors ${
                    item.itemType === 'material' ? 'bg-white border-gray-200' : 'bg-indigo-50/50 border-indigo-100'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    
                    {/* Type Selector */}
                    <div className="w-32">
                      <Select
                        label={index === 0 ? "Type" : ""}
                        value={item.itemType}
                        onChange={(e) => updateItem(item.id, 'itemType', e.target.value)}
                        options={[
                          { value: 'material', label: 'Material' },
                          { value: 'booth', label: 'Booth' },
                        ]}
                        disabled={isLoading}
                      />
                    </div>

                    {/* DYNAMIC FIELDS */}
                    <div className="flex-1">
                      {item.itemType === 'material' ? (
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <Select
                              label={index === 0 ? "Select Material" : ""}
                              value={item.materialId}
                              onChange={(e) => updateItem(item.id, 'materialId', e.target.value)}
                              options={materials.map(m => ({
                                value: m.id,
                                label: `${m.name}`
                              }))}
                              placeholder="Choose material..."
                              disabled={isLoading}
                            />
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              label={index === 0 ? "Qty" : ""}
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                              min="0.1"
                              step="any"
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <Select
                              label={index === 0 ? "Select Service" : ""}
                              value={item.serviceId}
                              onChange={(e) => updateItem(item.id, 'serviceId', e.target.value)}
                              options={services.map(s => ({
                                value: s.id,
                                label: s.name
                              }))}
                              placeholder="Choose service..."
                              disabled={isLoading}
                            />
                          </div>
                          <div className="w-24 opacity-50">
                            <Input
                              label={index === 0 ? "Qty" : ""}
                              value="1"
                              disabled={true}
                              className="bg-gray-100"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Price & Delete */}
                    <div className="w-24 pt-1">
                      <label className={`block text-xs font-medium text-gray-700 mb-1 ${index === 0 ? 'visible' : 'invisible'}`}>
                        Total
                      </label>
                      <div className="h-[38px] flex items-center justify-end px-2 font-medium text-gray-900 bg-gray-50 rounded border border-gray-200">
                        {parseFloat(item.subtotal || 0).toFixed(2)}
                      </div>
                    </div>

                    <div className={`pt-1 ${index === 0 ? 'mt-6' : 'mt-0'}`}>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove item"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {((item.itemType === 'material' && !item.materialId) || (item.itemType === 'booth' && !item.serviceId)) && (
                     <p className="text-xs text-red-500 mt-1 ml-1">* Selection required</p>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Area */}
        <div className="border-t border-gray-200 pt-4 mt-4 bg-white">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-4">
            <div>
              <Select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'momo', label: 'Mobile Money' },
                  { value: 'cheque', label: 'Cheque' },
                ]}
              />
            </div>
            
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reverseInventory}
                  onChange={(e) => setReverseInventory(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-700">Auto-reverse inventory</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 p-3 sm:p-4 rounded-lg">
            <div className="text-right flex-1">
              <span className="text-xs sm:text-sm text-gray-500 mr-2">Total Amount:</span>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">GH₵{calculateTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
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
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}