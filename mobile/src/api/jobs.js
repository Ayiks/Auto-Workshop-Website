import api from './client';

export const jobsApi = {
  getJobs:         (params) => api.get('/jobs', { params }),
  getJob:          (id)     => api.get(`/jobs/${id}`),
  createJob:       (data)   => api.post('/jobs', data),
  updateJob:       (id, d)  => api.put(`/jobs/${id}`, d),
  deleteJob:       (id)     => api.delete(`/jobs/${id}`),
  updateStatus:    (id, s)  => api.patch(`/jobs/${id}/status`, { status: s }),
  completeJob:     (id)     => api.put(`/jobs/${id}/complete`),
  addMaterial:     (id, d)  => api.post(`/jobs/${id}/materials`, d),
  removeMaterial:  (jId, mId) => api.delete(`/jobs/${jId}/materials/${mId}`),
  getStats:        ()       => api.get('/jobs/stats'),
};

export const invoicesApi = {
  getInvoices:     (params) => api.get('/invoices', { params }),
  getInvoice:      (id)     => api.get(`/invoices/${id}`),
  generateInvoice: (data)   => api.post('/invoices', data),
  getStats:        ()       => api.get('/invoices/stats'),
  getByJob:        (jobId)  => api.get(`/invoices/job/${jobId}`),
  voidInvoice:     (id)     => api.post(`/invoices/${id}/void`),
};

export const paymentsApi = {
  recordPayment:   (data)   => api.post('/payments', data),
  getPayments:     (params) => api.get('/payments', { params }),
  getByInvoice:    (invId)  => api.get(`/payments/invoice/${invId}`),
};
