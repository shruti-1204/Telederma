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

const COMMON_ALLERGIES = ['None known', 'Sulfa drugs', 'Penicillin', 'Aspirin', 'Fragrances', 'Latex'];
const COMMON_CONDITIONS = ['None', 'Asthma', 'Diabetes', 'Thyroid', 'Hypertension', 'Eczema'];

export default function MedicalProfileSetupScreen({ navigation }) {
  const { patient, saveMedicalProfile } = useContext(AuthContext);

  const [allergies, setAllergies] = useState(patient?.allergies || '');
  const [existingConditions, setExistingConditions] = useState(patient?.existingConditions || '');
  const [previousSkinProblems, setPreviousSkinProblems] = useState(patient?.previousSkinProblems || '');
  const [currentMedications, setCurrentMedications] = useState(patient?.currentMedications || '');
  const [previousTreatments, setPreviousTreatments] = useState(patient?.previousTreatments || '');
  const [medicalHistory, setMedicalHistory] = useState(patient?.medicalHistory || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // Toggle quick allergy chip
  const handleToggleAllergy = (item) => {
    if (item === 'None known') {
      setAllergies('None known');
      return;
    }
    const current = allergies.split(',').map((s) => s.trim()).filter((s) => s && s !== 'None known');
    if (current.includes(item)) {
      setAllergies(current.filter((s) => s !== item).join(', '));
    } else {
      setAllergies([...current, item].join(', '));
    }
  };

  // Toggle quick condition chip
  const handleToggleCondition = (item) => {
    if (item === 'None') {
      setExistingConditions('None');
      return;
    }
    const current = existingConditions.split(',').map((s) => s.trim()).filter((s) => s && s !== 'None');
    if (current.includes(item)) {
      setExistingConditions(current.filter((s) => s !== item).join(', '));
    } else {
      setExistingConditions([...current, item].join(', '));
    }
  };

  // Skip Medical Info
  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      await saveMedicalProfile(
        {
          allergies: '',
          existingConditions: '',
          previousSkinProblems: '',
          currentMedications: '',
          previousTreatments: '',
          medicalHistory: '',
        },
        true // isSkipped = true
      );
      // Navigation is automatically handled or explicit
      navigation.navigate('Dashboard');
    } catch (e) {
      console.log('Error skipping medical info:', e);
    } finally {
      setIsSkipping(false);
    }
  };

  // Save Medical Info & Complete
  const handleSaveAndContinue = async () => {
    setIsSubmitting(true);
    try {
      await saveMedicalProfile(
        {
          allergies: allergies.trim(),
          existingConditions: existingConditions.trim(),
          previousSkinProblems: previousSkinProblems.trim(),
          currentMedications: currentMedications.trim(),
          previousTreatments: previousTreatments.trim(),
          medicalHistory: medicalHistory.trim(),
        },
        false // isSkipped = false
      );
      navigation.navigate('Dashboard');
    } catch (e) {
      console.log('Error saving medical info:', e);
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
                <Text style={styles.stepBadgeText}>Step 2 of 2: Medical Information</Text>
              </View>
              <Text style={styles.optionalBadge}>Optional (Skippable)</Text>
            </View>

            {/* Screen Header */}
            <Text style={styles.screenTitle}>Medical Information</Text>
            <Text style={styles.screenSubtitle}>
              Help your dermatologist provide accurate diagnoses, avoid adverse drug interactions, and prescribe safer treatments.
            </Text>

            {/* Explanatory Info Card */}
            <View style={styles.tipCard}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipText}>
                You can fill this in now, or tap <Text style={{ fontWeight: '700' }}>"Skip for Now"</Text> and update it later from your profile.
              </Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* 1. Allergies */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Known Drug & Contact Allergies</Text>
                <View style={styles.chipsRow}>
                  {COMMON_ALLERGIES.map((item) => {
                    const isSel = allergies.includes(item);
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[styles.chip, isSel && styles.chipActive]}
                        onPress={() => handleToggleAllergy(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={styles.textInput}
                  value={allergies}
                  onChangeText={setAllergies}
                  placeholder="Or type specific allergies (e.g. Neomycin, Sulfa, Fragrance)"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* 2. Existing Medical Conditions */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Existing Medical Conditions</Text>
                <View style={styles.chipsRow}>
                  {COMMON_CONDITIONS.map((item) => {
                    const isSel = existingConditions.includes(item);
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[styles.chip, isSel && styles.chipActive]}
                        onPress={() => handleToggleCondition(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={styles.textInput}
                  value={existingConditions}
                  onChangeText={setExistingConditions}
                  placeholder="Or type conditions (e.g. Asthma, Diabetes, Thyroid)"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* 3. Previous Skin Problems */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Previous Skin Problems</Text>
                <TextInput
                  style={styles.textInput}
                  value={previousSkinProblems}
                  onChangeText={setPreviousSkinProblems}
                  placeholder="e.g. Acne Vulgaris, Atopic Eczema, Psoriasis, Fungal rash"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* 4. Current Regular Medications */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Current Medications</Text>
                <TextInput
                  style={styles.textInput}
                  value={currentMedications}
                  onChangeText={setCurrentMedications}
                  placeholder="e.g. Antihistamines, Vitamin D, topical ointments"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* 5. Previous Treatments */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Previous Treatments</Text>
                <TextInput
                  style={styles.textInput}
                  value={previousTreatments}
                  onChangeText={setPreviousTreatments}
                  placeholder="e.g. Chemical peel, steroid creams, laser therapy"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* 6. Medical History / Notes */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>General Medical History & Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={medicalHistory}
                  onChangeText={setMedicalHistory}
                  placeholder="Any other relevant details or family history of skin conditions..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Bottom Actions Row with SKIP OPTION */}
            <View style={styles.actionButtonsRow}>
              {/* Skip for Now */}
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={handleSkip}
                accessibilityLabel="skip-medical-btn"
                disabled={isSkipping || isSubmitting}
                activeOpacity={0.7}
              >
                {isSkipping ? (
                  <ActivityIndicator size="small" color="#64748B" />
                ) : (
                  <Text style={styles.skipBtnText}>Skip for Now</Text>
                )}
              </TouchableOpacity>

              {/* Save & Continue */}
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (isSubmitting || isSkipping) && styles.saveBtnDisabled,
                ]}
                onPress={handleSaveAndContinue}
                accessibilityLabel="save-medical-btn"
                disabled={isSubmitting || isSkipping}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.saveBtnText}>Save & Continue ➔</Text>
                )}
              </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 580,
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
  optionalBadge: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '700',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  tipIcon: {
    fontSize: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 12.5,
    color: '#166534',
    lineHeight: 18,
  },
  formContainer: {
    gap: 16,
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 2,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#E6F4F4',
    borderColor: '#0B6B6B',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#0B6B6B',
    fontWeight: '800',
  },
  textInput: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 76,
    paddingVertical: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 18,
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  saveBtn: {
    flex: 1,
    height: 50,
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
  saveBtnDisabled: {
    opacity: 0.7,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
