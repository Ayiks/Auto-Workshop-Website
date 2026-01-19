import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { materialsApi } from '@api/materials';
import { useAuthStore } from '@stores/authStore';
import Button from '@components/common/Button';
import Input, { Textarea } from '@components/common/Input';
import Select from '@components/common/Select';

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
        quantity: 1,
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
              // External material - clear inventory fields
              updated.materialId = null;
              updated.maxQuantity = null;
            } else {
              // Inventory material - clear name
              updated.materialName = '';
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
    if (!formData.problemDescription.trim()) newErrors.problemDescription = 'Problem description is required';

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
      if (material.unitPrice <= 0) {
        newErrors.materials = 'Material price must be greater than 0';
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Job Type */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <label className="block text-sm font-medium text-gray-900 mb-3">Job Type</label>
        <div className="grid grid-cols-3 gap-3">
          {['mechanic', 'sprayer', 'bodyworks'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFormData({ ...formData, jobType: type })}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                formData.jobType === type
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              disabled={isLoading || !!job}
            >
              {type === 'bodyworks' ? 'Body Works' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        {errors.jobType && (
          <p className="text-sm text-red-600 mt-2">{errors.jobType}</p>
        )}
      </div>

      {/* Client Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Client Information</h3>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Client Name</label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              placeholder="John Doe"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.clientName ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.clientName && (
              <p className="text-sm text-red-600 mt-2">{errors.clientName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Phone Number</label>
            <input
              type="tel"
              name="clientPhone"
              value={formData.clientPhone}
              onChange={handleChange}
              placeholder="+233 24 000 0000"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.clientPhone ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.clientPhone && (
              <p className="text-sm text-red-600 mt-2">{errors.clientPhone}</p>
            )}
          </div>
        </div>
        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-900 mb-2">Email (Optional)</label>
          <input
            type="email"
            name="clientEmail"
            value={formData.clientEmail}
            onChange={handleChange}
            placeholder="john@example.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Vehicle Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Vehicle Information</h3>
        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Make</label>
            <input
              type="text"
              name="vehicleMake"
              value={formData.vehicleMake}
              onChange={handleChange}
              placeholder="Toyota"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Model</label>
            <input
              type="text"
              name="vehicleModel"
              value={formData.vehicleModel}
              onChange={handleChange}
              placeholder="Camry"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Registration</label>
            <input
              type="text"
              name="vehicleRegNumber"
              value={formData.vehicleRegNumber}
              onChange={handleChange}
              placeholder="GR-1234-20"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Problem Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Problem Details</h3>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Problem Type</label>
            <input
              type="text"
              name="problemType"
              value={formData.problemType}
              onChange={handleChange}
              placeholder="Engine Issue"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.problemType ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.problemType && (
              <p className="text-sm text-red-600 mt-2">{errors.problemType}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Problem Description</label>
            <textarea
              name="problemDescription"
              value={formData.problemDescription}
              onChange={handleChange}
              placeholder="Describe the problem in detail..."
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.problemDescription ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.problemDescription && (
              <p className="text-sm text-red-600 mt-2">{errors.problemDescription}</p>
            )}
          </div>
        </div>
      </div>

      {/* Materials - Only show when creating new job */}
      {!job && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Materials</h3>
              <p className="text-sm text-gray-500 mt-1">Add materials and services for this job</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addMaterial}
              disabled={isLoading}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Add Material
            </Button>
          </div>

          {errors.materials && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-sm font-medium text-red-700">{errors.materials}</p>
            </div>
          )}

          {materials.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-500">No materials added yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Add Material" to start</p>
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((material, index) => (
                <div key={material.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-300 text-sm font-medium text-gray-700">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-600">Material #{index + 1}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={material.isExternal}
                          onChange={(e) => updateMaterial(material.id, 'isExternal', e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                          disabled={isLoading}
                        />
                        External
                      </label>
                      <button
                        type="button"
                        onClick={() => removeMaterial(material.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        disabled={isLoading}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    {/* Material Selection */}
                    <div className="col-span-5">
                      {material.isExternal ? (
                        <input
                          name={`material-name-${material.id}`}
                          value={material.materialName}
                          onChange={(e) => updateMaterial(material.id, 'materialName', e.target.value)}
                          placeholder="Material name"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          disabled={isLoading}
                        />
                      ) : (
                        <select
                          name={`material-${material.id}`}
                          value={material.materialId}
                          onChange={(e) => updateMaterial(material.id, 'materialId', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          disabled={isLoading}
                        >
                          <option value="">Select material</option>
                          {inventoryMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.quantity} available)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2">
                      <div className="relative">
                        <input
                          name={`quantity-${material.id}`}
                          type="number"
                          value={material.quantity}
                          onChange={(e) => updateMaterial(material.id, 'quantity', e.target.value)}
                          min="1"
                          max={material.maxQuantity || undefined}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-12"
                          disabled={isLoading}
                        />
                        {material.maxQuantity && (
                          <span className="absolute right-3 top-2.5 text-xs text-gray-400">
                            /{material.maxQuantity}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2">
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-sm text-gray-500">GH₵</span>
                        <input
                          name={`price-${material.id}`}
                          type="number"
                          value={material.unitPrice}
                          onChange={(e) => updateMaterial(material.id, 'unitPrice', e.target.value)}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pl-10"
                          disabled={isLoading || (!material.isExternal && material.materialId)}
                        />
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="col-span-3 flex items-center justify-between">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          GH₵{parseFloat(material.subtotal || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Subtotal</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Labour Cost */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <label className="block text-sm font-medium text-gray-900 mb-3">Labour Cost (GH₵)</label>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-3 text-gray-500">GH₵</span>
          <input
            type="number"
            name="labourCost"
            value={formData.labourCost}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Total Cost Summary - Only show when creating new job */}
      {!job && (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm py-2 border-b border-blue-200">
              <span className="text-gray-700">Materials Cost</span>
              <span className="font-medium text-gray-900">GH₵{materialsCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-blue-200">
              <span className="text-gray-700">Labour Cost</span>
              <span className="font-medium text-gray-900">GH₵{parseFloat(formData.labourCost || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-3">
              <span className="text-gray-900">Total Job Cost</span>
              <span className="text-blue-700">GH₵{totalCost.toFixed(2)}</span>
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
          {job ? 'Update Job' : 'Create Job'}
        </Button>
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