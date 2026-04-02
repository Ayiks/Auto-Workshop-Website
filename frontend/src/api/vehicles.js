import api from './client';

export const vehiclesApi = {
  getVehicles: async (customerId) => {
    const response = await api.get('/vehicles', { params: { customerId } });
    return response.data;
  },

  createVehicle: async (data) => {
    const response = await api.post('/vehicles', data);
    return response.data;
  },

  updateVehicle: async (id, data) => {
    const response = await api.put(`/vehicles/${id}`, data);
    return response.data;
  },

  deleteVehicle: async (id) => {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
  },
};
