import apiClient from './client';

export const authApi = {
  // Login
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response;
  },

  // Register
  registerUser: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response;
  },

  // Verify Email
  verifyEmail: async (token) => {
    const response = await apiClient.get(`/auth/verify-email/${token}`);
    return response;
  },
  // Setup Workspace  
  setupWorkspace: async (data) => {
    const response = await apiClient.post('/auth/setup-workspace', data);
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