import api from './client';

export const usersApi = {
  getUsers:            (params)           => api.get('/users', { params }),
  getUser:             (id)               => api.get(`/users/${id}`),
  createUser:          (data)             => api.post('/users', data),
  updateUser:          (id, data)         => api.put(`/users/${id}`, data),
  updatePermissions:   (id, permissions)  => api.put(`/users/${id}/permissions`, { permissions }),
  changePassword:      (id, password)     => api.put(`/users/${id}/password`, { newPassword: password }),
  deactivate:          (id)               => api.put(`/users/${id}/deactivate`),
  activate:            (id)               => api.put(`/users/${id}/activate`),
  deleteUser:          (id)               => api.delete(`/users/${id}`),
  getStats:            ()                 => api.get('/users/stats'),
};
