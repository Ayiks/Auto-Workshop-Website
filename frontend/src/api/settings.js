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

  // Get booth service
  getBoothService: async () => {
    const response = await apiClient.get('/services/booth');
    return response;
  },

  // Update booth service price
  updateBoothPrice: async (price) => {
    const response = await apiClient.put('/services/booth', { price });
    return response;
  },

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