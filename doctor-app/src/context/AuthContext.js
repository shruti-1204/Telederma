import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [doctorToken, setDoctorToken] = useState(null);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('doctorToken');
      if (token) {
        setDoctorToken(token);
      }
    } catch (e) {
      console.error('Failed to load token', e);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Real backend Login function
  const login = async (phone, otp, role = 'DOCTOR') => {
    setIsLoading(true);
    try {
      // Hit real backend
      const response = await api.post('/auth/verify-otp', { phone, otp, role });
      
      const token = response.data.data?.accessToken; // Adjust based on Mayuri's API response structure
      
      if (token) {
        setDoctorToken(token);
        await AsyncStorage.setItem('doctorToken', token);
        console.log('Login successful');
        return { success: true };
      } else {
        alert('Invalid response from server.');
        return { success: false };
      }
    } catch (error) {
      console.error('Login failed', error.response?.data || error);
      alert(error.response?.data?.message || 'Login Failed. Please check your OTP.');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const setManualToken = async (token) => {
    setDoctorToken(token);
    await AsyncStorage.setItem('doctorToken', token);
  };

  const logout = async () => {
    setDoctorToken(null);
    await AsyncStorage.removeItem('doctorToken');
  };

  return (
    <AuthContext.Provider value={{ login, logout, doctorToken, isLoading, setManualToken }}>
      {children}
    </AuthContext.Provider>
  );
};
