// src/api/boothServices.js
import apiClient from './client';

// ============================================
// BOOTH SERVICES API
// ============================================
export const boothServicesApi = {
  // Get all booth services
  getBoothServices: async (params) => {
    const response = await apiClient.get('/services/booth', { params });
    return response;
  },

  // Get single booth service
  getBoothService: async (id) => {
    const response = await apiClient.get(`/services/booth/${id}`);
    return response;
  },

  // Create booth service
  createBoothService: async (data) => {
    const response = await apiClient.post('/services/booth', data);
    return response;
  },

  // Update booth service
  updateBoothService: async (id, data) => {
    const response = await apiClient.put(`/services/booth/${id}`, data);
    return response;
  },

  // Delete booth service
  deleteBoothService: async (id) => {
    const response = await apiClient.delete(`/services/booth/${id}`);
    return response;
  },

  // Toggle booth service status
  toggleBoothService: async (id) => {
    const response = await apiClient.put(`/services/booth/${id}/toggle`);
    return response;
  },

  // Get booth service statistics
  getBoothServiceStats: async () => {
    const response = await apiClient.get('/services/booth/stats');
    return response;
  },
};

export default boothServicesApi;