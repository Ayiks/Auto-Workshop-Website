import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@api/customers';
import { useAuthStore } from '@stores/authStore';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';
import CustomerForm from './CustomerForm';
import LoadingSpinner from '@components/common/LoadingSpinner';

export default function CustomersManager() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  // Permissions
  const canEdit = ['admin', 'manager'].includes(user?.role);
  const canDelete = user?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // --- Data Fetching ---
  const { data, isLoading } = useQuery({
    queryKey: ['allCustomers'],
    queryFn: () => customersApi.getCustomers(),
    keepPreviousData: true,
  });

   const filteredResults = useMemo(() => {
      const allCustomers = Array.isArray(data) ? data : (data?.data || []);
      
      // If no search text, return the first 50 customers
      if (!searchTerm) return allCustomers;
  
      const lowerSearch = searchTerm.toLowerCase();
  
      return allCustomers.filter(customer => {
        const firstName = (customer.firstName || '').toLowerCase();
        const lastName = (customer.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`;
        const phone = (customer.phone || '').toLowerCase();
  
        // Match against Full Name, First Name, Last Name, or Phone
        return fullName.includes(lowerSearch) || phone.includes(lowerSearch);
      }).slice(0, 50); // Limit to top 50 results for performance
    }, [data, searchTerm]);
  
  const customers = filteredResults || [];

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: customersApi.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      handleCloseModal();
      alert('Customer created successfully');
    },
    onError: (err) => alert(err.response?.data?.error?.message || 'Failed to create customer')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customersApi.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      handleCloseModal();
      alert('Customer updated successfully');
    },
    onError: (err) => alert(err.response?.data?.error?.message || 'Failed to update customer')
  });

  const deleteMutation = useMutation({
    mutationFn: customersApi.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      alert('Customer deleted successfully');
    },
    onError: (err) => alert(err.response?.data?.error?.message || 'Failed to delete customer')
  });

  // --- Handlers ---
  const handleSave = (formData) => {
    if (selectedCustomer) {
      updateMutation.mutate({ id: selectedCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this customer? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setIsFormOpen(false);
    setSelectedCustomer(null);
  };

  if (isLoading) return <div className="p-8 text-center"><LoadingSpinner /></div>;

  return (
    <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
        <div>
          <h2 className="text-base font-bold text-gray-900">Customer Database</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage customer contacts and details</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                    type="text"
                    placeholder="Search customers..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {canEdit && (
                <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => setIsFormOpen(true)}
                    className="bg-gray-900 text-white hover:bg-black flex-shrink-0"
                >
                    <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Customer
                </Button>
            )}
        </div>
      </div>

      {/* Table */}
      {customers.length === 0 ? (
        <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900">No customers found</h3>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search terms or add a new customer.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name / Address</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Info</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                        {canEdit && <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900">{customer.firstName} {customer.lastName}</span>
                                    <span className="text-xs text-gray-500 truncate max-w-[200px]">{customer.address || '-'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center text-sm text-gray-700">
                                        <svg className="w-3 h-3 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        {customer.phone}
                                    </div>
                                    {customer.email && (
                                        <div className="flex items-center text-xs text-gray-500">
                                            <svg className="w-3 h-3 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            {customer.email}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-sm text-gray-500 italic block truncate max-w-[200px]">
                                    {customer.notes || '-'}
                                </span>
                            </td>
                            {canEdit && (
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 transition-opacity">
                                        <button 
                                            onClick={() => handleEdit(customer)} 
                                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                            title="Edit"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        
                                        {canDelete && (
                                            <button 
                                                onClick={() => handleDelete(customer.id)} 
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {/* Modal */}
      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={handleCloseModal}
          title={selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
          size="md"
        >
          <div className="p-1">
            <CustomerForm 
                initialData={selectedCustomer}
                onSubmit={handleSave}
                onCancel={handleCloseModal}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </Modal>
      )}
    </Card>
  );
}