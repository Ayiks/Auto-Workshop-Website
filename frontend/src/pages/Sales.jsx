// src/pages/Sales.jsx
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesApi, receiptsApi } from "@api/sales";
import { useAuthStore } from "@stores/authStore";
import { format, startOfMonth, endOfMonth } from "date-fns";
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
import TopUpModal from "@components/features/sales/TopUpModal";

export default function Sales() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // --- FILTERS STATE ---
  // Default to current month
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Fetch sales
  const { data: apiResponse, isLoading, error } = useQuery({
    queryKey: [
      "sales",
      {
        page,
        limit,
        startDate: dateRange.from,
        endDate: dateRange.to,
        paymentMethod: paymentMethodFilter,
        paymentStatus: paymentStatusFilter,
      },
    ],
    queryFn: () =>
      salesApi.getSales({
        page,
        limit,
        startDate: dateRange.from || undefined,
        endDate: dateRange.to || undefined,
        paymentMethod: paymentMethodFilter || undefined,
        paymentStatus: paymentStatusFilter || undefined,
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
    momoCount: 0,
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

  // Top Up / Add Payment Mutation
  const topUpMutation = useMutation({
    mutationFn: ({ id, data }) => salesApi.addPayment(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(["sales"]);
      queryClient.invalidateQueries(["dashboard"]);
      setShowTopUpModal(false);

      // Show receipt for the top-up
      setSelectedSale(response.data.sale);
      setSelectedReceipt(response.data.receipt); 
      setShowReceiptModal(true);
    },
    onError: (error) => {
      alert(error.response?.data?.error || "Failed to process payment top-up");
    },
  });

  // Update sale mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => salesApi.updateSale(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: ["sales"],
        refetchType: 'all'
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

  const handleTopUp = (formData) => {
    topUpMutation.mutate({
      id: selectedSale.id,
      data: formData,
    });
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

  const openTopUpModal = (sale) => {
    setSelectedSale(sale);
    setShowTopUpModal(true);
  };

  const openEditModal = async (sale) => {
    try {
      const response = await salesApi.getSale(sale.id);
      setSelectedSale(response.data);
      setShowEditModal(true);
    } catch (error) {
      alert("Failed to load sale details");
    }
  };

  const openDeleteModal = async (sale) => {
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

  const handleResetFilters = () => {
    setDateRange({
        from: "",
        to: ""
    });
    setPaymentMethodFilter("");
    setPaymentStatusFilter("");
  };

  useEffect(() => {
    setPage(1);
  }, [dateRange, paymentMethodFilter, paymentStatusFilter]);

  // Table columns
  const columns = useMemo(() => [
    {
      header: "Date",
      accessor: "saleDate",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 text-sm">
            {format(new Date(row.saleDate), "MMM dd, yyyy")}
          </span>
          <span className="text-[11px] text-gray-400">
            {format(new Date(row.saleDate), "HH:mm")}
          </span>
        </div>
      ),
    },
    {
      header: "Receipt No.",
      accessor: "receipt",
      render: (row) => (
        <span className="font-mono text-xs bg-gray-50 text-gray-600 border border-gray-200 px-2 py-1 rounded-md">
          #{row.receipt?.receiptNumber || "N/A"}
        </span>
      ),
    },
    {
      header: "Amount",
      accessor: "totalAmount",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900 text-sm">
            GH₵{parseFloat(row.totalAmount).toFixed(2)}
          </span>
          {row.amountPaid < row.totalAmount && (
             <span className="text-[10px] text-gray-500 font-medium">
               Paid: {parseFloat(row.amountPaid).toFixed(2)}
             </span>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      accessor: "paymentStatus",
      render: (row) => (
        <span
          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
            row.paymentStatus === "paid"
              ? "bg-gray-100 text-gray-600 border-gray-200"
              : ["partial", "partially"].includes(row.paymentStatus)
              ? "bg-gray-900 text-white border-gray-900 shadow-sm"
              : "bg-white text-red-600 border-red-200"
          }`}
        >
          {row.paymentStatus === "paid"
            ? "PAID"
            : ["partial", "partially"].includes(row.paymentStatus)
            ? "PARTIAL"
            : row.paymentStatus}
        </span>
      ),
    },
    {
      header: "Payment Method",
      accessor: "paymentMethod",
      render: (row) => (
        <span className="px-2.5 py-1 text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-100 rounded-full capitalize">
          {row.paymentMethod === "momo" ? "MoMo" : row.paymentMethod}
        </span>
      ),
    },
    {
      header: "Sold By",
      accessor: "user",
      render: (row) => (
        <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                {(row.user?.fullName || row.user?.username || "?")[0].toUpperCase()}
            </div>
            <span className="text-sm text-gray-600">
                {row.user?.fullName || row.user?.username || "N/A"}
            </span>
        </div>
      ),
    },
    {
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          {/* Top Up Button */}
          {["partial", "partially"].includes(row.paymentStatus) && hasPermission("sales", "create") && (
            <button
              onClick={() => openTopUpModal(row)}
              className="p-1.5 text-gray-900 hover:bg-gray-100 rounded-md transition-all border border-transparent hover:border-gray-200"
              title="Add Payment"
            >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}

          <button
            onClick={() => viewReceipt(row)}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all"
            title="View Receipt"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          {hasPermission("sales", "update") && (
            <button
              onClick={() => openEditModal(row)}
              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all"
              title="Edit Sale"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {hasPermission("sales", "delete") && (
            <button
              onClick={() => openDeleteModal(row)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
              title="Delete Sale"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ], [hasPermission]);

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white border border-red-100 text-red-600 px-6 py-8 rounded-xl text-center shadow-sm">
          <p className="font-medium">Unable to load sales data</p>
          <p className="text-sm mt-1 text-gray-500">{error.message}</p>
          <Button variant="secondary" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Modern Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Commerce</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Overview of sales transactions
              </p>
            </div>
            {hasPermission("sales", "create") && (
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
                className="bg-gray-900 hover:bg-black text-white shadow-sm border border-transparent transition-all"
              >
                New Sale
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`px-6 py-8 max-w-7xl mx-auto transition-all duration-300 ${
          showCreateModal ||
          showReceiptModal ||
          showEditModal ||
          showDeleteModal ||
          showTopUpModal
            ? "blur-sm opacity-50 pointer-events-none"
            : ""
        }`}
      >
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{stats.totalSales}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">GH₵{parseFloat(stats.totalRevenue).toFixed(2)}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cash Sales</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{stats.cashCount}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-600">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Digital (MoMo)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{stats.momoCount}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters & Content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full">
                
                {/* Date Range Inputs */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-auto">
                        <label className="text-[10px] uppercase text-gray-400 font-semibold absolute -top-1.5 left-2 bg-white px-1">From</label>
                        <input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                        className="pl-3 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white transition-all w-full"
                        />
                    </div>
                    <span className="text-gray-400">-</span>
                    <div className="relative w-full md:w-auto">
                        <label className="text-[10px] uppercase text-gray-400 font-semibold absolute -top-1.5 left-2 bg-white px-1">To</label>
                        <input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                        className="pl-3 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white transition-all w-full"
                        />
                    </div>
                </div>

                <div className="flex w-full md:w-auto gap-3">
                    <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white w-full sm:w-auto"
                    >
                    <option value="">All Status</option>
                    <option value="paid">Paid</option>
                    <option value="partially">Partial</option>
                    </select>

                    <select
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white w-full sm:w-auto"
                    >
                    <option value="">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="momo">Mobile Money</option>
                    <option value="cheque">Cheque</option>
                    </select>
                </div>

                {(dateRange.from || dateRange.to || paymentMethodFilter || paymentStatusFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="text-gray-500 hover:text-gray-900"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>

            {/* Sales List */}
            {isLoading ? (
              <div className="py-20 flex justify-center">
                <LoadingSpinner size="lg" text="Loading data..." />
              </div>
            ) : sales.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
                title="No sales found"
                description="Adjust filters or create a new sale."
                action={
                  hasPermission("sales", "create")
                    ? () => setShowCreateModal(true)
                    : null
                }
                actionText="Create Sale"
              />
            ) : (
              <>
                {/* DESKTOP VIEW */}
                <div className="hidden md:block">
                  <Table columns={columns} data={sales} />
                </div>

                {/* MOBILE VIEW */}
                <div className="md:hidden space-y-3 p-4 bg-gray-50">
                  {sales.map((row) => (
                    <div
                      key={row.id}
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-900">
                            {format(new Date(row.saleDate), "MMM dd, yyyy")}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(row.saleDate), "hh:mm a")}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-[10px] bg-gray-50 text-gray-500 border border-gray-100 px-1.5 py-0.5 rounded">
                            #{row.receipt?.receiptNumber || "N/A"}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                              row.paymentStatus === 'paid' ? 'bg-gray-100 text-gray-600' : 'bg-gray-900 text-white'
                          }`}>
                              {row.paymentStatus === 'paid' ? 'PAID' : 'PARTIAL'}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-50" />

                      {/* Footer */}
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-gray-900 tracking-tight">
                            GH₵{parseFloat(row.totalAmount).toFixed(2)}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                            {row.paymentMethod}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {["partial", "partially"].includes(row.paymentStatus) && hasPermission("sales", "create") && (
                            <button
                              onClick={() => openTopUpModal(row)}
                              className="p-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-lg"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          )}
                          <button onClick={() => viewReceipt(row)} className="p-2 text-gray-400 hover:text-gray-900">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* PAGINATION */}
            {!isLoading && totalItems > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between p-4 border-t border-gray-100">
                <div className="flex justify-between w-full md:hidden">
                  <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                  <span className="text-xs text-gray-500 font-medium self-center">Page {page} of {totalPages}</span>
                  <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                </div>
                <div className="hidden md:block text-xs text-gray-500 font-medium">
                  Showing <span className="text-gray-900">{startItem}</span> to <span className="text-gray-900">{endItem}</span> of <span className="text-gray-900">{totalItems}</span> results
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {[...Array(totalPages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    if (pageNum === 1 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1)) {
                      return (
                        <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${page === pageNum ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === page - 2 || pageNum === page + 2) {
                      return <span key={pageNum} className="text-gray-400 text-xs px-1">...</span>;
                    }
                    return null;
                  })}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={showCreateModal} onClose={handleCloseCreateModal} title="Create New Sale" size="lg">
        <div className="p-1">
          <SaleForm onSubmit={handleCreateSale} onCancel={handleCloseCreateModal} isLoading={createMutation.isPending} />
        </div>
      </Modal>

      {/* Top Up Modal */}
      {showTopUpModal && selectedSale && (
        <TopUpModal
          isOpen={showTopUpModal}
          onClose={() => {
            setShowTopUpModal(false);
            setSelectedSale(null);
          }}
          sale={selectedSale}
          onSubmit={handleTopUp}
          isSubmitting={topUpMutation.isPending}
        />
      )}

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
        <Modal isOpen={showReceiptModal} onClose={handleCloseReceiptModal} title="Sale Receipt" size="md">
          <div className="p-1">
            <Receipt receipt={selectedReceipt} sale={selectedSale} />
          </div>
        </Modal>
      )}
    </div>
  );
}