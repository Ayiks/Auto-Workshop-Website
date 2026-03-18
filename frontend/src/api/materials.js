import apiClient from './client';

export const materialsApi = {
  // Get all materials
  getMaterials: async (params) => {
    const response = await apiClient.get('/materials', { params });
    return response;
  },

  // Get single material
  getMaterial: async (id) => {
    const response = await apiClient.get(`/materials/${id}`);
    return response;
  },

  // Create material
  createMaterial: async (data) => {
    const response = await apiClient.post('/materials', data);
    return response;
  },

  // Update material
  updateMaterial: async (id, data) => {
    const response = await apiClient.put(`/materials/${id}`, data);
    return response;
  },

  // Delete material
  deleteMaterial: async (id) => {
    const response = await apiClient.delete(`/materials/${id}`);
    return response;
  },

  // Get low stock materials
  getLowStockMaterials: async () => {
    const response = await apiClient.get('/materials/low-stock');
    return response;
  },

  // Reorder material
  reorderMaterial: async (id, data) => {
    const response = await apiClient.post(`/materials/${id}/reorder`, data);
    return response;
  },

  // Get reorder history
  getReorderHistory: async (id) => {
    const response = await apiClient.get(`/materials/${id}/reorders`);
    return response;
  },

  bulkReorderMaterials: async (data) => {
    const payload = Array.isArray(data) ? { items: data } : data;
    const response = await apiClient.post('/materials/bulk-reorder', payload);
    return response.data;
  },

  // Get inventory snapshot at a given date
  getInventorySnapshot: async (date) => {
    const response = await apiClient.get('/materials/snapshot', { params: { date } });
    return response;
  },

  // Get all restock orders
  getRestockOrders: async (params) => {
    const response = await apiClient.get('/materials/restock-orders', { params });
    return response;
  },

  // Mark all items in a restock order as received (orderId is a UUID string)
  receiveRestockOrder: async (orderId) => {
    const response = await apiClient.post(`/materials/restock-orders/${orderId}/receive`);
    return response;
  },
};