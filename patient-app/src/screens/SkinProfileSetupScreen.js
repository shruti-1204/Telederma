import React, { useState, useContext } from 'react';
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
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import { AuthContext } from '../context/AuthContext';
import { imagePickerService } from '../services/imagePickerService';

const GENDERS = ['Male', 'Female', 'Other'];

export default function SkinProfileSetupScreen({ navigation }) {
  const { patient, updateProfile, logout } = useContext(AuthContext);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Editable Form State
  const [photoUri, setPhotoUri] = useState(patient?.photoUri || null);
  const [name, setName] = useState(patient?.name || 'Patient');
  const [age, setAge] = useState(patient?.age ? String(patient.age) : '28');
  const [gender, setGender] = useState(patient?.gender || 'Male');
  const [phone, setPhone] = useState(patient?.phone || '9876543210');
  const [email, setEmail] = useState(patient?.email || '');
  const [allergies, setAllergies] = useState(patient?.allergies || '');
  const [existingConditions, setExistingConditions] = useState(patient?.existingConditions || '');
  const [previousSkinProblems, setPreviousSkinProblems] = useState(patient?.previousSkinProblems || '');
  const [currentMedications, setCurrentMedications] = useState(patient?.currentMedications || '');
  const [previousTreatments, setPreviousTreatments] = useState(patient?.previousTreatments || '');
  const [medicalHistory, setMedicalHistory] = useState(patient?.medicalHistory || '');

  // Keep state in sync with loaded profile from PostgreSQL
  React.useEffect(() => {
    if (patient && !isEditing) {
      setPhotoUri(patient.photoUri || null);
      if (patient.name) setName(patient.name);
      if (patient.age) setAge(String(patient.age));
      if (patient.gender) setGender(patient.gender);
      if (patient.phone) setPhone(patient.phone);
      if (patient.email) setEmail(patient.email);
      if (patient.allergies) setAllergies(patient.allergies);
      if (patient.existingConditions) setExistingConditions(patient.existingConditions);
      if (patient.previousSkinProblems) setPreviousSkinProblems(patient.previousSkinProblems);
      if (patient.currentMedications) setCurrentMedications(patient.currentMedications);
      if (patient.previousTreatments) setPreviousTreatments(patient.previousTreatments);
      if (patient.medicalHistory) setMedicalHistory(patient.medicalHistory);
    }
  }, [patient, isEditing]);

  // Pick photo from gallery
  const handlePickGallery = async () => {
    setShowPhotoModal(false);
    const result = await imagePickerService.pickFromGallery();
    if (result && result.uri) {
      setPhotoUri(result.uri);
    }
  };

  // Take photo with camera
  const handleCaptureCamera = async () => {
    setShowPhotoModal(false);
    const result = await imagePickerService.takePhotoWithCamera();
    if (result && result.uri) {
      setPhotoUri(result.uri);
    }
  };

  // Remove photo
  const handleRemovePhoto = () => {
    setPhotoUri(null);
  };

  // Save changes
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg('');

    try {
      await updateProfile({
        photoUri,
        name: name.trim(),
        age: parseInt(age, 10) || 28,
        gender,
        email: email.trim(),
        allergies: allergies.trim(),
        existingConditions: existingConditions.trim(),
        previousSkinProblems: previousSkinProblems.trim(),
        currentMedications: currentMedications.trim(),
        previousTreatments: previousTreatments.trim(),
        medicalHistory: medicalHistory.trim(),
        medicalInfoSkipped: false, // If saved here, it is no longer skipped
      });

      setIsEditing(false);
      setSaveSuccessMsg('✓ Profile changes saved successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (e) {
      console.log('Error updating profile:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    if (Platform.OS === 'web') {
      logout();
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out of TeleDerma?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]);
    }
  };

  const renderPreviousSkinProblemsDisplay = (rawVal) => {
    if (!rawVal || !String(rawVal).trim()) {
      return <Text style={styles.fieldDisplayVal}>None reported</Text>;
    }

    const strVal = String(rawVal).trim();
    if (strVal.startsWith('{')) {
      try {
        const parsed = JSON.parse(strVal);
        const triage = parsed.triageLevel;
        const symptomsList = Array.isArray(parsed.symptoms)
          ? parsed.symptoms.join(', ')
          : (parsed.symptoms || [
              parsed.itching ? `Itching: ${parsed.itching}` : null,
              parsed.pain ? `Pain: ${parsed.pain}` : null,
              parsed.spreading ? `Spreading: ${parsed.spreading}` : null,
            ].filter(Boolean).join(', '));
        const duration = parsed.duration;
        const area = parsed.affectedArea;
        const observation = parsed.observation;

        const triageColor =
          triage === 'RED' ? '#DC2626' :
          triage === 'ORANGE' ? '#EA580C' :
          '#D97706';

        return (
          <View style={styles.skinProblemSummaryContainer}>
            {triage ? (
              <View style={styles.summaryLineRow}>
                <Text style={styles.summaryLineLabel}>Triage Level: </Text>
                <Text style={[styles.summaryLineValue, { color: triageColor, fontWeight: '700' }]}>
                  {triage}
                </Text>
              </View>
            ) : null}

            {symptomsList ? (
              <View style={styles.summaryLineRow}>
                <Text style={styles.summaryLineLabel}>Symptoms: </Text>
                <Text style={styles.summaryLineValue}>{symptomsList}</Text>
              </View>
            ) : null}

            {duration ? (
              <View style={styles.summaryLineRow}>
                <Text style={styles.summaryLineLabel}>Duration: </Text>
                <Text style={styles.summaryLineValue}>{duration}</Text>
              </View>
            ) : null}

            {area ? (
              <View style={styles.summaryLineRow}>
                <Text style={styles.summaryLineLabel}>Affected Area: </Text>
                <Text style={styles.summaryLineValue}>{area}</Text>
              </View>
            ) : null}

            {observation ? (
              <View style={styles.summaryLineRow}>
                <Text style={styles.summaryLineLabel}>Observation: </Text>
                <Text style={styles.summaryLineValue}>{observation}</Text>
              </View>
            ) : null}
          </View>
        );
      } catch (e) {
        const sanitized = strVal.replace(/"photoUri":\s*"data:[^"]+"/g, '"photoUri": "[Photo attached]"');
        return <Text style={styles.fieldDisplayVal}>{sanitized}</Text>;
      }
    }

    return <Text style={styles.fieldDisplayVal}>{strVal}</Text>;
  };

  const isMedicalEmpty =
    !patient?.allergies &&
    !patient?.existingConditions &&
    !patient?.previousSkinProblems &&
    !patient?.currentMedications &&
    !patient?.previousTreatments &&
    !patient?.medicalHistory;

  return (
    <SafeAreaView style={styles.safe}>
      <Header navigation={navigation} />

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
            {(photoUri || patient?.photoUri) ? (
              <Image
                source={{ uri: photoUri || patient?.photoUri }}
                style={styles.heroAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.heroAvatarCircle}>
                <Text style={styles.heroAvatarInitials}>
                  {name ? name[0].toUpperCase() : 'P'}
                </Text>
              </View>
            )}

            {isEditing && (
              <TouchableOpacity
                style={styles.heroAvatarEditBadge}
                onPress={() => setShowPhotoModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.heroAvatarEditIcon}>📷</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.heroDetailsCol}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName}>{name || 'Patient'}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
              </View>
            </View>
            <Text style={styles.heroSubText}>
              +91 {phone} • {age} yrs • {gender}
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

        {/* Notice if Medical Info was Skipped */}
        {!isEditing && (patient?.medicalInfoSkipped || isMedicalEmpty) && (
          <View style={styles.skippedNoticeBanner}>
            <View style={styles.skippedNoticeIconBox}>
              <Text style={styles.skippedNoticeIcon}>📋</Text>
            </View>
            <View style={styles.skippedNoticeTextCol}>
              <Text style={styles.skippedNoticeTitle}>Medical Information Pending</Text>
              <Text style={styles.skippedNoticeSub}>
                Medical details were skipped during setup. Adding them helps your dermatologist prescribe safer, personalized medications.
              </Text>
              <TouchableOpacity
                style={styles.addMedicalBtn}
                onPress={() => setIsEditing(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.addMedicalBtnText}>+ Add Medical Details Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECTION 1: PERSONAL INFORMATION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>1. Personal Demographics</Text>
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
                  placeholder="Enter full name"
                />
              ) : (
                <Text style={styles.fieldDisplayVal}>{name || '—'}</Text>
              )}
            </View>

            {/* Age & Gender */}
            <View style={styles.twoColFields}>
              <View style={[styles.fieldItem, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Age *</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="number-pad"
                  />
                ) : (
                  <Text style={styles.fieldDisplayVal}>{age || '—'}</Text>
                )}
              </View>

              <View style={[styles.fieldItem, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Gender *</Text>
                {isEditing ? (
                  <View style={styles.genderSelectRow}>
                    {GENDERS.map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.genderSelectChip,
                          gender === g && styles.genderSelectChipActive,
                        ]}
                        onPress={() => setGender(g)}
                      >
                        <Text
                          style={[
                            styles.genderSelectChipText,
                            gender === g && styles.genderSelectChipTextActive,
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

            {/* Mobile Number */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Mobile Number (WhatsApp Verified)</Text>
              <Text style={styles.fieldDisplayVal}>+91 {phone}</Text>
            </View>

            {/* Email Address */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                />
              ) : (
                <Text style={styles.fieldDisplayVal}>{email || 'Not specified'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* SECTION 2: MEDICAL INFORMATION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>2. Medical History & Dermatology Profile</Text>
            {isEditing && (
              <View style={styles.editingTag}>
                <Text style={styles.editingTagText}>Editing</Text>
              </View>
            )}
          </View>

          <View style={styles.fieldsGrid}>
            {/* Allergies */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Known Drug & Contact Allergies</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={allergies}
                  onChangeText={setAllergies}
                  placeholder="e.g. Penicillin, Sulfa drugs, Fragrances"
                />
              ) : (
                <Text style={styles.fieldDisplayVal}>
                  {allergies || 'None reported'}
                </Text>
              )}
            </View>

            {/* Existing Medical Conditions */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Existing Medical Conditions</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={existingConditions}
                  onChangeText={setExistingConditions}
                  placeholder="e.g. Asthma, Diabetes, Thyroid"
                />
              ) : (
                <Text style={styles.fieldDisplayVal}>
                  {existingConditions || 'None reported'}
                </Text>
              )}
            </View>

            {/* Previous Skin Problems */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Previous Skin Problems</Text>
              {isEditing && !String(previousSkinProblems || '').trim().startsWith('{') ? (
                <TextInput
                  style={styles.fieldInput}
                  value={previousSkinProblems}
                  onChangeText={setPreviousSkinProblems}
                  placeholder="e.g. Acne Vulgaris, Eczema, Psoriasis"
                />
              ) : (
                renderPreviousSkinProblemsDisplay(previousSkinProblems)
              )}
            </View>

            {/* Current Regular Medications */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Current Regular Medications</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={currentMedications}
                  onChangeText={setCurrentMedications}
                  placeholder="e.g. Antihistamines, Vitamin D, topical ointments"
                />
              ) : (
                <Text style={styles.fieldDisplayVal}>
                  {currentMedications || 'None reported'}
                </Text>
              )}
            </View>

            {/* Previous Treatments */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Previous Treatments & Procedures</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={previousTreatments}
                  onChangeText={setPreviousTreatments}
                  placeholder="e.g. Chemical peel, steroid creams, laser"
                />
              ) : (
                <Text style={styles.fieldDisplayVal}>
                  {previousTreatments || 'None reported'}
                </Text>
              )}
            </View>

            {/* General Medical History / Notes */}
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Medical History & Notes</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.fieldInput, styles.textArea]}
                  value={medicalHistory}
                  onChangeText={setMedicalHistory}
                  placeholder="Additional health context or notes"
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text style={styles.fieldDisplayVal}>
                  {medicalHistory || 'No additional history provided.'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Bottom Action Area: Save or Logout */}
        {isEditing ? (
          <View style={styles.bottomEditActions}>
            <TouchableOpacity
              style={styles.cancelEditBtn}
              onPress={() => setIsEditing(false)}
              disabled={isSaving}
            >
              <Text style={styles.cancelEditBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveChangesBtn}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveChangesBtnText}>Save Profile Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.logoutSection}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
              accessibilityLabel="logout-btn"
              aria-label="logout-btn"
            >
              <Text style={styles.logoutBtnIcon}>🚪</Text>
              <Text style={styles.logoutBtnText}>Log Out from TeleDerma</Text>
            </TouchableOpacity>
            <Text style={styles.logoutSubText}>
              Clears your local session and returns to the mobile login screen.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

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
            <Text style={styles.modalTitle}>Change Profile Photo</Text>
            <Text style={styles.modalSub}>Select an option below</Text>

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
                <Text style={styles.modalOptionSub}>Capture a new photo</Text>
              </View>
            </TouchableOpacity>

            {photoUri && (
              <TouchableOpacity
                style={[styles.modalOptionBtn, { backgroundColor: '#FEE2E2' }]}
                onPress={() => {
                  handleRemovePhoto();
                  setShowPhotoModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalOptionIcon}>🗑️</Text>
                <View>
                  <Text style={[styles.modalOptionTitle, { color: '#DC2626' }]}>Remove Photo</Text>
                  <Text style={styles.modalOptionSub}>Reset to initials avatar</Text>
                </View>
              </TouchableOpacity>
            )}

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
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  backLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  backLinkArrow: {
    fontSize: 18,
    color: '#0B6B6B',
    fontWeight: '800',
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B6B6B',
  },
  profileHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 16,
    gap: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroAvatarCol: {
    position: 'relative',
  },
  heroAvatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  heroAvatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0B6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarInitials: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroAvatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0F172A',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroAvatarEditIcon: {
    fontSize: 11,
  },
  heroDetailsCol: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803D',
  },
  heroSubText: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  heroEmailText: {
    fontSize: 12,
    color: '#0B6B6B',
    marginTop: 1,
    fontWeight: '500',
  },
  editToggleBtn: {
    backgroundColor: '#E6F4F4',
    borderWidth: 1,
    borderColor: '#0B6B6B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editToggleBtnActive: {
    backgroundColor: '#0B6B6B',
  },
  editToggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B6B6B',
  },
  editToggleBtnTextActive: {
    color: '#FFFFFF',
  },
  successToast: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  successToastText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  skippedNoticeBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  skippedNoticeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skippedNoticeIcon: {
    fontSize: 18,
  },
  skippedNoticeTextCol: {
    flex: 1,
  },
  skippedNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
  },
  skippedNoticeSub: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
    marginTop: 3,
    marginBottom: 10,
  },
  addMedicalBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addMedicalBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  editingTag: {
    backgroundColor: '#E6F4F4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  editingTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B6B6B',
  },
  fieldsGrid: {
    gap: 12,
  },
  fieldItem: {
    gap: 4,
  },
  twoColFields: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  fieldDisplayVal: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1E293B',
    paddingVertical: 4,
  },
  skinProblemSummaryContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 4,
    gap: 6,
  },
  summaryLineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  summaryLineLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  summaryLineValue: {
    fontSize: 13,
    color: '#1E293B',
    flex: 1,
    lineHeight: 18,
  },
  fieldInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    height: 70,
    paddingVertical: 8,
  },
  genderSelectRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genderSelectChip: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  genderSelectChipActive: {
    borderColor: '#0B6B6B',
    backgroundColor: '#E6F4F4',
  },
  genderSelectChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  genderSelectChipTextActive: {
    color: '#0B6B6B',
    fontWeight: '800',
  },
  bottomEditActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelEditBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelEditBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  saveChangesBtn: {
    flex: 1,
    backgroundColor: '#0B6B6B',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0B6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveChangesBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  logoutSection: {
    marginTop: 12,
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  logoutBtnIcon: {
    fontSize: 16,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  logoutSubText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
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
