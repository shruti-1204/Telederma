import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

const DEFAULT_IP = '192.168.0.104';
const PORT = '5000';

export const getHost = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {}
  return DEFAULT_IP;
};

export const BASE_URL = `http://${getHost()}:${PORT}/api/v1`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Interceptor to attach JWT token to every request automatically and resolve current host dynamically
api.interceptors.request.use(
  async (config) => {
    try {
      const host = getHost();
      if (host) {
        config.baseURL = `http://${host}:${PORT}/api/v1`;
      }
      const token = await AsyncStorage.getItem('doctorToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Failed to attach doctor token:', e);
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
      await AsyncStorage.removeItem('doctorToken');
    }
    return Promise.reject(error);
  }
);

export default api;
