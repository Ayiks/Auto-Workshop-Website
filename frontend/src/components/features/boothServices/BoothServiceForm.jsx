// src/components/features/boothServices/BoothServiceForm.jsx
import { useState, useEffect } from 'react';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import Select from '@components/common/Select';

const VEHICLE_CATEGORIES = [
  { value: 'Small Vehicle', label: 'Small Vehicle (Salon, Sedan)' },
  { value: 'Medium Vehicle', label: 'Medium Vehicle (SUV, Van)' },
  { value: 'Large Vehicle', label: 'Large Vehicle (4x4, Pickup)' },
  { value: 'Extra Large', label: 'Extra Large (Bus, Truck)' },
  { value: 'Motorcycle', label: 'Motorcycle' },
  { value: 'Other', label: 'Other' },
];

export default function BoothServiceForm({ service, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    category: service?.category || '',
    price: service?.price || '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        category: service.category,
        price: service.price,
      });
    }
  }, [service]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    onSubmit({
      name: formData.name.trim(),
      category: formData.category.trim(),
      price: parseFloat(formData.price),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
      {/* Service Name */}
      <Input
        label="Service Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="e.g., Salon, 4x4, Bus"
        required
        disabled={isLoading}
        error={errors.name}
      />

      {/* Category */}
      <Select
        label="Vehicle Category"
        name="category"
        value={formData.category}
        onChange={handleChange}
        options={VEHICLE_CATEGORIES}
        placeholder="Select category"
        required
        disabled={isLoading}
        error={errors.category}
      />

      {/* Price */}
      <Input
        label="Service Price (GH₵)"
        name="price"
        type="number"
        step="0.01"
        min="0"
        value={formData.price}
        onChange={handleChange}
        placeholder="0.00"
        required
        disabled={isLoading}
        error={errors.price}
      />

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-4">
        <div className="flex items-start gap-1.5 sm:gap-2">
          <svg className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs sm:text-sm text-blue-700">
            <p className="font-medium">About Booth Services</p>
            <ul className="mt-1 space-y-0.5 sm:space-y-1">
              <li>• No inventory tracking - unlimited usage</li>
              <li>• Can be sold at counter or included in jobs</li>
              <li>• Price changes only affect new sales</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-2 sm:pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
          className="text-xs sm:text-sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          className="text-xs sm:text-sm"
        >
          {service ? 'Update Service' : 'Create Service'}
        </Button>
      </div>
    </form>
  );
}