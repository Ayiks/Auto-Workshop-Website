import api from './client';

export const salesApi = {
  getSales:    (params)    => api.get('/sales', { params }),
  getSale:     (id)        => api.get(`/sales/${id}`),
  createSale:  (data)      => api.post('/sales', data),
  updateSale:  (id, data)  => api.put(`/sales/${id}`, data),
  deleteSale:  (id, data)  => api.delete(`/sales/${id}`, { data }),
  getStats:    (params)    => api.get('/sales/stats', { params }),
  addPayment:  (id, data)  => api.post(`/sales/${id}/payment`, data),
};

export const receiptsApi = {
  getSaleReceipt:    (saleId)      => api.get(`/receipts/sale/${saleId}`),
  getPaymentReceipt: (paymentId)   => api.get(`/receipts/payment/${paymentId}`),
  getReceipts:       (params)      => api.get('/receipts', { params }),
};

export const customersApi = {
  getCustomers:   (params) => api.get('/customers', { params }),
  getCustomer:    (id)     => api.get(`/customers/${id}`),
  createCustomer: (data)   => api.post('/customers', data),
};

export const servicesApi = {
  getServices:      (params) => api.get('/services', { params }),
  getBoothServices: ()       => api.get('/services/booth'),
};
