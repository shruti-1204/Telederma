import React, { useState, useEffect, useRef, useContext } from 'react';
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

export default function WhatsAppOTPScreen({ navigation, route }) {
  const phone = route?.params?.phone || '9876543210';
  const { verifyWhatsAppOtp, resendWhatsAppOtp } = useContext(AuthContext);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [statusState, setStatusState] = useState('idle'); // 'idle' | 'verifying' | 'error' | 'expired' | 'success'
  const [statusMessage, setStatusMessage] = useState('');

  const inputRefs = useRef([]);

  // Countdown timer
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            if (statusState === 'idle') {
              setStatusState('expired');
              setStatusMessage('Verification code may have expired. Tap Resend OTP.');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, statusState]);

  // Handle digit typing & auto-focus next box
  const handleDigitChange = (val, index) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    const newOtp = [...otp];

    if (cleaned.length > 1) {
      // Pasted multi-digit string (e.g. "123456")
      const pastedDigits = cleaned.slice(0, 6).split('');
      pastedDigits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextFocus = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      if (statusState === 'error' || statusState === 'expired') {
        setStatusState('idle');
        setStatusMessage('');
      }
      return;
    }

    newOtp[index] = cleaned;
    setOtp(newOtp);

    if (statusState === 'error' || statusState === 'expired') {
      setStatusState('idle');
      setStatusMessage('');
    }

    // Auto focus next box
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Fast fill test code
  const handleFillTestCode = () => {
    const testCode = ['1', '2', '3', '4', '5', '6'];
    setOtp(testCode);
    setStatusState('idle');
    setStatusMessage('');
    inputRefs.current[5]?.focus();
  };

  // Resend OTP
  const handleResend = async () => {
    if (timer > 0 || isResending) return;

    setIsResending(true);
    setStatusState('idle');
    setStatusMessage('');

    try {
      const res = await resendWhatsAppOtp(phone);
      if (res.success) {
        setTimer(30);
        setStatusState('idle');
        setStatusMessage('');
      } else {
        setStatusState('error');
        setStatusMessage(res.message || 'Unable to resend OTP. Please try again.');
      }
    } catch (e) {
      setStatusState('error');
      setStatusMessage('Network error while resending. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // Verify OTP
  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setStatusState('error');
      setStatusMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifying(true);
    setStatusState('verifying');
    setStatusMessage('Verifying code with WhatsApp server...');

    try {
      const result = await verifyWhatsAppOtp(phone, code);

      if (result.success) {
        setStatusState('success');
        setStatusMessage('✓ Verification successful! Preparing your profile...');

        // Smooth transition
        setTimeout(() => {
          if (result.isNewUser) {
            navigation.navigate('PersonalProfileSetup', { phone });
          } else {
            navigation.navigate('Dashboard');
          }
        }, 600);
      } else {
        setStatusState('error');
        setStatusMessage(result.message || 'Invalid verification code. Please check your WhatsApp.');
      }
    } catch (err) {
      setStatusState('error');
      setStatusMessage('Verification failed. Please check your network and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const formattedTimer = `00:${timer < 10 ? '0' : ''}${timer}`;
  const isOtpComplete = otp.join('').length === 6;

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
          <View style={styles.cardContainer}>
            {/* Top Back Link */}
            <TouchableOpacity
              style={styles.backRow}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backText}>Change Mobile Number</Text>
            </TouchableOpacity>

            {/* WhatsApp Verification Badge */}
            <View style={styles.whatsappHeaderRow}>
              <View style={styles.whatsappLogoCircle}>
                <Text style={styles.whatsappLogoEmoji}>💬</Text>
              </View>
              <View>
                <Text style={styles.whatsappTag}>WhatsApp Verification</Text>
                <Text style={styles.platformName}>TeleDerma Telehealth</Text>
              </View>
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.title}>Verify your mobile number</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit verification code to your WhatsApp at{' '}
              <Text style={styles.phoneHighlight}>+91 {phone}</Text>
            </Text>

            {/* 6 Digit Input Grid */}
            <View style={styles.otpGrid}>
              {otp.map((digit, idx) => {
                const isFocused = Boolean(digit);
                const hasError = statusState === 'error';
                const isSuccess = statusState === 'success';

                return (
                  <TextInput
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    style={[
                      styles.otpBox,
                      isFocused && styles.otpBoxFilled,
                      hasError && styles.otpBoxError,
                      isSuccess && styles.otpBoxSuccess,
                    ]}
                    value={digit}
                    onChangeText={(val) => handleDigitChange(val, idx)}
                    onKeyPress={(e) => handleKeyPress(e, idx)}
                    keyboardType="number-pad"
                    maxLength={Platform.OS === 'web' ? 6 : 1}
                    textAlign="center"
                    selectTextOnFocus
                    editable={!isVerifying && statusState !== 'success'}
                  />
                );
              })}
            </View>

            {/* Status Feedback Banners */}
            {statusState === 'error' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>❌</Text>
                <Text style={styles.errorText}>{statusMessage}</Text>
              </View>
            )}

            {statusState === 'expired' && (
              <View style={styles.expiredBox}>
                <Text style={styles.expiredIcon}>⏳</Text>
                <Text style={styles.expiredText}>{statusMessage}</Text>
              </View>
            )}

            {statusState === 'verifying' && (
              <View style={styles.verifyingBox}>
                <ActivityIndicator size="small" color="#0B6B6B" />
                <Text style={styles.verifyingText}>Verifying code...</Text>
              </View>
            )}

            {statusState === 'success' && (
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successText}>{statusMessage}</Text>
              </View>
            )}

            {/* Dev Test Code Helper */}
            <TouchableOpacity
              style={styles.testCodeHelper}
              onPress={handleFillTestCode}
              accessibilityLabel="autofill-test-otp"
              activeOpacity={0.7}
            >
              <Text style={styles.testCodeText}>

              </Text>
            </TouchableOpacity>

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.verifyBtn,
                (!isOtpComplete || isVerifying || statusState === 'success') && styles.verifyBtnDisabled,
              ]}
              onPress={handleVerify}
              accessibilityLabel="verify-otp-btn"
              disabled={!isOtpComplete || isVerifying || statusState === 'success'}
              activeOpacity={0.8}
            >
              {isVerifying ? (
                <View style={styles.btnLoadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.verifyBtnText}>Verifying...</Text>
                </View>
              ) : statusState === 'success' ? (
                <Text style={styles.verifyBtnText}>Verified! ➔</Text>
              ) : (
                <Text style={styles.verifyBtnText}>Verify & Continue ➔</Text>
              )}
            </TouchableOpacity>

            {/* Resend OTP & Countdown */}
            <View style={styles.resendContainer}>
              {timer > 0 ? (
                <View style={styles.timerBadge}>
                  <Text style={styles.timerLabel}>Resend OTP in</Text>
                  <Text style={styles.timerDigits}>{formattedTimer}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.resendActionBtn}
                  onPress={handleResend}
                  disabled={isResending}
                  activeOpacity={0.8}
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color="#0B6B6B" />
                  ) : (
                    <Text style={styles.resendActionText}>🔄 Resend OTP to WhatsApp</Text>
                  )}
                </TouchableOpacity>
              )}
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
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 6,
  },
  backArrow: {
    fontSize: 18,
    color: '#0B6B6B',
    fontWeight: '800',
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B6B6B',
  },
  whatsappHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  whatsappLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappLogoEmoji: {
    fontSize: 18,
  },
  whatsappTag: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  platformName: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 22,
  },
  phoneHighlight: {
    fontWeight: '800',
    color: '#0F172A',
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
    width: '100%',
  },
  otpBox: {
    flex: 1,
    minWidth: 0,
    maxWidth: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    paddingHorizontal: 0,
  },
  otpBoxFilled: {
    borderColor: '#0B6B6B',
    backgroundColor: '#E6F4F4',
    color: '#0B6B6B',
  },
  otpBoxError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
  },
  otpBoxSuccess: {
    borderColor: '#16A34A',
    backgroundColor: '#DCFCE7',
    color: '#16A34A',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorIcon: {
    fontSize: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    color: '#DC2626',
    fontWeight: '600',
  },
  expiredBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  expiredIcon: {
    fontSize: 14,
  },
  expiredText: {
    flex: 1,
    fontSize: 12.5,
    color: '#B45309',
    fontWeight: '600',
  },
  verifyingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F4F4',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  verifyingText: {
    fontSize: 13,
    color: '#0B6B6B',
    fontWeight: '700',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  successIcon: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15803D',
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: '#15803D',
    fontWeight: '700',
  },
  testCodeHelper: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  testCodeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  verifyBtn: {
    backgroundColor: '#0B6B6B',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0B6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  verifyBtnDisabled: {
    opacity: 0.65,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 18,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  timerDigits: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B6B6B',
  },
  resendActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  resendActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B6B6B',
  },
});
