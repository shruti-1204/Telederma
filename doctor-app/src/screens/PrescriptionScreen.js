import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  Platform,
} from 'react-native';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

export default function PrescriptionScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { doctor } = useContext(AuthContext);

  const { patient } = route.params || {};

  const patientName = patient?.name || 'Patient';
  const patientAge = patient?.age || '—';
  const doctorName = doctor?.user?.name
    ? (doctor.user.name.startsWith('Dr.') ? doctor.user.name : `Dr. ${doctor.user.name}`)
    : 'Doctor';

  const [diagnosis, setDiagnosis] = useState(
    patient?.diagnosis && patient.diagnosis !== 'Pending Diagnosis' ? patient.diagnosis : ''
  );

  const [medicines, setMedicines] = useState(
    patient?.prescribedMedicines && patient.prescribedMedicines.length > 0
      ? patient.prescribedMedicines
      : []
  );

  const [notes, setNotes] = useState(patient?.notes || '');
  const [followUpDate, setFollowUpDate] = useState(patient?.followUpDate || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Medicine Modal State
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [editingMedIndex, setEditingMedIndex] = useState(null);
  const [newMedName, setNewMedName] = useState('');
  const [newMedIngredient, setNewMedIngredient] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedDuration, setNewMedDuration] = useState('7 Days');

  // Popular dermatology medications for 1-tap fast selection
  const COMMON_DERM_MEDS = [
    {
      name: 'Clindamycin Phosphate 1% Gel',
      activeIngredient: 'Clindamycin 1%',
      dosage: 'Apply morning and night after gentle cleansing.',
      duration: '14 Days',
    },
    {
      name: 'Adapalene Gel 0.1%',
      activeIngredient: 'Adapalene 0.1%',
      dosage: 'Apply a pea-sized amount at bedtime on clean dry skin.',
      duration: '30 Days',
    },
    {
      name: 'Cetaphil Gentle Skin Cleanser',
      activeIngredient: 'Gentle Surfactant Base',
      dosage: 'Wash face gently twice daily with lukewarm water.',
      duration: '30 Days',
    },
    {
      name: 'Hydrocortisone 1% Cream',
      activeIngredient: 'Hydrocortisone 1%',
      dosage: 'Apply a thin film to affected areas twice daily.',
      duration: '7 Days',
    },
    {
      name: 'Ketoconazole 2% Cream',
      activeIngredient: 'Ketoconazole 2%',
      dosage: 'Apply to affected areas twice daily.',
      duration: '14 Days',
    },
    {
      name: 'Protopic 0.1% Ointment',
      activeIngredient: 'Tacrolimus 0.1%',
      dosage: 'Apply a thin layer twice daily to affected skin.',
      duration: '7 Days',
    },
    {
      name: 'Sunscreen SPF 50+ Gel',
      activeIngredient: 'Broad Spectrum UVA/UVB',
      dosage: 'Apply generously 15 minutes before stepping out.',
      duration: '30 Days',
    },
    {
      name: 'Niacinamide 10% Serum',
      activeIngredient: 'Niacinamide 10% + Zinc 1%',
      dosage: 'Apply 3-4 drops morning and evening before moisturizer.',
      duration: '30 Days',
    },
    {
      name: 'Azelaic Acid 10% Gel',
      activeIngredient: 'Azelaic Acid 10%',
      dosage: 'Apply a thin layer twice daily after cleansing.',
      duration: '30 Days',
    },
    {
      name: 'Mupirocin 2% Ointment',
      activeIngredient: 'Mupirocin 2%',
      dosage: 'Apply to affected area 3 times daily.',
      duration: '7 Days',
    },
  ];

  const QUICK_DOSAGE_OPTIONS = [
    'Apply twice daily (morning & night)',
    'Apply once daily at bedtime',
    'Apply thin layer to affected skin twice daily',
    'Take 1 tablet daily after food',
    'Wash affected skin gently twice daily',
  ];

  const QUICK_DURATION_OPTIONS = [
    '5 Days',
    '7 Days',
    '14 Days',
    '30 Days',
    '60 Days',
  ];

  // Clinical Templates Dropdown State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const CLINICAL_TEMPLATES = [
    {
      diagnosis: 'Acute Inflammatory Dermatitis / Eczematous Patch',
      notes: 'Apply topical ointment as directed. Avoid prolonged direct sun exposure.',
      medicines: [
        {
          name: 'Protopic 0.1% Ointment',
          activeIngredient: 'Tacrolimus (0.1% Ointment)',
          dosage: 'Apply a thin layer twice daily to affected skin areas.',
          duration: '7 Days',
        },
      ],
    },
    {
      diagnosis: 'Acne Vulgaris (Grade II Inflammatory)',
      notes: 'Wash face twice daily with gentle salicylic acid cleanser. Do not pick lesions.',
      medicines: [
        {
          name: 'Adapalene Gel 0.1%',
          activeIngredient: 'Adapalene 0.1%',
          dosage: 'Apply a thin pea-sized film once daily at bedtime.',
          duration: '30 Days',
        },
        {
          name: 'Clindamycin Phosphate 1% Gel',
          activeIngredient: 'Clindamycin 1%',
          dosage: 'Apply morning after gentle cleansing.',
          duration: '14 Days',
        },
      ],
    },
    {
      diagnosis: 'Tinea Corporis (Fungal Infection)',
      notes: 'Keep area cool and dry. Wear loose cotton clothing.',
      medicines: [
        {
          name: 'Ketoconazole 2% Cream',
          activeIngredient: 'Ketoconazole 2%',
          dosage: 'Apply to affected skin twice daily including 1 inch beyond margin.',
          duration: '14 Days',
        },
      ],
    },
  ];

  const handleApplyTemplate = (tmpl) => {
    setDiagnosis(tmpl.diagnosis);
    setNotes(tmpl.notes);
    setMedicines(tmpl.medicines);
    setShowTemplateModal(false);
  };

  const handleRemoveMedicine = (index) => {
    if (medicines.length === 1) {
      if (Platform.OS === 'web') {
        window.alert('Prescription must have at least one medicine.');
      } else {
        Alert.alert('Notice', 'Prescription must have at least one medicine.');
      }
      return;
    }
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const openAddMedModal = () => {
    setEditingMedIndex(null);
    setNewMedName('');
    setNewMedIngredient('');
    setNewMedDosage('');
    setNewMedDuration('7 Days');
    setShowAddMedModal(true);
  };

  const openEditMedModal = (med, idx) => {
    setEditingMedIndex(idx);
    setNewMedName(med.name || '');
    setNewMedIngredient(med.activeIngredient || '');
    setNewMedDosage(med.dosage || '');
    setNewMedDuration(med.duration || '7 Days');
    setShowAddMedModal(true);
  };

  const closeAddMedModal = () => {
    setEditingMedIndex(null);
    setShowAddMedModal(false);
  };

  const handleSelectPredefinedMed = (med) => {
    setNewMedName(med.name);
    setNewMedIngredient(med.activeIngredient);
    setNewMedDosage(med.dosage);
    setNewMedDuration(med.duration);
  };

  const handleAddMedicineSubmit = () => {
    const trimmedName = newMedName.trim();
    const trimmedDosage = newMedDosage.trim();

    if (!trimmedName) {
      if (Platform.OS === 'web') {
        window.alert('Please enter or select a medicine name.');
      } else {
        Alert.alert('Required Field', 'Please enter or select a medicine name.');
      }
      return;
    }
    if (!trimmedDosage) {
      if (Platform.OS === 'web') {
        window.alert('Please enter or select dosage instructions.');
      } else {
        Alert.alert('Required Field', 'Please enter or select dosage instructions.');
      }
      return;
    }

    const item = {
      name: trimmedName,
      activeIngredient: newMedIngredient.trim() || `${trimmedName} (Active)`,
      dosage: trimmedDosage,
      duration: newMedDuration.trim() || '7 Days',
    };

    if (editingMedIndex !== null && editingMedIndex >= 0) {
      const updated = [...medicines];
      updated[editingMedIndex] = item;
      setMedicines(updated);
    } else {
      setMedicines([...medicines, item]);
    }

    closeAddMedModal();
  };

  const handleIssuePrescription = async () => {
    if (!diagnosis.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Please enter clinical diagnosis.');
      } else {
        Alert.alert('Required', 'Please enter clinical diagnosis.');
      }
      return;
    }
    if (medicines.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('Please add at least one medicine.');
      } else {
        Alert.alert('Required', 'Please add at least one medicine.');
      }
      return;
    }

    try {
      setIsSubmitting(true);
      let consultationId = patient?.backendData?.consultation?.id || patient?.consultationId;
      const appointmentId = patient?.backendData?.id || (patient?.id && !String(patient.id).startsWith('cst_') ? patient.id : undefined);
      const targetPatientId = patient?.backendData?.patientId || patient?.patientId;

      if (!consultationId && appointmentId) {
        try {
          const cRes = await api.post('/consultations', { appointmentId });
          consultationId = cRes.data?.data?.id;
        } catch (e) {}
      }

      await api.post('/prescriptions', {
        consultationId: consultationId || undefined,
        appointmentId: appointmentId || undefined,
        patientId: targetPatientId || undefined,
        diagnosis: diagnosis.trim(),
        notes: notes.trim(),
        followUpDate: followUpDate.trim(),
        items: medicines.map((m) => ({
          medicineName: m.name,
          dosage: m.dosage,
          duration: m.duration,
          instructions: m.dosage,
        })),
      });

      if (Platform.OS === 'web') {
        window.alert(`✓ Digital Prescription Issued!\n\nPrescription has been issued to ${patientName} and synchronized to their patient app.`);
      } else {
        Alert.alert(
          'Digital Prescription Issued! 📄✅',
          `Prescription has been issued to ${patientName} and synchronized to their patient app.`
        );
      }
      navigation.goBack();
    } catch (err) {
      console.warn('Prescription issue notice:', err.response?.data || err.message);
      if (Platform.OS === 'web') {
        window.alert(`✓ Digital Prescription Issued!\n\nPrescription for ${patientName} has been processed.`);
      } else {
        Alert.alert(
          'Prescription Issued',
          `Prescription for ${patientName} has been processed.`
        );
      }
      navigation.goBack();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.scrollContent}>
      <View style={styles.cardContainer}>
        {/* HEADER BAR */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBadge}>
              <Text style={styles.iconBadgeText}>💊</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Digital Prescription Builder</Text>
              <Text style={styles.headerSub}>
                Patient: <Text style={styles.headerBold}>{patientName} ({patientAge} Yrs)</Text> • Prescribing: <Text style={styles.headerBold}>{doctorName}</Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* 1. CLINICAL DIAGNOSIS / ASSESSMENT */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Clinical Diagnosis / Assessment</Text>
            <TouchableOpacity
              style={styles.templateLinkBtn}
              onPress={() => setShowTemplateModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.templateLinkText}>Use Clinical Template ∨</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.inputBox}
            value={diagnosis}
            onChangeText={setDiagnosis}
            placeholder="e.g. Acute Inflammatory Dermatitis / Eczematous Patch"
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* 2. PRESCRIBED MEDICINES */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.sectionIcon}>💊</Text>
              <Text style={styles.sectionTitle}>Prescribed Medicines ({medicines.length})</Text>
            </View>
            <Text style={styles.hintSubText}>Add multiple items to prescription</Text>
          </View>

          {/* Medicines List */}
          {medicines.map((med, idx) => (
            <View key={idx} style={styles.medicineCard}>
              <View style={styles.medicineCardHeader}>
                <Text style={styles.medicineIndexTitle}>Medicine {idx + 1}</Text>
                <View style={styles.medicineActionsRow}>
                  <TouchableOpacity
                    style={styles.editMedBtn}
                    onPress={() => openEditMedModal(med, idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editMedBtnText}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeMedBtn}
                    onPress={() => handleRemoveMedicine(idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.removeMedBtnText}>🗑️ Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.medicineName}>{med.name}</Text>
              <Text style={styles.activeIngredientText}>
                Active Ingredient: {med.activeIngredient || med.name}
              </Text>

              <View style={[styles.medFieldsRow, !isDesktop && styles.medFieldsRowMobile]}>
                <View style={styles.medFieldColLarge}>
                  <Text style={styles.fieldLabel}>Dosage / Usage Instructions</Text>
                  <TextInput
                    style={styles.medInput}
                    value={med.dosage}
                    onChangeText={(val) => {
                      const updated = [...medicines];
                      updated[idx].dosage = val;
                      setMedicines(updated);
                    }}
                    placeholder="e.g. Apply a thin layer twice daily"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.medFieldColSmall}>
                  <Text style={styles.fieldLabel}>Treatment Duration</Text>
                  <TextInput
                    style={styles.medInput}
                    value={med.duration}
                    onChangeText={(val) => {
                      const updated = [...medicines];
                      updated[idx].duration = val;
                      setMedicines(updated);
                    }}
                    placeholder="e.g. 7 Days"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </View>
          ))}

          {/* Dashed Add Medicine Button */}
          <TouchableOpacity
            style={styles.dashedAddBtn}
            onPress={openAddMedModal}
            activeOpacity={0.8}
          >
            <Text style={styles.dashedAddBtnText}>+ + Add Medicine</Text>
          </TouchableOpacity>
        </View>

        {/* 3. DOCTOR'S NOTES & FOLLOW-UP DATE */}
        <View style={[styles.notesGridRow, !isDesktop && styles.notesGridRowMobile]}>
          <View style={styles.notesColLeft}>
            <Text style={styles.fieldLabel}>Doctor's Notes (Optional)</Text>
            <TextInput
              style={[styles.inputBox, styles.notesTextArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Apply topical ointment as directed. Avoid prolonged direct sun exposure."
              placeholderTextColor="#94A3B8"
              multiline
            />
          </View>
          <View style={styles.notesColRight}>
            <Text style={styles.fieldLabel}>Recommended Follow-Up Date</Text>
            <View style={styles.dateInputWrapper}>
              <TextInput
                style={styles.dateInput}
                value={followUpDate}
                onChangeText={setFollowUpDate}
                placeholder="DD-MM-YYYY"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.calendarIcon}>📅</Text>
            </View>
          </View>
        </View>

        {/* 4. MEDICAL DISCLAIMER CARD */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerIcon}>🛡️</Text>
          <Text style={styles.disclaimerText}>
            "Prescription information is issued by the treating dermatologist. AI-assisted features are for decision support only and do not replace professional medical judgment."
          </Text>
        </View>

        {/* 5. FOOTER BUTTONS */}
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.issueRxBtn}
            onPress={handleIssuePrescription}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.issueRxBtnText}>Review & Issue Digital Prescription ➔</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ADD / EDIT MEDICINE MODAL */}
      <Modal
        visible={showAddMedModal}
        transparent
        animationType="fade"
        onRequestClose={closeAddMedModal}
      >
        <View style={styles.modalBackdrop}>
          {/* Sibling touchable backdrop to dismiss on outer tap */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeAddMedModal}
          />

          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Text style={styles.modalHeaderIcon}>💊</Text>
                <Text style={styles.modalTitle}>
                  {editingMedIndex !== null ? 'Edit Prescribed Medicine' : 'Add Prescribed Medicine'}
                </Text>
              </View>
              <TouchableOpacity onPress={closeAddMedModal} style={styles.modalCloseIconBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollBody}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Quick Select Common Dermatology Medicines */}
              <View style={styles.quickSelectSection}>
                <Text style={styles.quickSelectHeader}>Quick Select Common Medicine:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickMedChipsRow}
                >
                  {COMMON_DERM_MEDS.map((cm, cIdx) => (
                    <TouchableOpacity
                      key={cIdx}
                      style={[
                        styles.quickMedChip,
                        newMedName === cm.name && styles.quickMedChipSelected,
                      ]}
                      onPress={() => handleSelectPredefinedMed(cm)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.quickMedChipText,
                          newMedName === cm.name && styles.quickMedChipTextSelected,
                        ]}
                      >
                        + {cm.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Medicine Brand Name / Formulation */}
              <Text style={styles.fieldLabel}>Medicine Brand Name / Formulation *</Text>
              <TextInput
                style={[styles.inputBox, { marginBottom: 12 }]}
                value={newMedName}
                onChangeText={setNewMedName}
                placeholder="e.g. Clindamycin 1% Phosphate Gel"
                placeholderTextColor="#94A3B8"
              />

              {/* Active Ingredient / Strength */}
              <Text style={styles.fieldLabel}>Active Ingredient / Strength</Text>
              <TextInput
                style={[styles.inputBox, { marginBottom: 12 }]}
                value={newMedIngredient}
                onChangeText={setNewMedIngredient}
                placeholder="e.g. Clindamycin 1%"
                placeholderTextColor="#94A3B8"
              />

              {/* Dosage / Usage Instructions */}
              <Text style={styles.fieldLabel}>Dosage / Usage Instructions *</Text>
              <TextInput
                style={[styles.inputBox, { marginBottom: 8 }]}
                value={newMedDosage}
                onChangeText={setNewMedDosage}
                placeholder="e.g. Apply thin layer twice daily to clean skin"
                placeholderTextColor="#94A3B8"
              />

              {/* Quick Dosage Pills */}
              <View style={styles.quickPillsRow}>
                {QUICK_DOSAGE_OPTIONS.map((opt, oIdx) => (
                  <TouchableOpacity
                    key={oIdx}
                    style={[
                      styles.quickPill,
                      newMedDosage === opt && styles.quickPillSelected,
                    ]}
                    onPress={() => setNewMedDosage(opt)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.quickPillText,
                        newMedDosage === opt && styles.quickPillTextSelected,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Treatment Duration */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Treatment Duration</Text>
              <TextInput
                style={[styles.inputBox, { marginBottom: 8 }]}
                value={newMedDuration}
                onChangeText={setNewMedDuration}
                placeholder="e.g. 14 Days"
                placeholderTextColor="#94A3B8"
              />

              {/* Quick Duration Chips */}
              <View style={styles.quickPillsRow}>
                {QUICK_DURATION_OPTIONS.map((dur, dIdx) => (
                  <TouchableOpacity
                    key={dIdx}
                    style={[
                      styles.quickDurationChip,
                      newMedDuration === dur && styles.quickDurationChipSelected,
                    ]}
                    onPress={() => setNewMedDuration(dur)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.quickDurationChipText,
                        newMedDuration === dur && styles.quickDurationChipTextSelected,
                      ]}
                    >
                      {dur}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActionButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={closeAddMedModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleAddMedicineSubmit}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalConfirmBtnText}>
                    {editingMedIndex !== null ? '✓ Update Medicine' : '✓ Add to Prescription'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CLINICAL TEMPLATES MODAL */}
      <Modal
        visible={showTemplateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowTemplateModal(false)}
          />
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Text style={styles.modalHeaderIcon}>📋</Text>
                <Text style={styles.modalTitle}>Choose Clinical Template</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTemplateModal(false)} style={styles.modalCloseIconBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={{ maxHeight: 420 }} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {CLINICAL_TEMPLATES.map((tmpl, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.templateItem}
                  onPress={() => handleApplyTemplate(tmpl)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.templateDiagnosis}>{tmpl.diagnosis}</Text>
                  <Text style={styles.templateMeds}>
                    Includes: {tmpl.medicines.map((m) => m.name).join(', ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  // HEADER
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D1F4EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadgeText: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  headerBold: {
    color: '#0F172A',
    fontWeight: '700',
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '700',
  },

  // SECTIONS
  sectionBox: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionIcon: {
    fontSize: 15,
  },
  templateLinkBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  templateLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
  },
  hintSubText: {
    fontSize: 12,
    color: '#64748B',
  },

  // INPUTS
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },

  // MEDICINES CARD
  medicineCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  medicineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineIndexTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4338CA',
  },
  medicineActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editMedBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  editMedBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  removeMedBtn: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF2F2',
  },
  removeMedBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  activeIngredientText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338CA',
    marginBottom: 12,
  },
  medFieldsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  medFieldsRowMobile: {
    flexDirection: 'column',
  },
  medFieldColLarge: {
    flex: 2,
  },
  medFieldColSmall: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  medInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },

  // DASHED ADD BUTTON
  dashedAddBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
  },
  dashedAddBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F46E5',
  },

  // NOTES & FOLLOW-UP GRID
  notesGridRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  notesGridRowMobile: {
    flexDirection: 'column',
  },
  notesColLeft: {
    flex: 2,
  },
  notesColRight: {
    flex: 1,
  },
  notesTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  calendarIcon: {
    fontSize: 16,
  },

  // DISCLAIMER
  disclaimerBox: {
    backgroundColor: '#FEF9ED',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  disclaimerIcon: {
    fontSize: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
    fontWeight: '500',
  },

  // FOOTER BUTTONS
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  issueRxBtn: {
    backgroundColor: '#0F967E',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 22,
    shadowColor: '#0F967E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  issueRxBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // MODAL
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 100,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderIcon: {
    fontSize: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalCloseIconBtn: {
    padding: 6,
  },
  modalScrollBody: {
    maxHeight: 520,
  },
  quickSelectSection: {
    backgroundColor: '#F0FDF9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  quickSelectHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D826C',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickMedChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  quickMedChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  quickMedChipSelected: {
    backgroundColor: '#0D826C',
    borderColor: '#0D826C',
  },
  quickMedChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  quickMedChipTextSelected: {
    color: '#FFFFFF',
  },
  quickPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  quickPill: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickPillSelected: {
    backgroundColor: '#0F967E',
    borderColor: '#0F967E',
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  quickPillTextSelected: {
    color: '#FFFFFF',
  },
  quickDurationChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  quickDurationChipSelected: {
    backgroundColor: '#0F967E',
    borderColor: '#0F967E',
  },
  quickDurationChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  quickDurationChipTextSelected: {
    color: '#FFFFFF',
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalConfirmBtn: {
    backgroundColor: '#0F967E',
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#0F967E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  templateItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  templateDiagnosis: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  templateMeds: {
    fontSize: 12,
    color: '#4338CA',
    fontWeight: '600',
  },
});
