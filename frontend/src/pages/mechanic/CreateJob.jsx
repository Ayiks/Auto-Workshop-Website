import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';

export default function CreateJob() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inventoryMaterials, setInventoryMaterials] = useState([]);
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    carMake: '',
    carModel: '',
    carRegNumber: '',
    problemDescription: '',
  });
  const [materials, setMaterials] = useState([]);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialType, setMaterialType] = useState('inventory'); // 'inventory' or 'manual'
  const [newMaterial, setNewMaterial] = useState({
    materialId: '',
    materialName: '',
    quantity: '',
    unitPrice: '',
    costPrice: '',
  });

  useEffect(() => {
    fetchInventoryMaterials();
  }, []);

  const fetchInventoryMaterials = async () => {
    try {
      const response = await api.get('/materials');
      setInventoryMaterials(response.materials.filter(m => m.isActive));
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMaterialChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'materialId' && value) {
      const selected = inventoryMaterials.find(m => m.id === parseInt(value));
      if (selected) {
        setNewMaterial({
          materialId: selected.id,
          materialName: selected.name,
          quantity: newMaterial.quantity || '',
          unitPrice: selected.sellingPrice,
          costPrice: selected.costPrice,
        });
      }
    } else {
      setNewMaterial({ ...newMaterial, [name]: value });
    }
  };

  const openMaterialModal = (type) => {
    setMaterialType(type);
    setNewMaterial({
      materialId: '',
      materialName: '',
      quantity: '',
      unitPrice: '',
      costPrice: '',
    });
    setShowMaterialModal(true);
  };

  const addMaterial = () => {
    if (!newMaterial.quantity || parseInt(newMaterial.quantity) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (materialType === 'inventory') {
      if (!newMaterial.materialId) {
        alert('Please select a material from inventory');
        return;
      }
    } else {
      if (!newMaterial.materialName || !newMaterial.unitPrice) {
        alert('Please enter material name and unit price');
        return;
      }
    }

    const materialToAdd = {
      ...newMaterial,
      quantity: parseInt(newMaterial.quantity),
      unitPrice: parseFloat(newMaterial.unitPrice),
      costPrice: parseFloat(newMaterial.costPrice || newMaterial.unitPrice * 0.7),
      type: materialType,
    };

    setMaterials([...materials, materialToAdd]);
    setShowMaterialModal(false);
  };

  const removeMaterial = (index) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const calculateMaterialsCost = () => {
    return materials.reduce((sum, m) => sum + (m.unitPrice * m.quantity), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.clientName || !formData.problemDescription) {
      alert('Client name and problem description are required');
      return;
    }

    try {
      setLoading(true);
      
      const jobData = {
        ...formData,
        materials: materials.length > 0 ? materials.map(m => ({
          materialId: m.materialId || null,
          materialName: m.materialName,
          quantity: m.quantity,
          unitPrice: m.unitPrice,
          costPrice: m.costPrice,
        })) : undefined,
      };

      const response = await api.post('/jobs', jobData);
      
      alert('Job created successfully!');
      navigate(`/jobs/${response.job.id}`);
    } catch (error) {
      alert(error.error?.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Job</h1>
          <p className="text-gray-600 mt-1">Record a new vehicle repair job</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Information */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Client Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleChange}
                  className="input"
                  placeholder="+233..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="clientEmail"
                  value={formData.clientEmail}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Vehicle Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Make
                </label>
                <input
                  type="text"
                  name="carMake"
                  value={formData.carMake}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., Toyota"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  name="carModel"
                  value={formData.carModel}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., Corolla"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  name="carRegNumber"
                  value={formData.carRegNumber}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., GR 1234-20"
                />
              </div>
            </div>
          </div>

          {/* Problem Description */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Problem Description *</h2>
            <textarea
              name="problemDescription"
              value={formData.problemDescription}
              onChange={handleChange}
              className="input"
              rows="4"
              placeholder="Describe the problem or service needed..."
              required
            ></textarea>
          </div>

          {/* Materials/Parts Needed */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Materials/Parts Needed</h2>
            
            {/* Add Material Buttons */}
            <div className="flex space-x-3 mb-4">
              <button
                type="button"
                onClick={() => openMaterialModal('inventory')}
                className="btn-primary flex-1"
              >
                ➕ From Inventory
              </button>
              <button
                type="button"
                onClick={() => openMaterialModal('manual')}
                className="btn-secondary flex-1"
              >
                ➕ Manual Entry
              </button>
            </div>

            {/* Materials List */}
            {materials.length > 0 ? (
              <div className="space-y-2">
                {materials.map((material, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{material.materialName}</p>
                        {material.type === 'inventory' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Inventory</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Qty: {material.quantity} • Price: GH₵ {material.unitPrice.toFixed(2)} • 
                        Subtotal: GH₵ {(material.quantity * material.unitPrice).toFixed(2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMaterial(index)}
                      className="text-red-600 hover:text-red-800 ml-4"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="border-t-2 pt-3 mt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Materials Cost:</span>
                    <span className="text-primary-600">GH₵ {calculateMaterialsCost().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No materials added yet. Click the buttons above to add materials.
              </p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary btn-touch"
            >
              {loading ? 'Creating...' : '✓ Create Job'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/jobs')}
              className="flex-1 btn-secondary btn-touch"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Material Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {materialType === 'inventory' ? 'Add from Inventory' : 'Manual Entry'}
            </h2>
            
            <div className="space-y-4">
              {materialType === 'inventory' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Material *
                    </label>
                    <select
                      name="materialId"
                      value={newMaterial.materialId}
                      onChange={handleMaterialChange}
                      className="input"
                      required
                    >
                      <option value="">-- Select Material --</option>
                      {inventoryMaterials.map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} (Stock: {mat.quantity}) - GH₵ {parseFloat(mat.sellingPrice).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {newMaterial.materialId && (
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm"><strong>Unit Price:</strong> GH₵ {parseFloat(newMaterial.unitPrice).toFixed(2)}</p>
                      <p className="text-sm"><strong>Cost Price:</strong> GH₵ {parseFloat(newMaterial.costPrice).toFixed(2)}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material Name *
                    </label>
                    <input
                      type="text"
                      name="materialName"
                      value={newMaterial.materialName}
                      onChange={handleMaterialChange}
                      className="input"
                      placeholder="Enter material name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price (GH₵) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="unitPrice"
                        value={newMaterial.unitPrice}
                        onChange={handleMaterialChange}
                        className="input"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cost Price (GH₵)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="costPrice"
                        value={newMaterial.costPrice}
                        onChange={handleMaterialChange}
                        className="input"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={newMaterial.quantity}
                  onChange={handleMaterialChange}
                  className="input"
                  min="1"
                  required
                />
              </div>

              {newMaterial.quantity && newMaterial.unitPrice && (
                <div className="bg-green-50 p-3 rounded">
                  <p className="font-medium">
                    Subtotal: GH₵ {(newMaterial.quantity * newMaterial.unitPrice).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={addMaterial}
                  className="flex-1 btn-primary"
                >
                  Add Material
                </button>
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}