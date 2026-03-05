// src/api/sandbox.js
import apiClient from './client';

export const sandboxApi = {
  // POST /api/sandboxes/create — no auth required
  createSandbox: () => apiClient.post('/sandboxes/create'),

  // GET /api/sandboxes/status — requires auth
  getSandboxStatus: () => apiClient.get('/sandboxes/status'),
};