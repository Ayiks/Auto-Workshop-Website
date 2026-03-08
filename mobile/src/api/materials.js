import api from './client';

export const materialsApi = {
  getMaterials:       (params)    => api.get('/materials', { params }),
  getMaterial:        (id)        => api.get(`/materials/${id}`),
  createMaterial:     (data)      => api.post('/materials', data),
  updateMaterial:     (id, data)  => api.put(`/materials/${id}`, data),
  deleteMaterial:     (id)        => api.delete(`/materials/${id}`),
  getLowStock:        ()          => api.get('/materials/low-stock'),
  reorder:            (id, data)  => api.post(`/materials/${id}/reorder`, data),
  bulkReorder:        (data)      => api.post('/materials/bulk-reorder', data),
};
