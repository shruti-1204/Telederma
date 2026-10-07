import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import DoctorProfileSetupScreen from './src/screens/DoctorProfileSetupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PatientDetailScreen from './src/screens/PatientDetailScreen';
import PrescriptionScreen from './src/screens/PrescriptionScreen';
import VideoCallScreen from './src/screens/VideoCallScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import DoctorProfileScreen from './src/screens/DoctorProfileScreen';
import DoctorScheduleScreen from './src/screens/DoctorScheduleScreen';

const Stack = createNativeStackNavigator();

// Top right logout button for easy switching/testing
const LogoutButton = () => {
  const { logout } = useContext(AuthContext);
  return (
    <TouchableOpacity onPress={logout} style={{ marginRight: 15 }}>
      <Text style={{ color: '#ff4444', fontWeight: 'bold' }}>Logout</Text>
    </TouchableOpacity>
  );
};

const AppNavigator = () => {
  const { doctorToken, isProfileCompleted, initialLoading } = useContext(AuthContext);

  if (initialLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F7F6' }}>
        <ActivityIndicator size="large" color="#0F6B59" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {doctorToken === null ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : !isProfileCompleted ? (
          // Doctor must complete mandatory profile details before entering Dashboard
          <Stack.Screen 
            name="DoctorProfileSetup" 
            component={DoctorProfileSetupScreen} 
            options={{ headerShown: false }} 
          />
        ) : (
          // Fully onboarded: Doctor Dashboard & clinical tools
          <>
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="DoctorProfile" 
              component={DoctorProfileScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="DoctorSchedule" 
              component={DoctorScheduleScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="PatientDetail" 
              component={PatientDetailScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Prescription" 
              component={PrescriptionScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="VideoCall" 
              component={VideoCallScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Progress" 
              component={ProgressScreen} 
              options={{ title: 'Treatment Tracking' }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
