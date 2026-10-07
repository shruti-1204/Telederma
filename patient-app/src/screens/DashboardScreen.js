import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { AuthContext } from '../context/AuthContext';
import { ConsultationContext } from '../context/ConsultationContext';
import Header from '../components/Header';
import MedicalDisclaimer from '../components/MedicalDisclaimer';
import ActionCard from '../components/ActionCard';
import { mockAppointments, mockPrescriptions, mockReminders, mockDoctors } from '../services/mockData';
import api from '../services/api';
import { socketService } from '../services/socketService';
import { parseDoctorSlots } from '../utils/slotHelper';

export default function DashboardScreen({ navigation }) {
  const { patient } = useContext(AuthContext);
  const { setCurrentStep, setSelectedDoctor } = useContext(ConsultationContext);

  const [registeredDoctors, setRegisteredDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [latestAppointment, setLatestAppointment] = useState(null);
  const [latestPrescription, setLatestPrescription] = useState(null);

  useEffect(() => {
    fetchRegisteredDoctors();
    fetchLatestAppointment();
    fetchLatestPrescription();

    const unsubFocus = navigation.addListener('focus', () => {
      fetchLatestAppointment();
      fetchLatestPrescription();
      fetchRegisteredDoctors();
    });

    socketService.connect();

    // Live WebSocket Listeners
    const unsubNewAppt = socketService.on('appointment:new', (appt) => {
      console.log('[Dashboard] Live appointment:new received:', appt);
      fetchLatestAppointment();
    });

    const unsubConfAppt = socketService.on('appointment:confirmed', (appt) => {
      console.log('[Dashboard] Live appointment:confirmed received:', appt);
      setLatestAppointment((prev) => (prev ? { ...prev, status: 'CONFIRMED' } : appt));
    });

    const unsubApptComp = socketService.on('appointment:completed', () => {
      console.log('[Dashboard] Live appointment:completed received');
      fetchLatestAppointment();
      fetchLatestPrescription();
    });

    const unsubConsultComp = socketService.on('consultation:completed', () => {
      console.log('[Dashboard] Live consultation:completed received');
      fetchLatestAppointment();
      fetchLatestPrescription();
    });

    const unsubReady = socketService.on('consultation:ready', (data) => {
      console.log('[Dashboard] Live consultation:ready received:', data);
      setLatestAppointment((prev) => (prev ? { ...prev, consultationReady: true, roomId: data.roomId } : prev));
    });

    const unsubRx = socketService.on('prescription:new', (rx) => {
      console.log('[Dashboard] Live prescription:new received:', rx);
      setLatestPrescription(rx);
      fetchLatestAppointment();
      fetchLatestPrescription();
    });

    const unsubDoc = socketService.on('doctor:new', () => {
      fetchRegisteredDoctors();
    });

    const unsubDocUpd = socketService.on('doctor:updated', () => {
      fetchRegisteredDoctors();
    });

    return () => {
      unsubFocus();
      unsubNewAppt();
      unsubConfAppt();
      unsubApptComp();
      unsubConsultComp();
      unsubReady();
      unsubRx();
      unsubDoc();
      unsubDocUpd();
    };
  }, [navigation]);

  const fetchRegisteredDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const res = await api.get('/doctors');
      if (res.data?.data) {
        const formatted = res.data.data.map((d, index) => {
          const fallback = mockDoctors[index % mockDoctors.length] || {};
          const cleanName = d.user?.name || 'Dr. Specialist';
          const displayName = cleanName.startsWith('Dr.') ? cleanName : `Dr. ${cleanName}`;
          return {
            id: d.id,
            name: displayName,
            qualification: d.qualification || 'MBBS, MD (Dermatology)',
            specialization: d.specialization || 'Clinical Dermatology',
            experience: d.experience || fallback.experience || 10,
            rating: fallback.rating || 4.9,
            reviewsCount: fallback.reviewsCount || 150,
            fee: d.fee || fallback.fee || 700,
            verified: d.isVerified,
            availableToday: true,
            about: d.bio || `${displayName} is a certified dermatologist registered on the TeleDerma telehealth network.`,
            languages: fallback.languages || ['English', 'Hindi', 'Marathi'],
            hospital: fallback.hospital || 'TeleDerma Telehealth Network',
            availableDates: ['Today', 'Tomorrow', 'Saturday', 'Sunday'],
            availableSlots: d.availableSlots,
            slots: parseDoctorSlots(d.availableSlots || fallback.slots),
          };
        });
        setRegisteredDoctors(formatted);
      }
    } catch (err) {
      console.warn('Dashboard fetch doctors error:', err.message);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchLatestAppointment = async () => {
    try {
      const res = await api.get('/appointments');
      if (res.data?.data && res.data.data.length > 0) {
        // Find most recent active appointment (only CONFIRMED or PENDING, not COMPLETED)
        const sorted = res.data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const active = sorted.find(
          (a) =>
            (a.status === 'CONFIRMED' || a.status === 'PENDING') &&
            a.status !== 'COMPLETED' &&
            a.consultation?.status !== 'COMPLETED'
        );
        setLatestAppointment(active || null);
      } else {
        setLatestAppointment(null);
      }
    } catch (err) {
      console.warn('Dashboard fetch appointment warning:', err.message);
      setLatestAppointment(null);
    }
  };

  const fetchLatestPrescription = async () => {
    try {
      const res = await api.get('/prescriptions');
      if (res.data?.data && res.data.data.length > 0) {
        setLatestPrescription(res.data.data[0]);
      }
    } catch (err) {
      // Keep default fallback
    }
  };

  const handleStartConsultation = () => {
    setCurrentStep(1);
    navigation.navigate('ConsultationFlow', { initialStep: 1 });
  };

  const handleBookDoctorDirect = (doc) => {
    setSelectedDoctor(doc);
    navigation.navigate('BookAppointment', { doctor: doc });
  };

  const getUpcomingAppointmentDisplay = () => {
    if (latestAppointment) {
      const dName = latestAppointment.doctor?.user?.name || 'Dr. Kundan Ashok Kharde';
      const cleanDocName = dName.startsWith('Dr.') ? dName : `Dr. ${dName}`;
      const slotTime = latestAppointment.slotStart
        ? new Date(latestAppointment.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '10:00 AM';
      const isConfirmed = latestAppointment.status === 'CONFIRMED';
      return {
        hasActive: true,
        doctorName: cleanDocName,
        timeString: `Today at ${slotTime}`,
        statusText: isConfirmed ? '🟢 CONFIRMED' : '🟡 AWAITING DOCTOR',
        isConfirmed,
        data: {
          id: latestAppointment.id,
          doctorName: cleanDocName,
          doctorSpecialization: latestAppointment.doctor?.specialization || 'Clinical Dermatology',
          date: latestAppointment.slotStart ? latestAppointment.slotStart.split('T')[0] : 'Today',
          time: slotTime,
          meetRoomId: latestAppointment.roomId || `room_${latestAppointment.id}`,
        },
      };
    }
    return {
      hasActive: false,
      doctorName: 'No Upcoming Consultations',
      timeString: 'Active queue is clear',
      statusText: '✓ ALL CLEAR',
      isConfirmed: false,
      data: null,
    };
  };

  const upcomingInfo = getUpcomingAppointmentDisplay();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Platform Header */}
      <Header navigation={navigation} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Welcome Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroTitle}>
              Hello, {patient?.name || 'User'} 👋
            </Text>
            <Text style={styles.heroSubtitle}>
              Live dermatology consultations & instant digital prescriptions.
            </Text>
          </View>
          <View style={styles.heroIconBox}>
            <Text style={styles.heroWatermarkIcon}>🩺</Text>
          </View>
        </View>

        {/* Important Medical Disclaimer */}
        <MedicalDisclaimer />

        {/* REAL-TIME VERIFIED DOCTORS CAROUSEL */}
        <View style={styles.verifiedDoctorsSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.livePulseDot} />
              <Text style={styles.sectionHeaderTitle}>Verified Dermatologists Online</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorList')} activeOpacity={0.7}>
              <Text style={styles.seeAllText}>View All ({registeredDoctors.length}) ➔</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>
            Direct appointments with certified doctors registered in the database
          </Text>

          {loadingDoctors ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : registeredDoctors.length === 0 ? (
            <View style={styles.noDocBox}>
              <Text style={{ color: Colors.textMuted }}>No registered doctors found.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.docCardsRow}
            >
              {registeredDoctors.map((doc) => (
                <View key={doc.id} style={styles.miniDocCard}>
                  <View style={styles.miniDocTop}>
                    <View style={styles.miniAvatar}>
                      <Text style={styles.miniAvatarText}>
                        {doc.name.replace('Dr. ', '').split(' ').map((w) => w[0]).join('')}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.miniDocName} numberOfLines={1}>{doc.name}</Text>
                        <Text style={styles.miniVerifiedBadge}>✓</Text>
                      </View>
                      <Text style={styles.miniDocSpec} numberOfLines={1}>{doc.specialization}</Text>
                    </View>
                  </View>
                  <View style={styles.miniDocBottom}>
                    <View>
                      <Text style={styles.miniFeeLabel}>Fee</Text>
                      <Text style={styles.miniFeeVal}>₹{doc.fee}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.miniBookBtn}
                      onPress={() => handleBookDoctorDirect(doc)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.miniBookBtnText}>Book Slot ➔</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 5 Main Action Cards Grid */}
        <View style={styles.actionCardsSection}>
          {/* Card 0: Direct Doctor Booking (Highlighted Primary) */}
          <ActionCard
            title="Book Verified Dermatologist"
            subtitle="Select from registered doctors (Dr. Kundan & team), choose date & time, and book instantly."
            icon="👨‍⚕️"
            iconBg="#E0F2FE"
            borderColor="#0284C7"
            onPress={() => navigation.navigate('DoctorList')}
          />

          {/* Card 1: Start Consultation (Purple) */}
          <ActionCard
            title="Start AI Triage Consultation"
            subtitle="Upload skin image, complete triage survey, and connect with a dermatologist."
            icon="🩺"
            iconBg={Colors.primaryLight}
            borderColor={Colors.primary}
            onPress={handleStartConsultation}
          />

          {/* Card 2: AI Skin Assistant (Teal) */}
          <ActionCard
            title="AI Skin Assistant"
            subtitle="Ask general educational questions & get preliminary visual skin analysis."
            icon="🤖"
            iconBg={Colors.secondaryLight}
            borderColor={Colors.secondary}
            onPress={() => navigation.navigate('AiAssistant')}
          />

          {/* Card 3: Medicine Brand Finder (Orange) */}
          <ActionCard
            title="Medicine Brand Finder"
            subtitle="Match active ingredient + strength to compare prices across alternative brands."
            icon="💊"
            iconBg={Colors.accentOrangeLight}
            borderColor={Colors.accentOrange}
            onPress={() => navigation.navigate('MedicineFinder')}
          />

          {/* Card 4: My Medical Records (Green) */}
          <ActionCard
            title="My Medical Records"
            subtitle="View history, photos, uploaded reports, and before/after comparisons."
            icon="📄"
            iconBg={Colors.accentGreenLight}
            borderColor={Colors.accentGreen}
            onPress={() => navigation.navigate('MedicalRecords')}
          />
        </View>

        {/* Quick Summary & Status */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionHeaderTitle}>Quick Summary & Status</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.summaryCardsRow}
          >
            {/* Card 1: Upcoming Appointment / Active Queue */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeaderRow}>
                <Text style={styles.summaryBadgeLabel}>
                  {upcomingInfo.hasActive ? `📅 ${upcomingInfo.statusText}` : '✓ NO ACTIVE CALL'}
                </Text>
              </View>
              <Text style={styles.summaryDoctorName}>
                {upcomingInfo.doctorName}
              </Text>
              <Text style={styles.summaryDateTime}>
                {upcomingInfo.timeString}
              </Text>
              {upcomingInfo.hasActive ? (
                <TouchableOpacity
                  style={[styles.callScreenBtn, !upcomingInfo.isConfirmed && { backgroundColor: '#F59E0B' }]}
                  onPress={() => navigation.navigate('VideoCall', { appointment: upcomingInfo.data })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.callScreenBtnText}>
                    {upcomingInfo.isConfirmed ? 'Enter Call Screen 🎥' : 'Join Waiting Room ⏳'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.callScreenBtn, { backgroundColor: '#0F967E' }]}
                  onPress={() => navigation.navigate('MedicalRecords')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.callScreenBtnText}>
                    View Records & Rx ➔
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Card 2: Follow-up Reminder */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeaderRow}>
                <Text style={styles.summaryBadgeLabelTeal}>🕒 FOLLOW-UP REMINDER</Text>
              </View>
              <Text style={styles.summaryDoctorName}>Follow-up Due</Text>
              <Text style={styles.summaryDateTime}>Date: 2026-09-15</Text>
              <TouchableOpacity
                style={styles.followupPhotoBtn}
                onPress={() => navigation.navigate('Progress')}
                activeOpacity={0.8}
              >
                <Text style={styles.followupPhotoBtnText}>Upload Follow-up Photo</Text>
              </TouchableOpacity>
            </View>

            {/* Card 3: Latest Prescription */}
            <View style={[styles.summaryCard, styles.summaryCardPrescription]}>
              <View style={styles.summaryHeaderRow}>
                <Text style={styles.summaryBadgeLabelOrange}>🔗 LATEST PRESCRIPTION</Text>
              </View>
              <View style={{ flex: 1, minHeight: 46, justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                  {latestPrescription ? `${latestPrescription.doctorName || 'Doctor'} Rx` : 'No Prescriptions Yet'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.prescriptionBtn}
                onPress={() => {
                  if (latestPrescription) {
                    navigation.navigate('Prescription', { prescription: latestPrescription });
                  } else {
                    navigation.navigate('MedicalRecords');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.prescriptionBtnText}>
                  {latestPrescription ? 'View Prescription' : 'View Records'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Footer padding */}
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
    paddingTop: 14,
  },
  heroBanner: {
    backgroundColor: '#2E3A8C',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 4,
  },
  heroTextCol: {
    flex: 1,
    zIndex: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    lineHeight: 20,
  },
  heroIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  heroWatermarkIcon: {
    fontSize: 32,
  },
  verifiedDoctorsSection: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  livePulseDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  docCardsRow: {
    gap: 12,
    paddingBottom: 4,
  },
  miniDocCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: 210,
    justifyContent: 'space-between',
  },
  miniDocTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  miniDocName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    flexShrink: 1,
  },
  miniVerifiedBadge: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 13,
    marginLeft: 4,
  },
  miniDocSpec: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  miniDocBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  miniFeeLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  miniFeeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  miniBookBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniBookBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  noDocBox: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionCardsSection: {
    marginTop: 14,
  },
  summarySection: {
    marginTop: 18,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
    letterSpacing: -0.2,
  },
  summaryCardsRow: {
    paddingBottom: 6,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 250,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCardPrescription: {
    justifyContent: 'space-between',
  },
  summaryHeaderRow: {
    marginBottom: 8,
  },
  summaryBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  summaryBadgeLabelTeal: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.logoTeal,
    letterSpacing: 0.5,
  },
  summaryBadgeLabelOrange: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accentOrange,
    letterSpacing: 0.5,
  },
  summaryDoctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 2,
  },
  summaryDateTime: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  callScreenBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callScreenBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  followupPhotoBtn: {
    backgroundColor: Colors.logoTeal,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followupPhotoBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  prescriptionBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prescriptionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
});
