import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { materialsApi } from '@api/materials';
import { useAuthStore } from '@stores/authStore';
import Button from '@components/common/Button';

export default function JobForm({ job, onSubmit, onCancel, isLoading }) {
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    jobType: job?.jobType || getDefaultJobType(user?.role) || 'mechanic',
    clientName: job?.clientName || '',
    clientPhone: job?.clientPhone || '',
    clientEmail: job?.clientEmail || '',
    vehicleMake: job?.vehicleMake || '',
    vehicleModel: job?.vehicleModel || '',
    vehicleRegNumber: job?.vehicleRegNumber || '',
    problemType: job?.problemType || '',
    problemDescription: job?.problemDescription || '',
    labourCost: job?.labourCost || 0,
  });

  const [materials, setMaterials] = useState(job?.materials || []);
  const [errors, setErrors] = useState({});

  // Fetch inventory materials
  const { data: materialsData } = useQuery({
    queryKey: ['materials', { status: 'active' }],
    queryFn: () => materialsApi.getMaterials({ status: 'active' }),
  });

  const inventoryMaterials = materialsData?.data || [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const addMaterial = () => {
    setMaterials([
      ...materials,
      {
        id: Date.now(),
        isExternal: false,
        materialId: '',
        materialName: '',
        quantity: 0,
        unitPrice: 0,
        subtotal: 0,
      },
    ]);
  };

  const removeMaterial = (id) => {
    setMaterials(materials.filter((m) => m.id !== id));
  };

  const updateMaterial = (id, field, value) => {
    setMaterials(
      materials.map((m) => {
        if (m.id === id) {
          const updated = { ...m, [field]: value };

          // When material selected from inventory
          if (field === 'materialId' && value) {
            const material = inventoryMaterials.find((inv) => inv.id === parseInt(value));
            if (material) {
              updated.materialName = material.name;
              updated.unitPrice = material.sellingPrice;
              updated.subtotal = material.sellingPrice * updated.quantity;
              updated.maxQuantity = material.quantity;
            }
          }

          // When toggling external
          if (field === 'isExternal') {
            if (value) {
              updated.materialId = null; // Clear ID
              updated.maxQuantity = null;
            } else {
              updated.materialName = ''; // Clear name
            }
          }

          // Recalculate subtotal
          if (field === 'quantity' || field === 'unitPrice') {
            updated.subtotal = parseFloat(updated.unitPrice || 0) * parseInt(updated.quantity || 0);
          }

          return updated;
        }
        return m;
      })
    );
  };

  const materialsCost = materials.reduce((sum, m) => sum + parseFloat(m.subtotal || 0), 0);
  const totalCost = materialsCost + parseFloat(formData.labourCost || 0);

  const validate = () => {
    const newErrors = {};

    if (!formData.clientName.trim()) newErrors.clientName = 'Client name is required';
    if (!formData.clientPhone.trim()) newErrors.clientPhone = 'Client phone is required';
    if (!formData.problemType.trim()) newErrors.problemType = 'Problem type is required';
    // if (!formData.problemDescription.trim()) newErrors.problemDescription = 'Problem description is required';

    // Validate materials
    for (const material of materials) {
      if (!material.isExternal && !material.materialId) {
        newErrors.materials = 'Please select material or mark as external';
        break;
      }
      if (material.isExternal && !material.materialName.trim()) {
        newErrors.materials = 'Please enter external material name';
        break;
      }
      if (material.quantity <= 0) {
        newErrors.materials = 'Material quantity must be greater than 0';
        break;
      }
      // Check stock availability for inventory materials
      if (!material.isExternal && material.materialId) {
        const inventoryItem = inventoryMaterials.find(inv => inv.id === parseInt(material.materialId));
        if (inventoryItem && parseInt(material.quantity) > inventoryItem.quantity) {
          newErrors.materials = `${material.materialName} has only ${inventoryItem.quantity} units in stock`;
          break;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        labourCost: parseFloat(formData.labourCost),
        materials: materials.map((m) => ({
          materialId: m.isExternal ? undefined : parseInt(m.materialId),
          materialName: m.materialName,
          quantity: parseInt(m.quantity),
          unitPrice: parseFloat(m.unitPrice),
          isExternal: m.isExternal,
        })),
      });
    }
  };

  // Reusable input class for strict monochrome focus states
  const inputClass = (hasError) => `w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-shadow focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
    hasError ? 'border-red-500' : 'border-gray-300'
  }`;

  return (
    <form onSubmit={handleSubmit} className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        
        {/* LEFT COLUMN: Data Entry */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. Job Type */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Job Type</label>
            <div className="grid grid-cols-3 gap-3">
              {['mechanic', 'sprayer', 'bodyworks'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, jobType: type })}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-all ${
                    formData.jobType === type
                      ? 'bg-black text-white border border-black shadow-md'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
                  }`}
                  disabled={isLoading}
                >
                  {type === 'bodyworks' ? 'Body Works' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Client & Vehicle (Grouped for density) */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm space-y-6">
            
            {/* Client Section */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Client Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                    className={inputClass(errors.clientName)}
                    placeholder="e.g. John Doe"
                    disabled={isLoading}
                  />
                  {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleChange}
                    className={inputClass(errors.clientPhone)}
                    placeholder="e.g. 024 456 7890"
                    disabled={isLoading}
                  />
                  {errors.clientPhone && <p className="text-xs text-red-500 mt-1">{errors.clientPhone}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleChange}
                    className={inputClass(false)}
                    placeholder="client@example.com"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 my-4"></div>

            {/* Vehicle Section */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                Vehicle Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Make</label>
                  <input
                    type="text"
                    name="vehicleMake"
                    value={formData.vehicleMake}
                    onChange={handleChange}
                    className={inputClass(false)}
                    placeholder="e.g. Toyota"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    name="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={handleChange}
                    className={inputClass(false)}
                    placeholder="e.g. Camry"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Registration</label>
                  <input
                    type="text"
                    name="vehicleRegNumber"
                    value={formData.vehicleRegNumber}
                    onChange={handleChange}
                    className={inputClass(false)}
                    placeholder="e.g. GR-2345-24"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Problem Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Problem Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Issue Summary *</label>
                <input
                  type="text"
                  name="problemType"
                  value={formData.problemType}
                  onChange={handleChange}
                  className={inputClass(errors.problemType)}
                  placeholder="e.g. Brake Failure"
                  disabled={isLoading}
                />
                {errors.problemType && <p className="text-xs text-red-500 mt-1">{errors.problemType}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Detailed Description *</label>
                <textarea
                  name="problemDescription"
                  value={formData.problemDescription}
                  onChange={handleChange}
                  rows={4}
                  className={inputClass(errors.problemDescription)}
                  placeholder="Describe the issue in detail..."
                  disabled={isLoading}
                />
                {errors.problemDescription && <p className="text-xs text-red-500 mt-1">{errors.problemDescription}</p>}
              </div>
            </div>
          </div>

          {/* 4. Materials List - (REMOVED !job CONDITION) */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Materials Used</h3>
              <button
                type="button"
                onClick={addMaterial}
                disabled={isLoading}
                className="text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-black transition-colors"
              >
                + Add Item
              </button>
            </div>

            {errors.materials && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded text-xs text-red-600">
                {errors.materials}
              </div>
            )}

            <div className="space-y-3">
              {materials.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-300">
                  <p className="text-sm text-gray-500">No materials added.</p>
                </div>
              ) : (
                materials.map((material, index) => (
                  <div key={material.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                    {/* Row 1: Controls */}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Item {index + 1}</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={material.isExternal}
                            onChange={(e) => updateMaterial(material.id, 'isExternal', e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-gray-900 focus:ring-black border-gray-300"
                            disabled={isLoading}
                          />
                          <span className="text-xs text-gray-600">External Source</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeMaterial(material.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Inputs Grid */}
                    <div className="grid grid-cols-12 gap-2">
                      {/* Name/Select */}
                      <div className="col-span-5">
                        {material.isExternal ? (
                          <input
                            value={material.materialName}
                            onChange={(e) => updateMaterial(material.id, 'materialName', e.target.value)}
                            placeholder="Item Name"
                            className={inputClass(false)}
                          />
                        ) : (
                          <div className="relative">
                              <select
                                  value={material.materialId}
                                  onChange={(e) => updateMaterial(material.id, 'materialId', e.target.value)}
                                  className={`${inputClass(false)} appearance-none`}
                              >
                                  <option value="">Select Item...</option>
                                  {inventoryMaterials.map((m) => (
                                  <option key={m.id} value={m.id}>
                                      {m.name}
                                  </option>
                                  ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                              </div>
                          </div>
                        )}
                      </div>

                      {/* Qty */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={material.quantity}
                          onChange={(e) => updateMaterial(material.id, 'quantity', e.target.value)}
                          min="1"
                          placeholder="Qty"
                          className={inputClass(false)}
                        />
                      </div>

                      {/* Price */}
                      <div className="col-span-2 relative">
                        <span className="absolute left-2 top-2.5 text-gray-400 text-xs">₵</span>
                        <input
                          type="number"
                          value={material.unitPrice}
                          onChange={(e) => updateMaterial(material.id, 'unitPrice', e.target.value)}
                          className={`${inputClass(false)} pl-5`}
                          disabled={!material.isExternal && material.materialId}
                        />
                      </div>

                      {/* Total */}
                      <div className="col-span-3 flex items-center justify-end">
                          <div className="text-right">
                              <span className="block text-sm font-bold text-gray-900">
                                  ₵{parseFloat(material.subtotal || 0).toFixed(2)}
                              </span>
                          </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Summary & Actions */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            
            {/* Unified Cost Breakdown (Used for both Create and Edit) */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900">Cost Breakdown</h3>
                </div>
                
                <div className="p-5 space-y-4">
                    {/* 1. Materials Sum */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Materials Total</span>
                        <span className="font-medium text-gray-900">GH₵{materialsCost.toFixed(2)}</span>
                    </div>

                    {/* 2. Labour Input */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Labour Cost</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-500 text-sm">GH₵</span>
                            <input
                                type="number"
                                name="labourCost"
                                value={formData.labourCost}
                                onChange={handleChange}
                                placeholder="0.00"
                                min="0"
                                className={`${inputClass(false)} pl-10 font-medium text-right`}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-2">
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-bold text-gray-900">Grand Total</span>
                            <span className="text-2xl font-bold text-black tracking-tight">
                                GH₵{totalCost.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200 grid gap-3">
                    <Button
                        type="submit"
                        variant="primary"
                        loading={isLoading}
                        className="w-full justify-center bg-black hover:bg-gray-800 text-white"
                    >
                        {job ? 'Save Changes' : 'Create Job'}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="w-full justify-center border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                        Cancel
                    </Button>
                </div>
            </div>

            {/* Helper Text */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-semibold text-gray-900 block mb-1">Note:</span>
                    Materials selected from inventory will automatically deduct stock upon job completion. External materials require manual price entry.
                </p>
            </div>

          </div>
        </div>
      </div>
    </form>
  );
}

function getDefaultJobType(role) {
  const roleMap = {
    mechanic: 'mechanic',
    sprayer: 'sprayer',
    bodyworks: 'bodyworks',
  };
  return roleMap[role] || 'mechanic';
}