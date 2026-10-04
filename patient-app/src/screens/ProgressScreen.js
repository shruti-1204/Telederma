import React, { useState } from 'react';
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
import { mockTreatmentTimeline } from '../services/mockData';

export default function ProgressScreen({ navigation }) {
  const [timeline, setTimeline] = useState(mockTreatmentTimeline);
  const [showUploadAlert, setShowUploadAlert] = useState(false);

  const handleUploadPhoto = () => {
    Alert.alert('Upload Progress Photo', 'Take a new photo or select from gallery for clinical timeline tracking.', [
      { text: '📷 Take Photo', onPress: () => addNewPhotoEntry('Camera Photo') },
      { text: '🖼️ Gallery', onPress: () => addNewPhotoEntry('Gallery Photo') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const addNewPhotoEntry = (source) => {
    const newEntry = {
      day: `Day ${timeline.length * 7 + 1}`,
      date: new Date().toISOString().split('T')[0],
      stage: 'Follow-up Check-in',
      status: 'Uploaded via ' + source,
      finding: 'Lesion boundary stable. Continued barrier repair observed.',
      triage: 'GREEN',
      notes: 'Submitted for Dr. Priya Sundaram clinical review.',
    };
    setTimeline([newEntry, ...timeline]);
    Alert.alert('Success', 'Progress photo uploaded and added to treatment timeline.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header navigation={navigation} />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleCard}>
          <Text style={styles.titleText}>Treatment Progress & Photo Timeline</Text>
          <Text style={styles.subText}>
            Track skin healing over time and share periodic updates with your dermatologist.
          </Text>

          <TouchableOpacity style={styles.uploadCtaBtn} onPress={handleUploadPhoto} activeOpacity={0.8}>
            <Text style={styles.uploadCtaBtnText}>+ Upload New Progress Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Timeline Items */}
        <Text style={styles.sectionHeading}>Progress History (Chronological)</Text>

        {timeline.map((item, idx) => (
          <View key={idx} style={styles.timelineCard}>
            <View style={styles.cardHeader}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.day}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.stageTitle}>{item.stage}</Text>
                <Text style={styles.stageDate}>{item.date}</Text>
              </View>
              <View
                style={[
                  styles.triageBadge,
                  {
                    backgroundColor:
                      item.triage === 'GREEN' ? Colors.triageGreenBg : Colors.triageYellowBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.triageBadgeText,
                    {
                      color: item.triage === 'GREEN' ? Colors.triageGreen : Colors.triageYellow,
                    },
                  ]}
                >
                  {item.triage}
                </Text>
              </View>
            </View>

            {/* Photo placeholder */}
            <View style={styles.imageBox}>
              <Text style={{ fontSize: 24 }}>📸</Text>
              <Text style={styles.imageBoxLabel}>{item.stage} Capture</Text>
            </View>

            <Text style={styles.findingText}>
              <Text style={{ fontWeight: '700' }}>Clinical Note:</Text> {item.finding}
            </Text>

            <View style={styles.notesBox}>
              <Text style={styles.notesText}>📌 {item.notes}</Text>
            </View>
          </View>
        ))}

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
  titleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 14,
  },
  titleText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textDark,
  },
  subText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
    marginBottom: 14,
  },
  uploadCtaBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadCtaBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 10,
  },
  timelineCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  stageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  stageDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  triageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  triageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  imageBox: {
    height: 110,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  imageBoxLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  findingText: {
    fontSize: 13,
    color: Colors.textDark,
    lineHeight: 18,
    marginBottom: 6,
  },
  notesBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    padding: 8,
  },
  notesText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
});
