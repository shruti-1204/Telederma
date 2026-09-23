import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const PatientDetailScreen = ({ route, navigation }) => {
  // We extract the 'patient' object that was passed from the Dashboard
  const { patient } = route.params;

  return (
    <ScrollView style={styles.container}>
      
      {/* 1. Patient Profile (Phase 3 of PDF) */}
      <View style={styles.profileHeader}>
        <Text style={styles.patientName}>{patient.name}</Text>
        <Text style={styles.patientDetails}>Age: 28  •  Gender: Male  •  ID: {patient.id}</Text>
      </View>

      {/* 2. Skin Image Placeholder */}
      <View style={styles.imagePlaceholder}>
        <Text style={{ color: '#666', fontSize: 16 }}>📷 Uploaded Skin Photo</Text>
        <Text style={{ color: '#999', fontSize: 12 }}>(Image from AWS S3 will render here)</Text>
      </View>

      {/* 3. AI Pre-Consultation Summary (Phase 4 of PDF) */}
      <View style={styles.aiBox}>
        <Text style={styles.sectionTitle}>🤖 AI Pre-Consultation Summary</Text>
        <View style={styles.divider} />
        <Text style={styles.infoText}>• Image Quality: Good</Text>
        <Text style={styles.infoText}>• Symptoms: Itching, Mild Burning</Text>
        <Text style={styles.infoText}>• Duration: 3 days</Text>
        
        <Text style={styles.triageResult}>
          AI Triage: <Text style={{ color: patient.triage.toLowerCase() }}>{patient.triage}</Text>
        </Text>
      </View>

      {/* 4. Triage Review Buttons (Phase 5 of PDF) */}
      <Text style={styles.subTitle}>Doctor Triage Review</Text>
      <Text style={styles.helperText}>Do you agree with the AI's risk assessment?</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#28a745' }]}>
          <Text style={styles.btnText}>✓ Confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ffc107' }]}>
          <Text style={styles.btnText}>✎ Change Level</Text>
        </TouchableOpacity>
      </View>

      {/* --- BUSINESS LOGIC: RED TRIAGE = OFFLINE ONLY --- */}
      {patient.triage === 'RED' ? (
        <View style={styles.redAlertBox}>
          <Text style={styles.redAlertTitle}>⚠️ SEVERE CASE (OFFLINE ONLY)</Text>
          <Text style={styles.redAlertText}>
            This patient's AI triage indicates a severe condition. Online consultation and digital prescriptions are disabled for safety.
          </Text>
          <TouchableOpacity 
            style={styles.offlineButton}
            onPress={() => alert('Patient has been notified to visit the nearest hospital physically.')}
          >
            <Text style={styles.offlineButtonText}>🏥 Refer to Nearest Hospital</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* 5. Start Consultation Button */}
          <TouchableOpacity 
            style={styles.videoButton}
            onPress={() => navigation.navigate('VideoCall', { patient })}
          >
            <Text style={styles.videoButtonText}>🎥 Start Video Consultation</Text>
          </TouchableOpacity>

          {/* 6. Write Prescription Button */}
          <TouchableOpacity 
            style={styles.rxButton}
            onPress={() => navigation.navigate('Prescription', { patient })}
          >
            <Text style={styles.rxButtonText}>✍️ Write Digital Prescription</Text>
          </TouchableOpacity>
        </>
      )}

      {/* 7. Treatment Progress Button (Available for all) */}
      <TouchableOpacity 
        style={styles.progressButton}
        onPress={() => navigation.navigate('Progress', { patient })}
      >
        <Text style={styles.progressButtonText}>📈 View Treatment Progress</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 20 },
  profileHeader: { marginBottom: 20 },
  patientName: { fontSize: 26, fontWeight: 'bold', color: '#102a43' },
  patientDetails: { fontSize: 16, color: '#627d98', marginTop: 5 },
  imagePlaceholder: { height: 200, backgroundColor: '#e4e7eb', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  aiBox: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#d9e2ec' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43' },
  divider: { height: 1, backgroundColor: '#bcccdc', marginVertical: 10 },
  infoText: { fontSize: 16, color: '#334e68', marginBottom: 5 },
  triageResult: { fontSize: 18, fontWeight: 'bold', color: '#102a43', marginTop: 15 },
  subTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43', marginBottom: 5 },
  helperText: { fontSize: 14, color: '#627d98', marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  actionBtn: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  historyBox: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#d9e2ec' },
  rxCard: { backgroundColor: '#f0f4f8', padding: 15, borderRadius: 8, marginTop: 10 },
  rxDate: { fontSize: 12, color: '#888', textAlign: 'right', marginBottom: 5 },
  rxMed: { fontSize: 16, fontWeight: 'bold', color: '#102a43', marginBottom: 4 },
  rxDosage: { fontSize: 14, color: '#334e68', marginBottom: 2 },
  rxNotes: { fontSize: 13, color: '#627d98', fontStyle: 'italic', marginTop: 4 },
  videoButton: { backgroundColor: '#0066cc', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  videoButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  rxButton: { backgroundColor: '#ffffff', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: '#0066cc' },
  rxButtonText: { color: '#0066cc', fontSize: 18, fontWeight: 'bold' },
  progressButton: { backgroundColor: '#102a43', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  progressButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  
  // Red Alert UI
  redAlertBox: { backgroundColor: '#ffe3e3', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#ffb3b3' },
  redAlertTitle: { fontSize: 16, fontWeight: 'bold', color: '#d32f2f', marginBottom: 5 },
  redAlertText: { fontSize: 14, color: '#b71c1c', marginBottom: 15, lineHeight: 20 },
  offlineButton: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 10, alignItems: 'center' },
  offlineButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});

export default PatientDetailScreen;
