import { useState, useEffect } from 'react';
import Button from '@components/common/Button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

export default function MaterialForm({ material, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    name: material?.name || '',
    quantity: material?.quantity,
    unitCost: material?.unitCost || '',
    sellingPrice: material?.sellingPrice || '',
    lowStockThreshold: material?.lowStockThreshold || 3,
  });

  // State to handle the image file and its visual preview
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(material?.imageUrl || null);
  const [errors, setErrors] = useState({});

  // Cleanup object URLs to avoid memory leaks
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

  // Handle File Selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB Limit Check
        setErrors(prev => ({ ...prev, image: 'File size must be less than 5MB' }));
        return;
      }
      
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file)); // Create local preview
      setErrors(prev => ({ ...prev, image: null }));
    }
  };

  // Remove Image
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    // If we are editing and user removes the existing image, we might need a flag 
    // to tell the backend to delete it (depending on your logic). 
    // For now, we just clear the UI.
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Material name is required';
    if (formData.unitCost <= 0) newErrors.unitCost = 'Unit cost must be greater than 0';
    if (formData.sellingPrice <= 0) newErrors.sellingPrice = 'Selling price must be greater than 0';
    if (parseFloat(formData.sellingPrice) <= parseFloat(formData.unitCost)) {
      newErrors.sellingPrice = 'Selling price should be greater than unit cost';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Pass both the form data AND the file object to the parent
      onSubmit({
        ...formData,
        imageFile: selectedFile, // The actual file object for uploading
        // If imagePreview is null, it means image was removed or never set
        hasImage: !!imagePreview 
      });
    }
  };

  const profit = formData.sellingPrice - formData.unitCost;
  const margin = profit > 0 ? (profit / formData.unitCost) * 100 : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* --- Image Upload Section --- */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-900 mb-3">Product Image</label>
        
        {imagePreview ? (
          // Preview State
          <div className="relative w-40 h-40 group">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="w-full h-full object-cover rounded-lg border border-gray-300 shadow-sm"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-white text-gray-500 hover:text-red-600 rounded-full p-1.5 shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              title="Remove Image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          // Upload State
          <div className="flex justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 hover:bg-gray-100 transition-colors">
            <div className="text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
              <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                >
                  <span>Upload a file</span>
                  <input 
                    id="file-upload" 
                    name="file-upload" 
                    type="file" 
                    className="sr-only" 
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageChange}
                    disabled={isLoading}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs leading-5 text-gray-500">PNG, JPG, WEBP up to 5MB</p>
            </div>
          </div>
        )}
        {errors.image && (
          <p className="text-sm text-red-600 mt-2">{errors.image}</p>
        )}
      </div>

      {/* --- Material Details Section --- */}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Material Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Engine Oil 5W-30"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          {errors.name && <p className="text-sm text-red-600 mt-2">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {material ? 'Current Quantity' : 'Initial Quantity'}
            </label>
            <input
              type="number"
              step="any"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Low Stock Threshold</label>
            <input
              type="number"
              step="any"
              name="lowStockThreshold"
              value={formData.lowStockThreshold}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.lowStockThreshold ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Unit Cost (GH₵)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500 pointer-events-none">GH₵&nbsp;</span>
              <input
                type="number"
                name="unitCost"
                value={formData.unitCost}
                onChange={handleChange}
                step="0.01"
                min="0"
                className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.unitCost ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Selling Price (GH₵)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500 pointer-events-none">GH₵&nbsp;</span>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                step="0.01"
                min="0"
                className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.sellingPrice ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
            </div>
            {errors.sellingPrice && <p className="text-sm text-red-600 mt-2">{errors.sellingPrice}</p>}
          </div>
        </div>

        {formData.unitCost > 0 && formData.sellingPrice > 0 && (
          <div className={`rounded-lg p-4 ${
            margin > 30 ? 'bg-green-50 border border-green-200' :
            margin > 15 ? 'bg-amber-50 border border-amber-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Profit Margin</p>
                <p className={`text-lg font-bold ${
                  margin > 30 ? 'text-green-700' : margin > 15 ? 'text-amber-700' : 'text-red-700'
                }`}>
                  {margin.toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Profit per unit</p>
                <p className="text-lg font-bold text-gray-900">GH₵ {profit.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

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
          {material ? 'Update Material' : 'Add Material'}
        </Button>
      </div>
    </form>
  );
}