import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import MedicalDisclaimer from '../components/MedicalDisclaimer';
import { mockPrescriptions } from '../services/mockData';

export default function PrescriptionScreen({ navigation, route }) {
  const prescription = route?.params?.prescription || mockPrescriptions[0];

  const handleDownload = () => {
    Alert.alert('Download Prescription', 'Digital Prescription PDF saved to your device downloads.', [
      { text: 'OK' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header navigation={navigation} />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back Link */}
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>← Back to Records</Text>
        </TouchableOpacity>

        {/* Prescription Document Card */}
        <View style={styles.rxDocumentCard}>
          {/* Header of Prescription */}
          <View style={styles.docHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicTitle}>TeleDerma Telemedicine Network</Text>
              <Text style={styles.doctorName}>{prescription.doctorName}</Text>
              <Text style={styles.doctorSub}>MBBS, MD Dermatology • Reg. #MCI-74829</Text>
            </View>
            <View style={styles.rxBadgeCircle}>
              <Text style={styles.rxBadgeText}>℞</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Patient & Date Meta */}
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Patient Name</Text>
              <Text style={styles.metaVal}>Rahul Sharma (28y / Male)</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metaLabel}>Prescription Date</Text>
              <Text style={styles.metaVal}>{prescription.date}</Text>
            </View>
          </View>

          {/* Diagnosis */}
          <View style={styles.diagnosisBox}>
            <Text style={styles.diagnosisLabel}>CLINICAL DIAGNOSIS</Text>
            <Text style={styles.diagnosisText}>{prescription.diagnosis}</Text>
          </View>

          {/* Medicines List */}
          <Text style={styles.sectionHeaderTitle}>Prescribed Medications (Rx)</Text>

          {prescription.medicines.map((med, idx) => (
            <View key={idx} style={styles.medCard}>
              <View style={styles.medNumberCircle}>
                <Text style={styles.medNumberText}>{idx + 1}</Text>
              </View>
              <View style={styles.medDetailCol}>
                <Text style={styles.medTitle}>{med.name}</Text>
                <Text style={styles.medDosageFrequency}>
                  Dosage: {med.dosage} • Frequency: {med.frequency}
                </Text>
                <Text style={styles.medDuration}>Duration: {med.duration}</Text>
                <View style={styles.instructionsBox}>
                  <Text style={styles.instructionsText}>📌 {med.instructions}</Text>
                </View>
              </View>
            </View>
          ))}

          {/* Doctor's Notes */}
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Doctor's Clinical Notes & Lifestyle Advice</Text>
            <Text style={styles.notesContent}>{prescription.notes}</Text>
          </View>

          {/* Follow-up Note */}
          <View style={styles.followUpCard}>
            <Text style={styles.followUpTitle}>Scheduled Follow-Up</Text>
            <Text style={styles.followUpDate}>
              📅 Next Review: {prescription.followUpDate || '2026-10-15'} (14 Days)
            </Text>
          </View>
        </View>

        <MedicalDisclaimer compact={true} />

        {/* Action Buttons */}
        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.8}>
          <Text style={styles.downloadBtnText}>📥 Download Prescription (PDF)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.finderBtn}
          onPress={() => navigation.navigate('MedicineFinder')}
          activeOpacity={0.8}
        >
          <Text style={styles.finderBtnText}>💊 Compare Alternative Brands in Finder ➔</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backLink: {
    marginBottom: 10,
  },
  backLinkText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
  rxDocumentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clinicTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  doctorSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rxBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rxBadgeText: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
    marginTop: 2,
  },
  diagnosisBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginBottom: 16,
  },
  diagnosisLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  diagnosisText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 10,
  },
  medCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  medNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  medNumberText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  medDetailCol: {
    flex: 1,
  },
  medTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  medDosageFrequency: {
    fontSize: 12,
    color: Colors.textDark,
    fontWeight: '500',
    marginTop: 2,
  },
  medDuration: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 1,
  },
  instructionsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  instructionsText: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  notesBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 4,
  },
  notesContent: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
  },
  followUpCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  followUpTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  followUpDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    marginTop: 2,
  },
  downloadBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  finderBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accentOrange,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  finderBtnText: {
    color: Colors.accentOrange,
    fontSize: 13,
    fontWeight: '700',
  },
});
