import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { materialsApi } from "@api/materials";
import { useAuthStore } from "@stores/authStore";

// Component Imports
import Card from "@components/common/Card";
import Button from "@components/common/Button";
import Table from "@components/common/Table";
import Modal from "@components/common/Modal";
import LoadingSpinner from "@components/common/LoadingSpinner";
import EmptyState from "@components/common/EmptyState";
import MaterialForm from "@components/features/materials/MaterialForm";
import ReorderModal from "@components/features/materials/ReorderModal";
import BulkReorderModal from "@components/features/materials/BulkReorderModal";

export default function Materials() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  // --- State Management ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showBulkReorderModal, setShowBulkReorderModal] = useState(false);
  
  // Selection
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // --- Data Fetching ---
  const { data, isLoading, error } = useQuery({
    queryKey: ["materials", { status: statusFilter, lowStock: showLowStock }],
    queryFn: () =>
      materialsApi.getMaterials({
        status: statusFilter === "all" ? undefined : statusFilter,
        lowStock: showLowStock ? "true" : undefined,
      }),
  });

  const materials = data?.data || [];

  // --- Derived State (Filtering & Stats) ---
  
  // Filter materials based on search term
 const filteredMaterials = useMemo(() => {
  return materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isLow = Number(material.quantity) <= Number(material.lowStockThreshold);
    const matchesLowStock = !showLowStock || (isLow && material.isActive);

    return matchesSearch && matchesLowStock;
  });
}, [materials, searchTerm, showLowStock]);

  // Calculate Stats (Based on ALL materials, not just filtered)
 const inventoryStats = useMemo(() => {
  // If materials is null or undefined, return defaults immediately
  if (!materials || materials.length === 0) {
    return {
      totalItems: 0,
      lowStockItems: 0,
      totalCostValue: 0,
      totalRetailValue: 0,
    };
  }

  const activeMaterials = materials.filter(m => m.isActive);

  return {
    totalItems: activeMaterials.length,
    lowStockItems: activeMaterials.filter(m => 
      Number(m.quantity) <= Number(m.lowStockThreshold)
    ).length,
    totalCostValue: activeMaterials.reduce((sum, m) => 
      sum + (Number(m.quantity || 0) * Number(m.unitCost || 0)), 0
    ),
    totalRetailValue: activeMaterials.reduce((sum, m) => 
      sum + (Number(m.quantity || 0) * Number(m.sellingPrice || 0)), 0
    ),
  };
}, [materials]);
  // --- Selection Logic ---
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredMaterials.length && filteredMaterials.length > 0) {
      setSelectedIds([]); // Deselect all
    } else {
      setSelectedIds(filteredMaterials.map(m => m.id)); // Select all VISIBLE
    }
  };

  const toggleSelectMaterial = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id) 
        : [...prev, id]
    );
  };

  // --- Mutations ---

  const createMutation = useMutation({
    mutationFn: materialsApi.createMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries(["materials"]);
      setShowAddModal(false);
    },
    onError: (err) => alert(err.message || "Failed to add material"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => materialsApi.updateMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["materials"]);
      setShowEditModal(false);
      setSelectedMaterial(null);
    },
    onError: (err) => alert(err.message || "Failed to update material"),
  });

  const deleteMutation = useMutation({
    mutationFn: materialsApi.deleteMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries(["materials"]);
      // If deleted item was selected, remove it from selection
      setSelectedIds(prev => prev.filter(id => id !== deleteMutation.variables));
    },
    onError: (err) => alert(err.message || "Failed to delete material"),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ id, data }) => materialsApi.reorderMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["materials"]);
      setShowReorderModal(false);
      setSelectedMaterial(null);
    },
    onError: (err) => alert(err.message || "Failed to reorder material"),
  });

  const bulkReorderMutation = useMutation({
    mutationFn: (data) => materialsApi.bulkReorderMaterials(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["materials"]);
      setShowBulkReorderModal(false);
      setSelectedIds([]); // Clear selection after successful order
      alert("Bulk reorder processed successfully!");
    },
    onError: (err) => alert(err.message || "Failed to process bulk reorder"),
  });

  const toggleStatusMutation = useMutation({
  mutationFn: ({ id, isActive }) => materialsApi.updateMaterial(id, { isActive }),
  onSuccess: () => {
    queryClient.invalidateQueries(["materials"]);
  },
  onError: (err) => alert(err.message || "Failed to update status"),
});

  // --- Handlers ---

  const handleAdd = (formData) => createMutation.mutate(formData);
  
  const handleEdit = (formData) => {
    updateMutation.mutate({ id: selectedMaterial.id, data: formData });
  };

  const handleDelete = (material) => {
    if (window.confirm(`Are you sure you want to delete "${material.name}"?`)) {
      deleteMutation.mutate(material.id);
    }
  };

  const handleReorder = (formData) => {
    reorderMutation.mutate({ id: selectedMaterial.id, data: formData });
  };

  const handleBulkReorderSubmit = (items) => {
    // Structure expected by backend controller
    bulkReorderMutation.mutate({ items });
  };

  const openEditModal = (material) => {
    setSelectedMaterial(material);
    setShowEditModal(true);
  };

  const openReorderModal = (material) => {
    setSelectedMaterial(material);
    setShowReorderModal(true);
  };

  // --- Table Configuration ---
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
          checked={filteredMaterials.length > 0 && selectedIds.length === filteredMaterials.length}
          onChange={toggleSelectAll}
          disabled={filteredMaterials.length === 0}
        />,
        <span>Restock</span>
      ),
      accessor: "select",
      className: "w-10",
      render: (row) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleSelectMaterial(row.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      header: "Material",
      accessor: "name",
      render: (row) => (
        
        <div className="flex items-center">
      <div>
        <p className={`font-medium ${row.isActive ? 'text-gray-900' : 'text-gray-400 italic'}`}>
          {row.name} {!row.isActive && "(Deactivated)"}
        </p>
        
        {/* FIX: Only show "Low Stock" if the material IS ACTIVE */}
        {row.isActive && Number(row.quantity) <= Number(row.lowStockThreshold) && (
          <p className="text-xs text-red-600 font-medium mt-0.5 flex items-center gap-1">
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
        const qty = Number(row.quantity);
    const threshold = Number(row.lowStockThreshold);
    const isLow = qty <= threshold;
    
    // Prevent division by zero and ensure numbers
    const percentage = threshold > 0 
      ? Math.min((qty / (threshold * 3)) * 100, 100)
      : 100;

        return (
      <div className="flex items-center">
        <div className="flex-1 mr-3 w-24">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <span className={`text-sm font-medium ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
          {qty}
        </span>
      </div>
    );
      },
    },
    {
      header: "Cost",
      accessor: "unitCost",
      render: (row) => <span className="text-sm text-gray-700">GH₵{Number(row.unitCost || 0).toFixed(2)}</span>
    },
    {
      header: "Price",
      accessor: "sellingPrice",
      render: (row) => <span className="text-sm font-medium text-gray-900">GH₵{Number(row.sellingPrice || 0).toFixed(2)}</span>
    },
    
    {
      header: "Status",
      accessor: "isActive",
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
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
      {/* 1. REACTIVATE BUTTON (Only shown if inactive) */}
      {!row.isActive && hasPermission("materials", "edit") && (
        <button
          onClick={() => toggleStatusMutation.mutate({ id: row.id, isActive: true })}
          className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-green-50"
          title="Reactivate material"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reactivate
        </button>
      )}

      {/* 2. STANDARD ACTIONS (Only shown if active) */}
      {row.isActive && (
        <>
          {hasPermission("materials", "reorder") && (
            <button
              onClick={() => openReorderModal(row)}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-blue-50"
              title="Add stock"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              Restock
            </button>
          )}
          
          {hasPermission("materials", "edit") && (
            <button
              onClick={() => openEditModal(row)}
              className="text-gray-600 hover:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </>
      )}

      {/* 3. DELETE BUTTON (Available for both, but styled differently) */}
      {hasPermission("materials", "delete") && (
        <button
          onClick={() => handleDelete(row)}
          className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  ),
},,
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
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Materials</h1>
              <p className="text-sm text-gray-500 mt-1">
                {selectedIds.length > 0 
                  ? `${selectedIds.length} item${selectedIds.length !== 1 ? 's' : ''} selected` 
                  : "Manage your inventory and stock levels"}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Conditional Bulk Reorder Button */}
              {selectedIds.length > 0 && hasPermission("materials", "reorder") && (
                <Button
                  variant="secondary"
                  onClick={() => setShowBulkReorderModal(true)}
                  className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                >
                  Reorder Selected ({selectedIds.length})
                </Button>
              )}

              {hasPermission("materials", "create") && (
                <Button
                  variant="primary"
                  onClick={() => setShowAddModal(true)}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  Add Material
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`p-6 transition-all duration-300 ${
        showAddModal || showEditModal || showReorderModal || showBulkReorderModal ? 'blur-sm saturate-50' : ''
      }`}>
        
        {/* Inventory Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">{inventoryStats.totalItems}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className={`text-2xl font-semibold mt-0.5 ${inventoryStats.lowStockItems > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {inventoryStats.lowStockItems}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value GH₵</p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">
                  {inventoryStats.totalCostValue.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Items</p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">{inventoryStats.activeItems}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters & Table */}
        <Card className="mb-6">
          <div className="p-5">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
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
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                {/* Low Stock Toggle */}
                <button
                  onClick={() => setShowLowStock(!showLowStock)}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    showLowStock
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Low Stock
                </button>
              </div>
            </div>

            {/* Data Table */}
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
                description={searchTerm ? "Try adjusting your search" : "Get started by adding your first material"}
                action={hasPermission("materials", "create") ? () => setShowAddModal(true) : null}
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

      {/* --- Modals --- */}

      {/* 1. Add Modal */}
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

      {/* 2. Edit Modal */}
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

      {/* 3. Single Reorder Modal */}
      <Modal
        isOpen={showReorderModal}
        onClose={() => {
          setShowReorderModal(false);
          setSelectedMaterial(null);
        }}
        title={`Restock: ${selectedMaterial?.name}`}
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

      {/* 4. Bulk Reorder Modal (New) */}
      <Modal
        isOpen={showBulkReorderModal}
        onClose={() => setShowBulkReorderModal(false)}
        title="Bulk Restock"
        size="xl"
      >
        <div className="p-1">
          <BulkReorderModal
            // Pass the full objects of the selected IDs
            selectedMaterials={materials.filter(m => selectedIds.includes(m.id))}
            onReorder={handleBulkReorderSubmit}
            onClose={() => setShowBulkReorderModal(false)}
            isLoading={bulkReorderMutation.isPending}
          />
        </div>
      </Modal>
    </div>
  );
}