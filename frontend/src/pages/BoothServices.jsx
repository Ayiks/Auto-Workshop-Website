// src/pages/BoothServices.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boothServicesApi } from '@api/boothService';
import { useAuthStore } from '@stores/authStore';
import Button from '@components/common/Button';
import Card, { StatCard } from '@components/common/Card';
import Table from '@components/common/Table';
import Modal from '@components/common/Modal';
import LoadingSpinner from '@components/common/LoadingSpinner';
import EmptyState from '@components/common/EmptyState';
import BoothServiceForm from '@components/features/boothServices/BoothServiceForm';

export default function BoothServices() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const canManage = hasPermission('services', 'create') || hasPermission('services', 'edit');

  // Fetch services
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['booth-services', { isActive: statusFilter !== 'all' ? statusFilter === 'active' : undefined }],
    queryFn: () => boothServicesApi.getBoothServices({
      isActive: statusFilter !== 'all' ? statusFilter === 'active' : undefined,
    }),
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['booth-service-stats'],
    queryFn: () => boothServicesApi.getBoothServiceStats(),
  });

  const services = servicesData?.data || [];
  const stats = statsData?.data || {};

  // Create mutation
  const createMutation = useMutation({
    mutationFn: boothServicesApi.createBoothService,
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-services']);
      queryClient.invalidateQueries(['booth-service-stats']);
      setShowCreateModal(false);
      alert('Booth service created successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to create booth service');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => boothServicesApi.updateBoothService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-services']);
      setShowEditModal(false);
      setSelectedService(null);
      alert('Booth service updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update booth service');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: boothServicesApi.deleteBoothService,
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-services']);
      queryClient.invalidateQueries(['booth-service-stats']);
      alert('Booth service deleted successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to delete booth service');
    },
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: boothServicesApi.toggleBoothService,
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-services']);
      queryClient.invalidateQueries(['booth-service-stats']);
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to toggle booth service');
    },
  });

  // Filter services by search
  const filteredServices = services.filter((service) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      service.name.toLowerCase().includes(searchLower) ||
      service.category.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (service) => {
    setSelectedService(service);
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this booth service?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggle = (id) => {
    toggleMutation.mutate(id);
  };

  const columns = [
    {
      key: 'name',
      label: 'Service Name',
      render: (service) => (
        <span className="font-medium text-gray-900">{service.name}</span>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (service) => (
        <span className="text-gray-700">{service.category}</span>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      render: (service) => (
        <span className="font-medium text-gray-900">
          GH₵{parseFloat(service.price).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (service) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          service.isActive
            ? 'bg-success-100 text-success-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {service.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (service) => (
        <div className="flex gap-2">
          {canManage && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(service)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant={service.isActive ? 'secondary' : 'success'}
                onClick={() => handleToggle(service.id)}
                loading={toggleMutation.isPending}
              >
                {service.isActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleDelete(service.id)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading booth services..." />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Booth Services</h1>
          <p className="text-gray-600 mt-1">
            Manage booth spray service pricing by vehicle type
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + Add Service
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Services"
          value={stats.totalServices || 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="primary"
        />
        <StatCard
          title="Active Services"
          value={stats.activeServices || 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="success"
        />
        <StatCard
          title="Inactive Services"
          value={stats.inactiveServices || 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
          color="secondary"
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by service name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {/* Services Table */}
      <Card>
        {filteredServices.length === 0 ? (
          <EmptyState
            title="No booth services found"
            description={searchTerm ? "Try adjusting your search" : "Add your first booth service to get started"}
          />
        ) : (
          <Table columns={columns} data={filteredServices} />
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Booth Service"
      >
        <BoothServiceForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowCreateModal(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedService(null);
        }}
        title="Edit Booth Service"
      >
        <BoothServiceForm
          service={selectedService}
          onSubmit={(data) => updateMutation.mutate({ id: selectedService.id, data })}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedService(null);
          }}
          isLoading={updateMutation.isPending}
        />
      </Modal>
    </div>
  );
}