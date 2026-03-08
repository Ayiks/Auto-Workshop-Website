import api from './client';

export const authApi = {
  login:           (data)   => api.post('/auth/login', data),
  register:        (data)   => api.post('/auth/register', data),
  verifyEmail:     (token)  => api.get(`/auth/verify-email/${token}`),
  setupWorkspace:  (data)   => api.post('/auth/setup-workspace', data),
  getCurrentUser:  ()       => api.get('/auth/me'),
  changePassword:  (data)   => api.put('/auth/change-password', data),
  updateProfile:   (data)   => api.put('/auth/me', data),
  logout:          ()       => api.post('/auth/logout'),
};
