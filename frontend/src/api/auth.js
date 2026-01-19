import apiClient from './client';

export const authApi = {
  // Login
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response;
  },

  // Change password
  changePassword: async (data) => {
    const response = await apiClient.put('/auth/change-password', data);
    return response;
  },

  // Logout
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response;
  },
};