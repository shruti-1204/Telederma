import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PatientDetailScreen from './src/screens/PatientDetailScreen';
import PrescriptionScreen from './src/screens/PrescriptionScreen';
import VideoCallScreen from './src/screens/VideoCallScreen';
import ProgressScreen from './src/screens/ProgressScreen';

const Stack = createNativeStackNavigator();

// A tiny button we put in the top right to let you logout during testing
const LogoutButton = () => {
  const { logout } = useContext(AuthContext);
  return (
    <TouchableOpacity onPress={logout} style={{ marginRight: 15 }}>
      <Text style={{ color: '#ff4444', fontWeight: 'bold' }}>Logout</Text>
    </TouchableOpacity>
  );
};

const AppNavigator = () => {
  const { doctorToken } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {doctorToken === null ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen} 
              options={{ 
                title: "Doctor Portal",
                headerRight: () => <LogoutButton /> 
              }} 
            />
            <Stack.Screen 
              name="PatientDetail" 
              component={PatientDetailScreen} 
              options={({ route }) => ({ title: route.params.patient.name })} 
            />
            <Stack.Screen 
              name="Prescription" 
              component={PrescriptionScreen} 
              options={{ title: 'Digital Rx' }} 
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
