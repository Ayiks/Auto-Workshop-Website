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
};