// src/api/expenses.js
import apiClient from './client';

// ============================================
// EXPENSES API
// ============================================
export const expensesApi = {
  // Create operational expense
  createExpense: async (data) => {
    const response = await apiClient.post('/expenses', data);
    return response;
  },

  // Get all expenses with filters
  getExpenses: async (params) => {
    const response = await apiClient.get('/expenses', { params });
    return response;
  },

  // Get single expense
  getExpense: async (id) => {
    const response = await apiClient.get(`/expenses/${id}`);
    return response;
  },

  // Update expense (operational only)
  updateExpense: async (id, data) => {
    const response = await apiClient.put(`/expenses/${id}`, data);
    return response;
  },

  // Delete expense (operational only)
  deleteExpense: async (id) => {
    const response = await apiClient.delete(`/expenses/${id}`);
    return response;
  },

  // Get expense statistics
  getExpenseStats: async (params) => {
    const response = await apiClient.get('/expenses/stats', { params });
    return response;
  },

  // Get expenses by category
  getExpensesByCategory: async (params) => {
    const response = await apiClient.get('/expenses/by-category', { params });
    return response;
  },


  // ----------------------------------------------------------------
  // NEW: INVENTORY CORRECTION METHODS (Cost of Goods)
  // ----------------------------------------------------------------

  // Revert a reorder (Delete expense + Reverse Inventory Stock)
  // Route: DELETE /api/expenses/:id/revert-reorder
  revertReorder: async (id) => {
    const response = await apiClient.delete(`/expenses/${id}/revert-reorder`);
    return response;
  },

  // Admin-only: correct amount on a locked (COG/auto-generated) expense
  // Route: PUT /api/expenses/:id/admin-correct
  adminCorrectExpense: async (id, data) => {
    const response = await apiClient.put(`/expenses/${id}/admin-correct`, data);
    return response;
  },

  // Admin-only: delete a locked (COG/auto-generated) expense
  // Route: DELETE /api/expenses/:id/admin-delete
  adminDeleteExpense: async (id) => {
    const response = await apiClient.delete(`/expenses/${id}/admin-delete`);
    return response;
  },
};

export default expensesApi;