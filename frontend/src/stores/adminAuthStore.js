import { create } from 'zustand';
import { adminApi } from '@api/admin';

export const useAdminAuthStore = create((set) => ({
  superAdmin: null,
  adminToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initAdminAuth: () => {
    try {
      const token = localStorage.getItem('adminToken');
      const raw = localStorage.getItem('adminUser');
      if (token && raw) {
        const superAdmin = JSON.parse(raw);
        set({ adminToken: token, superAdmin, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      set({ isLoading: false });
    }
  },

  login: async ({ email, password }) => {
    set({ error: null });
    try {
      const response = await adminApi.login({ email, password });
      const { token, superAdmin } = response;
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(superAdmin));
      set({ adminToken: token, superAdmin, isAuthenticated: true, error: null });
      return superAdmin;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    set({ adminToken: null, superAdmin: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
