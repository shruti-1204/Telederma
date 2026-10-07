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
  Image,
  Modal,
} from 'react-native';
import { Colors } from '../theme/colors';
import { AuthContext } from '../context/AuthContext';
import { imagePickerService } from '../services/imagePickerService';

const GENDERS = ['Male', 'Female', 'Other'];

export default function PersonalProfileSetupScreen({ navigation, route }) {
  const { patient, savePersonalProfile } = useContext(AuthContext);

  const initialPhone = route?.params?.phone || patient?.phone || '';

  const [photoUri, setPhotoUri] = useState(patient?.photoUri || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [name, setName] = useState(patient?.name || '');
  const [age, setAge] = useState(patient?.age ? String(patient.age) : '');
  const [gender, setGender] = useState(patient?.gender || '');
  const [phone] = useState(initialPhone);
  const [email, setEmail] = useState(patient?.email || '');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Pick photo from gallery
  const handlePickGallery = async () => {
    setShowPhotoModal(false);
    const result = await imagePickerService.pickFromGallery();
    if (result && result.uri) {
      setPhotoUri(result.uri);
      setPhotoFile(result);
    }
  };

  // Take photo with camera
  const handleCaptureCamera = async () => {
    setShowPhotoModal(false);
    const result = await imagePickerService.takePhotoWithCamera();
    if (result && result.uri) {
      setPhotoUri(result.uri);
      setPhotoFile(result);
    }
  };

  // Remove photo
  const handleRemovePhoto = () => {
    setPhotoUri(null);
    setPhotoFile(null);
  };

  // Validate required personal info
  const validateForm = () => {
    const errs = {};

    if (!name.trim()) {
      errs.name = 'Full name is required.';
    } else if (name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters.';
    }

    const ageNum = parseInt(age, 10);
    if (!age.trim()) {
      errs.age = 'Age is required.';
    } else if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      errs.age = 'Please enter a valid age between 1 and 120.';
    }

    if (!gender) {
      errs.gender = 'Please select your gender.';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errs.email = 'Please enter a valid email address.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinue = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await savePersonalProfile({
        photoUri,
        name: name.trim(),
        age: parseInt(age, 10),
        gender,
        phone,
        email: email.trim(),
      });

      navigation.navigate('MedicalProfileSetup');
    } catch (e) {
      console.log('Error saving personal profile:', e);
    } finally {
      setIsSubmitting(false);
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
          <View style={styles.cardContainer}>
            {/* Step Progress Pill */}
            <View style={styles.stepIndicatorRow}>
              <View style={styles.stepBadgeActive}>
                <Text style={styles.stepBadgeText}>Step 1 of 2: Personal Details</Text>
              </View>
              <Text style={styles.stepNextText}>Next: Medical History</Text>
            </View>

            {/* Screen Header */}
            <Text style={styles.screenTitle}>Create Your Profile</Text>
            <Text style={styles.screenSubtitle}>
              Please complete your personal details to personalize your dermatology consultation.
            </Text>

            {/* Profile Photo Section */}
            <View style={styles.photoSection}>
              <View style={styles.avatarWrapper}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderEmoji}>👤</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.avatarBadgeBtn}
                  onPress={() => setShowPhotoModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.avatarBadgeIcon}>📷</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.photoActionCol}>
                <Text style={styles.photoHeading}>Patient Profile Photo</Text>
                <Text style={styles.photoSub}>Helps your doctor identify you during video calls.</Text>

                <View style={styles.photoBtnRow}>
                  <TouchableOpacity
                    style={styles.photoActionPill}
                    onPress={() => setShowPhotoModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.photoActionPillText}>
                      {photoUri ? 'Change Photo' : '+ Upload Photo'}
                    </Text>
                  </TouchableOpacity>

                  {photoUri ? (
                    <TouchableOpacity
                      style={styles.removePhotoPill}
                      onPress={handleRemovePhoto}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.removePhotoPillText}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Full Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Full Legal Name <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, errors.name && styles.textInputError]}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errors.name) setErrors({ ...errors, name: null });
                  }}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                />
                {errors.name && <Text style={styles.fieldErrorText}>{errors.name}</Text>}
              </View>

              {/* Age & Gender in 2 Columns */}
              <View style={styles.twoColRow}>
                {/* Age */}
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>
                    Age <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.textInput, errors.age && styles.textInputError]}
                    value={age}
                    onChangeText={(val) => {
                      setAge(val.replace(/[^0-9]/g, ''));
                      if (errors.age) setErrors({ ...errors, age: null });
                    }}
                    placeholder="e.g. 28"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  {errors.age && <Text style={styles.fieldErrorText}>{errors.age}</Text>}
                </View>

                {/* Gender */}
                <View style={[styles.fieldGroup, { flex: 1.5 }]}>
                  <Text style={styles.fieldLabel}>
                    Gender <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <View style={styles.genderRow}>
                    {GENDERS.map((g) => {
                      const isSel = gender === g;
                      return (
                        <TouchableOpacity
                          key={g}
                          style={[styles.genderPill, isSel && styles.genderPillActive]}
                          onPress={() => {
                            setGender(g);
                            if (errors.gender) setErrors({ ...errors, gender: null });
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.genderPillText,
                              isSel && styles.genderPillTextActive,
                            ]}
                          >
                            {g}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {errors.gender && <Text style={styles.fieldErrorText}>{errors.gender}</Text>}
                </View>
              </View>

              {/* Verified Mobile Number (Pre-filled & Verified) */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>
                    Mobile Number <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✓ Verified on WhatsApp</Text>
                  </View>
                </View>
                <View style={styles.readOnlyInputRow}>
                  <Text style={styles.countryCodePre}>🇮🇳 +91</Text>
                  <Text style={styles.readOnlyPhoneText}>{phone || 'Not provided'}</Text>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              </View>

              {/* Email Address (Optional) */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <Text style={styles.optionalBadge}>(Optional)</Text>
                </View>
                <TextInput
                  style={[styles.textInput, errors.email && styles.textInputError]}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  placeholder="e.g. rahul.sharma@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && <Text style={styles.fieldErrorText}>{errors.email}</Text>}
              </View>
            </View>

            {/* Note stating personal information is mandatory */}
            <View style={styles.mandatoryNoticeBox}>
              <Text style={styles.mandatoryNoticeText}>
                ⚠️ Personal Information is required by telemedicine standards before clinical triage.
              </Text>
            </View>

            {/* Action Button: NO SKIP BUTTON HERE! */}
            <TouchableOpacity
              style={[styles.continueBtn, isSubmitting && styles.continueBtnDisabled]}
              onPress={handleContinue}
              accessibilityLabel="continue-personal-btn"
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <View style={styles.btnLoadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.continueBtnText}>Saving Personal Details...</Text>
                </View>
              ) : (
                <Text style={styles.continueBtnText}>Continue to Medical Information ➔</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Photo Picker Modal */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Profile Photo</Text>
            <Text style={styles.modalSub}>Choose a photo from your gallery or take a new picture</Text>

            <TouchableOpacity
              style={styles.modalOptionBtn}
              onPress={handlePickGallery}
              activeOpacity={0.7}
            >
              <Text style={styles.modalOptionIcon}>🖼️</Text>
              <View>
                <Text style={styles.modalOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.modalOptionSub}>Upload from device photos</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOptionBtn}
              onPress={handleCaptureCamera}
              activeOpacity={0.7}
            >
              <Text style={styles.modalOptionIcon}>📷</Text>
              <View>
                <Text style={styles.modalOptionTitle}>Take Photo with Camera</Text>
                <Text style={styles.modalOptionSub}>Capture a new photo now</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowPhotoModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepBadgeActive: {
    backgroundColor: '#E6F4F4',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0B6B6B',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B6B6B',
  },
  stepNextText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 20,
    gap: 16,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: 'relative',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E2E8F0',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0B6B6B',
  },
  avatarPlaceholderEmoji: {
    fontSize: 36,
  },
  avatarBadgeBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0B6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarBadgeIcon: {
    fontSize: 13,
  },
  photoActionCol: {
    flex: 1,
  },
  photoHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  photoSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
  },
  photoBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoActionPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0B6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  photoActionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B6B6B',
  },
  removePhotoPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removePhotoPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  formContainer: {
    gap: 14,
  },
  fieldGroup: {
    marginBottom: 2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#DC2626',
    fontWeight: '800',
  },
  optionalBadge: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  textInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  textInputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 4,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genderPill: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderPillActive: {
    borderColor: '#0B6B6B',
    backgroundColor: '#E6F4F4',
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  genderPillTextActive: {
    color: '#0B6B6B',
    fontWeight: '800',
  },
  readOnlyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
  },
  countryCodePre: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 8,
  },
  readOnlyPhoneText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  lockIcon: {
    fontSize: 14,
  },
  mandatoryNoticeBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
    marginBottom: 16,
  },
  mandatoryNoticeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 16,
  },
  continueBtn: {
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
  continueBtnDisabled: {
    opacity: 0.7,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  modalOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  modalOptionIcon: {
    fontSize: 24,
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalOptionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  modalCancelBtn: {
    marginTop: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
});
