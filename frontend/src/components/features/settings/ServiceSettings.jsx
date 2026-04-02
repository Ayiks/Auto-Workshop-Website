import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@api/settings';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';
import LoadingSpinner from '@components/common/LoadingSpinner';

export default function ServiceSettings() {
  const queryClient = useQueryClient();
  
  // Fetch all booth services
  const { 
    data: servicesResponse, 
    isLoading, 
    error: queryError,
    refetch 
  } = useQuery({
    queryKey: ['booth-services'],
    queryFn: settingsApi.getBoothServices,
  });

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
      alert(error.response?.data?.message || error.message || 'Failed to delete booth service');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: settingsApi.toggleBoothService,
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-services']);
    },
    onError: (error) => {
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

  if (isLoading) return <div className="p-8 text-center"><LoadingSpinner /></div>;

  if (queryError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-4 rounded-xl text-center">
          <p className="font-medium">Error loading services</p>
          <p className="text-sm mt-1">{queryError.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4 border-red-200 text-red-700 hover:bg-red-50">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Card */}
      <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 bg-gray-50/50">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Service Pricing</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage booth service pricing and categories</p>
          </div>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} className="bg-gray-900 text-white hover:bg-black whitespace-nowrap">
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Service
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 bg-white">
           <div className="p-2.5 sm:p-4 text-center">
              <span className="block text-lg sm:text-2xl font-bold text-gray-900">{services.length}</span>
              <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-semibold">Total</span>
           </div>
           <div className="p-2.5 sm:p-4 text-center">
              <span className="block text-lg sm:text-2xl font-bold text-gray-900">{services.filter(s => s.isActive).length}</span>
              <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-semibold">Active</span>
           </div>
           <div className="p-2.5 sm:p-4 text-center">
              <span className="block text-lg sm:text-2xl font-bold text-gray-400">{services.filter(s => !s.isActive).length}</span>
              <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-semibold">Inactive</span>
           </div>
           <div className="p-2.5 sm:p-4 text-center">
              <span className="block text-lg sm:text-2xl font-bold text-gray-900">GH₵{services.reduce((sum, s) => sum + parseFloat(s.price), 0).toFixed(0)}</span>
              <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-semibold">Value</span>
           </div>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-8 sm:py-12 md:py-16 px-4">
            <div className="inline-flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-gray-100 mb-3 sm:mb-4">
                <svg className="w-5 sm:w-6 h-5 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-900">No services found</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-4">Get started by adding your first service price.</p>
            <Button variant="outline" size="sm" onClick={handleOpenCreate}>Create Service</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">{service.name}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-500">{service.category}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-gray-900 font-mono">GH₵{parseFloat(service.price).toFixed(2)}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border ${
                        service.isActive 
                          ? 'bg-green-50 text-green-700 border-green-100' 
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                      <div className="flex justify-end gap-1 sm:gap-2 transition-opacity">
                        <button 
                            onClick={() => handleToggle(service.id)} 
                            className={`p-1 sm:p-1.5 rounded hover:bg-gray-100 transition-colors ${
                              service.isActive ? 'text-gray-400 hover:text-gray-600' : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={service.isActive ? "Deactivate" : "Activate"}
                        >
                            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <button 
                            onClick={() => handleOpenEdit(service)} 
                            className="p-1 sm:p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                        >
                            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button 
                            onClick={() => handleDelete(service.id)} 
                            className="p-1 sm:p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                        >
                            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingService ? 'Edit Service' : 'Add Service'}
        size="md"
      >
        <div className="space-y-3 sm:space-y-4 p-1">
          <div>
            <label className="block text-xs sm:text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Service Name</label>
            <input
                type="text"
                placeholder="e.g., Full Body Wash"
                value={formData.serviceCategory}
                onChange={(e) => setFormData({ ...formData, serviceCategory: e.target.value })}
                className="block w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm shadow-sm focus:border-gray-900 focus:ring-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Item Category</label>
            <input
                type="text"
                placeholder="e.g., SUV / 4x4"
                value={formData.itemCategory}
                onChange={(e) => setFormData({ ...formData, itemCategory: e.target.value })}
                className="block w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm shadow-sm focus:border-gray-900 focus:ring-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Price</label>
            <div className="relative">
                <span className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs sm:text-sm">GH₵</span>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="block w-full pl-8 sm:pl-10 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm shadow-sm focus:border-gray-900 focus:ring-gray-900"
                />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-2 sm:p-3">
              <p className="text-xs sm:text-xs text-red-600 font-medium">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-1.5 sm:gap-2 pt-3 sm:pt-4 border-t border-gray-100 mt-3 sm:mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={createMutation.isPending || updateMutation.isPending}
              className="bg-gray-900 text-white hover:bg-black"
            >
              {editingService ? 'Save Changes' : 'Create Service'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}