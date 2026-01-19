import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { materialsApi } from "@api/materials";
import { useAuthStore } from "@stores/authStore";
import Card from "@components/common/Card";
import Button from "@components/common/Button";
import Table from "@components/common/Table";
import Modal from "@components/common/Modal";
import LoadingSpinner from "@components/common/LoadingSpinner";
import EmptyState from "@components/common/EmptyState";
import MaterialForm from "@components/features/materials/MaterialForm";
import ReorderModal from "@components/features/materials/ReorderModal";

export default function Materials() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  // Fetch materials
  const { data, isLoading, error } = useQuery({
    queryKey: ["materials", { status: statusFilter, lowStock: showLowStock }],
    queryFn: () =>
      materialsApi.getMaterials({
        status: statusFilter === "all" ? undefined : statusFilter,
        lowStock: showLowStock ? "true" : undefined,
      }),
  });

  const materials = data?.data || [];

  // Filter by search term
  const filteredMaterials = materials.filter((material) =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate inventory stats
  const inventoryStats = {
    totalItems: materials.length,
    lowStockItems: materials.filter(m => m.quantity <= m.lowStockThreshold).length,
    totalValue: materials.reduce((sum, m) => sum + (m.quantity * m.unitCost), 0),
    activeItems: materials.filter(m => m.isActive).length,
  };

  // Create material mutation
  const createMutation = useMutation({
    mutationFn: materialsApi.createMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries(["materials"]);
      setShowAddModal(false);
      alert("Material added successfully!");
    },
    onError: (error) => {
      alert(error.message || "Failed to add material");
    },
  });

  // Update material mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => materialsApi.updateMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["materials"]);
      setShowEditModal(false);
      setSelectedMaterial(null);
      alert("Material updated successfully!");
    },
    onError: (error) => {
      alert(error.message || "Failed to update material");
    },
  });

  // Delete material mutation
  const deleteMutation = useMutation({
    mutationFn: materialsApi.deleteMaterial,
    onSuccess: (response) => {
      queryClient.invalidateQueries(["materials"]);
      alert(response.message || "Material deleted successfully!");
    },
    onError: (error) => {
      alert(error.message || "Failed to delete material");
    },
  });

  // Reorder material mutation
  const reorderMutation = useMutation({
    mutationFn: ({ id, data }) => materialsApi.reorderMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["materials"]);
      setShowReorderModal(false);
      setSelectedMaterial(null);
      alert("Material reordered successfully!");
    },
    onError: (error) => {
      alert(error.message || "Failed to reorder material");
    },
  });

  const handleAdd = (formData) => {
    createMutation.mutate(formData);
  };

  const handleEdit = (formData) => {
    updateMutation.mutate({
      id: selectedMaterial.id,
      data: formData,
    });
  };

  const handleDelete = (material) => {
    if (window.confirm(`Are you sure you want to delete "${material.name}"?`)) {
      deleteMutation.mutate(material.id);
    }
  };

  const handleReorder = (formData) => {
    reorderMutation.mutate({
      id: selectedMaterial.id,
      data: formData,
    });
  };

  const openEditModal = (material) => {
    setSelectedMaterial(material);
    setShowEditModal(true);
  };

  const openReorderModal = (material) => {
    setSelectedMaterial(material);
    setShowReorderModal(true);
  };

  // Table columns
  const columns = [
    {
      header: "Material",
      accessor: "name",
      render: (row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            {row.quantity <= row.lowStockThreshold && (
              <p className="text-xs text-red-600 font-medium mt-0.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Low Stock
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Stock",
      accessor: "quantity",
      render: (row) => {
        const isLow = row.quantity <= row.lowStockThreshold;
        return (
          <div className="flex items-center">
            <div className="flex-1 mr-3">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ 
                    width: `${Math.min((row.quantity / (row.lowStockThreshold * 3)) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
            <span className={`text-sm font-medium ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
              {row.quantity}
            </span>
          </div>
        );
      },
    },
    {
      header: "Cost",
      accessor: "unitCost",
      render: (row) => (
        <span className="text-sm text-gray-700">
          GH₵{Number(row.unitCost).toFixed(2)}
        </span>
      ),
    },
    {
      header: "Price",
      accessor: "sellingPrice",
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">
          GH₵{Number(row.sellingPrice).toFixed(2)}
        </span>
      ),
    },
    {
      header: "Margin",
      accessor: "margin",
      render: (row) => {
        const margin = ((row.sellingPrice - row.unitCost) / row.unitCost) * 100;
        return (
          <span className={`text-sm font-medium ${margin > 20 ? 'text-green-600' : margin > 10 ? 'text-amber-600' : 'text-red-600'}`}>
            {margin.toFixed(1)}%
          </span>
        );
      },
    },
    {
      header: "Status",
      accessor: "isActive",
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          row.isActive 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "",
      accessor: "actions",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {hasPermission("materials", "reorder") && row.quantity <= row.lowStockThreshold && (
            <button
              onClick={() => openReorderModal(row)}
              className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Reorder
            </button>
          )}
          
          {hasPermission("materials", "edit") && (
            <button
              onClick={() => openEditModal(row)}
              className="text-gray-600 hover:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {hasPermission("materials", "delete") && (
            <button
              onClick={() => handleDelete(row)}
              className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-4 rounded-xl">
          <p className="font-medium">Error loading materials</p>
          <p className="text-sm mt-1 opacity-90">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Materials</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your inventory and stock levels</p>
            </div>
            {hasPermission("materials", "create") && (
              <Button
                variant="primary"
                onClick={() => setShowAddModal(true)}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
                className="shadow-sm hover:shadow transition-shadow"
              >
                Add Material
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - will be blurred when modal is open */}
      <div className={`p-6 transition-all duration-300 ${
        showAddModal || showEditModal || showReorderModal ? 'blur-sm saturate-50' : ''
      }`}>
        {/* Inventory Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-lg mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">{inventoryStats.totalItems}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center">
              <div className="p-3 bg-red-50 rounded-lg mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">{inventoryStats.lowStockItems}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-lg mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">
                  GH₵{inventoryStats.totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center">
              <div className="p-3 bg-amber-50 rounded-lg mr-4">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Items</p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">{inventoryStats.activeItems}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters & Content */}
        <Card className="mb-6">
          <div className="p-5">
            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-full"
                  />
                  <svg className="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                {/* Low Stock Toggle */}
                <button
                  onClick={() => setShowLowStock(!showLowStock)}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                    showLowStock
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Low Stock
                </button>
              </div>
            </div>

            {/* Materials Table */}
            {isLoading ? (
              <div className="py-16">
                <LoadingSpinner size="lg" text="Loading materials..." />
              </div>
            ) : filteredMaterials.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                }
                title="No materials found"
                description={
                  searchTerm
                    ? "Try adjusting your search"
                    : "Get started by adding your first material"
                }
                action={
                  hasPermission("materials", "create")
                    ? () => setShowAddModal(true)
                    : null
                }
                actionText="Add Material"
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <Table columns={columns} data={filteredMaterials} />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Add Material Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Material"
        size="md"
      >
        <div className="p-1">
          <MaterialForm
            onSubmit={handleAdd}
            onCancel={() => setShowAddModal(false)}
            isLoading={createMutation.isPending}
          />
        </div>
      </Modal>

      {/* Edit Material Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedMaterial(null);
        }}
        title="Edit Material"
        size="md"
      >
        <div className="p-1">
          <MaterialForm
            material={selectedMaterial}
            onSubmit={handleEdit}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedMaterial(null);
            }}
            isLoading={updateMutation.isPending}
          />
        </div>
      </Modal>

      {/* Reorder Modal */}
      <Modal
        isOpen={showReorderModal}
        onClose={() => {
          setShowReorderModal(false);
          setSelectedMaterial(null);
        }}
        title={`Reorder: ${selectedMaterial?.name}`}
        size="sm"
      >
        <div className="p-1">
          <ReorderModal
            material={selectedMaterial}
            onReorder={handleReorder}
            onClose={() => {
              setShowReorderModal(false);
              setSelectedMaterial(null);
            }}
            isLoading={reorderMutation.isPending}
          />
        </div>
      </Modal>
    </div>
  );
}