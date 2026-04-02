import { useState, useEffect } from 'react';
import Button from '@components/common/Button';

export default function CustomerForm({ initialData, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    preferredContact: 'email',
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
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs sm:text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">First Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="firstName"
            required
            className="block w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm shadow-sm focus:border-gray-900 focus:ring-gray-900 transition-shadow"
            value={formData.firstName}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-xs sm:text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Last Name</label>
          <input
            type="text"
            name="lastName"
            className="block w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm shadow-sm focus:border-gray-900 focus:ring-gray-900 transition-shadow"
            value={formData.lastName}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs sm:text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Phone Number <span className="text-red-500">*</span></label>
          <input
            type="tel"
            name="phone"
            required
            placeholder="024 XXX XXXX"
            className="block w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm shadow-sm focus:border-gray-900 focus:ring-gray-900 transition-shadow"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-xs sm:text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Email Address</label>
          <input
            type="email"
            name="email"
            className="block w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm shadow-sm focus:border-gray-900 focus:ring-gray-900 transition-shadow"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs sm:text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Physical Address</label>
        <textarea
          name="address"
          rows="2"
          className="block w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm shadow-sm focus:border-gray-900 focus:ring-gray-900 resize-none transition-shadow"
          value={formData.address || ''}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="block text-xs sm:text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Notes</label>
        <textarea
          name="notes"
          rows="2"
          placeholder="Customer preferences or additional details..."
          className="block w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm shadow-sm focus:border-gray-900 focus:ring-gray-900 resize-none transition-shadow"
          value={formData.notes || ''}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="block text-xs sm:text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Preferred Contact</label>
        <select
          name="preferredContact"
          className="block w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm shadow-sm focus:border-gray-900 focus:ring-gray-900 transition-shadow"
          value={formData.preferredContact || 'email'}
          onChange={handleChange}
        >
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100">
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