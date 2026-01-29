// src/api/sales.js
import apiClient from './client';

// ============================================
// SALES API
// ============================================
export const salesApi = {
  // Create counter sale
  createSale: async (data) => {
    const response = await apiClient.post('/sales', data);
    return response;
  },

  // Get all sales with filters
  getSales: async (params) => {
    const response = await apiClient.get('/sales', { params });
    return response;
  },

  // Get single sale
  getSale: async (id) => {
    const response = await apiClient.get(`/sales/${id}`);
    return response;
  },

  // Update sale (edit items/payment method)
  updateSale: async (id, data) => {
    const response = await apiClient.put(`/sales/${id}`, data);
    return response;
  },

  // Delete/Reverse sale
  deleteSale: async (id, data) => {
    const response = await apiClient.delete(`/sales/${id}`, { data });
    return response;
  },

  // Get sales statistics
  getSalesStats: async (params) => {
    const response = await apiClient.get('/sales/stats', { params });
    return response;
  },

  addPayment:async (id, data) => {
    const reponse = await apiClient.post(`/sales/${id}/payment`, data);
    return reponse;
  }
};

// ============================================
// RECEIPTS API
// ============================================
export const receiptsApi = {
  // Get receipt by sale ID
  getSaleReceipt: async (saleId) => {
    const response = await apiClient.get(`/receipts/sale/${saleId}`);
    return response;
  },

  // Get receipt by payment ID
  getPaymentReceipt: async (paymentId) => {
    const response = await apiClient.get(`/receipts/payment/${paymentId}`);
    return response;
  },

  // Get receipt by receipt number
  getReceiptByNumber: async (receiptNumber) => {
    const response = await apiClient.get(`/receipts/number/${receiptNumber}`);
    return response;
  },

  // Get all receipts
  getReceipts: async (params) => {
    const response = await apiClient.get('/receipts', { params });
    return response;
  },

  // Get single receipt
  getReceipt: async (id) => {
    const response = await apiClient.get(`/receipts/${id}`);
    return response;
  },

  // Get receipt statistics
  getReceiptStats: async () => {
    const response = await apiClient.get('/receipts/stats');
    return response;
  },
};

// ============================================
// SERVICES API (for booth service)
// ============================================
export const servicesApi = {
  // Get booth service
  getBoothService: async () => {
    const response = await apiClient.get('/services/booth');
    return response;
  },

  // Update booth service price (admin only)
  updateBoothPrice: async (price) => {
    const response = await apiClient.put('/services/booth/price', { price });
    return response;
  },
};

export default { salesApi, receiptsApi, servicesApi };