import { create } from 'zustand';
import { authApi } from '@api/auth';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

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
        error: null,
      });
    } else {
      // No token/user in localStorage, clear all auth state
      set({ 
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
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

      // Update state - clear error and set authenticated
      set({
        token,
        user,
        isAuthenticated: true,
        error: null,
      });

      return user;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // registers the user
  registerUser: async (userData) => {
  set({ error: null });
  try {
    if (userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    await authApi.registerUser(userData);
    return { success: true };
  } catch (error) {
    set({ error: error.message || 'Registration failed' });
    throw error;
  }
},

  // Verifies the token and logs in!
  verifyEmail: async (token) => {
  set({ isLoading: true, error: null });
  try {
    const { token: authToken, user } = await authApi.verifyEmail(token);
    if (!authToken || !user) throw new Error("Missing token or user data in response");
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true, isLoading: false, error: null });
    return { token: authToken, user };
  } catch (error) {
    set({ error: error.message || 'Verification failed', isLoading: false });
    throw error;
  }
},

  // Creates the business and updates the token
  setupWorkspace: async (workspaceData) => {
  set({ isLoading: true, error: null });
  try {
    const { token, data: user } = await authApi.setupWorkspace(workspaceData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true, isLoading: false, error: null });
    return user;
  } catch (error) {
    set({ error: error.message || 'Workspace setup failed', isLoading: false });
    throw error;
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

      // Clear ALL state including error and loading
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
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

  setUser: (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    set({ user: userData });
  },

  // Clear error messages
  clearError: () => {
    set({ error: null });
  },
}));