import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('auth_user')) || null,
  token: localStorage.getItem('auth_token') || null,
  isAuthenticated: !!localStorage.getItem('auth_token'),
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { username, password });
      
      if (response.success) {
        const { token, user } = response;
        
        // Store in localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        
        // Update state
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        return { success: true };
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error.error?.message || 'Login failed',
      });
      return { success: false, error: error.error?.message };
    }
  },

  logout: () => {
    // Clear localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    
    // Reset state
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  verifyToken: async () => {
    try {
      const response = await api.get('/auth/verify');
      if (response.success) {
        set({ user: response.user, isAuthenticated: true });
        return true;
      }
    } catch (error) {
      // Token invalid, logout
      useAuthStore.getState().logout();
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;