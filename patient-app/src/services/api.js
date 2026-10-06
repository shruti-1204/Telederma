import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

const DEFAULT_IP = '192.168.0.104';
const PORT = '5000';

export const getHost = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  // Mobile app: automatically extract host IP from Metro bundle URL
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

// Web dynamically matches window.location.hostname, physical mobile devices on Wi-Fi use local network IP
export const BASE_URL = `http://${getHost()}:${PORT}/api/v1`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-inject JWT access token on every authenticated request and resolve current host dynamically
api.interceptors.request.use(
  async (config) => {
    try {
      const host = getHost();
      if (host) {
        config.baseURL = `http://${host}:${PORT}/api/v1`;
      }
      const token = await AsyncStorage.getItem('@telederma_auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Failed to load auth token for request', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-logout handling if 401 Unauthorized is returned
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Session expired or unauthorized. Clearing stored token.');
      await AsyncStorage.removeItem('@telederma_auth_token');
      await AsyncStorage.removeItem('@telederma_profile_completed');
    }
    return Promise.reject(error);
  }
);

export default api;
