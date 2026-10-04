import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LOCAL_IP = '192.168.0.106';
const PORT = '5000';

const getHost = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return LOCAL_IP;
};

export const BASE_URL = `http://${getHost()}:${PORT}/api/v1`;

const api = axios.create({
  baseURL: BASE_URL,
});

// Interceptor to attach JWT token to every request automatically
api.interceptors.request.use(
  async (config) => {
    // Fetch the REAL token of the logged-in doctor
    const token = await AsyncStorage.getItem('doctorToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // If token is invalid or user deleted, clear local storage
      await AsyncStorage.removeItem('doctorToken');
      // A full app reload might be needed, or context will handle it if wired up
    }
    return Promise.reject(error);
  }
);

export default api;

