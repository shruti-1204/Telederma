import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export default function MedicalDisclaimer({ compact = false }) {
  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View style={styles.iconCol}>
        <Text style={styles.icon}>🛡️</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>IMPORTANT MEDICAL DISCLAIMER</Text>
        <Text style={styles.message}>
          "AI-generated information is for general guidance and preliminary triage only. It is not a medical diagnosis and does not replace consultation with a qualified dermatologist."
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.disclaimerBg,
    borderColor: Colors.disclaimerBorder,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accentOrange,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  compactContainer: {
    padding: 8,
    marginVertical: 6,
  },
  iconCol: {
    marginRight: 10,
    marginTop: 1,
  },
  icon: {
    fontSize: 18,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.disclaimerTitle,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  message: {
    fontSize: 12,
    color: Colors.disclaimerText,
    lineHeight: 17,
  },
});
