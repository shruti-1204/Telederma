import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

const STEPS = [
  { num: 1, label: 'Photo & Quality Check' },
  { num: 2, label: 'Symptoms Questionnaire' },
  { num: 3, label: 'AI Triage Result' },
];

export default function StepperHeader({ currentStep = 1 }) {
  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {STEPS.map((step, idx) => {
          const isActive = currentStep === step.num;
          const isCompleted = currentStep > step.num;

          return (
            <React.Fragment key={step.num}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    isActive && styles.circleActive,
                    isCompleted && styles.circleCompleted,
                  ]}
                >
                  <Text
                    style={[
                      styles.circleText,
                      (isActive || isCompleted) && styles.circleTextActive,
                    ]}
                  >
                    {isCompleted ? '✓' : step.num}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.label,
                    isActive && styles.labelActive,
                    isCompleted && styles.labelCompleted,
                  ]}
                  numberOfLines={2}
                >
                  {step.label}
                </Text>
              </View>
              {idx < STEPS.length - 1 && (
                <View
                  style={[
                    styles.connectorLine,
                    isCompleted && styles.connectorLineActive,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  circleActive: {
    backgroundColor: Colors.primary,
  },
  circleCompleted: {
    backgroundColor: Colors.secondary,
  },
  circleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  circleTextActive: {
    color: '#FFFFFF',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    flexShrink: 1,
  },
  labelActive: {
    fontWeight: '700',
    color: Colors.textDark,
  },
  labelCompleted: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  connectorLine: {
    height: 2,
    width: 16,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  connectorLineActive: {
    backgroundColor: Colors.secondary,
  },
});
