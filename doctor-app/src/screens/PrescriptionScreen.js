import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';

const PrescriptionScreen = ({ route, navigation }) => {
  // Get patient details so the doctor knows who they are prescribing for
  const { patient } = route.params;

  // React State to hold the form inputs
  const [medicine, setMedicine] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [instructions, setInstructions] = useState('');

  const handleGenerateRx = () => {
    if (!medicine || !dosage) {
      Alert.alert('Validation Error', 'Please enter at least the Medicine name and Dosage.');
      return;
    }
    
    // In a real app, we would send this data to Mayuri's backend via axios.post()
    // For now, we simulate success and go back to the previous screen.
    Alert.alert(
      'Prescription Sent! ✅', 
      `The e-Prescription for ${patient.name} has been securely saved to the database and sent to their Patient App.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Digital E-Prescription (Rx)</Text>
      <Text style={styles.patientSubText}>For: {patient.name}</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>Medicine Name</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Clindamycin Gel" 
          value={medicine} onChangeText={setMedicine} 
        />

        <Text style={styles.label}>Dosage / Strength</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. 1% w/w" 
          value={dosage} onChangeText={setDosage} 
        />

        <Text style={styles.label}>Frequency</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Twice a day" 
          value={frequency} onChangeText={setFrequency} 
        />

        <Text style={styles.label}>Duration</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. 14 Days" 
          value={duration} onChangeText={setDuration} 
        />

        <Text style={styles.label}>Special Instructions</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="e.g. Apply a thin layer to affected area after washing." 
          multiline={true}
          numberOfLines={3}
          value={instructions} onChangeText={setInstructions} 
        />
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleGenerateRx}>
        <Text style={styles.submitButtonText}>📝 Generate Prescription</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#102a43' },
  patientSubText: { fontSize: 16, color: '#627d98', marginBottom: 20 },
  formCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#334e68', marginBottom: 8 },
  input: { backgroundColor: '#f4f6f8', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d9e2ec', marginBottom: 15, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#28a745', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  submitButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }
});

export default PrescriptionScreen;
