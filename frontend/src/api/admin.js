import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const adminClient = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

adminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/admin/login';
    }
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'An error occurred';
    const customError = new Error(message);
    customError.status = error.response?.status;
    return Promise.reject(customError);
  }
);

export const adminApi = {
  // Auth
  login: (data) => adminClient.post('/auth/login', data),
  getMe: () => adminClient.get('/auth/me'),

  // Stats
  getStats: () => adminClient.get('/stats'),

  // Businesses
  getBusinesses: (params) => adminClient.get('/businesses', { params }),
  getBusinessDetail: (id) => adminClient.get(`/businesses/${id}`),
  updateBusiness: (id, data) => adminClient.put(`/businesses/${id}`, data),
  toggleBusinessStatus: (id) => adminClient.put(`/businesses/${id}/toggle-status`),
  updateSubscription: (id, data) => adminClient.put(`/businesses/${id}/subscription`, data),

  // Users
  getAllUsers: (params) => adminClient.get('/users', { params }),
  updateUser: (id, data) => adminClient.put(`/users/${id}`, data),
  toggleUserStatus: (id) => adminClient.put(`/users/${id}/toggle-status`),
  verifyUserEmail: (id) => adminClient.put(`/users/${id}/verify-email`),
  resetUserPassword: (id, newPassword) => adminClient.put(`/users/${id}/reset-password`, { newPassword }),

  // Audit Logs
  getAuditLogs: (params) => adminClient.get('/audit-logs', { params }),

  // Feature Flags
  getFeatureFlags: () => adminClient.get('/feature-flags'),
  createFeatureFlag: (data) => adminClient.post('/feature-flags', data),
  updateFeatureFlag: (id, data) => adminClient.put(`/feature-flags/${id}`, data),
  deleteFeatureFlag: (id) => adminClient.delete(`/feature-flags/${id}`),
  toggleFlagForBusiness: (flagId, businessId) =>
    adminClient.put(`/feature-flags/${flagId}/businesses/${businessId}`),
  checkFeatureFlag: (key, businessId) =>
    adminClient.get(`/feature-flags/check/${key}`, { params: businessId ? { businessId } : {} }),

  // Query Runner
  runQuery: (sql) => adminClient.post('/query', { sql, confirmed: true }),

  // System Error Logs
  getSystemErrors: (params) => adminClient.get('/system-errors', { params }),
  resolveError: (id) => adminClient.put(`/system-errors/${id}/resolve`),

  // Impersonation
  impersonateUser: (userId) => adminClient.post(`/impersonate/${userId}`),
};
