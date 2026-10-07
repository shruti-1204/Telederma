import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import api from '../services/api';

export const AuthContext = createContext();

const STORAGE_KEYS = {
  TOKEN: '@telederma_auth_token',
  PROFILE_COMPLETED: '@telederma_profile_completed',
  PATIENT_PROFILE: '@telederma_patient_profile',
  ACTIVE_PHONE: '@telederma_active_phone',
};

const DEFAULT_PROFILE = {
  photoUri: null,
  name: '',
  age: '',
  gender: '',
  phone: '',
  email: '',
  allergies: '',
  existingConditions: '',
  previousSkinProblems: '',
  currentMedications: '',
  previousTreatments: '',
  medicalHistory: '',
  medicalInfoSkipped: false,
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [isProfileCompleted, setIsProfileCompleted] = useState(false);
  const [patient, setPatient] = useState(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedCompleted = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_COMPLETED);
      const storedProfile = await AsyncStorage.getItem(STORAGE_KEYS.PATIENT_PROFILE);

      let cachedPhoto = null;
      if (storedProfile) {
        try {
          cachedPhoto = JSON.parse(storedProfile)?.photoUri || null;
        } catch (e) {}
      }

      if (storedToken) {
        setToken(storedToken);

        // Fetch latest profile from live backend database
        try {
          const res = await api.get('/patients/me');
          const dbPatient = res.data?.data;
          if (dbPatient) {
            const photo = dbPatient.avatar || dbPatient.user?.avatar || cachedPhoto;
            const mapped = {
              ...DEFAULT_PROFILE,
              photoUri: photo,
              name: dbPatient.user?.name || '',
              email: dbPatient.user?.email || '',
              phone: dbPatient.user?.phone || '',
              gender: dbPatient.gender || '',
              allergies: dbPatient.allergies || '',
              existingConditions: dbPatient.existingConditions || '',
              currentMedications: dbPatient.currentMedications || '',
              previousSkinProblems: dbPatient.skinHistory || '',
              emergencyContact: dbPatient.emergencyContact || '',
            };
            setPatient(mapped);
            const isCompleted = !!dbPatient.user?.name;
            setIsProfileCompleted(isCompleted);
            await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_COMPLETED, isCompleted ? 'true' : 'false');
            await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_PROFILE, JSON.stringify(mapped));
            setLoading(false);
            return;
          }
        } catch (apiErr) {
          console.warn('Could not sync with backend /patients/me, using local cached session:', apiErr.message);
        }

        // Fallback to local storage if offline
        const isCompleted = storedCompleted === 'true';
        setIsProfileCompleted(isCompleted);

        if (storedProfile) {
          try {
            setPatient(JSON.parse(storedProfile));
          } catch (e) {
            setPatient(DEFAULT_PROFILE);
          }
        }
      } else {
        setToken(null);
        setIsProfileCompleted(false);
        setPatient(DEFAULT_PROFILE);
      }
    } catch (e) {
      console.log('Error loading patient session:', e);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Request WhatsApp OTP
   */
  const requestWhatsAppOtp = async (phone) => {
    return await authService.sendOTP(phone);
  };

  /**
   * Verify WhatsApp OTP
   */
  const verifyWhatsAppOtp = async (phone, otp) => {
    const result = await authService.verifyOTP(phone, otp);
    if (!result.success) {
      return result;
    }

    const authToken = result.token;
    setToken(authToken);
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, authToken);
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_PHONE, phone);

    // Check if the user already has a name in backend database
    const user = result.user;
    if (user && user.name && user.name.trim().length > 0) {
      // Existing patient returning!
      try {
        const res = await api.get('/patients/me');
        const dbPatient = res.data?.data;
        if (dbPatient) {
          const profileData = {
            ...DEFAULT_PROFILE,
            photoUri: dbPatient.avatar || dbPatient.user?.avatar || null,
            name: dbPatient.user?.name || user.name,
            phone: dbPatient.user?.phone || phone,
            email: dbPatient.user?.email || user.email || '',
            gender: dbPatient.gender || '',
            allergies: dbPatient.allergies || '',
            existingConditions: dbPatient.existingConditions || '',
            currentMedications: dbPatient.currentMedications || '',
            previousSkinProblems: dbPatient.skinHistory || '',
          };
          setPatient(profileData);
          setIsProfileCompleted(true);
          await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_COMPLETED, 'true');
          await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_PROFILE, JSON.stringify(profileData));
          return { success: true, isNewUser: false };
        }
      } catch (err) {
        console.warn('Failed to fetch full patient profile:', err.message);
      }

      setIsProfileCompleted(true);
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_COMPLETED, 'true');
      return { success: true, isNewUser: false };
    }

    // New patient needing profile setup
    const initialProfile = {
      ...DEFAULT_PROFILE,
      phone: phone,
    };
    setPatient(initialProfile);
    setIsProfileCompleted(false);
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_COMPLETED, 'false');
    await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_PROFILE, JSON.stringify(initialProfile));

    return { success: true, isNewUser: true };
  };

  /**
   * Resend WhatsApp OTP
   */
  const resendWhatsAppOtp = async (phone) => {
    return await authService.resendOTP(phone);
  };

  /**
   * Save Personal Profile (Step 1 of Profile Setup)
   */
  const savePersonalProfile = async (personalData) => {
    const updated = {
      ...patient,
      ...personalData,
    };
    setPatient(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_PROFILE, JSON.stringify(updated));

    // Sync to PostgreSQL backend including avatar
    try {
      await api.put('/patients/me', {
        name: personalData.name,
        gender: personalData.gender,
        email: personalData.email || '',
        avatar: personalData.photoUri !== undefined ? personalData.photoUri : null,
      });
    } catch (err) {
      console.warn('Failed to sync personal profile to backend:', err.message);
    }

    return updated;
  };

  /**
   * Save Medical Information (Step 2 of Profile Setup)
   */
  const saveMedicalProfile = async (medicalData, isSkipped = false) => {
    const updated = {
      ...patient,
      ...medicalData,
      medicalInfoSkipped: isSkipped,
    };
    setPatient(updated);
    setIsProfileCompleted(true);
    await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_PROFILE, JSON.stringify(updated));
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_COMPLETED, 'true');

    // Sync to PostgreSQL backend if provided
    if (!isSkipped && medicalData) {
      try {
        await api.put('/patients/me', {
          allergies: medicalData.allergies,
          existingConditions: medicalData.existingConditions,
          currentMedications: medicalData.currentMedications,
          skinHistory: medicalData.previousSkinProblems,
          avatar: patient.photoUri !== undefined ? patient.photoUri : null,
        });
      } catch (err) {
        console.warn('Failed to sync medical profile to backend:', err.message);
      }
    }

    return updated;
  };

  /**
   * Update full profile (from View / Edit Profile screen)
   */
  const updateProfile = async (updatedFields) => {
    const updated = {
      ...patient,
      ...updatedFields,
    };
    setPatient(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_PROFILE, JSON.stringify(updated));

    // Sync to PostgreSQL backend
    try {
      await api.put('/patients/me', {
        name: updated.name,
        gender: updated.gender,
        email: updated.email || '',
        allergies: updated.allergies,
        existingConditions: updated.existingConditions,
        currentMedications: updated.currentMedications,
        skinHistory: updated.previousSkinProblems,
        avatar: updated.photoUri !== undefined ? updated.photoUri : null,
      });
    } catch (err) {
      console.warn('Failed to sync updated profile to backend:', err.message);
    }

    return updated;
  };

  /**
   * Logout and clear local session state
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout').catch(() => {});
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE_COMPLETED);
    } catch (e) {
      console.log('Error during logout:', e);
    }
    setToken(null);
    setIsProfileCompleted(false);
    setPatient(DEFAULT_PROFILE);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isProfileCompleted,
        patient,
        loading,
        requestWhatsAppOtp,
        verifyWhatsAppOtp,
        resendWhatsAppOtp,
        savePersonalProfile,
        saveMedicalProfile,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
