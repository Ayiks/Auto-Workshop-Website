import api from './client';

export const reportsApi = {
  getDashboard:       ()       => api.get('/reports/dashboard'),
  getSalesReport:     (params) => api.get('/reports/sales', { params }),
  getJobReport:       (params) => api.get('/reports/jobs', { params }),
  getExpenseReport:   (params) => api.get('/reports/expenses', { params }),
  getProfitLoss:      (params) => api.get('/reports/profit-loss', { params }),
  getRevenue:         (params) => api.get('/reports/revenue', { params }),
};
