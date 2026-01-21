// src/api/settings.js
import apiClient from './client';

// ============================================
// SETTINGS API
// ============================================
export const settingsApi = {
  // Get business settings (public - no auth)
  getBusinessSettings: async () => {
    const response = await apiClient.get('/settings/business');
    return response;
  },

  // Update business settings
  updateBusinessSettings: async (data) => {
    const response = await apiClient.put('/settings/business', data);
    return response;
  },

  // ========================
  // BOOTH SERVICES API
  // ========================
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

  // Get booth service categories (for sale form)
  getServiceCategories: async () => {
    const response = await apiClient.get('/services/booth/categories');
    return response;
  },

  // Get item categories for a service category (for sale form)
  getItemCategories: async (serviceCategory) => {
    const response = await apiClient.get(`/services/booth/items/${serviceCategory}`);
    return response;
  },

  // Get service price by category combination (for sale form)
  getServicePrice: async (serviceCategory, itemCategory) => {
    const response = await apiClient.get('/services/booth/price', {
      params: { serviceCategory, itemCategory }
    });
    return response;
  },

  // ========================
  // USER PROFILE API
  // ========================
  // Get current user profile
  getProfile: async () => {
    const response = await apiClient.get('/auth/me');
    return response;
  },

  // Update own profile
  updateProfile: async (data) => {
    const response = await apiClient.put('/auth/me', data);
    return response;
  },

  // Change own password
  changeOwnPassword: async (currentPassword, newPassword) => {
    const response = await apiClient.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response;
  },
};

export default settingsApi;