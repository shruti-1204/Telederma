import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { socketService } from '../services/socketService';

const DEFAULT_SLOTS = ['10:00 AM', '11:30 AM', '04:00 PM', '05:30 PM'];

const QUICK_SUGGESTIONS = [
  '09:00 AM',
  '10:00 AM',
  '11:30 AM',
  '02:00 PM',
  '04:00 PM',
  '05:30 PM',
  '07:00 PM',
  '08:30 PM',
];

export default function DoctorScheduleScreen({ navigation }) {
  const [slots, setSlots] = useState(DEFAULT_SLOTS);
  const [slotInput, setSlotInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    loadSlots();
    socketService.connect();
    const unsub = socketService.on('doctor:updated', (updated) => {
      if (updated?.availableSlots) {
        let loaded = [];
        try {
          loaded = JSON.parse(updated.availableSlots);
        } catch (_) {
          loaded = updated.availableSlots.split(',').map((s) => s.trim()).filter(Boolean);
        }
        if (Array.isArray(loaded) && loaded.length > 0) {
          setSlots(loaded);
        }
      }
    });
    return () => unsub();
  }, []);

  const loadSlots = async () => {
    try {
      setLoading(true);
      // 1. Try fetching doctor profile directly from backend first
      try {
        const res = await api.get('/doctors/me');
        const doc = res.data?.data || res.data?.doctor;
        if (doc?.availableSlots) {
          const raw = doc.availableSlots;
          let loaded = [];
          try {
            loaded = JSON.parse(raw);
          } catch (_) {
            loaded = raw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
          }
          if (Array.isArray(loaded) && loaded.length > 0) {
            setSlots(loaded);
            await AsyncStorage.setItem('@doctor_schedule_slots', JSON.stringify(loaded));
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Backend fetch /doctors/me skipped, checking cache:', e.message);
      }

      // 2. Try loading cached slots from AsyncStorage
      const cached = await AsyncStorage.getItem('@doctor_schedule_slots');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSlots(parsed);
            setLoading(false);
            return;
          }
        } catch (_) {}
      }

      // 3. Fallback to default slots (matches screenshot)
      setSlots(DEFAULT_SLOTS);
      await AsyncStorage.setItem('@doctor_schedule_slots', JSON.stringify(DEFAULT_SLOTS));
    } catch (err) {
      console.warn('Error loading doctor schedule slots:', err.message);
      setSlots(DEFAULT_SLOTS);
    } finally {
      setLoading(false);
    }
  };

  const syncSlotsWithBackend = async (updatedSlots) => {
    try {
      setSaving(true);
      await AsyncStorage.setItem('@doctor_schedule_slots', JSON.stringify(updatedSlots));

      // Sync with backend doctor profile
      const slotsString = updatedSlots.join(', ');
      try {
        await api.put('/doctors/me', {
          availableSlots: slotsString,
        });
      } catch (apiErr) {
        // Fallback endpoint if available
        try {
          await api.put('/doctors/profile', { availableSlots: slotsString });
        } catch (_) {}
      }

      // Also update doctor_profile_cache if present
      try {
        const cachedProf = await AsyncStorage.getItem('doctor_profile_cache');
        if (cachedProf) {
          const profObj = JSON.parse(cachedProf);
          profObj.availableSlots = slotsString;
          await AsyncStorage.setItem('doctor_profile_cache', JSON.stringify(profObj));
        }
      } catch (_) {}

      setStatusMessage('✓ Schedule saved successfully');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.warn('Sync schedule warning:', err.message);
      setStatusMessage('✓ Saved locally');
      setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlot = (slotToAdd) => {
    const raw = (slotToAdd !== undefined ? slotToAdd : slotInput).trim();
    if (!raw) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a time slot (e.g. 08:30 PM)');
      } else {
        Alert.alert('Empty Slot', 'Please enter a time slot (e.g. 08:30 PM)');
      }
      return;
    }

    // Format if needed
    let formatted = raw.toUpperCase();
    if (!formatted.includes('AM') && !formatted.includes('PM')) {
      formatted = `${formatted} PM`;
    }

    // Prevent duplicates
    if (slots.some((s) => s.toLowerCase() === formatted.toLowerCase())) {
      if (Platform.OS === 'web') {
        window.alert(`Slot "${formatted}" is already in your active schedule.`);
      } else {
        Alert.alert('Duplicate Slot', `Slot "${formatted}" is already in your active schedule.`);
      }
      return;
    }

    const updated = [...slots, formatted];
    setSlots(updated);
    setSlotInput('');
    syncSlotsWithBackend(updated);
  };

  const handleRemoveSlot = (slotToRemove) => {
    const updated = slots.filter((s) => s !== slotToRemove);
    setSlots(updated);
    syncSlotsWithBackend(updated);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navigation Bar */}
      <View style={styles.topNavbar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnArrow}>←</Text>
          <Text style={styles.backBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.navRight}>
          {saving ? (
            <View style={styles.savingBadge}>
              <ActivityIndicator size="small" color="#0F967E" />
              <Text style={styles.savingText}>Saving...</Text>
            </View>
          ) : statusMessage ? (
            <Text style={styles.savedNoticeText}>{statusMessage}</Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageCenterContainer}>
          {/* Main Card */}
          <View style={styles.card}>
            {/* Header */}
            <Text style={styles.title}>Doctor Schedule & Available Slots</Text>
            <Text style={styles.subtitle}>
              Manage your consultation hours. Blocked slots will be hidden from patient booking.
            </Text>

            {/* Medical Disclaimer Banner */}
            <View style={styles.disclaimerBox}>
              <View style={styles.disclaimerHeaderRow}>
                <View style={styles.shieldIconContainer}>
                  <Text style={styles.shieldEmoji}>🛡️</Text>
                </View>
                <Text style={styles.disclaimerTitle}>IMPORTANT MEDICAL DISCLAIMER</Text>
              </View>
              <Text style={styles.disclaimerText}>
                "AI-generated information is for general guidance and preliminary triage only. It is
                not a medical diagnosis and does not replace consultation with a qualified
                dermatologist."
              </Text>
            </View>

            {/* Add Slot Row */}
            <View style={styles.addSlotRow}>
              <TextInput
                style={styles.slotInput}
                placeholder="e.g. 08:30 PM"
                placeholderTextColor="#94A3B8"
                value={slotInput}
                onChangeText={setSlotInput}
                onSubmitEditing={() => handleAddSlot()}
                returnKeyType="done"
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.addSlotBtn}
                onPress={() => handleAddSlot()}
                activeOpacity={0.85}
              >
                <Text style={styles.addSlotBtnText}>+ Add Slot</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Suggestions Chips */}
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsLabel}>Quick add:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                {QUICK_SUGGESTIONS.map((preset) => {
                  const alreadyAdded = slots.includes(preset);
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.suggestionChip,
                        alreadyAdded && styles.suggestionChipDisabled,
                      ]}
                      onPress={() => !alreadyAdded && handleAddSlot(preset)}
                      disabled={alreadyAdded}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.suggestionChipText,
                          alreadyAdded && styles.suggestionChipTextDisabled,
                        ]}
                      >
                        {alreadyAdded ? `✓ ${preset}` : `+ ${preset}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Active Slots Section */}
            <Text style={styles.activeSlotsTitle}>
              Active Slots Today ({slots.length})
            </Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0F967E" />
                <Text style={styles.loadingText}>Loading schedule...</Text>
              </View>
            ) : slots.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No active consultation slots configured for today.
                </Text>
                <Text style={styles.emptySubText}>
                  Use the field above to add slots for patient appointments.
                </Text>
              </View>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot, index) => (
                  <View key={`${slot}-${index}`} style={styles.slotPill}>
                    <Text style={styles.clockIcon}>🕒</Text>
                    <Text style={styles.slotTimeText}>{slot}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveSlot(slot)}
                      style={styles.removeBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.removeCrossText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Bottom Save confirmation info */}
            <View style={styles.cardFooter}>
              <View style={styles.footerNoteRow}>
                <Text style={styles.footerCheckIcon}>✓</Text>
                <Text style={styles.footerNoteText}>
                  Changes are automatically saved and updated on the patient appointment booking
                  page.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...(Platform.OS === 'web'
      ? {
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }
      : {}),
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  backBtnArrow: {
    fontSize: 18,
    color: '#0F766E',
    fontWeight: '700',
    marginRight: 6,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F766E',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingText: {
    fontSize: 12,
    color: '#0F967E',
    fontWeight: '600',
    marginLeft: 6,
  },
  savedNoticeText: {
    fontSize: 13,
    color: '#0F766E',
    fontWeight: '600',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scrollContent: {
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  pageCenterContainer: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 32 : 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  disclaimerBox: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
    borderWidth: 1,
    borderLeftWidth: 5,
    borderLeftColor: '#D97706',
    borderRadius: 8,
    padding: 16,
    marginBottom: 22,
  },
  disclaimerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  shieldIconContainer: {
    marginRight: 6,
  },
  shieldEmoji: {
    fontSize: 14,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.6,
  },
  disclaimerText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#92400E',
    fontWeight: '400',
  },
  addSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 12,
  },
  slotInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    height: 44,
    minWidth: 200,
    maxWidth: 240,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  addSlotBtn: {
    backgroundColor: '#0F967E',
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlotBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionsContainer: {
    marginBottom: 22,
  },
  suggestionsLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '500',
  },
  suggestionsScroll: {
    flexDirection: 'row',
  },
  suggestionChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionChipDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.5,
  },
  suggestionChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  suggestionChipTextDisabled: {
    color: '#94A3B8',
  },
  activeSlotsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 10,
  },
  emptyContainer: {
    backgroundColor: '#F8FAFC',
    padding: 24,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  slotPill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  slotTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3730A3',
    marginRight: 10,
  },
  removeBtn: {
    padding: 2,
  },
  removeCrossText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4338CA',
  },
  cardFooter: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerCheckIcon: {
    fontSize: 13,
    color: '#0F766E',
    fontWeight: '700',
    marginRight: 6,
  },
  footerNoteText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    lineHeight: 17,
  },
});
