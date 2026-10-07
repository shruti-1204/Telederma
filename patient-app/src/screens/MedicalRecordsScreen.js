import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import { mockAppointments, mockPrescriptions, mockTreatmentTimeline } from '../services/mockData';
import api from '../services/api';
import { socketService } from '../services/socketService';

const RECORD_TABS = ['Consultations', 'Prescriptions', 'Skin Images', 'Before / After Compare'];

export default function MedicalRecordsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Consultations');
  const [compareMode, setCompareMode] = useState('split'); // 'split' or 'day1' or 'day30'

  const [appointmentsList, setAppointmentsList] = useState([]);
  const [prescriptionsList, setPrescriptionsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [liveBanner, setLiveBanner] = useState(null);

  useEffect(() => {
    fetchRecords();
    const unsubFocus = navigation.addListener('focus', () => {
      fetchRecords();
    });

    socketService.connect();

    // Real-Time Notification: New Prescription from Doctor!
    const unsubRx = socketService.on('prescription:new', (newRx) => {
      console.log('[PatientApp] Live prescription:new event received:', newRx);
      setLiveBanner({
        title: 'New Digital Prescription Issued! 📄⚡',
        subtitle: `Doctor has updated your treatment plan.`,
        data: newRx,
      });
      fetchRecords();
    });

    // Real-Time Notification: Appointment confirmed
    const unsubAppt = socketService.on('appointment:confirmed', (confirmed) => {
      console.log('[PatientApp] Live appointment:confirmed event received:', confirmed);
      setLiveBanner({
        title: 'Appointment Confirmed! 🩺⚡',
        subtitle: `Your consultation is now confirmed.`,
        data: confirmed,
      });
      fetchRecords();
    });

    // Real-Time Notification: Appointment or Consultation completed
    const unsubApptComp = socketService.on('appointment:completed', (data) => {
      console.log('[PatientApp] Live appointment:completed event received:', data);
      setLiveBanner({
        title: 'Consultation Completed! 🩺✅',
        subtitle: 'Your session has ended and prescription is saved in history.',
        data,
      });
      fetchRecords();
    });

    const unsubConsultComp = socketService.on('consultation:completed', (data) => {
      console.log('[PatientApp] Live consultation:completed event received:', data);
      setLiveBanner({
        title: 'Consultation Completed! 🩺✅',
        subtitle: 'Your session has ended and prescription is saved in history.',
        data,
      });
      fetchRecords();
    });

    return () => {
      unsubFocus();
      unsubRx();
      unsubAppt();
      unsubApptComp();
      unsubConsultComp();
    };
  }, [navigation]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      // 1. Fetch appointments
      const apptRes = await api.get('/appointments').catch(() => null);
      if (apptRes?.data?.data && apptRes.data.data.length > 0) {
        const formatted = apptRes.data.data.map((a) => {
          const isCompleted = a.status === 'COMPLETED' || a.consultation?.status === 'COMPLETED';
          const rx = a.consultation?.prescription;
          const cleanDocName = a.doctor?.user?.name
            ? (a.doctor.user.name.startsWith('Dr.') ? a.doctor.user.name : `Dr. ${a.doctor.user.name}`)
            : 'Dr. Specialist';

          return {
            id: a.id,
            doctorName: cleanDocName,
            doctorSpecialization: a.doctor?.specialization || 'Clinical Dermatology',
            date: new Date(a.slotStart || a.createdAt).toLocaleDateString(),
            time: new Date(a.slotStart || a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fee: a.doctor?.fee || 600,
            status: isCompleted ? 'COMPLETED' : a.status,
            symptoms: a.notes ? [a.notes] : ['Skin Consultation'],
            diagnosis: rx?.diagnosis || 'Clinical Dermatology Assessment',
            hasPrescription: !!rx,
            meetRoomId: a.consultation?.roomId || a.roomId || `room_${a.id}`,
            consultationId: a.consultation?.id,
            prescription: rx,
            backendData: a,
          };
        });
        setAppointmentsList(formatted);
      }

      // 2. Fetch prescriptions
      const rxRes = await api.get('/prescriptions').catch(() => null);
      if (rxRes?.data?.data && rxRes.data.data.length > 0) {
        const formattedRx = rxRes.data.data.map((r) => {
          const cleanDocName = r.doctor?.user?.name
            ? (r.doctor.user.name.startsWith('Dr.') ? r.doctor.user.name : `Dr. ${r.doctor.user.name}`)
            : 'Dr. Sarah Jenkins';

          return {
            id: r.id,
            doctorName: cleanDocName,
            date: new Date(r.createdAt).toLocaleDateString(),
            diagnosis: r.diagnosis || 'Clinical Dermatology Care Plan',
            medicines: (r.items || []).map((i) => ({
              name: i.medicineName,
              dosage: i.dosage || 'Standard dose',
              frequency: i.frequency || i.dosage || 'Twice daily',
              duration: i.duration || '14 Days',
              instructions: i.instructions || r.notes || 'Apply on clean skin',
            })),
            notes: r.notes || 'Apply as directed.',
            followUpDate: r.followUpDate || 'In 2 Weeks',
            backendData: r,
          };
        });
        setPrescriptionsList(formattedRx);
      }
    } catch (e) {
      console.warn('Failed to load records from backend:', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header navigation={navigation} />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {RECORD_TABS.map((tab) => {
            const isSel = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, isSel && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isSel && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Real-time Notification Banner */}
        {liveBanner && (
          <TouchableOpacity
            style={{
              backgroundColor: '#ECFDF5',
              borderWidth: 1,
              borderColor: '#10B981',
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => {
              if (liveBanner.title.includes('Prescription')) {
                setActiveTab('Prescriptions');
              } else {
                setActiveTab('Consultations');
              }
              setLiveBanner(null);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#065F46' }}>{liveBanner.title}</Text>
              <Text style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>{liveBanner.subtitle} Tap to view.</Text>
            </View>
            <Text style={{ fontSize: 16, color: '#10B981', fontWeight: 'bold' }}>➔</Text>
          </TouchableOpacity>
        )}

        {/* TAB 1: CONSULTATIONS */}
        {activeTab === 'Consultations' && (
          <View>
            <Text style={styles.tabSectionTitle}>Previous Consultations History</Text>
            {appointmentsList.length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: Colors.textMuted }}>No consultations recorded yet.</Text>
              </View>
            ) : (
              appointmentsList.map((appt) => (
                <View key={appt.id} style={styles.recordCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docName}>{appt.doctorName}</Text>
                      <Text style={styles.docSpec}>{appt.doctorSpecialization}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            appt.status === 'COMPLETED'
                              ? '#ECFDF5'
                              : appt.status === 'CONFIRMED'
                              ? Colors.primaryLight
                              : '#FEF3C7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              appt.status === 'COMPLETED'
                                ? '#059669'
                                : appt.status === 'CONFIRMED'
                                ? Colors.primary
                                : '#D97706',
                          },
                        ]}
                      >
                        {appt.status === 'COMPLETED' ? '✓ COMPLETED' : appt.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailText}>📅 {appt.date} at {appt.time}</Text>
                    <Text style={styles.detailText}>💰 Fee: ₹{appt.fee} (Paid)</Text>
                  </View>

                  <View style={styles.symptomsBox}>
                    <Text style={styles.symptomsLabel}>Diagnosis / Concern:</Text>
                    <Text style={styles.symptomsValue}>{appt.diagnosis || appt.symptoms?.join(', ')}</Text>
                  </View>

                  <View style={styles.actionRow}>
                    {appt.hasPrescription ? (
                      <TouchableOpacity
                        style={[styles.cardActionBtn, { backgroundColor: '#0F967E' }]}
                        onPress={() => navigation.navigate('Prescription', { appointment: appt, prescription: appt.prescription })}
                      >
                        <Text style={[styles.cardActionText, { color: '#FFFFFF' }]}>📄 View Digital Rx ➔</Text>
                      </TouchableOpacity>
                    ) : appt.status === 'COMPLETED' ? (
                      <View style={{ paddingVertical: 6 }}>
                        <Text style={{ color: '#059669', fontWeight: '700', fontSize: 13 }}>✓ Consultation Completed</Text>
                      </View>
                    ) : null}
                    {appt.status !== 'COMPLETED' && appt.status === 'CONFIRMED' && (
                      <TouchableOpacity
                        style={[styles.cardActionBtn, { backgroundColor: Colors.primary }]}
                        onPress={() => navigation.navigate('VideoCall', { appointment: appt })}
                      >
                        <Text style={[styles.cardActionText, { color: '#FFFFFF' }]}>Join Video Call</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 2: PRESCRIPTIONS */}
        {activeTab === 'Prescriptions' && (
          <View>
            <Text style={styles.tabSectionTitle}>Active & Past Prescriptions</Text>
            {prescriptionsList.length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: Colors.textMuted }}>No digital prescriptions issued yet.</Text>
              </View>
            ) : (
              prescriptionsList.map((rx) => (
                <View key={rx.id} style={styles.recordCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docName}>{rx.diagnosis}</Text>
                      <Text style={styles.docSpec}>Prescribed by {rx.doctorName} • {rx.date}</Text>
                    </View>
                    <View style={styles.rxIconCircle}>
                      <Text style={styles.rxIconText}>℞</Text>
                    </View>
                  </View>

                  <View style={styles.medsList}>
                    {rx.medicines.map((m, idx) => (
                      <View key={idx} style={styles.medItem}>
                        <Text style={styles.medName}>• {m.name}</Text>
                        <Text style={styles.medDosage}>{m.frequency} ({m.duration})</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.fullRxBtn}
                    onPress={() => navigation.navigate('Prescription', { prescription: rx })}
                  >
                    <Text style={styles.fullRxBtnText}>Open Full Prescription PDF / View</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: SKIN IMAGES */}
        {activeTab === 'SkinImages' || activeTab === 'Skin Images' && (
          <View>
            <Text style={styles.tabSectionTitle}>Uploaded Lesion Photos Timeline</Text>
            {mockTreatmentTimeline.map((item, idx) => (
              <View key={idx} style={styles.recordCard}>
                <View style={styles.timelineCardHeader}>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>{item.day}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.timelineStage}>{item.stage}</Text>
                    <Text style={styles.timelineDate}>{item.date}</Text>
                  </View>
                  <View
                    style={[
                      styles.triageTag,
                      {
                        backgroundColor:
                          item.triage === 'GREEN' ? Colors.triageGreenBg : Colors.triageYellowBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.triageTagText,
                        {
                          color: item.triage === 'GREEN' ? Colors.triageGreen : Colors.triageYellow,
                        },
                      ]}
                    >
                      {item.triage}
                    </Text>
                  </View>
                </View>

                <Text style={styles.findingParagraph}>{item.finding}</Text>
                <Text style={styles.notesParagraph}>📝 {item.notes}</Text>
              </View>
            ))}
          </View>
        )}

        {/* TAB 4: BEFORE / AFTER COMPARE */}
        {activeTab === 'Before / After Compare' && (
          <View>
            <Text style={styles.tabSectionTitle}>Treatment Progress Comparison</Text>
            <Text style={styles.tabSectionSubtitle}>
              Compare initial presentation (Day 1) against current recovery status (Day 30).
            </Text>

            {/* Toggle Modes */}
            <View style={styles.compareToggleRow}>
              <TouchableOpacity
                style={[styles.compToggleBtn, compareMode === 'split' && styles.compToggleBtnActive]}
                onPress={() => setCompareMode('split')}
              >
                <Text style={[styles.compToggleText, compareMode === 'split' && styles.compToggleTextActive]}>
                  Split View (Side-by-Side)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compToggleBtn, compareMode === 'day1' && styles.compToggleBtnActive]}
                onPress={() => setCompareMode('day1')}
              >
                <Text style={[styles.compToggleText, compareMode === 'day1' && styles.compToggleTextActive]}>
                  Day 1 Only
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compToggleBtn, compareMode === 'day30' && styles.compToggleBtnActive]}
                onPress={() => setCompareMode('day30')}
              >
                <Text style={[styles.compToggleText, compareMode === 'day30' && styles.compToggleTextActive]}>
                  Day 30 (Current)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Comparison Display */}
            {compareMode === 'split' ? (
              <View style={styles.splitCompareCard}>
                <View style={styles.compareHalf}>
                  <View style={styles.compareImagePlaceholder}>
                    <Text style={styles.comparePlaceholderIcon}>🔴</Text>
                    <Text style={styles.comparePlaceholderLabel}>Initial Skin Photo</Text>
                    <Text style={styles.comparePlaceholderDate}>Day 1 (2026-09-01)</Text>
                  </View>
                  <Text style={styles.compareFindingText}>
                    Active pustules, severe redness across cheek
                  </Text>
                </View>

                <View style={styles.compareDivider} />

                <View style={styles.compareHalf}>
                  <View style={[styles.compareImagePlaceholder, { backgroundColor: '#F0FDF4' }]}>
                    <Text style={styles.comparePlaceholderIcon}>🟢</Text>
                    <Text style={[styles.comparePlaceholderLabel, { color: '#166534' }]}>
                      Current Skin Photo
                    </Text>
                    <Text style={styles.comparePlaceholderDate}>Day 30 (2026-09-30)</Text>
                  </View>
                  <Text style={styles.compareFindingText}>
                    Pustules cleared, redness reduced by 85%
                  </Text>
                </View>
              </View>
            ) : compareMode === 'day1' ? (
              <View style={styles.singleCompareCard}>
                <View style={[styles.compareImagePlaceholder, { height: 220 }]}>
                  <Text style={{ fontSize: 36 }}>🔴</Text>
                  <Text style={styles.comparePlaceholderLabel}>Day 1 Initial Baseline</Text>
                  <Text style={styles.comparePlaceholderDate}>Captured on 2026-09-01</Text>
                </View>
                <Text style={styles.singleFindingNotes}>
                  Baseline clinical image uploaded by patient prior to Adapalene + Clindamycin initiation.
                </Text>
              </View>
            ) : (
              <View style={styles.singleCompareCard}>
                <View style={[styles.compareImagePlaceholder, { height: 220, backgroundColor: '#F0FDF4' }]}>
                  <Text style={{ fontSize: 36 }}>🟢</Text>
                  <Text style={[styles.comparePlaceholderLabel, { color: '#166534' }]}>
                    Day 30 Current Progress
                  </Text>
                  <Text style={styles.comparePlaceholderDate}>Captured on 2026-09-30</Text>
                </View>
                <Text style={styles.singleFindingNotes}>
                  Significant re-epithelialization and reduction in acneiform inflammatory papules.
                </Text>
              </View>
            )}

            {/* Upload New Progress Photo button */}
            <TouchableOpacity
              style={styles.uploadProgressBtn}
              onPress={() => navigation.navigate('Progress')}
            >
              <Text style={styles.uploadProgressBtnText}>+ Upload New Progress Photo</Text>
            </TouchableOpacity>
          </View>
        )}

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
  tabsRow: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  tabSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 4,
  },
  tabSectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  recordCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  docName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },
  docSpec: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textDark,
    fontWeight: '500',
  },
  symptomsBox: {
    marginBottom: 12,
  },
  symptomsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  symptomsValue: {
    fontSize: 13,
    color: Colors.textDark,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cardActionBtn: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  rxIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accentPurpleLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rxIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.accentPurple,
  },
  medsList: {
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  medItem: {
    marginBottom: 6,
  },
  medName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
  },
  medDosage: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 10,
  },
  fullRxBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  fullRxBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textDark,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  timelineStage: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  timelineDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  triageTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  triageTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  findingParagraph: {
    fontSize: 13,
    color: Colors.textDark,
    lineHeight: 18,
    marginBottom: 6,
  },
  notesParagraph: {
    fontSize: 12,
    color: Colors.secondary,
    fontStyle: 'italic',
  },
  compareToggleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  compToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compToggleBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  compToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  compToggleTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  splitCompareCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  compareHalf: {
    flex: 1,
  },
  compareDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  compareImagePlaceholder: {
    height: 140,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  comparePlaceholderIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  comparePlaceholderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
  comparePlaceholderDate: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  compareFindingText: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  singleCompareCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  singleFindingNotes: {
    fontSize: 13,
    color: Colors.textDark,
    lineHeight: 18,
    marginTop: 10,
  },
  uploadProgressBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  uploadProgressBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
