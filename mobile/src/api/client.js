import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject auth token on every request
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

// Normalize error responses
apiClient.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const data    = err.response?.data;
    const message = data?.message || err.message || 'Something went wrong';
    const code    = data?.code    || 'UNKNOWN_ERROR';
    const status  = err.response?.status;

    // On 401 clear storage — navigation handles redirect
    if (status === 401) {
      AsyncStorage.multiRemove(['auth_token', 'auth_user']).catch(() => {});
    }

    return Promise.reject({ message, code, status, details: data?.details });
  }
);

export default apiClient;
