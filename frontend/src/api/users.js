// src/api/users.js
import apiClient from './client';

// ============================================
// USERS API
// ============================================
export const usersApi = {
  // Get all users with filters
  getUsers: async (params) => {
    const response = await apiClient.get('/users', { params });
    return response;
  },

  // Get single user
  getUser: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response;
  },

  // Create new user
  createUser: async (data) => {
    const response = await apiClient.post('/users', data);
    return response;
  },

  // Update user
  updateUser: async (id, data) => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response;
  },

  // Update user permissions
  updateUserPermissions: async (id, permissions) => {
    const response = await apiClient.put(`/users/${id}/permissions`, { permissions });
    return response;
  },

  // Change user password
  changeUserPassword: async (id, newPassword) => {
    const response = await apiClient.put(`/users/${id}/password`, { newPassword });
    return response;
  },

  // Deactivate user
  deactivateUser: async (id) => {
    const response = await apiClient.put(`/users/${id}/deactivate`);
    return response;
  },

  // Activate user
  activateUser: async (id) => {
    const response = await apiClient.put(`/users/${id}/activate`);
    return response;
  },

  // Delete user
  deleteUser: async (id) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response;
  },

  // Get user statistics
  getUserStats: async () => {
    const response = await apiClient.get('/users/stats');
    return response;
  },
};

export default usersApi;