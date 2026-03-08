import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';
import { sandboxApi } from '../api/sandbox';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isSandbox: false,
  sandboxExpiresAt: null,

  initAuth: async () => {
    try {
      const [token, userStr, sandboxExpiresAt] = await AsyncStorage.multiGet([
        'auth_token',
        'auth_user',
        'sandboxExpiresAt',
      ]);
      const tokenVal   = token[1];
      const userVal    = userStr[1];
      const sandboxVal = sandboxExpiresAt[1];

      if (tokenVal && userVal) {
        set({
          token: tokenVal,
          user: JSON.parse(userVal),
          isAuthenticated: true,
          isLoading: false,
          error: null,
          isSandbox: !!sandboxVal,
          sandboxExpiresAt: sandboxVal || null,
        });
      } else {
        set({ token: null, user: null, isAuthenticated: false, isLoading: false, isSandbox: false, sandboxExpiresAt: null });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (credentials) => {
    set({ error: null });
    try {
      const response = await authApi.login(credentials);
      const { token, user } = response.data || response;
      await AsyncStorage.multiSet([['auth_token', token], ['auth_user', JSON.stringify(user)]]);
      set({ token, user, isAuthenticated: true, error: null });
      return user;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  loginAsSandbox: async () => {
    set({ error: null });
    try {
      const response = await sandboxApi.createSandbox();
      const { token, user, expiresAt } = response;
      await AsyncStorage.multiSet([
        ['auth_token', token],
        ['auth_user', JSON.stringify(user)],
        ['sandboxExpiresAt', expiresAt],
      ]);
      set({ token, user, isAuthenticated: true, error: null, isSandbox: true, sandboxExpiresAt: expiresAt });
      return user;
    } catch (error) {
      set({ error: error.message || 'Failed to create demo. Please try again.' });
      throw error;
    }
  },

  registerUser: async (userData) => {
    set({ error: null });
    try {
      if (userData.password.length < 8) throw new Error('Password must be at least 8 characters long');
      await authApi.register(userData);
      return { success: true };
    } catch (error) {
      set({ error: error.message || 'Registration failed' });
      throw error;
    }
  },

  verifyEmail: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const { token: authToken, user } = await authApi.verifyEmail(token);
      if (!authToken || !user) throw new Error('Missing token or user data in response');
      await AsyncStorage.multiSet([['auth_token', authToken], ['auth_user', JSON.stringify(user)]]);
      set({ user, token: authToken, isAuthenticated: true, isLoading: false, error: null });
      return { token: authToken, user };
    } catch (error) {
      set({ error: error.message || 'Verification failed', isLoading: false });
      throw error;
    }
  },

  setupWorkspace: async (workspaceData) => {
    set({ isLoading: true, error: null });
    try {
      const { token, data: user } = await authApi.setupWorkspace(workspaceData);
      await AsyncStorage.multiSet([['auth_token', token], ['auth_user', JSON.stringify(user)]]);
      set({ token, user, isAuthenticated: true, isLoading: false, error: null });
      return user;
    } catch (error) {
      set({ error: error.message || 'Workspace setup failed', isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch {}
    await AsyncStorage.multiRemove(['auth_token', 'auth_user', 'sandboxExpiresAt']);
    set({ token: null, user: null, isAuthenticated: false, isLoading: false, error: null, isSandbox: false, sandboxExpiresAt: null });
  },

  refreshUser: async () => {
    try {
      const response = await authApi.getCurrentUser();
      const user = response.data?.user || response.user;
      await AsyncStorage.setItem('auth_user', JSON.stringify(user));
      set({ user });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  hasPermission: (module, action) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'admin') return true;
    const permissions = user.permissions || {};
    return (permissions[module] || []).includes(action);
  },

  hasRole: (role) => {
    const { user } = get();
    if (!user) return false;
    return Array.isArray(role) ? role.includes(user.role) : user.role === role;
  },

  setUser: async (userData) => {
    await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
    set({ user: userData });
  },

  clearError: () => set({ error: null }),
}));
