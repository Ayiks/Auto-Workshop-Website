import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { materialsApi } from "@api/materials";
import { useAuthStore } from "@stores/authStore";
import { useResponsive } from "@hooks/useResponsive";
import { RESPONSIVE_SPACING } from "@utils/responsiveHelpers";
import { uploadToCloudinary } from "../services/cloudinary";

// Component Imports
import Card from "@components/common/Card";
import Button from "@components/common/Button";
import Table from "@components/common/Table";
import Modal from "@components/common/Modal";
import LoadingSpinner from "@components/common/LoadingSpinner";
import EmptyState from "@components/common/EmptyState";
import MaterialForm from "@components/features/materials/MaterialForm";
import RestockWizard from "@components/features/materials/RestockWizard";
import RestockOrdersList from "@components/features/materials/RestockOrdersList";
import { Image as ImageIcon } from "lucide-react";

export default function Materials() {
  const queryClient = useQueryClient();
  const { hasPermission, hasRole } = useAuthStore();

  // --- State Management ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);

  const [isUploading, setIsUploading] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRestockWizard, setShowRestockWizard] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState('inventory');

  // Selection
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // --- Data Fetching ---
  const { data, isLoading, error } = useQuery({
    queryKey: ["materials", { status: statusFilter, lowStock: showLowStock }],
    queryFn: () =>
      materialsApi.getMaterials({
        status: statusFilter === "all" ? undefined : statusFilter,
        // lowStock: showLowStock ? "true" : undefined,
      }),
  });

  const materials = data?.data || [];

  // --- Derived State ---
  // const filteredMaterials = useMemo(() => {
  //   return materials.filter((material) => {
  //     const matchesSearch = material.name
  //       .toLowerCase()
  //       .includes(searchTerm.toLowerCase());
  //     const matchesStatus = showLowStock
  //       ? material.isActive
  //       : statusFilter === "all"
  //         ? true
  //         : statusFilter === "active"
  //           ? material.isActive
  //           : !material.isActive;
  //     const isLow =
  //       Number(material.quantity) <= Number(material.lowStockThreshold);
  //     // Only show active low stock items, matching what inventoryStats counts
  //     const matchesLowStock = !showLowStock || (isLow && material.isActive);

  //     return matchesSearch && matchesStatus && matchesLowStock;
  //   });
  // }, [materials, searchTerm, showLowStock, statusFilter]);

  const filteredMaterials = useMemo(() => {
    const result = materials.filter((material) => {
      const matchesSearch = material.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus = showLowStock
        ? material.isActive
        : statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? material.isActive
            : !material.isActive;
      const isLow =
        Number(material.quantity) <= Number(material.lowStockThreshold);
      const matchesLowStock = !showLowStock || isLow;
      return matchesSearch && matchesStatus && matchesLowStock;
    });

    // if (showLowStock) {
    //   console.log(
    //     "Low stock filter ON. Matches:",
    //     result.map((m) => ({
    //       name: m.name,
    //       qty: Number(m.quantity),
    //       threshold: Number(m.lowStockThreshold),
    //       isActive: m.isActive,
    //       isLow: Number(m.quantity) <= Number(m.lowStockThreshold),
    //     })),
    //   );
    // }

    return result;
  }, [materials, searchTerm, showLowStock, statusFilter]);


  const inventoryStats = useMemo(() => {
    if (!materials || materials.length === 0) {
      return {
        totalItems: filteredMaterials.length,
        lowStockItems: 0,
        totalCostValue: 0,
        totalRetailValue: 0,
        activeItems: 0,
      };
    }

    const activeMaterials = materials.filter((m) => m.isActive);


    return {
      totalItems: filteredMaterials.length,
      activeItems: activeMaterials.length,
      lowStockItems: activeMaterials.filter(
        (m) => Number(m.quantity) <= Number(m.lowStockThreshold),
      ).length,
      totalCostValue: activeMaterials.reduce(
        (sum, m) => sum + Number(m.quantity || 0) * Number(m.unitCost || 0),
        0,
      ),
      totalRetailValue: activeMaterials.reduce(
        (sum, m) => sum + Number(m.quantity || 0) * Number(m.sellingPrice || 0),
        0,
      ),
    };
  }, [materials, filteredMaterials]);

  // --- Selection Logic ---
  const toggleSelectAll = () => {
    if (
      selectedIds.length === filteredMaterials.length &&
      filteredMaterials.length > 0
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(
        filteredMaterials
          .map((m) => (m.id && m.isActive ? m.id : null))
          .filter((id) => id !== null),
      );
    }
  };

  const toggleSelectMaterial = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id],
    );
  };

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: materialsApi.createMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries(["materials"]);
      setShowAddModal(false);
      setIsUploading(false);
    },
    onError: (err) => {
      alert(err.message || "Failed to add material");
      setIsUploading(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => materialsApi.updateMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["materials"]);
      setShowEditModal(false);
      setSelectedMaterial(null);
      setIsUploading(false);
    },
    onError: (err) => {
      alert(err.message || "Failed to update material");
      setIsUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: materialsApi.deleteMaterial,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(["materials"]);
      setSelectedIds((prev) => prev.filter((id) => id !== variables));
    },
    onError: (err) => alert(err.message || "Failed to delete material"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }) =>
      materialsApi.updateMaterial(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries(["materials"]);
    },
    onError: (err) => alert(err.message || "Failed to update status"),
  });

  // Add this useEffect
