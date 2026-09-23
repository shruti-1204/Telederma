import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your actual local IP or backend URL when deploying
const BASE_URL = 'http://localhost:3000/api'; 

const api = axios.create({
  baseURL: BASE_URL,
});

// Interceptor to attach JWT token to every request automatically
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('doctorToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
