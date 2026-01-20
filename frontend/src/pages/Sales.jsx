import { useState, useEffect } from "react";
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
import Receipt from "@components/features/sales/Receipt";

export default function Sales() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [dateFilter, setDateFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");

  // Fetch sales
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "sales",
      { startDate: dateFilter, paymentMethod: paymentMethodFilter },
    ],
    queryFn: () =>
      salesApi.getSales({
        startDate: dateFilter || undefined,
        paymentMethod: paymentMethodFilter || undefined,
      }),
  });

  const sales = data?.data || [];

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
      alert(error.message || "Failed to create sale");
    },
  });

  const handleCreateSale = (formData) => {
    createMutation.mutate(formData);
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

  const handleCloseReceiptModal = () => {
    // Don't clear state immediately, wait for animation
    // setSelectedReceipt(null);
    // setSelectedSale(null);
    setShowReceiptModal(false);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  // Table columns
  const columns = [
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
        <button
          onClick={() => viewReceipt(row)}
          className="text-gray-600 hover:text-gray-900 font-medium text-sm flex items-center gap-2 transition-colors"
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
          View
        </button>
      ),
    },
  ];

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

      {/* Main Content - will be blurred when modal is open */}
      <div
        className={`p-6 transition-all duration-300 ${
          showCreateModal || showReceiptModal ? "blur-sm saturate-50" : ""
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
                  {sales.length}
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
                  {sales
                    .reduce(
                      (sum, sale) => sum + parseFloat(sale.totalAmount),
                      0,
                    )
                    .toFixed(2)}
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
                  {sales.filter((s) => s.paymentMethod === "cash").length}
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
                  {sales.filter((s) => s.paymentMethod === "momo").length}
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

            {/* Sales Table */}
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
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <Table columns={columns} data={sales} />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Create Sale Modal - Using Updated Modal Component */}
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

      {/* Receipt Modal - Only render when data is available */}
      <Modal
        isOpen={showReceiptModal}
        onClose={handleCloseReceiptModal}
        onCloseComplete={() => {
          setSelectedReceipt(null);
          setSelectedSale(null);
        }}
        title="Sale Receipt"
        size="md"
      >
        <div className="p-1">
          {selectedReceipt && selectedSale ? (
            <Receipt receipt={selectedReceipt} sale={selectedSale} />
          ) : (
            <div className="text-center py-8">
              <LoadingSpinner text="Loading receipt..." />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
