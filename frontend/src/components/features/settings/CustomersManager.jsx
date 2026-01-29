import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@api/customers';
import { useAuthStore } from '@stores/authStore';
import { Search, Plus, Phone, Mail, Edit2, Trash2 } from 'lucide-react';

import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Table from '@components/common/Table';
import Modal from '@components/common/Modal'; // Assuming you have a Modal component
import CustomerForm from './CustomerForm';

export default function CustomersManager() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  // Permissions: Managers/Admins can edit/create. Only Admins can delete.
  const canEdit = ['admin', 'manager'].includes(user?.role);
  const canDelete = user?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // --- Data Fetching ---
  const { data, isLoading } = useQuery({
    queryKey: ['customers', searchTerm],
    queryFn: () => customersApi.getCustomers({ search: searchTerm }),
    keepPreviousData: true,
  });

const customers = Array.isArray(data) 
    ? data 
    : (data?.data || []);
  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: customersApi.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      handleCloseModal();
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Failed to create customer');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customersApi.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      handleCloseModal();
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Failed to update customer');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: customersApi.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Failed to delete customer');
    }
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

  // --- Table Columns ---
  const columns = [
    {
      header: 'Name',
      accessor: 'firstName',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.firstName} {row.lastName}</p>
          <p className="text-xs text-gray-500 truncate max-w-[200px]">{row.address}</p>
        </div>
      )
    },
    {
      header: 'Contact',
      accessor: 'phone',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center text-sm text-gray-700">
            <Phone className="w-3 h-3 mr-2 text-gray-400" />
            {row.phone}
          </div>
          {row.email && (
             <div className="flex items-center text-sm text-gray-500">
             <Mail className="w-3 h-3 mr-2 text-gray-400" />
             {row.email}
           </div>
          )}
        </div>
      )
    },
    {
      header: 'Notes',
      accessor: 'notes',
      render: (row) => (
        <span className="text-sm text-gray-500 italic block truncate max-w-[200px]">
          {row.notes || '-'}
        </span>
      )
    },
    // Only show Actions column if user has permission
    ...(canEdit ? [{
      header: '',
      accessor: 'id',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => handleEdit(row)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          
          {canDelete && (
            <button 
              onClick={() => handleDelete(row.id)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }] : [])
  ];

  return (
    <Card>
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {canEdit && (
            <Button 
              variant="primary" 
              onClick={() => setIsFormOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Customer
            </Button>
          )}
        </div>

        {/* Table */}
        <Table 
          columns={columns} 
          data={customers} 
          isLoading={isLoading}
          emptyMessage="No customers found. Try adjusting your search."
        />

        {/* Modal */}
        {isFormOpen && (
          <Modal
            isOpen={isFormOpen}
            onClose={handleCloseModal}
            title={selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
          >
            <CustomerForm 
              initialData={selectedCustomer}
              onSubmit={handleSave}
              onCancel={handleCloseModal}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </Modal>
        )}
      </div>
    </Card>
  );
} 