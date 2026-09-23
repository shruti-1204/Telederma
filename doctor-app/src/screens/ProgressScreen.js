import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert } from 'react-native';

const ProgressScreen = ({ route, navigation }) => {
  const { patient } = route.params;
  const [notes, setNotes] = useState('');

  const handleSaveNotes = () => {
    Alert.alert(
      'Progress Saved! ✅',
      `Your medical notes for ${patient.name} have been updated in their record.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Longitudinal Care View</Text>
      <Text style={styles.patientSubText}>Tracking healing for: {patient.name}</Text>

      {/* Before & After Photo Section */}
      <View style={styles.photoContainer}>
        
        {/* Day 1 (Initial) Photo */}
        <View style={styles.photoCard}>
          <Text style={styles.dateLabel}>Day 1 (Initial)</Text>
          <View style={[styles.imagePlaceholder, { backgroundColor: '#ffe3e3' }]}>
            <Text style={styles.emoji}>📷</Text>
            <Text style={styles.imageSubtext}>Severe Rash</Text>
          </View>
          <Text style={styles.aiTag}>AI: RED</Text>
        </View>

        {/* Day 14 (Current) Photo */}
        <View style={styles.photoCard}>
          <Text style={styles.dateLabel}>Day 14 (Current)</Text>
          <View style={[styles.imagePlaceholder, { backgroundColor: '#e3fce0' }]}>
            <Text style={styles.emoji}>📷</Text>
            <Text style={styles.imageSubtext}>Healing / Faded</Text>
          </View>
          <Text style={styles.aiTag}>AI: GREEN</Text>
        </View>

      </View>

      {/* Doctor's Assessment Notes */}
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Doctor's Progress Assessment</Text>
        <TextInput 
          style={styles.textArea} 
          placeholder="e.g. The skin lesion has significantly reduced in size. The current Clindamycin gel dosage is effective. Continue for 7 more days." 
          multiline={true}
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes} 
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveNotes}>
        <Text style={styles.saveButtonText}>💾 Save Progress Notes</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#102a43' },
  patientSubText: { fontSize: 16, color: '#627d98', marginBottom: 20 },
  
  photoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  photoCard: { width: '48%', backgroundColor: '#ffffff', padding: 10, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3 },
  dateLabel: { fontSize: 14, fontWeight: 'bold', color: '#334e68', marginBottom: 10 },
  
  imagePlaceholder: { width: '100%', height: 120, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  emoji: { fontSize: 30 },
  imageSubtext: { fontSize: 12, color: '#555', marginTop: 5 },
  
  aiTag: { fontSize: 12, fontWeight: 'bold', color: '#102a43' },

  notesSection: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334e68', marginBottom: 10 },
  textArea: { backgroundColor: '#f4f6f8', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#d9e2ec', height: 100, textAlignVertical: 'top', fontSize: 16 },
  
  saveButton: { backgroundColor: '#0066cc', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  saveButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }
});

export default ProgressScreen;
