// src/api/jobs.js
import apiClient from './client';

// ============================================
// JOBS API
// ============================================
export const jobsApi = {
  // Create job
  createJob: async (data) => {
    const response = await apiClient.post('/jobs', data);
    return response;
  },

  // Get all jobs with filters
  getJobs: async (params) => {
    const response = await apiClient.get('/jobs', { params });
    return response;
  },

  // Get single job
  getJob: async (id) => {
    const response = await apiClient.get(`/jobs/${id}`);
    return response;
  },

  // Update job
  updateJob: async (id, data) => {
    const response = await apiClient.put(`/jobs/${id}`, data);
    return response;
  },

  // Delete job
  deleteJob: async (id) => {
    const response = await apiClient.delete(`/jobs/${id}`);
    return response;
  },

  // Update job status
  updateJobStatus: async (id, status) => {
    const response = await apiClient.patch(`/jobs/${id}/status`, { status });
    return response;
  },

  // Complete job (triggers invoice generation)
  completeJob: async (id) => {
    const response = await apiClient.put(`/jobs/${id}/complete`);
    return response;
  },

  // Add material to job
  addJobMaterial: async (id, data) => {
    const response = await apiClient.post(`/jobs/${id}/materials`, data);
    return response;
  },

  // Remove material from job
  removeJobMaterial: async (jobId, materialId) => {
    const response = await apiClient.delete(`/jobs/${jobId}/materials/${materialId}`);
    return response;
  },

  // Get job statistics
  getJobStats: async (params) => {
    const response = await apiClient.get('/jobs/stats', { params });
    return response;
  },
};

// ============================================
// INVOICES API
// ============================================
export const invoicesApi = {
  // Generate invoice from job
  generateInvoice: async (data) => {
    const response = await apiClient.post('/invoices', data);
    return response;
  },

  // Get all invoices
  getInvoices: async (params) => {
    const response = await apiClient.get('/invoices', { params });
    return response;
  },

  // Get single invoice with full details
  getInvoice: async (id) => {
    const response = await apiClient.get(`/invoices/${id}`);
    return response;
  },

  // Get outstanding invoices
  getOutstandingInvoices: async () => {
    const response = await apiClient.get('/invoices/outstanding');
    return response;
  },

  // Get invoice by job ID
  getInvoiceByJobId: async (jobId) => {
    const response = await apiClient.get(`/invoices/job/${jobId}`);
    return response;
  },

  // Get invoice statistics
  getInvoiceStats: async () => {
    const response = await apiClient.get('/invoices/stats');
    return response;
  },

  // Void an Invoice (Restock items)
  voidInvoice: async (id) => {
    const response = await api.post(`/invoices/${id}/void`);
    return response.data;
  }
};

// ============================================
// PAYMENTS API
// ============================================
export const paymentsApi = {
  // Record payment
  recordPayment: async (data) => {
    const response = await apiClient.post('/payments', data);
    return response;
  },

  // Get all payments
  getPayments: async (params) => {
    const response = await apiClient.get('/payments', { params });
    return response;
  },

  // Get invoice payments
  getInvoicePayments: async (invoiceId) => {
    const response = await apiClient.get(`/payments/invoice/${invoiceId}`);
    return response;
  },

  // Get single payment
  getPayment: async (id) => {
    const response = await apiClient.get(`/payments/${id}`);
    return response;
  },

  // Get payment statistics
  getPaymentStats: async () => {
    const response = await apiClient.get('/payments/stats');
    return response;
  },

  // Admin: void (delete) a payment and recalculate the invoice
  voidPayment: async (id) => {
    const response = await apiClient.delete(`/payments/${id}`);
    return response;
  },
};

// ============================================
// JOB PHOTOS API
// ============================================
export const jobPhotosApi = {
  getPhotos: async (jobId) => {
    const response = await apiClient.get(`/jobs/${jobId}/photos`);
    return response;
  },
  addPhoto: async (jobId, data) => {
    const response = await apiClient.post(`/jobs/${jobId}/photos`, data);
    return response;
  },
  deletePhoto: async (jobId, photoId) => {
    const response = await apiClient.delete(`/jobs/${jobId}/photos/${photoId}`);
    return response;
  },
};

export default { jobsApi, invoicesApi, paymentsApi };