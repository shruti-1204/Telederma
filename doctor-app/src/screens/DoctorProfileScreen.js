import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { imagePickerService } from '../services/imagePickerService';
import { AuthContext } from '../context/AuthContext';

const GENDERS = ['Male', 'Female', 'Other'];

export default function DoctorProfileScreen({ navigation }) {
  const { logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // 1. Basic Information
  const [photoUri, setPhotoUri] = useState(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // 2. Professional Information
  const [specialization, setSpecialization] = useState('Dermatologist');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [hospitalClinic, setHospitalClinic] = useState('');
  const [expertiseAreas, setExpertiseAreas] = useState('');

  // 3. Consultation Information
  const [consultationFee, setConsultationFee] = useState('');
  const [consultationDuration, setConsultationDuration] = useState('20 mins');
  const [availableSlots, setAvailableSlots] = useState('');
  const [languages, setLanguages] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    fetchProfile();
    const unsubscribe = navigation?.addListener ? navigation.addListener('focus', () => {
      fetchProfile();
    }) : null;
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigation]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      // Fetch Doctor Profile from backend
      const res = await api.get('/doctors/me');
      const doc = res.data?.data;
      if (doc) {
        const u = doc.user || {};
        const avatarImg = doc.avatar || u.avatar || null;
        setPhotoUri(avatarImg);
        setName(u.name || '');
        setPhone(u.phone || '');
        setEmail(u.email || '');
        setGender(doc.gender || 'Male');
        if (doc.age !== null && doc.age !== undefined) setAge(String(doc.age));
        if (doc.dateOfBirth) setDateOfBirth(doc.dateOfBirth);
        if (doc.specialization) setSpecialization(doc.specialization);
        if (doc.qualification) setQualification(doc.qualification);
        if (doc.experienceYears !== null && doc.experienceYears !== undefined) {
          setExperienceYears(String(doc.experienceYears));
        }
        if (doc.hospitalClinic) setHospitalClinic(doc.hospitalClinic);
        if (doc.expertiseAreas) setExpertiseAreas(doc.expertiseAreas);
        if (doc.consultationFee !== null && doc.consultationFee !== undefined) {
          setConsultationFee(String(doc.consultationFee));
        }
        if (doc.consultationDuration) setConsultationDuration(doc.consultationDuration);
        if (doc.availableSlots) setAvailableSlots(doc.availableSlots);
        if (doc.languages) setLanguages(doc.languages);
        if (doc.upiId) setUpiId(doc.upiId);

        // Cache doctor profile in AsyncStorage
        await AsyncStorage.setItem('doctor_profile_cache', JSON.stringify({
          ...doc,
          avatar: avatarImg,
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch doctor profile:', err);
      // Try local cache
      try {
        const cached = await AsyncStorage.getItem('doctor_profile_cache');
        if (cached) {
          const doc = JSON.parse(cached);
          const u = doc.user || {};
          setPhotoUri(doc.avatar || u.avatar || null);
          if (u.name) setName(u.name);
          if (u.phone) setPhone(u.phone);
          if (u.email) setEmail(u.email);
          if (doc.gender) setGender(doc.gender);
          if (doc.specialization) setSpecialization(doc.specialization);
          if (doc.qualification) setQualification(doc.qualification);
          if (doc.experienceYears) setExperienceYears(String(doc.experienceYears));
          if (doc.hospitalClinic) setHospitalClinic(doc.hospitalClinic);
          if (doc.expertiseAreas) setExpertiseAreas(doc.expertiseAreas);
          if (doc.consultationFee) setConsultationFee(String(doc.consultationFee));
          if (doc.languages) setLanguages(doc.languages);
          if (doc.upiId) setUpiId(doc.upiId);
        }
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

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

  const handleRemovePhoto = () => {
    setShowPhotoModal(false);
    setPhotoUri(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Full Name is required.');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg('');

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        avatar: photoUri,
        gender,
        age: age ? parseInt(age, 10) : null,
        dateOfBirth: dateOfBirth || null,
        specialization: specialization.trim() || 'Dermatologist',
        qualification: qualification.trim(),
        experienceYears: experienceYears ? parseInt(experienceYears, 10) : null,
        hospitalClinic: hospitalClinic.trim(),
        expertiseAreas: expertiseAreas.trim(),
        consultationFee: consultationFee ? parseFloat(consultationFee) : null,
        consultationDuration: consultationDuration.trim(),
        availableSlots: availableSlots.trim(),
        languages: languages.trim(),
        upiId: upiId.trim(),
      };

      const res = await api.put('/doctors/me', payload);

      // Save to cache
      await AsyncStorage.setItem('doctor_profile_cache', JSON.stringify(res.data?.data || payload));

      setIsEditing(false);
      setSaveSuccessMsg('✓ Doctor profile updated successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to update doctor profile:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to update profile';
      alert(`Error saving profile: ${errMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0B6E69" />
          <Text style={styles.loadingText}>Loading Doctor Profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const initialLetter = name ? name.trim().charAt(0).toUpperCase() : 'D';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Link to Dashboard */}
        <TouchableOpacity
          style={styles.backLinkRow}
          onPress={() => navigation.navigate('Dashboard')}
          activeOpacity={0.7}
        >
          <Text style={styles.backLinkArrow}>←</Text>
          <Text style={styles.backLinkText}>Back to Dashboard</Text>
        </TouchableOpacity>

        {/* Profile Header Hero Card */}
        <View style={styles.profileHeroCard}>
          <View style={styles.heroAvatarCol}>
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={styles.heroAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.heroAvatarCircle}>
                <Text style={styles.heroAvatarInitials}>{initialLetter}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.heroAvatarEditBadge}
              onPress={() => setShowPhotoModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.heroAvatarEditIcon}>📷</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroDetailsCol}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName}>{name ? (name.startsWith('Dr.') ? name : `Dr. ${name}`) : 'Doctor'}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
              </View>
            </View>
            <Text style={styles.heroSubText}>
              +91 {phone} • {experienceYears ? `${experienceYears} yrs exp` : 'Specialist'} • {specialization}
            </Text>
            {email ? <Text style={styles.heroEmailText}>{email}</Text> : null}
          </View>

          {/* Toggle Edit Button */}
          <TouchableOpacity
            style={[styles.editToggleBtn, isEditing && styles.editToggleBtnActive]}
            onPress={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditing(true);
              }
            }}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.editToggleBtnText,
                  isEditing && styles.editToggleBtnTextActive,
                ]}
              >
                {isEditing ? '💾 Save Changes' : '✏️ Edit Profile'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Save Success Alert */}
        {saveSuccessMsg ? (
          <View style={styles.successToast}>
            <Text style={styles.successToastText}>{saveSuccessMsg}</Text>
          </View>
        ) : null}

        {/* SECTION 1: BASIC INFORMATION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>1. Basic Information</Text>
            {isEditing && (
              <View style={styles.editingTag}>
                <Text style={styles.editingTagText}>Editing</Text>
              </View>
            )}
          </View>

          <View style={styles.fieldsGrid}>
            {/* Full Name */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Full Legal Name *</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  placeholderTextColor="#9CA3AF"
                />
              ) : (
                <Text style={styles.fieldDisplayVal}>{name || '—'}</Text>
              )}
            </View>

            {/* Age & Gender */}
            <View style={styles.twoColFields}>
              <View style={[styles.fieldItem, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Age / Date of Birth</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={age}
                    onChangeText={setAge}
                    placeholder="e.g. 38"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                  />
                ) : (
                  <Text style={styles.fieldDisplayVal}>{age ? `${age} yrs` : '—'}</Text>
                )}
              </View>

              <View style={[styles.fieldItem, { flex: 1.5, marginLeft: 12 }]}>
                <Text style={styles.fieldLabel}>Gender *</Text>
                {isEditing ? (
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
                ) : (
                  <Text style={styles.fieldDisplayVal}>{gender || '—'}</Text>
                )}
              </View>
            </View>

            {/* Mobile Number (Read-only verified) */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Mobile Number (WhatsApp Verified)</Text>
              <Text style={styles.fieldDisplayVal}>+91 {phone || '—'}</Text>
            </View>

            {/* Email Address */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="e.g. dr.rajesh@telederma.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.fieldDisplayVal}>{email || 'Not specified'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* SECTION 2: PROFESSIONAL INFORMATION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>2. Professional Information</Text>
            {isEditing && (
              <View style={styles.editingTag}>
                <Text style={styles.editingTagText}>Editing</Text>
              </View>
            )}
          </View>

          <View style={styles.fieldsGrid}>
            {/* Specialization */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Specialization *</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={specialization}
                  onChangeText={setSpecialization}
                  placeholder="e.g. Dermatologist & Cosmetologist"
                  placeholderTextColor="#9CA3AF"
                />
              ) : (
                <Text style={styles.fieldDisplayVal}>{specialization || 'Dermatologist'}</Text>
              )}
            </View>

            {/* Qualifications */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Qualifications *</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={qualification}
                  onChangeText={setQualification}
                  placeholder="e.g. MBBS, MD (Dermatology), DNB"
                  placeholderTextColor="#9CA3AF"
                />
              ) : (
                <Text style={styles.fieldDisplayVal}>{qualification || 'MBBS, MD (Dermatology)'}</Text>
              )}
            </View>

            {/* Experience & Hospital */}
            <View style={styles.twoColFields}>
              <View style={[styles.fieldItem, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Years of Experience *</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={experienceYears}
                    onChangeText={setExperienceYears}
                    placeholder="e.g. 10"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                  />
                ) : (
                  <Text style={styles.fieldDisplayVal}>{experienceYears ? `${experienceYears} Years` : '—'}</Text>
                )}
              </View>

              <View style={[styles.fieldItem, { flex: 1.5, marginLeft: 12 }]}>
                <Text style={styles.fieldLabel}>Current Hospital / Clinic *</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={hospitalClinic}
                    onChangeText={setHospitalClinic}
                    placeholder="e.g. Apollo Dermatology Clinic"
                    placeholderTextColor="#9CA3AF"
                  />
                ) : (
                  <Text style={styles.fieldDisplayVal}>{hospitalClinic || 'TeleDerma Telehealth Network'}</Text>
                )}
              </View>
            </View>

            {/* Areas of Expertise */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Areas of Expertise</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.fieldInput, styles.multilineInput]}
                  value={expertiseAreas}
                  onChangeText={setExpertiseAreas}
                  placeholder="e.g. Acne & Rosacea, Eczema & Psoriasis, Laser Procedures, Hair Loss"
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              ) : (
                <Text style={styles.fieldDisplayVal}>{expertiseAreas || 'General Dermatology, Acne, Eczema'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* SECTION 3: CONSULTATION INFORMATION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>3. Consultation Information</Text>
            {isEditing && (
              <View style={styles.editingTag}>
                <Text style={styles.editingTagText}>Editing</Text>
              </View>
            )}
          </View>

          <View style={styles.fieldsGrid}>
            {/* Fee & Duration */}
            <View style={styles.twoColFields}>
              <View style={[styles.fieldItem, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Consultation Fee (₹) *</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={consultationFee}
                    onChangeText={setConsultationFee}
                    placeholder="e.g. 700"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                  />
                ) : (
                  <Text style={styles.fieldDisplayVal}>{consultationFee ? `₹${consultationFee}` : '₹700'}</Text>
                )}
              </View>

              <View style={[styles.fieldItem, { flex: 1.2, marginLeft: 12 }]}>
                <Text style={styles.fieldLabel}>Consultation Duration</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={consultationDuration}
                    onChangeText={setConsultationDuration}
                    placeholder="e.g. 20 mins"
                    placeholderTextColor="#9CA3AF"
                  />
                ) : (
                  <Text style={styles.fieldDisplayVal}>{consultationDuration || '20 mins'}</Text>
                )}
              </View>
            </View>

            {/* Available Time Slots */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Available Time Slots</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={availableSlots}
                  onChangeText={setAvailableSlots}
                  placeholder="e.g. 09:00 AM - 01:00 PM, 04:00 PM - 08:00 PM"
                  placeholderTextColor="#9CA3AF"
                />
              ) : (
                <View>
                  <Text style={styles.fieldDisplayVal}>{availableSlots || '09:00 AM - 01:00 PM, 04:00 PM - 08:00 PM'}</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('DoctorSchedule')}
                    style={{ marginTop: 6 }}
                  >
                    <Text style={{ fontSize: 13, color: '#0F766E', fontWeight: '600' }}>
                      📅 Manage & View Daily Slots ➔
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Languages Spoken */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Languages Spoken</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={languages}
                  onChangeText={setLanguages}
                  placeholder="e.g. English, Hindi, Marathi"
                  placeholderTextColor="#9CA3AF"
                />
              ) : (
                <Text style={styles.fieldDisplayVal}>{languages || 'English, Hindi'}</Text>
              )}
            </View>

            {/* Direct Consultation Payment UPI ID */}
            <View style={styles.fieldItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={styles.fieldLabel}>Doctor UPI ID (Direct Patient Payments)</Text>
                <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 11, color: '#047857', fontWeight: '600' }}>🔒 2-Way AES Encrypted</Text>
                </View>
              </View>
              {isEditing ? (
                <View>
                  <TextInput
                    style={styles.fieldInput}
                    value={upiId}
                    onChangeText={setUpiId}
                    placeholder="e.g. dr.kundan@oksbi or 9876543210@upi"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                  />
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    Stored with two-way AES-256-CBC encryption. Patients pay directly to this UPI ID upon video call completion.
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937', flex: 1 }}>
                    {upiId || 'Not configured'}
                  </Text>
                  {upiId ? (
                    <Text style={{ fontSize: 12, color: '#0F766E', fontWeight: '600' }}>✓ Active</Text>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Big Save Button at bottom when editing */}
        {isEditing && (
          <TouchableOpacity
            style={styles.bottomSaveBtn}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.bottomSaveBtnText}>💾 Save All Profile Changes</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Logout Button */}
        {!isEditing && (
          <TouchableOpacity
            style={styles.profileLogoutBtn}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Text style={styles.profileLogoutBtnText}>🚪 Log Out of Doctor Account</Text>
          </TouchableOpacity>
        )}

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
            <Text style={styles.modalSub}>Choose how you want to update your profile photo</Text>

            <TouchableOpacity style={styles.modalBtn} onPress={handlePickGallery}>
              <Text style={styles.modalBtnIcon}>📁</Text>
              <Text style={styles.modalBtnText}>Choose from Files / Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtn} onPress={handleCaptureCamera}>
              <Text style={styles.modalBtnIcon}>📷</Text>
              <Text style={styles.modalBtnText}>Take Photo with Camera</Text>
            </TouchableOpacity>

            {photoUri && (
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalRemoveBtn]}
                onPress={handleRemovePhoto}
              >
                <Text style={styles.modalBtnIcon}>🗑️</Text>
                <Text style={[styles.modalBtnText, { color: '#DC2626' }]}>Remove Photo</Text>
              </TouchableOpacity>
            )}

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
    paddingTop: 16,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#0B6E69',
    fontWeight: '600',
  },

  // Back link
  backLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 6,
  },
  backLinkArrow: {
    fontSize: 18,
    color: '#0B6E69',
    fontWeight: '700',
    marginRight: 6,
  },
  backLinkText: {
    fontSize: 15,
    color: '#0B6E69',
    fontWeight: '700',
  },

  // Hero Card
  profileHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#113F36',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 4,
    flexWrap: 'wrap',
    gap: 16,
  },
  heroAvatarCol: {
    position: 'relative',
  },
  heroAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#0B6E69',
  },
  heroAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0B6E69',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroAvatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1F2937',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroAvatarEditIcon: {
    fontSize: 12,
  },
  heroDetailsCol: {
    flex: 1,
    minWidth: 200,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  heroSubText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 2,
  },
  heroEmailText: {
    fontSize: 13,
    color: '#0B6E69',
    fontWeight: '500',
  },

  // Edit Button in Hero Card
  editToggleBtn: {
    backgroundColor: '#0B6E69',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
  },
  editToggleBtnActive: {
    backgroundColor: '#0B6E69',
  },
  editToggleBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  editToggleBtnTextActive: {
    color: '#FFFFFF',
  },

  // Success Toast
  successToast: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  successToastText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 14,
  },

  // Section Cards
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
  editingTag: {
    backgroundColor: '#E6F4F3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editingTagText: {
    color: '#0B6E69',
    fontWeight: '700',
    fontSize: 12,
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
  fieldDisplayVal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    paddingVertical: 6,
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
    borderColor: '#0B6E69',
    borderWidth: 2,
    backgroundColor: '#E6F4F3',
  },
  genderPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  genderPillTextActive: {
    color: '#0B6E69',
    fontWeight: '800',
  },

  // Bottom Save Button
  bottomSaveBtn: {
    backgroundColor: '#0B6E69',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0B6E69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // Modal styles
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
  modalRemoveBtn: {
    backgroundColor: '#FEE2E2',
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
  profileLogoutBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  profileLogoutBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
});
