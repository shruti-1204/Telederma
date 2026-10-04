import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const LoginScreen = () => {
  const { login, isLoading, setManualToken } = useContext(AuthContext);

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Registration specific fields
  const [docName, setDocName] = useState('');
  const [regId, setRegId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const requestOtp = async (isLogin) => {
    setErrorMessage('');
    setStatusMessage('');
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone) {
      setErrorMessage('Please enter your mobile number');
      return;
    }
    setSendingOtp(true);
    try {
      const res = await api.post('/auth/send-otp', { phone: cleanPhone, isLogin });
      setOtpSent(true);
      setStatusMessage('✓ OTP sent to your WhatsApp! ');
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to send OTP';
      setErrorMessage(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleLoginSubmit = () => {
    setErrorMessage('');
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (cleanPhone && otp) {
      login(cleanPhone, otp.trim());
    } else {
      setErrorMessage('Please enter OTP');
    }
  };

  const handleRegisterSubmit = async () => {
    setErrorMessage('');
    setStatusMessage('');
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanName = docName.trim();
    const cleanRegId = regId.trim();

    if (!cleanName || !cleanRegId || !cleanPhone) {
      setErrorMessage('Please fill all details: Name, NMC ID, and Phone');
      return;
    }

    setIsVerifying(true);
    setStatusMessage('Checking records & verifying NMC credentials...');
    try {
      // 0. Pre-check: Does user already exist by Phone OR Name?
      const checkRes = await api.post('/auth/check-user', { phone: cleanPhone, name: cleanName });
      if (checkRes.data.exists) {
        if (checkRes.data.reason === 'phone') {
          setErrorMessage('This mobile number is already registered! Please switch to Login tab.');
        } else {
          setErrorMessage('A doctor with this name is already registered! Please switch to Login tab.');
        }
        setIsVerifying(false);
        setStatusMessage('');
        return;
      }

      // 1. Web Scraping Verification
      const verifyRes = await api.post('/verification/verify', {
        expectedName: cleanName,
        registrationNumber: cleanRegId
      });
      
      const { status } = verifyRes.data?.verificationResult || {};
      
      if (status !== 'VERIFIED ACTIVE PRACTITIONER') {
        setErrorMessage('❌ CREDENTIAL MISMATCH: Registration failed. Your details do not match NMC records.');
        setIsVerifying(false);
        setStatusMessage('');
        return;
      }

      // 2. If verified, send OTP
      setStatusMessage('✓ NMC Verified! Sending OTP to your WhatsApp...');
      await api.post('/auth/send-otp', { phone: cleanPhone, isLogin: false });
      setOtpSent(true);
      setStatusMessage('✓ NMC Verified! OTP sent to WhatsApp ');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Verification Failed. Please check your details.');
      setStatusMessage('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegisterOtpSubmit = async () => {
    setErrorMessage('');
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!otp) {
      setErrorMessage('Please enter the 6-digit OTP');
      return;
    }
    
    // We call login from context which internally calls verify-otp and saves token
    const res = await login(cleanPhone, otp.trim(), 'DOCTOR');
    
    if (res && res.success) {
      try {
        // Once token is saved, update the profile with License Number (NMC ID)
        await api.put('/doctors/me', { licenseNumber: regId.trim(), name: docName.trim() });
      } catch (err) {
        console.error('Failed to update doctor profile', err);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Telederma Doctor Portal</Text>
      
      {/* TOGGLE TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, !isRegisterMode && styles.activeTab]} onPress={() => { setIsRegisterMode(false); setOtpSent(false); setOtp(''); }}>
          <Text style={[styles.tabText, !isRegisterMode && styles.activeTabText]}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, isRegisterMode && styles.activeTab]} onPress={() => { setIsRegisterMode(true); setOtpSent(false); setOtp(''); }}>
          <Text style={[styles.tabText, isRegisterMode && styles.activeTabText]}>Register</Text>
        </TouchableOpacity>
      </View>

      {!isRegisterMode ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Welcome Back</Text>

          {errorMessage ? (
            <View style={{ backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {statusMessage ? (
            <View style={{ backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#10B981', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{statusMessage}</Text>
            </View>
          ) : null}

          <TextInput 
            style={styles.input}
            placeholder="Enter Registered Mobile Number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!otpSent}
          />
          
          {otpSent && (
            <TextInput 
              style={styles.input}
              placeholder="Enter OTP (Check WhatsApp)"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />
          )}

          {!otpSent ? (
            <TouchableOpacity style={styles.button} onPress={() => requestOtp(true)}>
              {sendingOtp ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP via WhatsApp</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleLoginSubmit}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login Securely</Text>}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.subtitle}>New Doctor Registration</Text>
          <Text style={styles.hint}>Complete NMC Verification to create an account.</Text>

          {errorMessage ? (
            <View style={{ backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444', borderRadius: 8, padding: 10, marginVertical: 12 }}>
              <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {statusMessage ? (
            <View style={{ backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#10B981', borderRadius: 8, padding: 10, marginVertical: 12 }}>
              <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{statusMessage}</Text>
            </View>
          ) : null}

          <TextInput 
            style={styles.input}
            placeholder="Full Name (Any format e.g. Patil Gopal Rao)"
            value={docName}
            onChangeText={setDocName}
            editable={!otpSent}
          />
          <TextInput 
            style={styles.input}
            placeholder="NMC Registration ID (e.g. HMC1632)"
            value={regId}
            onChangeText={setRegId}
            editable={!otpSent}
          />
          <TextInput 
            style={styles.input}
            placeholder="Contact Number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!otpSent}
          />

          {otpSent && (
            <TextInput 
              style={styles.input}
              placeholder="Enter OTP (Check WhatsApp)"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />
          )}

          {!otpSent ? (
            <TouchableOpacity style={styles.button} onPress={handleRegisterSubmit}>
              {isVerifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Send OTP</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleRegisterOtpSubmit}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirm OTP & Register</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#F2F7F6' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', color: '#113F36' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#113F36' },
  input: { backgroundColor: '#F2F7F6', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#E8F3F1', color: '#113F36' },
  button: { backgroundColor: '#0F6B59', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#E8F3F1', borderRadius: 8, padding: 5 },
  tabBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#0F6B59' },
  tabText: { color: '#113F36', fontWeight: 'bold' },
  activeTabText: { color: '#fff' },
  hint: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20 }
});

export default LoginScreen;
