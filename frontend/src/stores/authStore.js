import { create } from 'zustand';
import { authApi } from '@api/auth';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  // Initialize auth state from localStorage
  initAuth: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      set({
        token,
        user: JSON.parse(user),
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  // Login
  login: async (credentials) => {
    try {
      const response = await authApi.login(credentials);
      // Response is already unwrapped by axios interceptor
      const { token, user } = response.data || response;

      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Update state
      set({
        token,
        user,
        isAuthenticated: true,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Logout
  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Clear state
      set({
        token: null,
        user: null,
        isAuthenticated: false,
      });
    }
  },

  // Refresh current user
  refreshUser: async () => {
    try {
      const response = await authApi.getCurrentUser();
      // Response is already unwrapped by axios interceptor
      const user = response.data?.user || response.user;

      localStorage.setItem('user', JSON.stringify(user));
      set({ user });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Check if user has permission
  hasPermission: (module, action) => {
    const { user } = get();
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;

    const permissions = user.permissions || {};
    const modulePermissions = permissions[module] || [];
    
    return modulePermissions.includes(action);
  },

  // Check if user has role
  hasRole: (role) => {
    const { user } = get();
    if (!user) return false;
    
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    
    return user.role === role;
  },
}));