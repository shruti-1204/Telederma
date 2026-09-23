import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

const VideoCallScreen = ({ route, navigation }) => {
  const { patient } = route.params;

  // Video Call States
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Prescription States (Dynamic Array)
  const [medicines, setMedicines] = useState([{ name: '', dosage: '' }]);
  const [notes, setNotes] = useState('');

  const handleEndCall = () => {
    Alert.alert("Call Ended", `Consultation with ${patient.name} has finished.`, [{ text: "OK", onPress: () => navigation.goBack() }]);
  };

  const handleAddMedicine = () => {
    setMedicines([...medicines, { name: '', dosage: '' }]);
  };

  const updateMedicine = (text, index, field) => {
    const newMedicines = [...medicines];
    newMedicines[index][field] = text;
    setMedicines(newMedicines);
  };

  const handleSavePrescription = () => {
    // Check if at least the first medicine is filled
    if (!medicines[0].name) {
      Alert.alert("Error", "Please enter at least one medicine name.");
      return;
    }
    
    // In the future, this sends the array to the backend!
    Alert.alert(
      "Prescription Saved! ✅",
      `Saved ${medicines.length} medicine(s) securely to ${patient.name}'s medical record.`,
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      
      {/* ========================================== */}
      {/* TOP HALF: VIDEO CALL INTERFACE             */}
      {/* ========================================== */}
      <View style={styles.videoSection}>
        <View style={styles.patientVideoArea}>
          <Text style={styles.placeholderText}>Waiting for {patient.name}...</Text>
        </View>
        <View style={styles.doctorVideoArea}>
          {isCameraOff ? <Text style={styles.doctorInitials}>DR</Text> : <Text style={styles.cameraText}>📷 You</Text>}
        </View>
        <View style={styles.controlBar}>
          <TouchableOpacity style={[styles.controlBtn, isMuted && styles.controlBtnActive]} onPress={() => setIsMuted(!isMuted)}>
            <Text style={styles.controlBtnText}>{isMuted ? '🔇' : '🎙️'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]} onPress={() => setIsCameraOff(!isCameraOff)}>
            <Text style={styles.controlBtnText}>{isCameraOff ? '📸' : '📷'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, styles.endCallBtn]} onPress={handleEndCall}>
            <Text style={styles.endCallText}>❌ End</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================== */}
      {/* BOTTOM HALF: LIVE PRESCRIPTION FORM        */}
      {/* ========================================== */}
      <View style={styles.prescriptionSection}>
        <View style={styles.rxHeader}>
          <Text style={styles.rxTitle}>✍️ Live e-Prescription</Text>
          <Text style={styles.rxSubtitle}>For: {patient.name}</Text>
        </View>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          
          {medicines.map((med, index) => (
            <View key={index} style={styles.medicineBlock}>
              <Text style={styles.medLabel}>Medicine #{index + 1}</Text>
              
              <TextInput 
                style={styles.input} 
                placeholder="Medicine Name (e.g. Paracetamol)" 
                value={med.name} 
                onChangeText={(text) => updateMedicine(text, index, 'name')} 
              />
              
              <TextInput 
                style={styles.input} 
                placeholder="Dosage (e.g. 1-0-1 after meals)" 
                value={med.dosage} 
                onChangeText={(text) => updateMedicine(text, index, 'dosage')} 
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addMedBtn} onPress={handleAddMedicine}>
            <Text style={styles.addMedBtnText}>➕ Add Another Medicine</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Special Instructions / Notes</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="e.g. Avoid direct sunlight. Use sunscreen." 
            multiline={true} numberOfLines={3}
            value={notes} onChangeText={setNotes} 
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSavePrescription}>
            <Text style={styles.saveBtnText}>💾 Save Prescription to Record</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
  videoSection: { height: '40%', backgroundColor: '#000000', position: 'relative' },
  patientVideoArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  doctorVideoArea: { position: 'absolute', top: 20, right: 15, width: 80, height: 110, backgroundColor: '#333', borderRadius: 8, borderWidth: 1, borderColor: '#555', justifyContent: 'center', alignItems: 'center' },
  cameraText: { color: '#bbb', fontWeight: 'bold', fontSize: 12 },
  doctorInitials: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  controlBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 15, position: 'absolute', bottom: 0, width: '100%' },
  controlBtn: { backgroundColor: '#333', padding: 12, borderRadius: 25, marginHorizontal: 10 },
  controlBtnActive: { backgroundColor: '#555' },
  controlBtnText: { color: '#fff', fontSize: 18 },
  endCallBtn: { backgroundColor: '#ff4444', paddingHorizontal: 20 },
  endCallText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  prescriptionSection: { flex: 1, backgroundColor: '#F4F7FA', borderTopLeftRadius: 25, borderTopRightRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, elevation: 10 },
  rxHeader: { backgroundColor: '#ffffff', padding: 20, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderBottomWidth: 1, borderBottomColor: '#eee' },
  rxTitle: { fontSize: 20, fontWeight: '900', color: '#1A365D' },
  rxSubtitle: { fontSize: 14, color: '#718096', fontWeight: '600', marginTop: 3 },
  
  formContainer: { padding: 20 },
  medicineBlock: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  medLabel: { fontSize: 14, fontWeight: 'bold', color: '#3182CE', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '700', color: '#4A5568', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 10, color: '#2D3748' },
  textArea: { height: 80, textAlignVertical: 'top', backgroundColor: '#ffffff' },
  
  addMedBtn: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 15, backgroundColor: '#E2E8F0', borderRadius: 8, marginBottom: 20 },
  addMedBtnText: { color: '#2D3748', fontWeight: 'bold', fontSize: 14 },
  
  saveBtn: { backgroundColor: '#0066cc', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 15, marginBottom: 40 },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});

export default VideoCallScreen;
