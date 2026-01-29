// src/components/features/expenses/ExpenseForm.jsx
import { useState, useEffect } from 'react';

const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

export default function ExpenseForm({ expense, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    category: expense?.category || '',
    description: expense?.description || '',
    amount: expense?.amount || '',
    expenseDate: expense?.expenseDate 
      ? new Date(expense.expenseDate).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0],
    notes: expense?.notes || '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (expense) {
      setFormData({
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        expenseDate: new Date(expense.expenseDate).toISOString().split('T')[0],
        notes: expense.notes || '',
      });
    }
  }, [expense]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.expenseDate) {
      newErrors.expenseDate = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    onSubmit({
      category: formData.category,
      description: formData.description.trim(),
      amount: parseFloat(formData.amount),
      expenseDate: formData.expenseDate,
      notes: formData.notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Category <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full px-3 py-2.5 bg-white border rounded-lg text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-shadow ${
              errors.category ? 'border-red-300' : 'border-gray-300'
            } ${isLoading ? 'bg-gray-50' : ''}`}
          >
            <option value="">Select category</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        {errors.category && (
          <p className="text-xs text-red-600 font-medium">{errors.category}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Description <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g., Monthly office rent"
          disabled={isLoading}
          className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-shadow ${
            errors.description ? 'border-red-300' : 'border-gray-300'
          } ${isLoading ? 'bg-gray-50' : ''}`}
        />
        {errors.description && (
          <p className="text-xs text-red-600 font-medium">{errors.description}</p>
        )}
      </div>

      {/* Amount & Date Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
              GH₵
            </span>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
              disabled={isLoading}
              className={`w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-shadow ${
                errors.amount ? 'border-red-300' : 'border-gray-300'
              } ${isLoading ? 'bg-gray-50' : ''}`}
            />
          </div>
          {errors.amount && (
            <p className="text-xs text-red-600 font-medium">{errors.amount}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="expenseDate"
            value={formData.expenseDate}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-shadow ${
              errors.expenseDate ? 'border-red-300' : 'border-gray-300'
            } ${isLoading ? 'bg-gray-50' : ''}`}
          />
          {errors.expenseDate && (
            <p className="text-xs text-red-600 font-medium">{errors.expenseDate}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Notes (Optional)
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add any additional details..."
          rows={3}
          disabled={isLoading}
          className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-shadow resize-none ${
            isLoading ? 'bg-gray-50' : ''
          }`}
        />
      </div>

      {/* Info Box - Neutral SaaS Style */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Operational Expense</p>
          <p className="text-xs text-gray-500 mt-0.5">
            This record will impact the company's net profit calculation.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
        >
          {isLoading && (
            <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {expense ? 'Save Changes' : 'Record Expense'}
        </button>
      </div>
    </form>
  );
}