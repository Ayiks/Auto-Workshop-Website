// src/components/features/settings/ServiceSettings.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@api/settings';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import Modal from '@components/common/Modal';

export default function ServiceSettings() {
  const queryClient = useQueryClient();
  
  // Fetch all booth services with debugging
  const { 
    data: servicesResponse, 
    isLoading, 
    error: queryError,
    refetch 
  } = useQuery({
    queryKey: ['booth-services'],
    queryFn: async () => {
      try {
        console.log('Fetching booth services...');
        const response = await settingsApi.getBoothServices();
        console.log('API Response:', response);
        return response;
      } catch (err) {
        console.error('Error fetching booth services:', err);
        throw err;
      }
    },
  });

  console.log('servicesResponse:', servicesResponse);
  console.log('isLoading:', isLoading);
  console.log('queryError:', queryError);

  const services = servicesResponse?.data || [];

  // State for modal and form
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    serviceCategory: '',
    itemCategory: '',
    price: '',
  });
  const [error, setError] = useState('');

  // Mutations
  const createMutation = useMutation({
    mutationFn: settingsApi.createBoothService,
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-services']);
      resetForm();
      setShowModal(false);
      alert('Booth service created successfully!');
    },
    onError: (error) => {
      console.error('Create error:', error);
      alert(error.response?.data?.message || error.message || 'Failed to create booth service');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => settingsApi.updateBoothService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-services']);
      resetForm();
      setShowModal(false);
      alert('Booth service updated successfully!');
    },
    onError: (error) => {
      console.error('Update error:', error);
      alert(error.response?.data?.message || error.message || 'Failed to update booth service');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: settingsApi.deleteBoothService,
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-services']);
      alert('Booth service deleted successfully!');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      alert(error.response?.data?.message || error.message || 'Failed to delete booth service');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: settingsApi.toggleBoothService,
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-services']);
      alert('Booth service status updated successfully!');
    },
    onError: (error) => {
      console.error('Toggle error:', error);
      alert(error.response?.data?.message || error.message || 'Failed to update booth service status');
    },
  });

  const resetForm = () => {
    setFormData({
      serviceCategory: '',
      itemCategory: '',
      price: '',
    });
    setEditingService(null);
    setError('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (service) => {
    setEditingService(service);
    setFormData({
      serviceCategory: service.name,
      itemCategory: service.category,
      price: service.price.toString(),
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const { serviceCategory, itemCategory, price } = formData;

    if (!serviceCategory || !itemCategory || !price) {
      setError('Please fill in all fields');
      return;
    }

    const priceValue = parseFloat(price);
    if (priceValue <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    setError('');

    if (editingService) {
      updateMutation.mutate({
        id: editingService.id,
        data: {
          serviceCategory,
          itemCategory,
          price: priceValue,
        },
      });
    } else {
      createMutation.mutate({
        serviceCategory,
        itemCategory,
        price: priceValue,
      });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this booth service?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggle = (id) => {
    toggleMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">Loading service settings...</div>
      </Card>
    );
  }

  if (queryError) {
    return (
      <Card>
        <div className="text-center py-8 text-red-600">
          <p>Error loading services: {queryError.message}</p>
          <Button variant="primary" onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  console.log('Services data:', services);
  console.log('Services length:', services.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Booth Service Pricing</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage booth service pricing for different categories
            </p>
          </div>
          <Button variant="primary" onClick={handleOpenCreate}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Service
          </Button>
        </div>
      </Card>

      {/* Services Table */}
      <Card>
        {services.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No booth services yet</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first booth service.</p>
            <Button variant="primary" onClick={handleOpenCreate}>
              Create Booth Service
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {service.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      GH₵{parseFloat(service.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          service.isActive
                            ? 'bg-success-100 text-success-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(service.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {service.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(service)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Service Statistics */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{services.length}</div>
            <div className="text-gray-600">Total Services</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-success-600">
              {services.filter(s => s.isActive).length}
            </div>
            <div className="text-gray-600">Active Services</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {services.filter(s => !s.isActive).length}
            </div>
            <div className="text-gray-600">Inactive Services</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-primary-600">
              GH₵{services.reduce((sum, s) => sum + parseFloat(s.price), 0).toFixed(2)}
            </div>
            <div className="text-gray-600">Total Value</div>
          </div>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingService ? 'Edit Booth Service' : 'Add New Booth Service'}
      >
        <div className="space-y-4">
          <Input
            label="Service Category"
            placeholder="e.g., Full Body, Touch Up, Detailing"
            value={formData.serviceCategory}
            onChange={(e) =>
              setFormData({ ...formData, serviceCategory: e.target.value })
            }
            required
          />
          
          <Input
            label="Item Category"
            placeholder="e.g., 4x4, Saloon, Fridge, TV"
            value={formData.itemCategory}
            onChange={(e) =>
              setFormData({ ...formData, itemCategory: e.target.value })
            }
            required
          />
          
          <Input
            label="Price (GH₵)"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 200.00"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={createMutation.isPending || updateMutation.isPending}
          >
            {editingService ? 'Update Service' : 'Create Service'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}