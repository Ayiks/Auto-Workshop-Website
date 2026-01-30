import { useState, useEffect } from 'react';
import Button from '@components/common/Button';

export default function CustomerForm({ initialData, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">First Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="firstName"
            required
            className="block w-full rounded-lg p-2 border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm transition-shadow"
            value={formData.firstName}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Last Name</label>
          <input
            type="text"
            name="lastName"
            className="block w-full rounded-lg p-2 border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm transition-shadow"
            value={formData.lastName}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Phone Number <span className="text-red-500">*</span></label>
          <input
            type="tel"
            name="phone"
            required
            placeholder="024 XXX XXXX"
            className="block w-full rounded-lg p-2 border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm transition-shadow"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Email Address</label>
          <input
            type="email"
            name="email"
            className="block w-full rounded-lg p-2 border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm transition-shadow"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Physical Address</label>
        <textarea
          name="address"
          rows="2"
          className="block w-full rounded-lg p-2 border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm resize-none transition-shadow"
          value={formData.address || ''}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Notes</label>
        <textarea
          name="notes"
          rows="2"
          placeholder="Customer preferences or additional details..."
          className="block w-full rounded-lg p-2 border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm resize-none transition-shadow"
          value={formData.notes || ''}
          onChange={handleChange}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onCancel} type="button" disabled={isLoading} size="sm">
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={isLoading} size="sm" className="bg-gray-900 hover:bg-black text-white">
          {initialData ? 'Update Customer' : 'Add Customer'}
        </Button>
      </div>
    </form>
  );
}