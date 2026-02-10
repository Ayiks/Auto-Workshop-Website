import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Import Query hooks
import { settingsApi } from '@api/settings'; // Import your settings API
import Button from '@components/common/Button';
import UnitFormModal from '@components/features/settings/UnitFormModal'; // Import the new Modal
import { Upload, X, Image as ImageIcon, Plus, Trash2, RefreshCw } from 'lucide-react';

export default function MaterialForm({ material, onSubmit, onCancel, isLoading }) {
  const queryClient = useQueryClient();
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);

  // 1. Fetch Global Units
  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ['units'],
    queryFn: settingsApi.getUnits,
    staleTime: 5 * 60 * 1000, // Cache for 5 mins
  });

  const globalUnits = unitsData?.data || [];

  const [formData, setFormData] = useState({
    name: material?.name || '',
    quantity: material?.quantity || '',
    unitCost: material?.unitCost || '',
    sellingPrice: material?.sellingPrice || '',
    lowStockThreshold: material?.lowStockThreshold || 3,
    // Store the ID of the unit now, not just the string name
    materialUnitId: material?.materialUnitId || material?.materialUnit?.id || '', 
  });

  // State for handling Alternate Units
  const [alternateUnits, setAlternateUnits] = useState(
    material?.alternateUnits?.map(u => ({
      id: u.id,
      unitId: u.unitId || '', // Link to Global Unit ID
      name: u.name || '',     // Fallback name if needed
      factor: parseFloat(u.factor),
      price: parseFloat(u.price)
    })) || []
  );

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(material?.imageUrl || null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    return () => {
      if (imagePreview && !imagePreview.startsWith('http')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // --- UNIT MANAGEMENT HANDLERS ---

  const addUnitRow = () => {
    setAlternateUnits([...alternateUnits, { unitId: '', factor: '', price: '' }]);
  };

  const removeUnitRow = (index) => {
    const newUnits = [...alternateUnits];
    newUnits.splice(index, 1);
    setAlternateUnits(newUnits);
  };

  const updateUnitRow = (index, field, value) => {
    const newUnits = [...alternateUnits];
    newUnits[index][field] = value;
    setAlternateUnits(newUnits);
  };

  // Get symbol for currently selected base unit
  const getBaseUnitSymbol = () => {
    const unit = globalUnits.find(u => u.id.toString() === formData.materialUnitId.toString());
    return unit ? unit.abbreviation : 'Units';
  };

  // --------------------------------

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'File size must be less than 5MB' }));
        return;
      }
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, image: null }));
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Material name is required';
    // if (!formData.materialUnitId) newErrors.materialUnitId = 'Base unit is required';
    if (formData.unitCost <= 0) newErrors.unitCost = 'Unit cost must be > 0';
    if (formData.sellingPrice <= 0) newErrors.sellingPrice = 'Selling price must be > 0';
    
    // Validate Units
    if (alternateUnits.length > 0) {
      alternateUnits.forEach((unit, idx) => {
        if (!unit.unitId) newErrors[`unit_${idx}_id`] = 'Unit is required';
        if (!unit.factor || unit.factor <= 1) newErrors[`unit_${idx}_factor`] = 'Must be > 1';
        if (!unit.price || unit.price <= 0) newErrors[`unit_${idx}_price`] = 'Required';
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {

      // 1. Look up the base unit name
      const selectedBaseUnit = globalUnits.find(u => u.id.toString() === formData.materialUnitId.toString());

      // 2. prepare alternate unit with names
      const formattedAlternateUnits = alternateUnits.map(u => {
        // find object and get its name
        const unitObj = globalUnits.find(gu => gu.id.toString() === u.unitId.toString());
        return {
        ...u,
        name: unitObj ? unitObj.name : 'Unknown', // Send the name!
        unitId: parseInt(u.unitId), // Ensure ID is a number
        factor: parseFloat(u.factor),
        price: parseFloat(u.price)
      };
      });
      onSubmit({
      ...formData,
      baseUnit: selectedBaseUnit ? selectedBaseUnit.name : 'Piece', // Send "KG", not "Piece"
      materialUnitId: parseInt(formData.materialUnitId),
      alternateUnits: formattedAlternateUnits,
      imageFile: selectedFile,
      hasImage: !!imagePreview 
    });
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Image Upload */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-900 mb-3">Product Image</label>
          {imagePreview ? (
            <div className="relative w-40 h-40 group">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg border border-gray-300 shadow-sm" />
              <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 bg-white text-gray-500 hover:text-red-600 rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 hover:bg-gray-100 transition-colors">
              <div className="text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-300" />
                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 hover:text-blue-500">
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" disabled={isLoading} />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">Product Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Engine Oil 5W-30"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              disabled={isLoading}
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
               {material ? 'Current Quantity' : 'Initial Quantity'}
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="absolute right-4 top-3.5 text-gray-500 text-xs font-medium uppercase pointer-events-none">
                 {getBaseUnitSymbol()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Low Stock Alert</label>
            <input
              type="number"
              name="lowStockThreshold"
              value={formData.lowStockThreshold}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Cost Price (Base)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">GH₵</span>
              <input
                type="number"
                name="unitCost"
                value={formData.unitCost}
                onChange={handleChange}
                className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.unitCost ? 'border-red-500' : 'border-gray-300'}`}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Selling Price (Base)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">GH₵</span>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.sellingPrice ? 'border-red-500' : 'border-gray-300'}`}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* --- UNIT CONFIGURATION SECTION --- */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Unit Configuration</h3>
          <p className="text-sm text-gray-500 mb-4">Define how this product is measured and sold in bulk.</p>

          {/* Base Unit Selector */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
            <div className="flex justify-between items-center mb-2">
               <label className="block text-xs font-bold uppercase text-blue-800">Base Unit (Smallest Unit)</label>
               {/* --- QUICK ADD BUTTON --- */}
               <button 
                 type="button"
                 onClick={() => setIsUnitModalOpen(true)}
                 className="text-xs flex items-center gap-1 text-blue-600 font-bold hover:text-blue-800 hover:underline"
               >
                 <Plus size={14} /> New Unit
               </button>
            </div>
            
            <div className="relative">
              <select
                name="materialUnitId"
                value={formData.materialUnitId}
                onChange={handleChange}
                className={`w-full max-w-xs px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 ${errors.materialUnitId ? 'border-red-500' : 'border-blue-200'}`}
              >
                <option value="">-- Select Base Unit --</option>
                {globalUnits.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.abbreviation})
                  </option>
                ))}
              </select>
            </div>
            {errors.materialUnitId && <p className="text-xs text-red-600 mt-1">{errors.materialUnitId}</p>}
            
            <p className="text-xs text-blue-600 mt-2">
              All stock quantity will be tracked in <strong>{getBaseUnitSymbol()}</strong>.
            </p>
          </div>

          {/* Alternate Units Table */}
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-900">Alternate Selling Units (Optional)</label>
                <button 
                  type="button" 
                  onClick={addUnitRow} 
                  className="text-xs flex items-center gap-1 text-blue-600 font-medium hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100"
                >
                  <Plus className="w-3 h-3" /> Add Unit
                </button>
             </div>

             {alternateUnits.length > 0 ? (
               <div className="border border-gray-200 rounded-lg overflow-hidden">
                 <table className="min-w-full divide-y divide-gray-200">
                   <thead className="bg-gray-50">
                     <tr>
                       <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                       <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Factor ({getBaseUnitSymbol()})</th>
                       <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price (GH₵)</th>
                       <th className="w-10"></th>
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                     {alternateUnits.map((unit, idx) => (
                       <tr key={idx}>
                         <td className="p-2">
                           <select
                              value={unit.unitId}
                              onChange={(e) => updateUnitRow(idx, 'unitId', e.target.value)}
                              className={`w-full p-2 border rounded text-sm ${errors[`unit_${idx}_id`] ? 'border-red-500' : 'border-gray-300'}`}
                           >
                             <option value="">Select Unit...</option>
                             {globalUnits
                               .filter(u => u.id.toString() !== formData.materialUnitId.toString()) // Exclude base unit
                               .map(u => (
                                 <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                             ))}
                           </select>
                         </td>
                         <td className="p-2">
                           <input
                             type="number"
                             placeholder="e.g. 12"
                             value={unit.factor}
                             onChange={(e) => updateUnitRow(idx, 'factor', e.target.value)}
                             className={`w-full p-2 border rounded text-sm ${errors[`unit_${idx}_factor`] ? 'border-red-500' : 'border-gray-300'}`}
                           />
                         </td>
                         <td className="p-2">
                           <input
                             type="number"
                             placeholder="0.00"
                             value={unit.price}
                             onChange={(e) => updateUnitRow(idx, 'price', e.target.value)}
                             className={`w-full p-2 border rounded text-sm ${errors[`unit_${idx}_price`] ? 'border-red-500' : 'border-gray-300'}`}
                           />
                         </td>
                         <td className="p-2 text-center">
                           <button type="button" onClick={() => removeUnitRow(idx)} className="text-gray-400 hover:text-red-500">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             ) : (
               <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500">
                 No alternate units configured. Product is sold only by <strong>{getBaseUnitSymbol()}</strong>.
               </div>
             )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading} className="px-6">
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isLoading} className="px-8 shadow-sm">
            {material ? 'Update Material' : 'Add Material'}
          </Button>
        </div>
      </form>

      {/* --- REUSABLE UNIT MODAL --- */}
      <UnitFormModal 
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        onSuccess={() => {
            // Trigger a refetch of the units list so the new unit appears in the dropdown immediately
            queryClient.invalidateQueries(['units']);
        }}
      />
    </>
  );
}