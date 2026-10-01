import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT: Your laptop's Wi-Fi IP changed today. It is now 192.168.1.102
const BASE_URL = 'http://192.168.1.102:5000/api/v1'; 

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
