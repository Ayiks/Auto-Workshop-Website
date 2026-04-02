import api from './client';
export const customersApi = {
  // Get all customers (supports ?search= query)
  getCustomers: async (params) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  // Get a single customer with vehicles
  getCustomer: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  // Create a new customer
  createCustomer: async (data) => {
    const response = await api.post('/customers', data);
    return response.data;
  },

  // Update an existing customer
  updateCustomer: async (id, data) => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data;
  },

  // Delete (soft delete) a customer
  deleteCustomer: async (id) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },
};