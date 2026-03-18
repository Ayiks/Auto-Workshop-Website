import apiClient from './client';

export const vendorsApi = {
  getVendors: async (params) => {
    const response = await apiClient.get('/vendors', { params });
    return response;
  },

  getVendor: async (id) => {
    const response = await apiClient.get(`/vendors/${id}`);
    return response;
  },

  createVendor: async (data) => {
    const response = await apiClient.post('/vendors', data);
    return response;
  },

  updateVendor: async (id, data) => {
    const response = await apiClient.put(`/vendors/${id}`, data);
    return response;
  },

  deleteVendor: async (id) => {
    const response = await apiClient.delete(`/vendors/${id}`);
    return response;
  },
};
