// src/pages/Sales.jsx
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesApi, receiptsApi } from "@api/sales";
import { useAuthStore } from "@stores/authStore";
import { format } from "date-fns";
import Card from "@components/common/Card";
import Button from "@components/common/Button";
import Table from "@components/common/Table";
import Modal from "@components/common/Modal";
import LoadingSpinner from "@components/common/LoadingSpinner";
import EmptyState from "@components/common/EmptyState";
import SaleForm from "@components/features/sales/SaleForm";
import EditSaleModal from "@components/features/sales/EditSaleModal";
import DeleteSaleModal from "@components/features/sales/DeleteSaleModal";
import Receipt from "@components/features/sales/Receipt";

export default function Sales() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [dateFilter, setDateFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Fetch sales
  const { data: apiResponse, isLoading, error } = useQuery({
    queryKey: [
      "sales",
      {
        page,
        limit,
        startDate: dateFilter,
        paymentMethod: paymentMethodFilter,
      },
    ],
    queryFn: () =>
      salesApi.getSales({

        page,
        limit,
        startDate: dateFilter || undefined,
        paymentMethod: paymentMethodFilter || undefined,
      }),
    keepPreviousData: true,
  });

  const sales = apiResponse?.data || [];
  const totalItems = apiResponse?.totalItems || 0;
const totalPages = apiResponse?.totalPages || 1;

const stats = apiResponse?.stats || {
  totalRevenue: 0,
  totalSales: 0,
  cashCount: 0,
  momoCount: 0
};

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(startItem + limit - 1, totalItems);

  // Create sale mutation
  const createMutation = useMutation({
    mutationFn: salesApi.createSale,
    onSuccess: (response) => {
      queryClient.invalidateQueries(["sales"]);
      queryClient.invalidateQueries(["dashboard"]);
      setShowCreateModal(false);

      // Show receipt
      setSelectedSale(response.data.sale);
      setSelectedReceipt(response.data.receipt);
      setShowReceiptModal(true);
    },
    onError: (error) => {
      alert(error.response?.data?.error || "Failed to create sale");
    },
  });

  // Update sale mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => salesApi.updateSale(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: ["sales"],
        refetchType: 'all' // Forces all sales-related queries (all pages) to be marked stale
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowEditModal(false);
      setSelectedSale(null);
      alert("Sale updated successfully!");
    },
    onError: (error) => {
      alert(error.response?.data?.error || "Failed to update sale");
    },
  });

  // Delete sale mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, data }) => salesApi.deleteSale(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["sales"]);
      queryClient.invalidateQueries(["dashboard"]);
      setShowDeleteModal(false);
      setSelectedSale(null);
      alert("Sale deleted successfully!");
    },
    onError: (error) => {
      alert(error.response?.data?.error || "Failed to delete sale");
    },
  });

  const handleCreateSale = (formData) => {
    createMutation.mutate(formData);
  };

  const handleEditSale = (formData) => {
    updateMutation.mutate({
      id: selectedSale.id,
      data: formData,
    });
  };

  const handleDeleteSale = (formData) => {
    deleteMutation.mutate({
      id: selectedSale.id,
      data: formData,
    });
  };

  const viewReceipt = async (sale) => {
    try {
      const response = await receiptsApi.getSaleReceipt(sale.id);
      setSelectedSale(sale);
      setSelectedReceipt(response.data);
      setShowReceiptModal(true);
    } catch (error) {
      alert("Failed to load receipt");
    }
  };

  const openEditModal = async (sale) => {
    // Fetch full sale details
    try {
      const response = await salesApi.getSale(sale.id);
      setSelectedSale(response.data);
      setShowEditModal(true);
    } catch (error) {
      alert("Failed to load sale details");
    }
  };

  const openDeleteModal = async (sale) => {
    // Fetch full sale details
    try {
      const response = await salesApi.getSale(sale.id);
      setSelectedSale(response.data);
      setShowDeleteModal(true);
    } catch (error) {
      alert("Failed to load sale details");
    }
  };

  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    setTimeout(() => {
      setSelectedReceipt(null);
      setSelectedSale(null);
    }, 300);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  // Check if sale can be edited (within 24 hours)
  const canEditSale = (saleDate) => {
    const hours = (new Date() - new Date(saleDate)) / (1000 * 60 * 60);
    return hours <= 24;
  };

  useEffect(() => {
    setPage(1);
  }, [dateFilter, paymentMethodFilter]);

  // Table columns
  const columns =  useMemo(() => [
    {
      header: "Date",
      accessor: "saleDate",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">
            {format(new Date(row.saleDate), "MMM dd, yyyy")}
          </span>
          <span className="text-xs text-gray-500">
            {format(new Date(row.saleDate), "HH:mm")}
          </span>
        </div>
      ),
    },
    {
      header: "Receipt No.",
      accessor: "receipt",
      render: (row) => (
        <span className="font-mono text-sm bg-gray-50 px-2 py-1 rounded">
          {row.receipt?.receiptNumber || "N/A"}
        </span>
      ),
    },
    {
      header: "Items",
      accessor: "items",
      render: (row) => (
        <div className="text-sm">
          <span className="text-gray-900">{row.items?.length || 0}</span>
          <span className="text-gray-500 ml-1">items</span>
        </div>
      ),
    },
    {
      header: "Total Amount",
      accessor: "totalAmount",
      render: (row) => (
        <span className="font-semibold text-gray-900">
          GH₵{parseFloat(row.totalAmount).toFixed(2)}
        </span>
      ),
    },
    {
      header: "Payment Method",
      accessor: "paymentMethod",
      render: (row) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            row.paymentMethod === "cash"
              ? "bg-blue-50 text-blue-700"
              : row.paymentMethod === "momo"
                ? "bg-green-50 text-green-700"
                : "bg-purple-50 text-purple-700"
          }`}
        >
          {row.paymentMethod}
        </span>
      ),
    },
    {
      header: "Sold By",
      accessor: "user",
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.user?.fullName || row.user?.username || "N/A"}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => viewReceipt(row)}
            className="text-gray-600 hover:text-gray-900 p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="View Receipt"
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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>

          {hasPermission("sales", "update") && (
            <button
              onClick={() => openEditModal(row)}
              className="text-primary-600 hover:text-primary-900 p-1.5 hover:bg-primary-50 rounded transition-colors"
              title="Edit Sale"
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

          {hasPermission("sales", "delete") && (
            <button
              onClick={() => openDeleteModal(row)}
              className="text-danger-600 hover:text-danger-900 p-1.5 hover:bg-danger-50 rounded transition-colors"
              title="Delete Sale"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ], [hasPermission]) ;

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-4 rounded-xl">
          <p className="font-medium">Error loading sales</p>
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
              <h1 className="text-2xl font-semibold text-gray-900">Sales</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage and track counter sales
              </p>
            </div>
            {hasPermission("sales", "create") && (
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                icon={
                  <svg
                    className="w-5 h-5"
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
                className="shadow-sm hover:shadow transition-shadow"
              >
                New Sale
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`p-6 transition-all duration-300 ${
          showCreateModal ||
          showReceiptModal ||
          showEditModal ||
          showDeleteModal
            ? "blur-sm saturate-50"
            : ""
        }`}
      >
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-lg mr-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">
                  {stats.totalSales}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-lg mr-4">
                <svg
                  className="w-6 h-6 text-green-600"
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
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">
                  GH₵
                 {parseFloat(stats.totalRevenue).toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center">
              <div className="p-3 bg-amber-50 rounded-lg mr-4">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Cash Sales</p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">
                  {stats.cashCount}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-lg mr-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Mobile Money
                </p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">
                  {stats.momoCount}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters & Content */}
        <Card className="mb-6">
          <div className="p-5">
            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-full"
                  />
                  <svg
                    className="w-4 h-4 absolute left-3 top-3 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Payments</option>
                  <option value="cash">Cash</option>
                  <option value="momo">Mobile Money</option>
                  <option value="cheque">Cheque</option>
                </select>

                {(dateFilter || paymentMethodFilter) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setDateFilter("");
                      setPaymentMethodFilter("");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Sales List - Responsive Layout */}
            {isLoading ? (
              <div className="py-16">
                <LoadingSpinner size="lg" text="Loading sales..." />
              </div>
            ) : sales.length === 0 ? (
              <EmptyState
                icon={
                  <svg
                    className="w-16 h-16 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                }
                title="No sales found"
                description="Start making sales to see them here"
                action={
                  hasPermission("sales", "create")
                    ? () => setShowCreateModal(true)
                    : null
                }
                actionText="Create First Sale"
              />
            ) : (
              <>
                {/* DESKTOP VIEW (Hidden on small screens) */}
                <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200">
                  <Table columns={columns} data={sales} />
                </div>

                {/* MOBILE VIEW (Hidden on medium+ screens) */}
                <div className="md:hidden space-y-4">
                  {sales.map((row) => (
                    <div
                      key={row.id}
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3"
                    >
                      {/* Header: Date and Receipt */}
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {format(new Date(row.saleDate), "MMM dd, yyyy")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(row.saleDate), "hh:mm a")}
                          </p>
                        </div>
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          #{row.receipt?.receiptNumber || "N/A"}
                        </span>
                      </div>

                      {/* Details Row: Items & User */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-600">
                          <span className="block text-xs text-gray-400">
                            Sold By
                          </span>
                          {row.user?.fullName || row.user?.username || "N/A"}
                        </div>
                        <div className="text-gray-600">
                          <span className="block text-xs text-gray-400">
                            Items
                          </span>
                          {row.items?.length || 0} items
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-100" />

                      {/* Footer: Price, Payment & Actions */}
                      <div className="flex justify-between items-center">
                        {/* Price & Payment Badge */}
                        <div className="flex flex-col gap-1">
                          <span className="text-lg font-bold text-gray-900">
                            GH₵{parseFloat(row.totalAmount).toFixed(2)}
                          </span>
                          <span
                            className={`w-max px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full ${
                              row.paymentMethod === "cash"
                                ? "bg-blue-50 text-blue-700"
                                : row.paymentMethod === "momo"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {row.paymentMethod === "momo"
                              ? "MoMo"
                              : row.paymentMethod}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => viewReceipt(row)}
                            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                            title="View Receipt"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </button>

                          {hasPermission("sales", "update") && (
                            <button
                              onClick={() => openEditModal(row)}
                              className="p-2 text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <svg
                                className="w-5 h-5"
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

                          {hasPermission("sales", "delete") && (
                            <button
                              onClick={() => openDeleteModal(row)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {/* PAGINATION CONTROLS */}
            {!isLoading && totalItems > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 border-t border-gray-200 pt-6">
                {/* Mobile: Simple Previous/Next */}
                <div className="flex justify-between w-full md:hidden">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 font-medium self-center">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>

                {/* Desktop: Detailed Info */}
                <div className="hidden md:block text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-900">{startItem}</span>{" "}
                  to{" "}
                  <span className="font-medium text-gray-900">{endItem}</span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-900">
                    {totalItems}
                  </span>{" "}
                  results
                </div>

                {/* Desktop: Numbered Buttons */}
                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  {/* Page Numbers Logic (Simplified for clarity) */}
                  {[...Array(totalPages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    // Only show current, first, last, and near neighbors
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= page - 1 && pageNum <= page + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                            page === pageNum
                              ? "bg-primary-600 text-white shadow-sm"
                              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === page - 2 || pageNum === page + 2) {
                      return (
                        <span key={pageNum} className="text-gray-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Create Sale Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        title="Create New Sale"
        size="lg"
      >
        <div className="p-1">
          <SaleForm
            onSubmit={handleCreateSale}
            onCancel={handleCloseCreateModal}
            isLoading={createMutation.isPending}
          />
        </div>
      </Modal>

      {/* Edit Sale Modal */}
      {selectedSale && (
        <EditSaleModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSale(null);
          }}
          sale={selectedSale}
          onSubmit={handleEditSale}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete Sale Modal */}
      {selectedSale && (
        <DeleteSaleModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedSale(null);
          }}
          sale={selectedSale}
          onConfirm={handleDeleteSale}
          isLoading={deleteMutation.isPending}
        />
      )}

      {/* Receipt Modal */}
      {selectedReceipt && selectedSale && (
        <Modal
          isOpen={showReceiptModal}
          onClose={handleCloseReceiptModal}
          title="Sale Receipt"
          size="md"
        >
          <div className="p-1">
            <Receipt receipt={selectedReceipt} sale={selectedSale} />
          </div>
        </Modal>
      )}
    </div>
  );
}
