import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { imagePickerService } from '../services/imagePickerService';

const GENDERS = ['Male', 'Female', 'Other'];

export default function DoctorProfileSetupScreen({ navigation }) {
  const { doctor, completeDoctorProfile, logout, isLoading } = useContext(AuthContext);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Basic Information
  const [photoUri, setPhotoUri] = useState(doctor?.avatar || doctor?.user?.avatar || null);
  const [name, setName] = useState(doctor?.user?.name || doctor?.name || '');
  const [gender, setGender] = useState(doctor?.gender || 'Male');
  const [age, setAge] = useState(doctor?.age ? String(doctor.age) : '');
  const [phone, setPhone] = useState(doctor?.user?.phone || doctor?.phone || '');
  const [email, setEmail] = useState(doctor?.user?.email || doctor?.email || '');

  // 2. Professional Information
  const [specialization, setSpecialization] = useState(doctor?.specialization || 'Dermatologist');
  const [qualification, setQualification] = useState(doctor?.qualification || 'MBBS, MD (Dermatology)');
  const [experienceYears, setExperienceYears] = useState(
    doctor?.experienceYears !== null && doctor?.experienceYears !== undefined
      ? String(doctor.experienceYears)
      : '10'
  );
  const [hospitalClinic, setHospitalClinic] = useState(doctor?.hospitalClinic || 'Apollo Skin Institute');
  const [expertiseAreas, setExpertiseAreas] = useState(
    doctor?.expertiseAreas || 'Acne & Rosacea, Eczema, Psoriasis, Laser Procedures'
  );

  // 3. Consultation Information
  const [consultationFee, setConsultationFee] = useState(
    doctor?.consultationFee !== null && doctor?.consultationFee !== undefined
      ? String(doctor.consultationFee)
      : '700'
  );
  const [consultationDuration, setConsultationDuration] = useState(doctor?.consultationDuration || '20 mins');
  const [availableSlots, setAvailableSlots] = useState(
    doctor?.availableSlots || '09:00 AM - 01:00 PM, 04:00 PM - 08:00 PM'
  );
  const [languages, setLanguages] = useState(doctor?.languages || 'English, Hindi');
  const [upiId, setUpiId] = useState(doctor?.upiId || '');

  useEffect(() => {
    if (doctor) {
      if (doctor.avatar || doctor.user?.avatar) {
        setPhotoUri(doctor.avatar || doctor.user?.avatar);
      }
      if (doctor.user?.name || doctor.name) {
        setName(doctor.user?.name || doctor.name);
      }
      if (doctor.user?.phone || doctor.phone) {
        setPhone(doctor.user?.phone || doctor.phone);
      }
      if (doctor.user?.email || doctor.email) {
        setEmail(doctor.user?.email || doctor.email);
      }
      if (doctor.gender) {
        setGender(doctor.gender);
      }
      if (doctor.age) {
        setAge(String(doctor.age));
      }
      if (doctor.specialization) {
        setSpecialization(doctor.specialization);
      }
      if (doctor.qualification) {
        setQualification(doctor.qualification);
      }
      if (doctor.experienceYears !== null && doctor.experienceYears !== undefined) {
        setExperienceYears(String(doctor.experienceYears));
      }
      if (doctor.hospitalClinic) {
        setHospitalClinic(doctor.hospitalClinic);
      }
      if (doctor.expertiseAreas) {
        setExpertiseAreas(doctor.expertiseAreas);
      }
      if (doctor.consultationFee !== null && doctor.consultationFee !== undefined) {
        setConsultationFee(String(doctor.consultationFee));
      }
      if (doctor.consultationDuration) {
        setConsultationDuration(doctor.consultationDuration);
      }
      if (doctor.availableSlots) {
        setAvailableSlots(doctor.availableSlots);
      }
      if (doctor.languages) {
        setLanguages(doctor.languages);
      }
      if (doctor.upiId) {
        setUpiId(doctor.upiId);
      }
    }
  }, [doctor]);

  const handlePickGallery = async () => {
    setShowPhotoModal(false);
    const result = await imagePickerService.pickFromGallery();
    if (result && result.uri) {
      setPhotoUri(result.uri);
    }
  };

  const handleCaptureCamera = async () => {
    setShowPhotoModal(false);
    const result = await imagePickerService.takePhotoWithCamera();
    if (result && result.uri) {
      setPhotoUri(result.uri);
    }
  };

  const handleSkipPhoto = () => {
    setShowPhotoModal(false);
    setPhotoUri(null);
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    // Strict validation: ALL fields except photo are mandatory
    if (!name.trim()) {
      setErrorMessage('Full Legal Name is required.');
      return;
    }
    if (!age.trim()) {
      setErrorMessage('Age / Date of Birth is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Email Address is required.');
      return;
    }
    if (!specialization.trim()) {
      setErrorMessage('Specialization is required (e.g. Dermatologist).');
      return;
    }
    if (!qualification.trim()) {
      setErrorMessage('Qualifications are required (e.g. MBBS, MD).');
      return;
    }
    if (!experienceYears.trim()) {
      setErrorMessage('Years of Experience is required.');
      return;
    }
    if (!hospitalClinic.trim()) {
      setErrorMessage('Current Hospital or Clinic name is required.');
      return;
    }
    if (!expertiseAreas.trim()) {
      setErrorMessage('Areas of Expertise are required.');
      return;
    }
    if (!consultationFee.trim()) {
      setErrorMessage('Consultation Fee (₹) is required.');
      return;
    }
    if (!consultationDuration.trim()) {
      setErrorMessage('Consultation Duration is required (e.g. 20 mins).');
      return;
    }
    if (!availableSlots.trim()) {
      setErrorMessage('Available Time Slots are required.');
      return;
    }
    if (!languages.trim()) {
      setErrorMessage('Languages Spoken are required.');
      return;
    }
    if (parseFloat(consultationFee) > 0 && !upiId.trim()) {
      setErrorMessage('Doctor UPI ID is required so patients can pay consultation fees directly to you.');
      return;
    }
    if (upiId.trim() && !upiId.includes('@')) {
      setErrorMessage('Please enter a valid UPI ID containing "@" (e.g. name@oksbi or 9876543210@upi).');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        gender,
        age: parseInt(age, 10) || null,
        email: email.trim(),
        avatar: photoUri, // can be null if doctor skipped photo
        specialization: specialization.trim(),
        qualification: qualification.trim(),
        experienceYears: parseInt(experienceYears, 10) || 0,
        hospitalClinic: hospitalClinic.trim(),
        expertiseAreas: expertiseAreas.trim(),
        consultationFee: parseFloat(consultationFee) || 0,
        consultationDuration: consultationDuration.trim(),
        availableSlots: availableSlots.trim(),
        languages: languages.trim(),
        upiId: upiId.trim(),
      };

      await completeDoctorProfile(payload);
      // AuthContext will set isProfileCompleted=true and automatically navigate to Dashboard!
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialLetter = name ? name.trim().charAt(0).toUpperCase() : 'D';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Branding */}
        <View style={styles.topBanner}>
          <View style={styles.badgeRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>🩺</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>TeleDerma</Text>
              <Text style={styles.brandRole}>Doctor Practitioner Setup</Text>
            </View>
          </View>
          <Text style={styles.pageTitle}>Complete Your Doctor Profile</Text>
          <Text style={styles.pageSubtitle}>
            Welcome to the TeleDerma Doctor Network! Please provide your professional credentials and consultation setup to activate your dashboard.
          </Text>
          <View style={styles.mandatoryNotice}>
            <Text style={styles.mandatoryNoticeText}>
              ⚠️ Profile details are compulsory. Photo upload is optional.
            </Text>
          </View>
        </View>

        {/* Error Alert */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          </View>
        ) : null}

        {/* PHOTO SECTION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Profile Photo (Optional)</Text>
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalBadgeText}>Optional / Skipable</Text>
            </View>
          </View>

          <View style={styles.photoContainer}>
            <View style={styles.avatarWrapper}>
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>{initialLetter}</Text>
                </View>
              )}
            </View>

            <View style={styles.photoDetailsCol}>
              <View style={styles.photoBtnRow}>
                <TouchableOpacity
                  style={styles.uploadPhotoBtn}
                  onPress={() => setShowPhotoModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.uploadPhotoBtnText}>
                    {photoUri ? '📷 Change Photo' : '📷 Upload Photo'}
                  </Text>
                </TouchableOpacity>

                {photoUri ? (
                  <TouchableOpacity
                    style={styles.skipPhotoBtn}
                    onPress={handleSkipPhoto}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.skipPhotoBtnText}>Remove Photo</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.skipPhotoBtn}
                    onPress={handleSkipPhoto}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.skipPhotoBtnText}>Skip Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.photoHintText}>
                {photoUri
                  ? '✓ Photo selected. This will appear on your profile and patient appointment cards.'
                  : 'If you skip uploading a photo, your initial letter will be used as your avatar.'}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 1: BASIC INFORMATION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>1. Basic Information</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Mandatory</Text>
            </View>
          </View>

          <View style={styles.fieldsGrid}>
            {/* Full Name */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Full Legal Name *</Text>
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Dr. Rajesh Sharma"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Age & Gender */}
            <View style={styles.twoColFields}>
              <View style={[styles.fieldItem, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Age / Date of Birth *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={age}
                  onChangeText={setAge}
                  placeholder="e.g. 38"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.fieldItem, { flex: 1.5, marginLeft: 12 }]}>
                <Text style={styles.fieldLabel}>Gender *</Text>
                <View style={styles.genderRow}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderPill,
                        gender === g && styles.genderPillActive,
                      ]}
                      onPress={() => setGender(g)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.genderPillText,
                          gender === g && styles.genderPillTextActive,
                        ]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Mobile Number (Read-only verified) */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Mobile Number (WhatsApp Verified)</Text>
              <View style={[styles.fieldInput, styles.readOnlyInput]}>
                <Text style={styles.readOnlyText}>+91 {phone || '—'}</Text>
                <Text style={styles.verifiedCheck}>✓ Verified</Text>
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Email Address *</Text>
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. dr.rajesh@telederma.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* SECTION 2: PROFESSIONAL INFORMATION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>2. Professional Information</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Mandatory</Text>
            </View>
          </View>

          <View style={styles.fieldsGrid}>
            {/* Specialization */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Specialization *</Text>
              <TextInput
                style={styles.fieldInput}
                value={specialization}
                onChangeText={setSpecialization}
                placeholder="e.g. Dermatologist & Cosmetologist"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Qualifications */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Qualifications *</Text>
              <TextInput
                style={styles.fieldInput}
                value={qualification}
                onChangeText={setQualification}
                placeholder="e.g. MBBS, MD (Dermatology), DNB"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Experience & Hospital */}
            <View style={styles.twoColFields}>
              <View style={[styles.fieldItem, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Years of Experience *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                  placeholder="e.g. 10"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.fieldItem, { flex: 1.5, marginLeft: 12 }]}>
                <Text style={styles.fieldLabel}>Current Hospital / Clinic *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={hospitalClinic}
                  onChangeText={setHospitalClinic}
                  placeholder="e.g. Apollo Dermatology Clinic"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Areas of Expertise */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Areas of Expertise *</Text>
              <TextInput
                style={[styles.fieldInput, styles.multilineInput]}
                value={expertiseAreas}
                onChangeText={setExpertiseAreas}
                placeholder="e.g. Acne & Rosacea, Eczema & Psoriasis, Laser Procedures, Hair Loss"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>
          </View>
        </View>

        {/* SECTION 3: CONSULTATION INFORMATION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>3. Consultation Information</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Mandatory</Text>
            </View>
          </View>

          <View style={styles.fieldsGrid}>
            {/* Fee & Duration */}
            <View style={styles.twoColFields}>
              <View style={[styles.fieldItem, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Consultation Fee (₹) *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={consultationFee}
                  onChangeText={setConsultationFee}
                  placeholder="e.g. 700"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.fieldItem, { flex: 1.2, marginLeft: 12 }]}>
                <Text style={styles.fieldLabel}>Consultation Duration *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={consultationDuration}
                  onChangeText={setConsultationDuration}
                  placeholder="e.g. 20 mins"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Available Time Slots */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Available Time Slots *</Text>
              <TextInput
                style={styles.fieldInput}
                value={availableSlots}
                onChangeText={setAvailableSlots}
                placeholder="e.g. 09:00 AM - 01:00 PM, 04:00 PM - 08:00 PM"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Languages Spoken */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Languages Spoken *</Text>
              <TextInput
                style={styles.fieldInput}
                value={languages}
                onChangeText={setLanguages}
                placeholder="e.g. English, Hindi, Marathi"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Direct Consultation Payment UPI ID */}
            <View style={styles.fieldItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.fieldLabel}>Doctor UPI ID (Direct Patient Payments) *</Text>
                <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 11, color: '#047857', fontWeight: '600' }}>🔒 2-Way Encrypted</Text>
                </View>
              </View>
              <TextInput
                style={styles.fieldInput}
                value={upiId}
                onChangeText={setUpiId}
                placeholder="e.g. dr.kundan@oksbi or 9876543210@upi"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                Patients transfer consultation fees directly to your UPI ID without middleman deduction. Your UPI ID is encrypted with AES-256 in the database.
              </Text>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={isSubmitting || isLoading}
          activeOpacity={0.8}
        >
          {isSubmitting || isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>
              Complete Profile & Enter Dashboard ➔
            </Text>
          )}
        </TouchableOpacity>

        {/* Logout Option */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.logoutBtnText}>Switch Account or Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Photo Picker Modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoModal(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Profile Photo</Text>
            <Text style={styles.modalSub}>
              Select a professional profile picture, or skip to use your initials.
            </Text>

            <TouchableOpacity style={styles.modalBtn} onPress={handlePickGallery}>
              <Text style={styles.modalBtnIcon}>📁</Text>
              <Text style={styles.modalBtnText}>Choose from Files / Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtn} onPress={handleCaptureCamera}>
              <Text style={styles.modalBtnIcon}>📷</Text>
              <Text style={styles.modalBtnText}>Take Photo with Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalSkipBtn]}
              onPress={handleSkipPhoto}
            >
              <Text style={styles.modalBtnIcon}>⏭️</Text>
              <Text style={[styles.modalBtnText, { color: '#0F6B59' }]}>
                Skip Photo / Use Initials
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
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
    backgroundColor: '#F2F7F6',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },

  // Top Banner
  topBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#113F36',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#0F6B59',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoIcon: {
    fontSize: 22,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#113F36',
    letterSpacing: -0.5,
  },
  brandRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F6B59',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 14,
  },
  mandatoryNotice: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    padding: 10,
  },
  mandatoryNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    textAlign: 'center',
  },

  // Error Alert
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#113F36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  requiredBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requiredBadgeText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12,
  },
  optionalBadge: {
    backgroundColor: '#E8F3F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  optionalBadgeText: {
    color: '#0F6B59',
    fontWeight: '700',
    fontSize: 12,
  },

  // Photo Section
  photoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#0F6B59',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0F6B59',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  photoDetailsCol: {
    flex: 1,
    minWidth: 200,
  },
  photoBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  uploadPhotoBtn: {
    backgroundColor: '#0F6B59',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  uploadPhotoBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  skipPhotoBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  skipPhotoBtnText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 13,
  },
  photoHintText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },

  // Fields
  fieldsGrid: {
    gap: 16,
  },
  fieldItem: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  readOnlyInput: {
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '600',
  },
  verifiedCheck: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '700',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  twoColFields: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Gender pills
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  genderPillActive: {
    borderColor: '#0F6B59',
    borderWidth: 2,
    backgroundColor: '#E8F3F1',
  },
  genderPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  genderPillTextActive: {
    color: '#0F6B59',
    fontWeight: '800',
  },

  // Submit button
  submitBtn: {
    backgroundColor: '#0F6B59',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0F6B59',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Logout button
  logoutBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 20,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 10,
  },
  modalSkipBtn: {
    backgroundColor: '#E8F3F1',
  },
  modalBtnIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalCancelBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
});
