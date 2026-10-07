import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const AuthContext = createContext();

const STORAGE_KEYS = {
  TOKEN: 'doctorToken',
  PROFILE_COMPLETED: 'doctor_profile_completed',
  PROFILE_CACHE: 'doctor_profile_cache',
};

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [doctorToken, setDoctorToken] = useState(null);
  const [isProfileCompleted, setIsProfileCompleted] = useState(false);
  const [doctor, setDoctor] = useState(null);

  // Helper to determine if doctor profile has all required mandatory fields
  const checkProfileCompleteness = (doc) => {
    if (!doc) return false;
    if (typeof doc.isProfileCompleted === 'boolean') {
      return doc.isProfileCompleted;
    }
    const hasQual = !!doc.qualification && doc.qualification.trim().length > 0;
    const hasSpec = !!doc.specialization && doc.specialization.trim().length > 0;
    const hasHosp = !!doc.hospitalClinic && doc.hospitalClinic.trim().length > 0;
    const hasFee = doc.consultationFee !== null && doc.consultationFee !== undefined && String(doc.consultationFee).trim().length > 0;
    const hasExp = doc.experienceYears !== null && doc.experienceYears !== undefined;
    const hasLang = !!doc.languages && doc.languages.trim().length > 0;
    return hasQual && hasSpec && hasHosp && hasFee && hasExp && hasLang;
  };

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedCompleted = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_COMPLETED);
      const cachedProfileStr = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_CACHE);

      let cachedDoc = null;
      if (cachedProfileStr) {
        try {
          cachedDoc = JSON.parse(cachedProfileStr);
          setDoctor(cachedDoc);
        } catch (e) {}
      }

      if (token) {
        setDoctorToken(token);

        // Fetch fresh profile from PostgreSQL backend
        try {
          const res = await api.get('/doctors/me');
          const freshDoc = res.data?.data;
          if (freshDoc) {
            setDoctor(freshDoc);
            const isCompleted = checkProfileCompleteness(freshDoc);
            setIsProfileCompleted(isCompleted);
            await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_COMPLETED, isCompleted ? 'true' : 'false');
            await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_CACHE, JSON.stringify(freshDoc));
            setInitialLoading(false);
            return;
          }
        } catch (apiErr) {
          console.warn('[Doctor Auth] Could not sync with backend /doctors/me, falling back to local storage:', apiErr.message);
        }

        // Fallback to local storage
        const fallbackCompleted = storedCompleted === 'true' || checkProfileCompleteness(cachedDoc);
        setIsProfileCompleted(fallbackCompleted);
      } else {
        setDoctorToken(null);
        setIsProfileCompleted(false);
        setDoctor(null);
      }
    } catch (e) {
      console.error('Failed to load doctor login status', e);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Login function
  const login = async (phone, otp, role = 'DOCTOR') => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', { phone, otp, role });
      const token = response.data.data?.accessToken;
      
      if (token) {
        setDoctorToken(token);
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);

        // Fetch doctor profile to verify if registration setup is completed
        try {
          const docRes = await api.get('/doctors/me');
          const docData = docRes.data?.data;
          if (docData) {
            setDoctor(docData);
            const isCompleted = checkProfileCompleteness(docData);
            setIsProfileCompleted(isCompleted);
            await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_COMPLETED, isCompleted ? 'true' : 'false');
            await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_CACHE, JSON.stringify(docData));
            return { success: true, isProfileCompleted: isCompleted, doctor: docData };
          }
        } catch (fetchErr) {
          console.warn('[Doctor Auth] Initial doctor profile fetch warning:', fetchErr.message);
        }

        setIsProfileCompleted(false);
        await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_COMPLETED, 'false');
        return { success: true, isProfileCompleted: false };
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

  // Complete profile setup for first-time doctors
  const completeDoctorProfile = async (profileData) => {
    setIsLoading(true);
    try {
      const res = await api.put('/doctors/me', profileData);
      const updatedDoc = res.data?.data;
      setDoctor(updatedDoc || profileData);
      setIsProfileCompleted(true);
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_COMPLETED, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_CACHE, JSON.stringify(updatedDoc || profileData));
      return { success: true, data: updatedDoc };
    } catch (err) {
      console.error('Failed to save complete doctor profile:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to save profile';
      throw new Error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile from Doctor Profile screen
  const updateProfile = async (updatedFields) => {
    setIsLoading(true);
    try {
      const res = await api.put('/doctors/me', updatedFields);
      const updatedDoc = res.data?.data;
      setDoctor(updatedDoc || { ...doctor, ...updatedFields });
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_CACHE, JSON.stringify(updatedDoc || { ...doctor, ...updatedFields }));
      return { success: true, data: updatedDoc };
    } catch (err) {
      console.error('Failed to update doctor profile:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to update profile';
      throw new Error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const setManualToken = async (token) => {
    setDoctorToken(token);
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
  };

  const logout = async () => {
    setDoctorToken(null);
    setIsProfileCompleted(false);
    setDoctor(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE_COMPLETED);
    await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE_CACHE);
  };

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        doctorToken,
        isProfileCompleted,
        doctor,
        isLoading,
        initialLoading,
        completeDoctorProfile,
        updateProfile,
        setManualToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
