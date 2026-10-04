import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Colors } from '../theme/colors';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { requestWhatsAppOtp } = useContext(AuthContext);

  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const validatePhone = (num) => {
    const cleaned = num.replace(/[^0-9]/g, '');
    if (!cleaned) {
      return 'Mobile number is required.';
    }
    if (cleaned.length !== 10) {
      return 'Please enter a valid 10-digit Indian mobile number.';
    }
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      return 'Please enter a valid mobile number starting with 6, 7, 8, or 9.';
    }
    return '';
  };

  const handleContinue = async () => {
    const error = validatePhone(phone);
    if (error) {
      setErrorMsg(error);
      return;
    }

    setErrorMsg('');
    setIsSending(true);

    try {
      const cleaned = phone.replace(/[^0-9]/g, '');
      const response = await requestWhatsAppOtp(cleaned);

      if (response.success) {
        navigation.navigate('WhatsAppOTP', { phone: cleaned });
      } else {
        setErrorMsg(response.message || 'Unable to send OTP. Please check your number.');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Container Card */}
          <View style={styles.cardContainer}>
            {/* Branding Header */}
            <View style={styles.brandBox}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoIcon}>🩺</Text>
              </View>
              <Text style={styles.brandTitle}>TeleDerma</Text>
              <Text style={styles.brandSubtitle}>Teledermatology Platform</Text>
            </View>

            {/* Welcome Message */}
            <View style={styles.welcomeBox}>
              <Text style={styles.welcomeTitle}>Welcome to TeleDerma</Text>
              <Text style={styles.welcomeSub}>
                Your personalized dermatology care, anytime.
              </Text>
            </View>

            {/* WhatsApp Verification Banner */}
            <View style={styles.whatsappNoticeBanner}>
              <View style={styles.whatsappIconCircle}>
                <Text style={styles.whatsappIconText}>💬</Text>
              </View>
              <View style={styles.whatsappNoticeTextCol}>
                <Text style={styles.whatsappNoticeTitle}>Instant WhatsApp Verification</Text>
                <Text style={styles.whatsappNoticeSub}>
                  We will send a 6-digit one-time code directly to your WhatsApp.
                </Text>
              </View>
            </View>

            {/* Form */}
            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>
                Mobile Number <Text style={styles.requiredAsterisk}>*</Text>
              </Text>

              <View
                style={[
                  styles.phoneInputRow,
                  errorMsg ? styles.phoneInputRowError : null,
                ]}
              >
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryFlag}>🇮🇳</Text>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={(val) => {
                    const digits = val.replace(/[^0-9]/g, '');
                    setPhone(digits);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus={Platform.OS === 'web'}
                />
              </View>

              {errorMsg ? (
                <View style={styles.errorRow}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* Continue Button */}
              <TouchableOpacity
                style={[styles.continueBtn, isSending && styles.continueBtnDisabled]}
                onPress={handleContinue}
                disabled={isSending}
                activeOpacity={0.8}
              >
                {isSending ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.continueBtnText}>Sending OTP...</Text>
                  </View>
                ) : (
                  <Text style={styles.continueBtnText}>Continue ➔</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Privacy & Trust Badge */}
            <View style={styles.footerNoteBox}>
              <Text style={styles.footerNoteText}>
                🔒 Secure & Confidential • Telehealth data encrypted & protected under medical confidentiality guidelines.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F6FAF9',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#0B6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#0B6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoIcon: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0B6B6B',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  welcomeBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  welcomeSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  whatsappNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 12,
  },
  whatsappIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappIconText: {
    fontSize: 18,
  },
  whatsappNoticeTextCol: {
    flex: 1,
  },
  whatsappNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  whatsappNoticeSub: {
    fontSize: 11.5,
    color: '#166534',
    marginTop: 2,
    lineHeight: 16,
  },
  formSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: '#DC2626',
    fontWeight: '800',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  phoneInputRowError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: '100%',
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    gap: 6,
  },
  countryFlag: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
    gap: 6,
  },
  errorIcon: {
    fontSize: 13,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12.5,
    fontWeight: '600',
  },
  continueBtn: {
    backgroundColor: '#0B6B6B',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#0B6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  continueBtnDisabled: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footerNoteBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  footerNoteText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
});
