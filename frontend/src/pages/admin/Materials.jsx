import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    costPrice: '',
    sellingPrice: '',
    quantity: '',
    lowStockLevel: '10',
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await api.get('/materials');
      setMaterials(response.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (material = null) => {
    if (material) {
      setEditingMaterial(material);
      setFormData({
        name: material.name,
        costPrice: material.costPrice,
        sellingPrice: material.sellingPrice,
        quantity: material.quantity,
        lowStockLevel: material.lowStockLevel,
      });
    } else {
      setEditingMaterial(null);
      setFormData({
        name: '',
        costPrice: '',
        sellingPrice: '',
        quantity: '',
        lowStockLevel: '10',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMaterial(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingMaterial) {
        // Update existing material
        await api.put(`/materials/${editingMaterial.id}`, formData);
      } else {
        // Create new material
        await api.post('/materials', formData);
      }
      
      fetchMaterials();
      handleCloseModal();
    } catch (error) {
      alert(error.error?.message || 'Failed to save material');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    
    try {
      await api.delete(`/materials/${id}`);
      fetchMaterials();
    } catch (error) {
      alert(error.error?.message || 'Failed to delete material');
    }
  };

  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Materials Management</h1>
            <p className="text-gray-600 mt-1">Manage your inventory and pricing</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary btn-touch"
          >
            ➕ Add Material
          </button>
        </div>

        {/* Search */}
        <div className="card">
          <input
            type="text"
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
          />
        </div>

        {/* Materials Table */}
        <div className="card">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading materials...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No materials found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cost Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Selling Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMaterials.map((material) => (
                    <tr key={material.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {material.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        GH₵ {parseFloat(material.costPrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        GH₵ {parseFloat(material.sellingPrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {material.quantity}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {material.quantity <= material.lowStockLevel ? (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button
                          onClick={() => handleOpenModal(material)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingMaterial ? 'Edit Material' : 'Add New Material'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Price (GH₵)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price (GH₵)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    name="lowStockLevel"
                    value={formData.lowStockLevel}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 btn-primary">
                  {editingMaterial ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}