import api from './client';

export const sandboxApi = {
  create:    () => api.post('/sandboxes/create'),
  getStatus: () => api.get('/sandboxes/status'),
};
