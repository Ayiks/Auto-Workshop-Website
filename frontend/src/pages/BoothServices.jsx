// src/pages/BoothServices.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boothServicesApi } from '@api/boothService';
import { useAuthStore } from '@stores/authStore';
import Button from '@components/common/Button';
import Table from '@components/common/Table';
import Modal from '@components/common/Modal';
import { toast } from 'react-hot-toast';
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

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['booth-services', { isActive: statusFilter !== 'all' ? statusFilter === 'active' : undefined }],
    queryFn: () => boothServicesApi.getBoothServices({
      isActive: statusFilter !== 'all' ? statusFilter === 'active' : undefined,
    }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['booth-service-stats'],
    queryFn: () => boothServicesApi.getBoothServiceStats(),
  });

  const services = servicesData?.data || [];
  const stats = statsData?.data || {};

  const createMutation = useMutation({
    mutationFn: boothServicesApi.createBoothService,
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-services']);
      queryClient.invalidateQueries(['booth-service-stats']);
      setShowCreateModal(false);
      toast.success('Booth service created');
    },
    onError: (error) => toast.error(error.response?.data?.error?.message || 'Failed to create booth service'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => boothServicesApi.updateBoothService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-services']);
      setShowEditModal(false);
      setSelectedService(null);
      toast.success('Booth service updated');
    },
    onError: (error) => toast.error(error.response?.data?.error?.message || 'Failed to update booth service'),
  });

  const deleteMutation = useMutation({
    mutationFn: boothServicesApi.deleteBoothService,
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-services']);
      queryClient.invalidateQueries(['booth-service-stats']);
      toast.success('Booth service deleted');
    },
    onError: (error) => toast.error(error.response?.data?.error?.message || 'Failed to delete booth service'),
  });

  const toggleMutation = useMutation({
    mutationFn: boothServicesApi.toggleBoothService,
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-services']);
      queryClient.invalidateQueries(['booth-service-stats']);
    },
    onError: (error) => toast.error(error.response?.data?.error?.message || 'Failed to update booth service status'),
  });

  const filteredServices = services.filter((service) => {
    const q = searchTerm.toLowerCase();
    return service.name.toLowerCase().includes(q) || service.category.toLowerCase().includes(q);
  });

  const handleEdit = (service) => { setSelectedService(service); setShowEditModal(true); };
  const handleDelete = (id) => {
    if (window.confirm('Delete this booth service?')) deleteMutation.mutate(id);
  };

  const columns = [
    {
      header: 'Service Name',
      accessor: 'name',
      render: (service) => (
        <span className={`font-medium text-sm ${service.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
          {service.name}
        </span>
      ),
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (service) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border bg-gray-50 text-gray-600 border-gray-100 capitalize">
          {service.category}
        </span>
      ),
    },
    {
      header: 'Price',
      accessor: 'price',
      render: (service) => (
        <span className="font-bold text-gray-900 font-mono">
          GH₵{parseFloat(service.price).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (service) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
          service.isActive
            ? 'bg-green-50 text-green-700 border-green-100'
            : 'bg-gray-50 text-gray-500 border-gray-200'
        }`}>
          {service.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: '',
      accessor: 'actions',
      render: (service) => (
        <div className="flex justify-end items-center gap-1">
          {canManage && (
            <>
              <button
                onClick={() => toggleMutation.mutate(service.id)}
                className={`p-1.5 rounded transition-colors ${
                  service.isActive
                    ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                    : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                }`}
                title={service.isActive ? 'Deactivate' : 'Activate'}
              >
                {service.isActive ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
              </button>
              <button
                onClick={() => handleEdit(service)}
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button
                onClick={() => handleDelete(service.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
        <LoadingSpinner size="lg" text="Loading booth services..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Booth Services</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage spray booth service pricing by vehicle type</p>
            </div>
            {canManage && (
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                className="bg-gray-900 hover:bg-black text-white shadow-sm border-transparent text-xs sm:text-sm w-full sm:w-auto"
              >
                Add Service
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              title="Total Services"
              value={stats.totalServices || 0}
              subtitle="All booth services"
              iconPath="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
            <StatCard
              title="Active"
              value={stats.activeServices || 0}
              subtitle="Available for booking"
              iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <StatCard
              title="Inactive"
              value={stats.inactiveServices || 0}
              subtitle="Suspended services"
              iconPath="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </div>
        </div>

        {/* Filter + Table Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 sm:p-5 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 max-w-md w-full">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text"
                    placeholder="Search by service name or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredServices.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={<svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                title={searchTerm ? "No services found" : "No booth services yet"}
                description={searchTerm ? "Try adjusting your search" : "Add your first booth service to get started"}
                action={canManage ? () => setShowCreateModal(true) : null}
                actionText="Add Service"
              />
            </div>
          ) : (
            <>
              <Table columns={columns} data={filteredServices} />
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <span>Showing {filteredServices.length} services</span>
                <span className="font-medium">{stats.activeServices || 0} active</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add Booth Service" size="md">
        <div className="p-1">
          <BoothServiceForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowCreateModal(false)}
            isLoading={createMutation.isPending}
          />
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedService(null); }} title="Edit Booth Service" size="md">
        <div className="p-1">
          <BoothServiceForm
            service={selectedService}
            onSubmit={(data) => updateMutation.mutate({ id: selectedService.id, data })}
            onCancel={() => { setShowEditModal(false); setSelectedService(null); }}
            isLoading={updateMutation.isPending}
          />
        </div>
      </Modal>
    </div>
  );
}

function StatCard({ title, value, subtitle, iconPath }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} /></svg>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
      <div className="text-xs text-gray-400 font-medium mt-1">{subtitle}</div>
    </div>
  );
}
