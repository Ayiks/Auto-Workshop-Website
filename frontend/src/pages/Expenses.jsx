// src/pages/Expenses.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesApi } from "@api/expenses";
import { useAuthStore } from "@stores/authStore";
import { toast } from "react-hot-toast";

import Button from "@components/common/Button";
import Modal from "@components/common/Modal";
import LoadingSpinner from "@components/common/LoadingSpinner";
import EmptyState from "@components/common/EmptyState";
import Card from "@components/common/Card"; // Ensure you have this or use div with classes
import ExpenseForm from "@components/features/expenses/ExpenseForm";
import ReorderCorrectionModal from "@components/features/expenses/ReorderCorrectionModal";
import RevertReorderModal from "@components/features/expenses/RevertReorderModal";
import { format } from "date-fns";

const EXPENSE_TYPE_LABELS = {
  cog: "Cost of Goods",
  operational: "Operational",
};

export default function Expenses() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuthStore();

  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  
  // Correction States
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedReorder, setSelectedReorder] = useState(null);
  
  // Revert States
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [expenseToRevert, setExpenseToRevert] = useState(null);
  const [isReverting, setIsReverting] = useState(false);

  // Fetch expenses
  const { data: expensesData, isLoading } = useQuery({
    queryKey: [
      "expenses",
      {
        type: typeFilter !== "all" ? typeFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
      },
    ],
    queryFn: () =>
      expensesApi.getExpenses({
        type: typeFilter !== "all" ? typeFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
      }),
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ["expense-stats"],
    queryFn: () => expensesApi.getExpenseStats(),
  });

  const expenses = expensesData?.data || [];
  const stats = statsData?.data || {};

  // Create expense mutation
  const createMutation = useMutation({
    mutationFn: expensesApi.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries(["expenses"]);
      queryClient.invalidateQueries(["expense-stats"]);
      setShowCreateModal(false);
      toast.success("Expense added successfully");
    },
    onError: (error) => toast.error("Failed to add expense"),
  });

  // Update expense mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => expensesApi.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["expenses"]);
      queryClient.invalidateQueries(["expense-stats"]);
      setShowEditModal(false);
      setSelectedExpense(null);
      toast.success("Expense updated");
    },
    onError: (error) => toast.error("Failed to update expense"),
  });

  // Delete expense mutation
  const deleteMutation = useMutation({
    mutationFn: expensesApi.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries(["expenses"]);
      queryClient.invalidateQueries(["expense-stats"]);
      toast.success("Expense deleted");
    },
    onError: (error) => toast.error("Failed to delete expense"),
  });

  // Correction mutation
  const correctionMutation = useMutation({
    mutationFn: ({ id, ...data }) => expensesApi.correctReorder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["expenses"]);
      queryClient.invalidateQueries(["expense-stats"]);
      setShowCorrectionModal(false);
      setSelectedReorder(null);
      toast.success("Stock and expense corrected");
    },
    onError: () => toast.error("Failed to correct reorder"),
  });

  // --- HANDLERS ---

  const handleCorrection = (expense) => {
    setSelectedReorder(expense);
    setShowCorrectionModal(true);
  };

  const handleRevert = (expense) => {
    setExpenseToRevert(expense);
    setIsRevertModalOpen(true);
  };

  const confirmRevert = async (id) => {
    try {
      setIsReverting(true);
      await expensesApi.revertReorder(id);
      
      queryClient.invalidateQueries(["expenses"]);
      queryClient.invalidateQueries(["expense-stats"]);
      
      toast.success('Reorder reverted and stock adjusted.');
      setIsRevertModalOpen(false);
      setExpenseToRevert(null);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to revert reorder');
    } finally {
      setIsReverting(false);
    }
  };

  const handleEdit = (expense) => {
    setSelectedExpense(expense);
    setShowEditModal(true);
  };

  const handleDelete = (id, isReadOnly) => {
    if (isReadOnly) return;
    if (window.confirm("Are you sure you want to delete this expense?")) {
      deleteMutation.mutate(id);
    }
  };

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      expense.description.toLowerCase().includes(searchLower) ||
      expense.category.toLowerCase().includes(searchLower)
    );
  });

  const categories = [...new Set(expenses.map((e) => e.category))].sort();

  // Column Definitions
  const columns = [
    {
      key: "expenseDate",
      label: "Date",
      width: "100px",
      render: (expense) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            {format(new Date(expense.expenseDate), "MMM d, yyyy")}
          </span>
          <span className="text-xs text-gray-400">
            {format(new Date(expense.expenseDate), "HH:mm")}
          </span>
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (expense) => (
        <div className="max-w-xs">
          <p className="text-sm font-medium text-gray-900 truncate">
            {expense.description}
          </p>
          {expense.notes && (
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
              {expense.notes}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      width: "140px",
      render: (expense) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100 capitalize">
          {expense.category.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      width: "120px",
      render: (expense) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
            expense.type === "cog"
              ? "bg-white text-gray-700 border-gray-300"
              : "bg-black text-white border-black"
          }`}
        >
          {expense.type === "cog" ? "COGS" : "OPEX"}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      width: "100px",
      render: (expense) => (
        <div className="text-right">
          <span className="font-bold text-gray-900 font-mono">
            GH₵{parseFloat(expense.amount).toFixed(2)}
          </span>
        </div>
      ),
    },
    {
      key: "recordedBy",
      label: "User",
      width: "100px",
      render: (expense) => (
        <span className="text-xs text-gray-500">
          {expense.source === "system"
            ? "System"
            : expense.user?.fullName || expense.user?.username || "N/A"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "100px",
      render: (expense) => (
        <div className="flex justify-end gap-1">
          {
            expense.category === 'material_reorder' ? (
             <>
              <button
                onClick={() => handleCorrection(expense)}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Correct Inventory Stock & Cost"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              <button
                onClick={() => handleRevert(expense)} 
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Reverse Reorder (Remove Stock)"
              >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                 </svg>
              </button>
             </>
          ) : (
            expense.type === "operational" && !expense.isReadOnly ? (
            <>
              <button
                onClick={() => handleEdit(expense)}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => handleDelete(expense.id, expense.isReadOnly)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          ) : (
             <span className="text-[10px] text-gray-300 font-medium px-2 py-1 bg-gray-50 rounded select-none">SYSTEM</span>
          ))
          }
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
        <LoadingSpinner size="lg" text="Loading expenses..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
          <div className="px-6 py-4 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Expenses
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Track and manage operational costs
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-2 shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
              {hasPermission("expenses", "create") && (
                <Button
                  variant="primary"
                  onClick={() => setShowCreateModal(true)}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                  className="bg-gray-900 hover:bg-black text-white shadow-sm border-transparent"
                >
                  Add Expense
                </Button>
              )}
              </div>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">

        <div className="mb-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Total Expenses
                </span>
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">
                GH₵{Number(stats.totalExpenses || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 font-medium mt-1">
                All time record
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Cost of Goods
                </span>
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">
                GH₵{Number(stats.totalCOGS || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 font-medium mt-1">
                Inventory & Materials
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Operational
                </span>
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">
                GH₵{Number(stats.totalOperational || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 font-medium mt-1">
                Running costs
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  This Month
                </span>
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">
                GH₵{Number(stats.thisMonth || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 font-medium mt-1">
                Current spending
              </div>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Filter Bar */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="cog">Cost of Goods</option>
                  <option value="operational">Operational</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category.replace("_", " ").charAt(0).toUpperCase() +
                        category.replace("_", " ").slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {filteredExpenses.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                }
                title={searchTerm ? "No expenses found" : "No expenses yet"}
                description={
                  searchTerm
                    ? "Try adjusting your search criteria"
                    : "Start by adding your first operational expense"
                }
                action={hasPermission("expenses", "create") ? () => setShowCreateModal(true) : null}
                actionText="Add Expense"
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          className="text-left py-3 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider"
                          style={{ width: column.width }}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredExpenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="hover:bg-gray-50 transition-colors group"
                      >
                        {columns.map((column) => (
                          <td key={column.key} className="py-4 px-6">
                            {column.render(expense)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <span>Showing {filteredExpenses.length} records</span>
                <span className="font-medium">Total: GH₵{Number(stats.totalExpenses || 0).toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- Modals (Logic preserved) --- */}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Expense"
        size="md"
      >
        <div className="p-1">
          <ExpenseForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowCreateModal(false)}
            isLoading={createMutation.isPending}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedExpense(null);
        }}
        title="Edit Expense"
        size="md"
      >
        <div className="p-1">
          <ExpenseForm
            expense={selectedExpense}
            onSubmit={(data) =>
              updateMutation.mutate({ id: selectedExpense.id, data })
            }
            onCancel={() => {
              setShowEditModal(false);
              setSelectedExpense(null);
            }}
            isLoading={updateMutation.isPending}
          />
        </div>
      </Modal>

      <ReorderCorrectionModal
        isOpen={showCorrectionModal}
        onClose={() => {
            setShowCorrectionModal(false);
            setSelectedReorder(null);
        }}
        expense={selectedReorder}
        onSubmit={(data) => correctionMutation.mutate(data)}
        isLoading={correctionMutation.isPending}
      />

      <RevertReorderModal
         isOpen={isRevertModalOpen}
         onClose={() => setIsRevertModalOpen(false)}
         expense={expenseToRevert}
         onConfirm={confirmRevert}
         isLoading={isReverting}
       />
    </div>
  );
}