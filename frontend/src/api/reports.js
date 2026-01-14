import apiClient from './client';

export const reportsApi = {
  // Get dashboard overview
  getDashboard: async () => {
    const response = await apiClient.get('/reports/dashboard');
    return response;
  },

  // Get sales report
  getSalesReport: async (params) => {
    const response = await apiClient.get('/reports/sales', { params });
    return response;
  },

  // Get job report
  getJobReport: async (params) => {
    const response = await apiClient.get('/reports/jobs', { params });
    return response;
  },

  // Get expense report
  getExpenseReport: async (params) => {
    const response = await apiClient.get('/reports/expenses', { params });
    return response;
  },

  // Get profit & loss
  getProfitLoss: async (params) => {
    const response = await apiClient.get('/reports/profit-loss', { params });
    return response;
  },

  // Get revenue breakdown
  getRevenue: async (params) => {
    const response = await apiClient.get('/reports/revenue', { params });
    return response;
  },
};