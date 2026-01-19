// src/components/features/jobs/AddMaterialModal.jsx
import { useState, useEffect } from 'react';
import { Button, Input, Select, Modal } from '../../common';
import { materialsApi } from '../../../api/materials';

const AddMaterialModal = ({ isOpen, onClose, onSubmit, jobId }) => {
  const [materialType, setMaterialType] = useState('inventory'); // 'inventory' or 'external'
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    materialId: '',
    materialName: '',
    quantity: '',
    unitPrice: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch inventory materials when modal opens
  useEffect(() => {
    if (isOpen && materialType === 'inventory') {
      fetchMaterials();
    }
  }, [isOpen, materialType]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setMaterialType('inventory');
      setFormData({
        materialId: '',
        materialName: '',
        quantity: '',
        unitPrice: '',
      });
      setErrors({});
    }
  }, [isOpen]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const response = await materialsApi.getMaterials({ status: 'active' });
      setMaterials(response.data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialSelect = (e) => {
    const materialId = e.target.value;
    setFormData(prev => ({ ...prev, materialId }));

    if (materialId) {
      const selected = materials.find(m => m.id === parseInt(materialId));
      if (selected) {
        setFormData(prev => ({
          ...prev,
          materialName: selected.name,
          unitPrice: selected.sellingPrice,
        }));
      }
    }

    if (errors.materialId) {
      setErrors(prev => ({ ...prev, materialId: null }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (materialType === 'inventory') {
      if (!formData.materialId) {
        newErrors.materialId = 'Please select a material';
      } else {
        // Check stock availability
        const selected = materials.find(m => m.id === parseInt(formData.materialId));
        if (selected && selected.quantity < parseInt(formData.quantity)) {
          newErrors.quantity = `Only ${selected.quantity} units available in stock`;
        }
      }
    } else {
      if (!formData.materialName.trim()) {
        newErrors.materialName = 'Material name is required';
      }
      if (!formData.unitPrice || parseFloat(formData.unitPrice) <= 0) {
        newErrors.unitPrice = 'Unit price must be greater than 0';
      }
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const submitData = {
        materialId: materialType === 'inventory' ? parseInt(formData.materialId) : null,
        materialName: formData.materialName,
        quantity: parseInt(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        isExternal: materialType === 'external',
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Error adding material:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateSubtotal = () => {
    const quantity = parseInt(formData.quantity) || 0;
    const price = parseFloat(formData.unitPrice) || 0;
    return (quantity * price).toFixed(2);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Material to Job"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Material Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Material Source
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMaterialType('inventory')}
              className={`px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
                materialType === 'inventory'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              From Inventory
            </button>
            <button
              type="button"
              onClick={() => {
                setMaterialType('external');
                setFormData(prev => ({ ...prev, materialId: '', materialName: '', unitPrice: '' }));
              }}
              className={`px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
                materialType === 'external'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              External Material
            </button>
          </div>
        </div>

        {/* Inventory Material Selection */}
        {materialType === 'inventory' ? (
          <>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading materials...</div>
            ) : (
              <Select
                label="Select Material"
                name="materialId"
                value={formData.materialId}
                onChange={handleMaterialSelect}
                error={errors.materialId}
                required
              >
                <option value="">-- Select Material --</option>
                {materials.map(material => (
                  <option key={material.id} value={material.id}>
                    {material.name} (Stock: {material.quantity}) - GHS {material.sellingPrice}
                  </option>
                ))}
              </Select>
            )}

            {formData.materialId && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Unit Price:</span>
                    <span className="font-medium">GHS {formData.unitPrice}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Available Stock:</span>
                    <span className="font-medium">
                      {materials.find(m => m.id === parseInt(formData.materialId))?.quantity || 0} units
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* External Material Fields */
          <>
            <Input
              label="Material Name"
              name="materialName"
              value={formData.materialName}
              onChange={handleChange}
              error={errors.materialName}
              placeholder="Enter material name"
              required
            />
            <Input
              label="Unit Price (GHS)"
              name="unitPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.unitPrice}
              onChange={handleChange}
              error={errors.unitPrice}
              required
            />
          </>
        )}

        {/* Quantity */}
        <Input
          label="Quantity"
          name="quantity"
          type="number"
          min="1"
          value={formData.quantity}
          onChange={handleChange}
          error={errors.quantity}
          required
        />

        {/* Subtotal */}
        {formData.quantity && formData.unitPrice && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Subtotal:</span>
              <span className="text-xl font-bold text-blue-700">
                GHS {calculateSubtotal()}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || loading}
            loading={isSubmitting}
          >
            Add Material
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddMaterialModal;