import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { materialsApi } from '@api/materials'; 
const EXPENSE_CATEGORIES = [
  { value: 'materials', label: 'Material Purchases (Stock)' }, 
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

  // --- MATERIAL BUILDER STATE ---
  // If editing an existing expense, we won't try to parse the lines back from description 
  // we just show the standard form. This builder is primarily for creation.
  const [lineItems, setLineItems] = useState([]);
  const [itemSearch, setItemSearch] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Fetch Materials for the search dropdown
  const { data: materialsData } = useQuery({
    queryKey: ['materials', { status: 'active' }],
    queryFn: () => materialsApi.getMaterials({ status: 'active' }),
    enabled: formData.category === 'materials' && !expense, // Only fetch if creating material expense
  });

  const materials = materialsData?.data || [];

  const filteredMaterials = useMemo(() => {
    if (!itemSearch) return [];
    return materials.filter(m => 
      m.name.toLowerCase().includes(itemSearch.toLowerCase())
    ).slice(0, 5); // Limit results
  }, [materials, itemSearch]);

  const [errors, setErrors] = useState({});

  // Sync basic data
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

  // --- LINE ITEM LOGIC ---

  const addLineItem = (material) => {
    setLineItems(prev => [
      ...prev,
      {
        id: Date.now(), // Temp ID
        materialId: material.id,
        name: material.name,
        qty: 1,
        unitCost: material.unitCost || 0, // Default to system cost price
      }
    ]);
    setItemSearch("");
    setShowResults(false);
  };

  const removeLineItem = (id) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: parseFloat(value) };
      }
      return item;
    }));
  };

  // Auto-calculate Total and Description when line items change
  useEffect(() => {
    if (formData.category === 'materials' && lineItems.length > 0) {
      const total = lineItems.reduce((sum, item) => sum + (item.qty * item.unitCost), 0);
      
      // Generate a nice description string
      const descString = `Stock: ${lineItems.map(i => `${i.qty}x ${i.name}`).join(', ')}`;
      
      // Generate detailed notes
      const notesString = lineItems.map(i => 
        `- ${i.name}: ${i.qty} units @ GH₵${i.unitCost}`
      ).join('\n');

      setFormData(prev => ({
        ...prev,
        amount: total.toFixed(2),
        description: descString.substring(0, 200), // Ensure it fits DB limits
        notes: notesString
      }));
    }
  }, [lineItems, formData.category]);


  // --- STANDARD HANDLERS ---

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Amount must be valid';
    if (!formData.expenseDate) newErrors.expenseDate = 'Date is required';
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
      
      {/* 1. Category Selection */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Category <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            disabled={isLoading || !!expense} // Lock category on edit to prevent logic break
            className={`w-full px-3 py-2.5 bg-white border rounded-lg text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-shadow ${
              errors.category ? 'border-red-300' : 'border-gray-300'
            }`}
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
        {errors.category && <p className="text-xs text-red-600 font-medium">{errors.category}</p>}
      </div>

      {/* --- MATERIAL CALCULATOR SECTION --- */}
      {formData.category === 'materials' && !expense && (
        <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              Purchase Calculator
            </h4>
            <span className="text-[10px] text-blue-600 bg-blue-100 px-2 py-1 rounded-full font-medium">Auto-fills Total</span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search inventory items..."
              value={itemSearch}
              onChange={(e) => { setItemSearch(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {showResults && itemSearch && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredMaterials.length > 0 ? (
                  filteredMaterials.map(material => (
                    <button
                      key={material.id}
                      type="button"
                      onClick={() => addLineItem(material)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex justify-between items-center"
                    >
                      <span>{material.name}</span>
                      <span className="text-xs text-gray-400">Curr Cost: {material.costPrice}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-sm text-gray-400 italic">No items found</div>
                )}
              </div>
            )}
          </div>

          {/* Line Items List */}
          <div className="space-y-2">
            {lineItems.map((item) => (
              <div key={item.id} className="flex items-end gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-1">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Item</label>
                  <div className="text-sm font-medium text-gray-900 truncate" title={item.name}>{item.name}</div>
                </div>
                <div className="w-16">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => updateLineItem(item.id, 'qty', e.target.value)}
                    className="w-full p-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-center"
                  />
                </div>
                <div className="w-20">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Cost (₵)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitCost}
                    onChange={(e) => updateLineItem(item.id, 'unitCost', e.target.value)}
                    className="w-full p-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
                <div className="pb-1">
                  <button type="button" onClick={() => removeLineItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
            {lineItems.length === 0 && (
              <div className="text-center py-4 text-xs text-blue-400 italic border border-dashed border-blue-200 rounded-lg">
                Add items above to calculate total automatically
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Description (Auto-filled but editable) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Description <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder={formData.category === 'materials' ? "Generated automatically..." : "e.g., Monthly office rent"}
          disabled={isLoading}
          className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-shadow ${
            errors.description ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors.description && <p className="text-xs text-red-600 font-medium">{errors.description}</p>}
      </div>

      {/* 3. Amount & Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">GH₵</span>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
              // If calculator is active, make standard input read-onlyish (user can still override if needed)
              readOnly={formData.category === 'materials' && lineItems.length > 0}
              className={`w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-shadow ${
                errors.amount ? 'border-red-300' : 'border-gray-300'
              } ${formData.category === 'materials' && lineItems.length > 0 ? 'bg-gray-100' : ''}`}
            />
          </div>
          {errors.amount && <p className="text-xs text-red-600 font-medium">{errors.amount}</p>}
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
            }`}
          />
          {errors.expenseDate && <p className="text-xs text-red-600 font-medium">{errors.expenseDate}</p>}
        </div>
      </div>

      {/* 4. Notes */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">Notes (Optional)</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add any additional details..."
          rows={3}
          disabled={isLoading}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-shadow resize-none"
        />
      </div>

      {/* Info Box */}
      <div className={`border rounded-lg p-4 flex gap-3 ${
          formData.category === 'materials' 
          ? 'bg-blue-50 border-blue-200 text-blue-800' 
          : 'bg-gray-50 border-gray-200 text-gray-900'
      }`}>
        <div className="flex-shrink-0 mt-0.5">
          <svg className={`w-5 h-5 ${formData.category === 'materials' ? 'text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={
                formData.category === 'materials' 
                ? "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" 
                : "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            } />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium">
            {formData.category === 'materials' ? 'Material Purchase' : 'Operational Expense'}
          </p>
          <p className={`text-xs mt-0.5 ${formData.category === 'materials' ? 'text-blue-600' : 'text-gray-500'}`}>
            {formData.category === 'materials' 
             ? "Recorded as inventory purchase cost. Does NOT automatically update stock count."
             : "This record will impact the company's net profit calculation."
            }
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