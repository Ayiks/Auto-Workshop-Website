// src/components/features/sales/SaleForm.jsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { materialsApi } from "@api/materials";
import { settingsApi } from "@api/settings";
import Button from "@components/common/Button";
import Select from "@components/common/Select";
import Input from "@components/common/Input";
import { format } from "date-fns";

export default function SaleForm({ onSubmit, onCancel, isLoading }) {
  const [saleType, setSaleType] = useState("counter");
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Booth service state
  const [serviceCategory, setServiceCategory] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [boothPrice, setBoothPrice] = useState(0);
  const [selectedService, setSelectedService] = useState(null);

  // Fetch materials for counter sale
  const { data: materialsData } = useQuery({
    queryKey: ["materials", { status: "active" }],
    queryFn: () => materialsApi.getMaterials({ status: "active" }),
    enabled: saleType === "counter",
  });

  // Fetch booth service categories
  const { data: serviceCategoriesData } = useQuery({
    queryKey: ["booth-service-categories"],
    queryFn: () => settingsApi.getServiceCategories(),
    enabled: saleType === "booth",
  });

  // Fetch item categories when service category is selected
  const { data: itemCategoriesData } = useQuery({
    queryKey: ["booth-item-categories", serviceCategory],
    queryFn: () => settingsApi.getItemCategories(serviceCategory),
    enabled: saleType === "booth" && !!serviceCategory,
  });

  const materials = materialsData?.data || [];
  const activeMaterials = materials.filter((m) => m.quantity > 0);
  const serviceCategories = serviceCategoriesData?.data || [];
  const itemCategories = itemCategoriesData?.data || [];

  // Reset when switching sale type
  useEffect(() => {
    setItems([]);
    setServiceCategory("");
    setItemCategory("");
    setBoothPrice(0);
    setSelectedService(null);
  }, [saleType]);

  // Auto-fill price when both categories are selected
  useEffect(() => {
    if (serviceCategory && itemCategory) {
      const selected = itemCategories.find(
        (i) => i.itemCategory === itemCategory
      );
      if (selected) {
        setBoothPrice(parseFloat(selected.price));
        setSelectedService(selected);
      } else {
        setBoothPrice(0);
        setSelectedService(null);
      }
    } else {
      setBoothPrice(0);
      setSelectedService(null);
    }
  }, [serviceCategory, itemCategory, itemCategories]);

  // Counter Sale Functions
  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now(),
        itemType: "material",
        materialId: "",
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

          if (field === "materialId" && value) {
            const material = materials.find((m) => m.id === parseInt(value));
            if (material) {
              updated.unitPrice = material.sellingPrice;
              updated.subtotal = material.sellingPrice * updated.quantity;
              updated.maxQuantity = material.quantity;
              updated.materialName = material.name;
            }
          }

          if (field === "quantity") {
            updated.subtotal = updated.unitPrice * parseFloat(value || 0);
          }

          return updated;
        }
        return item;
      })
    );
  };

  // Calculate totals
  const itemsTotal = items.reduce(
    (sum, item) => sum + parseFloat(item.subtotal || 0),
    0
  );
  const grandTotal = saleType === "counter" ? itemsTotal : boothPrice;

  // Date validation
  const isFutureDate = new Date(saleDate) > new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isOldDate = new Date(saleDate) < thirtyDaysAgo;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isFutureDate) {
      alert("Cannot create a sale with a future date");
      return;
    }

    if (saleType === "counter") {
      if (items.length === 0) {
        alert("Please add at least one item");
        return;
      }

      for (const item of items) {
        if (!item.materialId) {
          alert("Please select a material for all items");
          return;
        }
        if (item.quantity <= 0) {
          alert("Quantity must be greater than 0");
          return;
        }
        const selectedQty = parseFloat(item.quantity);
        const availableQty = Number(item.maxQuantity);
        if (selectedQty > availableQty) {
          alert(
            `Not enough stock for ${item.materialName}. Available: ${item.maxQuantity}`
          );
          return;
        }
      }

      const saleItems = items.map((item) => ({
        itemType: "material",
        materialId: Number(item.materialId),
        quantity: parseFloat(item.quantity),
      }));

      onSubmit({
        items: saleItems,
        paymentMethod,
        saleDate: new Date(saleDate).toISOString(),
      });
    } else {
      if (!serviceCategory || !itemCategory) {
        alert("Please select both service and item category");
        return;
      }

      if (!selectedService?.id) {
        alert("Service ID not found. Please reselect the service.");
        return;
      }

      const submitData = {
        items: [
          {
            itemType: "booth",
            serviceId: selectedService.id,
          },
        ],
        paymentMethod,
        saleDate: new Date(saleDate).toISOString(),
      };

      onSubmit(submitData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Sale Type Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Sale Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSaleType("counter")}
            className={`px-6 py-4 rounded-lg border-2 font-medium transition-all ${
              saleType === "counter"
                ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm"
                : "border-gray-300 text-gray-700 hover:border-gray-400"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Counter Sale
            </div>
            <p className="text-xs mt-1 text-gray-500">Materials</p>
          </button>
          <button
            type="button"
            onClick={() => setSaleType("booth")}
            className={`px-6 py-4 rounded-lg border-2 font-medium transition-all ${
              saleType === "booth"
                ? "border-success-500 bg-success-50 text-success-700 shadow-sm"
                : "border-gray-300 text-gray-700 hover:border-gray-400"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Booth Service
            </div>
            <p className="text-xs mt-1 text-gray-500">Spray Services</p>
          </button>
        </div>
      </div>

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
              max={format(new Date(), "yyyy-MM-dd")}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-2">
              {saleDate === format(new Date(), "yyyy-MM-dd")
                ? "Recording sale for today"
                : "Backdating sale record"}
            </p>
          </div>

          {isOldDate && (
            <div className="ml-4 bg-warning-50 border border-warning-200 rounded-lg p-3 max-w-xs">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-warning-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* COUNTER SALE SECTION */}
      {saleType === "counter" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Sale Items</h3>
            <p className="text-sm text-gray-500 mt-1">Add materials to this sale</p>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 mb-4">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500">No items added yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Add Item" below to start</p>
            </div>
          ) : (
            <>
              {/* Desktop Header Row */}
              <div className="hidden md:grid grid-cols-12 gap-4 mb-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-3">Material</div>
                <div className="col-span-3">Quantity</div>
                <div className="col-span-3">Unit Price (GH₵)</div>
                <div className="col-span-3 text-right">Subtotal (GH₵)</div>
              </div>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      
                      {/* Material: 3 Cols */}
                      <div className="col-span-1 md:col-span-3">
                        <label className="block md:hidden text-xs font-medium text-gray-500 mb-1">Material</label>
                        <Select
                          name={`material-${item.id}`}
                          value={item.materialId}
                          onChange={(e) => updateItem(item.id, "materialId", e.target.value)}
                          options={activeMaterials.map((m) => ({
                            value: m.id.toString(),
                            label: m.name, // Simplified label, stock shown in quantity field now
                          }))}
                          placeholder="Select material"
                          required
                          disabled={isLoading}
                        />
                      </div>

                      {/* Quantity: 3 Cols */}
                      <div className="col-span-1 md:col-span-3">
                        <label className="block md:hidden text-xs font-medium text-gray-500 mb-1">Quantity</label>
                        <div className="flex flex-col">
                          <Input
                            name={`quantity-${item.id}`}
                            type="number"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                            min="0"
                            max={item.maxQuantity}
                            placeholder="0"
                            required
                            disabled={isLoading}
                            // Removed arrows, standard padding
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          {item.maxQuantity && (
                            <div className="mt-1 text-xs text-gray-500 flex justify-between px-1">
                              <span>Max Stock:</span>
                              <span className="font-medium">{item.maxQuantity}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Price: 3 Cols */}
                      <div className="col-span-1 md:col-span-3">
                        <label className="block md:hidden text-xs font-medium text-gray-500 mb-1">Unit Price (GH₵)</label>
                        <Input
                          name={`price-${item.id}`}
                          type="number"
                          value={item.unitPrice}
                          disabled
                          step="0.01"
                          placeholder="0.00"
                          // Standard padding since GHC is in header
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      {/* Subtotal & Delete: 3 Cols */}
                      <div className="col-span-1 md:col-span-3 flex items-center justify-between h-[42px]">
                        <div className="flex-1 md:text-right mr-4">
                          <span className="md:hidden text-xs text-gray-500 mr-2">Subtotal:</span>
                          <span className="text-sm font-semibold text-gray-900 truncate block">
                            {parseFloat(item.subtotal || 0).toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                          disabled={isLoading}
                          title="Remove item"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ADD ITEM BUTTON */}
          <Button
            type="button"
            variant="secondary"
            onClick={addItem}
            className="w-full py-3 border-2 border-dashed border-gray-300 bg-gray-50 text-gray-600 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-all"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add New Item
          </Button>
        </div>
      )}

      {/* BOOTH SALE SECTION (unchanged) */}
      {saleType === "booth" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Booth Service Details</h3>
          
          <div className="space-y-4">
            <Select
              label="Service Category"
              value={serviceCategory}
              onChange={(e) => {
                setServiceCategory(e.target.value);
                setItemCategory("");
                setBoothPrice(0);
                setSelectedService(null);
              }}
              options={serviceCategories.map(cat => ({
                value: cat,
                label: cat,
              }))}
              placeholder="Select service (e.g., Full Body, Touch Up)"
              required
              disabled={isLoading}
            />

            {serviceCategory && (
              <Select
                label="Item Category"
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                options={itemCategories.map(item => ({
                  value: item.itemCategory,
                  label: `${item.itemCategory} - GH₵ ${parseFloat(item.price).toFixed(2)}`,
                }))}
                placeholder="Select item (e.g., 4x4, Saloon, Fridge)"
                required
                disabled={isLoading}
              />
            )}

            {serviceCategory && itemCategory && boothPrice > 0 && (
              <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-success-900">Service Price</p>
                    <p className="text-xs text-success-700 mt-1">
                      {serviceCategory} - {itemCategory}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-success-700">
                    GH₵&nbsp;{boothPrice.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Totals & Payment */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="space-y-3 mb-6">
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-gray-900">Total Amount</span>
              <span className="text-primary-600">GH₵&nbsp;{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-3">
            {["cash", "momo", "cheque"].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  paymentMethod === method
                    ? method === "cash"
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : method === "momo"
                        ? "border-success-500 bg-success-50 text-success-700"
                        : "border-secondary-500 bg-secondary-50 text-secondary-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {method === "momo"
                  ? "Mobile Money"
                  : method.charAt(0).toUpperCase() + method.slice(1)}
              </button>
            ))}
          </div>
        </div>

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
            disabled={
              isFutureDate || 
              grandTotal === 0 ||
              (saleType === "counter" && items.length === 0) || 
              (saleType === "booth" && (!serviceCategory || !itemCategory))
            }
            className="px-8 shadow-sm"
          >
            Complete Sale • GH₵&nbsp;{grandTotal.toFixed(2)}
          </Button>
        </div>
      </div>
    </form>
  );
}