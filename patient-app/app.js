import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ConsultationProvider } from './src/context/ConsultationContext';

// Authentication & Profile Setup Screens
import LoginScreen from './src/screens/LoginScreen';
import WhatsAppOTPScreen from './src/screens/WhatsAppOTPScreen';
import PersonalProfileSetupScreen from './src/screens/PersonalProfileSetupScreen';
import MedicalProfileSetupScreen from './src/screens/MedicalProfileSetupScreen';

// Main Application Screens
import DashboardScreen from './src/screens/DashboardScreen';
import ConsultationFlowScreen from './src/screens/ConsultationFlowScreen';
import AiAssistantScreen from './src/screens/AiAssistantScreen';
import MedicineBrandFinderScreen from './src/screens/MedicineBrandFinderScreen';
import MedicalRecordsScreen from './src/screens/MedicalRecordsScreen';
import DoctorListScreen from './src/screens/DoctorListScreen';
import DoctorProfileScreen from './src/screens/DoctorProfileScreen';
import BookAppointmentScreen from './src/screens/BookAppointmentScreen';
import VideoCallScreen from './src/screens/VideoCallScreen';
import PrescriptionScreen from './src/screens/PrescriptionScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import SkinProfileSetupScreen from './src/screens/SkinProfileSetupScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { token, isProfileCompleted, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#F6FAF9',
        }}
      >
        <ActivityIndicator size="large" color="#0B6B6B" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#F6FAF9' },
        }}
      >
        {token === null ? (
          // 1. Unauthenticated: Login & WhatsApp OTP verification
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="WhatsAppOTP" component={WhatsAppOTPScreen} />
          </>
        ) : !isProfileCompleted ? (
          // 2. First-time Authenticated: Compulsory Personal Info -> Optional Medical Info
          <>
            <Stack.Screen
              name="PersonalProfileSetup"
              component={PersonalProfileSetupScreen}
            />
            <Stack.Screen
              name="MedicalProfileSetup"
              component={MedicalProfileSetupScreen}
            />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
          </>
        ) : (
          // 3. Authenticated & Onboarded: Full TeleDerma Application
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="ConsultationFlow" component={ConsultationFlowScreen} />
            <Stack.Screen name="AiAssistant" component={AiAssistantScreen} />
            <Stack.Screen name="MedicineFinder" component={MedicineBrandFinderScreen} />
            <Stack.Screen name="MedicalRecords" component={MedicalRecordsScreen} />
            <Stack.Screen name="DoctorList" component={DoctorListScreen} />
            <Stack.Screen name="DoctorProfile" component={DoctorProfileScreen} />
            <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
            <Stack.Screen name="VideoCall" component={VideoCallScreen} />
            <Stack.Screen name="Prescription" component={PrescriptionScreen} />
            <Stack.Screen name="Progress" component={ProgressScreen} />
            <Stack.Screen name="SkinProfile" component={SkinProfileSetupScreen} />
            <Stack.Screen
              name="PersonalProfileSetup"
              component={PersonalProfileSetupScreen}
            />
            <Stack.Screen
              name="MedicalProfileSetup"
              component={MedicalProfileSetupScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ConsultationProvider>
          <AppNavigator />
        </ConsultationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
