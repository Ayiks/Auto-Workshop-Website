import apiClient from './client';

export const salesApi = {
  // Create sale
  createSale: async (data) => {
    const response = await apiClient.post('/sales', data);
    return response;
  },

  // Get all sales
  getSales: async (params) => {
    const response = await apiClient.get('/sales', { params });
    return response;
  },

  // Get single sale
  getSale: async (id) => {
    const response = await apiClient.get(`/sales/${id}`);
    return response;
  },

  // Get sales statistics
  getSalesStats: async (params) => {
    const response = await apiClient.get('/sales/stats', { params });
    return response;
  },
};

// Receipts API
export const receiptsApi = {
  // Get receipt by sale ID
  getSaleReceipt: async (saleId) => {
    const response = await apiClient.get(`/receipts/sale/${saleId}`);
    return response;
  },

  // Get receipt by number
  getReceiptByNumber: async (receiptNumber) => {
    const response = await apiClient.get(`/receipts/number/${receiptNumber}`);
    return response;
  },
};