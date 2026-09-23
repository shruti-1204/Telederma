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

  const login = async (mobile, otp) => {
    setIsLoading(true);
    
    // --- TEMPORARY UI BYPASS (Since Mayuri's backend is not running locally right now) ---
    setTimeout(async () => {
      const fakeToken = "dummy-dev-token-123";
      setDoctorToken(fakeToken);
      await AsyncStorage.setItem('doctorToken', fakeToken);
      setIsLoading(false);
    }, 800); // Wait 0.8 seconds to simulate network, then let you in!

    /* === REAL CODE (Commented out until we connect to backend) ===
    try {
      const response = await api.post('/auth/verify-otp', { mobile, otp, role: 'DOCTOR' });
      const token = response.data.token;
      
      setDoctorToken(token);
      await AsyncStorage.setItem('doctorToken', token);
      console.log('Login successful');
    } catch (error) {
      console.error('Login failed', error);
      alert('Login Failed. Please check your OTP.');
    }
    setIsLoading(false);
    =============================================================== */
  };

  const logout = async () => {
    setDoctorToken(null);
    await AsyncStorage.removeItem('doctorToken');
  };

  return (
    <AuthContext.Provider value={{ login, logout, doctorToken, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
