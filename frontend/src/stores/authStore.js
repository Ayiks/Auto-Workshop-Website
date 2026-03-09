import { create } from 'zustand';
import { authApi } from '@api/auth';
import { sandboxApi } from '@api/sandbox';
import { queryClient } from '../queryClient';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Sandbox state as plain values — never functions.
  // If stored as functions, (s) => s.isSandbox returns the function reference
  // itself (always truthy), making the banner appear on every page.
  isSandbox: false,
  sandboxExpiresAt: null,

  // Initialize auth state from localStorage
  initAuth: () => {
    const token            = localStorage.getItem('token');
    const user             = localStorage.getItem('user');
    const sandboxExpiresAt = localStorage.getItem('sandboxExpiresAt');

    if (token && user) {
      set({
        token,
        user: JSON.parse(user),
        isAuthenticated: true,
        isLoading: false,
        error: null,
        // Rehydrate sandbox state so the banner survives page refreshes
        isSandbox: !!sandboxExpiresAt,
        sandboxExpiresAt: sandboxExpiresAt || null,
      });
    } else {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isSandbox: false,
        sandboxExpiresAt: null,
      });
    }
  },

  // Login
  login: async (credentials) => {
    try {
      const response = await authApi.login(credentials);
      const { token, user } = response.data || response;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      set({ token, user, isAuthenticated: true, error: null });
      return user;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // One-click sandbox / demo login
  loginAsSandbox: async () => {
    // Do NOT set isLoading:true here — isLoading is only for initAuth.
    // Setting it causes App.jsx to unmount the router and show a spinner,
    // so navigate('/app/dashboard') fires into nothing on the first click.
    set({ error: null });
    try {
      const response = await sandboxApi.createSandbox();
      const { token, user, expiresAt } = response;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('sandboxExpiresAt', expiresAt);

      set({
        token,
        user,
        isAuthenticated: true,
        error: null,
        isSandbox: true,
        sandboxExpiresAt: expiresAt,
      });

      return user;
    } catch (error) {
      set({ error: error.message || 'Failed to create demo. Please try again.' });
      throw error;
    }
  },

  // Register
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

  // Verify email
  verifyEmail: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const { token: authToken, user } = await authApi.verifyEmail(token);
      if (!authToken || !user) throw new Error('Missing token or user data in response');
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return { token: authToken, user };
    } catch (error) {
      set({ error: error.message || 'Verification failed', isLoading: false });
      throw error;
    }
  },

  // Setup workspace
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('sandboxExpiresAt');

      // Clear all React Query cached data so the next user sees fresh data
      queryClient.clear();

      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isSandbox: false,
        sandboxExpiresAt: null,
      });
    }
  },

  // Refresh current user
  refreshUser: async () => {
    try {
      const response = await authApi.getCurrentUser();
      const user = response.data?.user || response.user;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Check if user has permission
  hasPermission: (module, action) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'admin') return true;
    const permissions = user.permissions || {};
    return (permissions[module] || []).includes(action);
  },

  // Check if user has role
  hasRole: (role) => {
    const { user } = get();
    if (!user) return false;
    return Array.isArray(role) ? role.includes(user.role) : user.role === role;
  },

  setUser: (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    set({ user: userData });
  },

  clearError: () => set({ error: null }),
}));