useEffect(() => {
  setSelectedIds([]);
}, [showLowStock, statusFilter, searchTerm]);

  // --- Handlers ---

  const handleAdd = async (formData) => {
    try {
      setIsUploading(true);
      let finalImageUrl = "";
      if (formData.imageFile) {
        finalImageUrl = await uploadToCloudinary(formData.imageFile);
      }
      const payload = { ...formData, imageUrl: finalImageUrl };
      delete payload.imageFile;
      delete payload.hasImage;
      createMutation.mutate(payload);
    } catch (error) {
      console.error("Error preparing upload:", error);
      setIsUploading(false);
      alert("Failed to upload image. Please try again.");
    }
  };

  const handleEdit = async (formData) => {
    try {
      setIsUploading(true);
      let finalImageUrl = formData.imageUrl;
      if (formData.imageFile) {
        finalImageUrl = await uploadToCloudinary(formData.imageFile);
      } else if (!formData.hasImage) {
        finalImageUrl = "";
      }
      const payload = { ...formData, imageUrl: finalImageUrl };
      delete payload.imageFile;
      delete payload.hasImage;
      updateMutation.mutate({ id: selectedMaterial.id, data: payload });
    } catch (error) {
      console.error("Error updating material:", error);
      setIsUploading(false);
      alert("Failed to update material with image.");
    }
  };

  const handleDelete = (material) => {
    if (window.confirm(`Are you sure you want to delete "${material.name}"?`)) {
      deleteMutation.mutate(material.id);
    }
  };

  const openEditModal = (material) => {
    setSelectedMaterial(material);
    setShowEditModal(true);
  };

  // --- Table Configuration ---
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 h-4 w-4 cursor-pointer"
          checked={
            filteredMaterials.length > 0 &&
            selectedIds.length === filteredMaterials.length
          }
          onChange={toggleSelectAll}
          disabled={filteredMaterials.length === 0}
        />
      ),
      accessor: "select",
      className: "w-10",
      render: (row) => {
        const isInactive = !row.isActive;
        return (
          <input
            type="checkbox"
            disabled={isInactive}
            className={`rounded border-gray-300 text-gray-900 focus:ring-gray-900 h-4 w-4 transition-all ${
              isInactive
                ? "opacity-20 cursor-not-allowed bg-gray-100"
                : "cursor-pointer"
            }`}
            checked={selectedIds.includes(row.id)}
            onChange={() => !isInactive && toggleSelectMaterial(row.id)}
            onClick={(e) => e.stopPropagation()}
          />
        );
      },
    },
    {
      header: "Product",
      accessor: "name",
      render: (row) => (
        <div className="flex items-center gap-3">
          {/* Image Thumbnail */}
          <div className="flex-shrink-0 h-9 w-9">
            {row.imageUrl ? (
              <img
                className="h-9 w-9 rounded-md object-cover border border-gray-200"
                src={row.imageUrl}
                alt=""
              />
            ) : (
              <div className="h-9 w-9 rounded-md bg-gray-50 flex items-center justify-center border border-gray-200">
                <ImageIcon className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>

          <div>
            <p
              className={`font-semibold text-sm ${row.isActive ? "text-gray-900" : "text-gray-400 line-through"}`}
            >
              {row.name}
            </p>
            {row.isActive &&
              Number(row.quantity) <= Number(row.lowStockThreshold) && (
                <span className="text-[10px] text-red-600 font-bold uppercase tracking-wide">
                  Restock Needed
                </span>
              )}
          </div>
        </div>
      ),
    },
    {
      header: "Stock Level",
      accessor: "quantity",
      render: (row) => {
        const qty = Number(row.quantity);
        const threshold = Number(row.lowStockThreshold);
        const isLow = qty <= threshold;
        const percentage =
          threshold > 0 ? Math.min((qty / (threshold * 3)) * 100, 100) : 100;

        return (
          <div className="w-full max-w-[120px]">
            <div className="flex justify-between text-xs mb-1">
              <span
                className={`font-medium ${isLow ? "text-red-600" : "text-gray-900"}`}
              >
                {qty}
              </span>
              <span className="text-gray-400">/ {threshold}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isLow ? "bg-red-500" : "bg-gray-800"}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: "Cost",
      accessor: "unitCost",
      render: (row) => (
        <span className="text-sm text-gray-500 font-mono">
          GH₵{Number(row.unitCost || 0).toFixed(2)}
        </span>
      ),
    },
    {
      header: "Price",
      accessor: "sellingPrice",
      render: (row) => (
        <span className="text-sm font-bold text-gray-900 font-mono">
          GH₵{Number(row.sellingPrice || 0).toFixed(2)}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
            row.isActive
              ? "bg-green-50 text-green-700 border-green-100"
              : "bg-gray-50 text-gray-500 border-gray-200"
          }`}
        >
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "",
      accessor: "actions",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {!row.isActive && hasPermission("materials", "edit") && (
            <button
              onClick={() =>
                toggleStatusMutation.mutate({ id: row.id, isActive: true })
              }
              className="text-gray-900 hover:bg-gray-100 p-1.5 rounded transition-colors"
              title="Reactivate"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}

          {row.isActive && (
            <>
              {hasPermission("materials", "edit") && (
                <button
                  onClick={() => openEditModal(row)}
                  className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded transition-colors"
                  title="Edit"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              )}
            </>
          )}

          {hasPermission("materials", "delete") && (
            <button
              onClick={() => handleDelete(row)}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
              title="Delete"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
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
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-4 rounded-xl shadow-sm">
          <p className="font-medium">Error loading materials</p>
          <p className="text-sm mt-1 opacity-90">{error.message}</p>
        </div>
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
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                Inventory
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {selectedIds.length > 0
                  ? `${selectedIds.length} item${selectedIds.length !== 1 ? "s" : ""} selected`
                  : "Manage stock levels and products"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {hasPermission("materials", "reorder") && (
                <Button
                  variant="secondary"
                  onClick={() => setShowRestockWizard(true)}
                  className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all text-xs sm:text-sm"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                >
                  Restock
                </Button>
              )}

              {hasPermission("materials", "create") && (
                <Button
                  variant="primary"
                  onClick={() => setShowAddModal(true)}
                  className="bg-gray-900 hover:bg-black text-white shadow-sm border border-transparent transition-all text-xs sm:text-sm"
                  icon={
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  }
                >
                  Add Product
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`px-4 sm:px-6 md:px-8 py-6 sm:py-8 max-w-7xl mx-auto transition-all duration-300 ${
          showAddModal || showEditModal || showRestockWizard
            ? "blur-sm opacity-50 pointer-events-none"
            : ""
        }`}
      >
        {/* Inventory Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-white border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Total Items
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 tracking-tight">
                  {inventoryStats.totalItems}
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-600 flex-shrink-0">
                <svg
                  className="w-4 sm:w-5 h-4 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Low Stock
                </p>
                <p
                  className={`text-xl sm:text-2xl font-bold mt-1 tracking-tight ${inventoryStats.lowStockItems > 0 ? "text-red-600" : "text-gray-900"}`}
                >
                  {inventoryStats.lowStockItems}
                </p>
              </div>
              <div
                className={`p-2 rounded-lg border flex-shrink-0 ${inventoryStats.lowStockItems > 0 ? "bg-red-50 border-red-100 text-red-600" : "bg-gray-50 border-gray-100 text-gray-600"}`}
              >
                <svg
                  className="w-4 sm:w-5 h-4 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          {hasRole("admin") && (
            <Card className="bg-white border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Total Value
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 tracking-tight">
                    GH₵{inventoryStats.totalCostValue.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-600 flex-shrink-0">
                  <svg
                    className="w-4 sm:w-5 h-4 sm:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </Card>
          )}

          <Card className="bg-white border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Active Items
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 tracking-tight">
                  {inventoryStats.activeItems}
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-600 flex-shrink-0">
                <svg
                  className="w-4 sm:w-5 h-4 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 border-b border-gray-200 mb-4">
          {[{ key: 'inventory', label: 'Inventory' }, { key: 'restock-orders', label: 'Restock Orders' }].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >{tab.label}</button>
          ))}
        </div>

        {/* Restock Orders Tab */}
        {activeTab === 'restock-orders' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <RestockOrdersList />
          </div>
        )}

        {/* Filters & Table Container */}
        {activeTab === 'inventory' && <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white transition-all"
                />
              </div>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button
                  onClick={() => setShowLowStock(!showLowStock)}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    showLowStock ? "bg-red-50 border-red-100 text-red-600" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Low Stock
                </button>
              </div>
            </div>
          </div>

          {/* Data Table */}
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner size="lg" text="Loading materials..." />
            </div>
          ) : filteredMaterials.length === 0 ? (
            <EmptyState
              icon={
                <svg
                  className="w-12 h-12 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
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
            <>
              <div className="overflow-hidden">
                <Table columns={columns} data={filteredMaterials} />
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <span>Showing {filteredMaterials.length} items</span>
                {inventoryStats.lowStockItems > 0 && (
                  <span className="text-red-500 font-medium">{inventoryStats.lowStockItems} item{inventoryStats.lowStockItems !== 1 ? 's' : ''} need restock</span>
                )}
              </div>
            </>
          )}
        </div>}
      </div>

      {/* --- Modals --- */}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Product"
        size="md"
      >
        <div className="p-1">
          <MaterialForm
            onSubmit={handleAdd}
            onCancel={() => setShowAddModal(false)}
            isLoading={createMutation.isPending || isUploading}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedMaterial(null);
        }}
        title="Edit Product"
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
            isLoading={updateMutation.isPending || isUploading}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showRestockWizard}
        onClose={() => setShowRestockWizard(false)}
        title="Restock Order"
        size="xl"
      >
        <div className="p-1">
          <RestockWizard
            onClose={() => setShowRestockWizard(false)}
            onSuccess={() => setActiveTab('restock-orders')}
          />
        </div>
      </Modal>
    </div>
  );
}
