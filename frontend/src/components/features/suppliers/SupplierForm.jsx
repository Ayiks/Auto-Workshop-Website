import { useState, useEffect } from 'react';
import Button from '@components/common/Button';

export default function SupplierForm({ vendor, onSubmit, onCancel, isLoading }) {
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    whatsappNumber: '',
    location: '',
    notes: '',
  });

  useEffect(() => {
    if (vendor) {
      setForm({
        companyName: vendor.companyName || '',
        contactName: vendor.contactName || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        whatsappNumber: vendor.whatsappNumber || '',
        location: vendor.location || '',
        notes: vendor.notes || '',
      });
    }
  }, [vendor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const field = (label, name, type = 'text', placeholder = '', required = false) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      {field('Company Name', 'companyName', 'text', 'e.g. ABC Supplies Ltd', true)}
      {field('Contact Person', 'contactName', 'text', 'e.g. John Mensah')}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('Phone Number', 'phone', 'tel', '0XX XXX XXXX')}
        {field('WhatsApp Number', 'whatsappNumber', 'tel', '0XX XXX XXXX')}
      </div>
      {field('Email Address', 'email', 'email', 'vendor@company.com')}
      {field('Location / Address', 'location', 'text', 'e.g. Industrial Area, Accra')}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Payment terms, delivery info, etc."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 resize-none"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button type="submit" variant="primary" loading={isLoading}>
          {vendor ? 'Save Changes' : 'Add Supplier'}
        </Button>
      </div>
    </form>
  );
}
