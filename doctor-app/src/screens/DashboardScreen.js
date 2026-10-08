import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  Modal,
} from 'react-native';
import api from '../services/api';
import { socketService } from '../services/socketService';
import { AuthContext } from '../context/AuthContext';

// Default clinical cases (empty by default - populated strictly from backend database)
const DEFAULT_CASES = [];

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const { logout } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('Clinical Queue'); // 'Clinical Queue' | 'Consultation History' | 'Schedule Slots' | 'Earnings & Revenue'
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingPaymentClaim, setPendingPaymentClaim] = useState(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);

  useEffect(() => {
    fetchData();

    const unsubFocus = navigation.addListener('focus', () => {
      fetchData();
    });

    socketService.connect();

    // Listen for live appointment booked in Real-Time
    const unsubNew = socketService.on('appointment:new', (appt) => {
      console.log('[Doctor App] Live Appointment Received:', appt);
      fetchData();
    });

    const unsubConfirmed = socketService.on('appointment:confirmed', (appt) => {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === appt.id
            ? { ...p, status: 'CONFIRMED', triage: 'YELLOW', backendData: appt }
            : p
        )
      );
    });

    // Real-Time Notification: Appointment or Consultation completed
    const unsubApptCompleted = socketService.on('appointment:completed', (data) => {
      console.log('[Doctor App] Live appointment:completed received:', data);
      setPatients((prev) =>
        prev.map((p) =>
          p.id === data.appointmentId || p.id === data.id
            ? {
                ...p,
                status: 'COMPLETED',
                waitingTime: 'Concluded',
                backendData: { ...p.backendData, status: 'COMPLETED' },
              }
            : p
        )
      );
    });

    const unsubConsultCompleted = socketService.on('consultation:completed', (data) => {
      console.log('[Doctor App] Live consultation:completed received:', data);
      setPatients((prev) =>
        prev.map((p) =>
          p.id === data.appointmentId || p.backendData?.consultation?.id === data.consultationId
            ? {
                ...p,
                status: 'COMPLETED',
                waitingTime: 'Concluded',
                backendData: { ...p.backendData, status: 'COMPLETED' },
              }
            : p
        )
      );
    });

    const unsubRxNew = socketService.on('prescription:new', (rx) => {
      console.log('[Doctor App] Live prescription:new received:', rx);
      setPatients((prev) =>
        prev.map((p) =>
          p.backendData?.consultation?.id === rx.consultationId ||
          p.id === rx.consultation?.appointmentId ||
          p.backendData?.patientId === rx.patientId
            ? {
                ...p,
                status: 'COMPLETED',
                waitingTime: 'Concluded',
                diagnosis: rx.diagnosis || p.diagnosis,
                prescribedMedicines:
                  rx.items?.map((i) => ({
                    name: i.medicineName,
                    activeIngredient: i.medicineName,
                    dosage: i.dosage || 'As directed',
                    duration: i.duration || '14 Days',
                  })) || p.prescribedMedicines,
                backendData: { ...p.backendData, status: 'COMPLETED' },
              }
            : p
        )
      );
    });

    // Real-Time Notification: Patient marked direct UPI payment as sent
    const unsubPaymentClaimed = socketService.on('payment:claimed', (data) => {
      console.log('[Doctor App] Live payment:claimed received on dashboard:', data);
      setPendingPaymentClaim(data);
    });

    return () => {
      unsubFocus();
      unsubNew();
      unsubConfirmed();
      unsubApptCompleted();
      unsubConsultCompleted();
      unsubRxNew();
      unsubPaymentClaimed();
    };
  }, [navigation]);

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      // Fetch Doctor profile
      const meRes = await api.get('/auth/me');
      if (meRes.data?.data) {
        setUser(meRes.data.data);
      }

      // Fetch Appointments
      const response = await api.get('/appointments');
      if (response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        const liveCases = response.data.data.map((appt) => {
          const pName =
            appt.patient?.user?.name ||
            (appt.patient?.user?.phone ? `Patient (+91 ${appt.patient.user.phone})` : 'Patient');
          
          const isCompleted =
            appt.status === 'COMPLETED' ||
            appt.consultation?.status === 'COMPLETED';

          let triage = 'YELLOW';
          let risk = '30/100';
          let type = 'Async / Scheduled';
          if (appt.status === 'CONFIRMED' || appt.status === 'PENDING') {
            triage = 'ORANGE';
            risk = '60/100';
            type = 'Live Video';
          }
          if (isCompleted) {
            triage = 'GREEN';
            risk = 'Resolved';
          }

          const rxItems = appt.consultation?.prescription?.items || [];
          const prescribedMedicines = rxItems.length > 0
            ? rxItems.map((i) => ({
                name: i.medicineName,
                activeIngredient: i.medicineName,
                dosage: i.dosage || 'As directed',
                duration: i.duration || '14 Days',
              }))
            : [
                {
                  name: 'Protopic 0.1% Ointment',
                  activeIngredient: 'Tacrolimus (0.1% Ointment)',
                  dosage: 'Apply a thin layer twice daily to affected skin areas.',
                  duration: '7 Days',
                },
              ];

          return {
            id: appt.id,
            name: pName,
            age: 28,
            gender: appt.patient?.gender || 'Not specified',
            status: isCompleted ? 'COMPLETED' : (appt.status || 'PENDING'),
            triage,
            riskScore: risk,
            type,
            waitingTime: isCompleted ? 'Concluded' : 'Pending',
            dateTime: new Date(appt.slotStart || appt.createdAt || Date.now()).toLocaleString([], {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            allergies: appt.patient?.allergies || 'None reported',
            currentMeds: appt.patient?.currentMedications || 'None reported',
            mainConcern: appt.notes || 'Skin Consultation',
            symptoms: appt.notes || 'Consultation request',
            duration: '—',
            progression: '—',
            aiVision: 'Clinical Evaluation',
            aiReason: 'Patient scheduled clinical session',
            skinType: appt.patient?.skinType || 'Not specified',
            skinTone: appt.patient?.skinTone || 'Not specified',
            medicalHistory: appt.patient?.skinHistory || 'None provided',
            skinPhoto: null,
            questionnaire: {
              'Main Concern': appt.notes || 'Skin Consultation',
            },
            prescribedMedicines,
            diagnosis: appt.consultation?.prescription?.diagnosis || 'Pending Diagnosis',
            notes: appt.consultation?.prescription?.notes || '',
            followUpDate: appt.consultation?.prescription?.followUpDate || '',
            backendData: appt,
          };
        });

        setPatients(liveCases);
      } else {
        setPatients([]);
      }
    } catch (err) {
      console.warn('Dashboard fetch warning:', err.message);
      setPatients([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const isCaseCompleted = (c) => {
    return (
      c.status === 'COMPLETED' ||
      c.backendData?.status === 'COMPLETED' ||
      c.backendData?.consultation?.status === 'COMPLETED'
    );
  };

  const handleConfirmDashboardPayment = async () => {
    try {
      setIsConfirmingPayment(true);
      await api.post('/payments/confirm-received', {
        appointmentId: pendingPaymentClaim?.appointmentId,
        consultationId: pendingPaymentClaim?.consultationId,
      });
      setPendingPaymentClaim(null);
      fetchData();
      alert('✓ Direct UPI Payment Confirmed! Prescription has been released to the patient.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm payment.');
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const activeCases = patients.filter((p) => !isCaseCompleted(p) && p.status !== 'CANCELLED');
  const completedCases = patients.filter((p) => isCaseCompleted(p));

  // Compute stat counts from active cases
  const redCount = activeCases.filter((p) => p.triage === 'RED').length;
  const orangeCount = activeCases.filter((p) => p.triage === 'ORANGE').length;
  const yellowCount = activeCases.filter((p) => p.triage === 'YELLOW').length;
  const completedCount = completedCases.length;
  const totalRevenue = completedCount * 700;
  const totalConsultations = completedCases.length + activeCases.length;

  const doctorName = user?.name ? (user.name.startsWith('Dr.') ? user.name : `Dr. ${user.name}`) : 'Dr. Aisha Sharma';
  const regNumber = user?.doctor?.licenseNumber || 'DMC-68421';
  const avatarUrl = user?.avatar || user?.doctor?.avatar || null;
  const doctorInitial = doctorName.replace('Dr. ', '').trim().charAt(0).toUpperCase() || 'D';

  const renderQueueItem = ({ item }) => {
    const isOrange = item.triage === 'ORANGE';
    const isRed = item.triage === 'RED';
    const isYellow = item.triage === 'YELLOW';

    let stripeColor = '#EAB308';
    let badgeBg = '#FEF9C3';
    let badgeText = '#A16207';
    if (isOrange) {
      stripeColor = '#F97316';
      badgeBg = '#FFEDD5';
      badgeText = '#C2410C';
    } else if (isRed) {
      stripeColor = '#EF4444';
      badgeBg = '#FEE2E2';
      badgeText = '#B91C1C';
    }

    return (
      <View style={[styles.queueCard, { borderLeftColor: stripeColor }]}>
        <View style={styles.queueCardContent}>
          {/* Left Triage Badge */}
          <View style={[styles.triageBadgeBox, { backgroundColor: badgeBg }]}>
            <Text style={[styles.triageBadgeText, { color: badgeText }]}>{item.triage}</Text>
          </View>

          {/* Patient Details */}
          <View style={styles.patientInfoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.queuePatientName}>{item.name}</Text>
              <Text style={styles.queuePatientMeta}>({item.age} yrs, {item.gender})</Text>
            </View>
            <Text style={styles.queueCaseMeta}>
              Case ID: <Text style={styles.monoText}>{item.id}</Text> • Risk Score:{' '}
              <Text style={{ fontWeight: '800', color: '#1E293B' }}>{item.riskScore}</Text> • Type:{' '}
              <Text style={{ fontWeight: '600', color: '#1E293B' }}>{item.type}</Text>
            </Text>
          </View>

          {/* Right Action & Waiting Time */}
          <View style={styles.queueRightCol}>
            <View style={styles.queueTimeBox}>
              <Text style={styles.queueWaitTime}>🕒 Waiting: {item.waitingTime}</Text>
              <Text style={styles.queueDateTime}>{item.dateTime}</Text>
            </View>
            <TouchableOpacity
              style={styles.openCaseBtn}
              onPress={() => navigation.navigate('PatientDetail', { patient: item })}
              activeOpacity={0.85}
            >
              <Text style={styles.openCaseBtnText}>👁️ Open Case File</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderHistoryItem = ({ item }) => {
    return (
      <View style={styles.historyCard}>
        <View style={styles.historyCardContent}>
          {/* Header Row */}
          <View style={styles.historyTopRow}>
            <View style={styles.nameRow}>
              <Text style={styles.queuePatientName}>{item.name}</Text>
              <Text style={styles.queuePatientMeta}>({item.age} yrs, {item.gender})</Text>
            </View>
            <View style={styles.completedBadgePill}>
              <Text style={styles.completedBadgeText}>✓ COMPLETED</Text>
            </View>
          </View>

          {/* Meta Row */}
          <Text style={styles.historyCaseMeta}>
            Case ID: <Text style={styles.monoText}>{item.id}</Text> • Time: <Text style={{ fontWeight: '600', color: '#1E293B' }}>{item.dateTime}</Text> • Type: <Text style={{ fontWeight: '600', color: '#1E293B' }}>{item.type}</Text>
          </Text>

          {/* Diagnosis & Prescription Preview Box */}
          <View style={styles.historyRxBox}>
            <View style={styles.rxHeaderRow}>
              <Text style={styles.historyRxLabel}>🩺 Clinical Diagnosis:</Text>
              <Text style={styles.historyDiagnosisText}>{item.diagnosis || 'Acute Inflammatory Dermatitis'}</Text>
            </View>

            {item.prescribedMedicines && item.prescribedMedicines.length > 0 && (
              <View style={styles.historyMedsRow}>
                <Text style={styles.historyMedsLabel}>💊 Prescribed Medications:</Text>
                <View style={styles.medsTagsContainer}>
                  {item.prescribedMedicines.map((m, idx) => (
                    <View key={idx} style={styles.medTagPill}>
                      <Text style={styles.medTagText}>{m.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {item.notes ? (
              <Text style={styles.historyNotesText}>
                📝 Advice: {item.notes}
              </Text>
            ) : null}
          </View>

          {/* Action Row */}
          <View style={styles.historyActionsRow}>
            <TouchableOpacity
              style={styles.viewHistoryRxBtn}
              onPress={() => navigation.navigate('Prescription', { patient: item })}
              activeOpacity={0.85}
            >
              <Text style={styles.viewHistoryRxBtnText}>📄 View / Edit Rx</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.openCaseHistoryBtn}
              onPress={() => navigation.navigate('PatientDetail', { patient: item })}
              activeOpacity={0.85}
            >
              <Text style={styles.openCaseHistoryBtnText}>👁️ View Case File</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.scrollContent}>
      <View style={styles.wrapper}>
        {/* TOP TABS NAVIGATION */}
        <View style={styles.topTabBar}>
          <View style={styles.topTabsGroup}>
            <TouchableOpacity
              style={[styles.topTabBtn, activeTab === 'Clinical Queue' && styles.topTabBtnActive]}
              onPress={() => setActiveTab('Clinical Queue')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.topTabBtnText,
                  activeTab === 'Clinical Queue' && styles.topTabBtnTextActive,
                ]}
              >
                Clinical Queue ({activeCases.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.topTabBtn, activeTab === 'Consultation History' && styles.topTabBtnActive]}
              onPress={() => setActiveTab('Consultation History')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.topTabBtnText,
                  activeTab === 'Consultation History' && styles.topTabBtnTextActive,
                ]}
              >
                Consultation History ({completedCases.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.topTabBtn, activeTab === 'Schedule Slots' && styles.topTabBtnActive]}
              onPress={() => {
                navigation.navigate('DoctorSchedule');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.topTabBtnText,
                  activeTab === 'Schedule Slots' && styles.topTabBtnTextActive,
                ]}
              >
                Schedule Slots
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.topTabBtn, activeTab === 'Earnings & Revenue' && styles.topTabBtnActive]}
              onPress={() => {
                setActiveTab('Earnings & Revenue');
                setShowRevenueModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.topTabBtnText,
                  activeTab === 'Earnings & Revenue' && styles.topTabBtnTextActive,
                ]}
              >
                Earnings & Revenue
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.topLogoutBtn}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Text style={styles.topLogoutBtnText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>

        {/* HERO WORKSTATION BANNER */}
        <View style={styles.heroBanner}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroPreTitle}>DERMATOLOGIST CLINICAL WORKSTATION</Text>
            <Text style={styles.heroTitle}>Welcome, {doctorName} 👏</Text>
            <View style={styles.heroRegRow}>
              <Text style={styles.heroRegText}>Reg No: <Text style={{ fontWeight: '700' }}>{regNumber}</Text> • Status:</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroRight}>
            <TouchableOpacity
              style={styles.heroWhiteBtn}
              onPress={() => navigation.navigate('DoctorSchedule')}
              activeOpacity={0.85}
            >
              <Text style={styles.heroWhiteBtnText}>📅 Manage Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroWhiteBtn}
              onPress={() => setShowRevenueModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.heroWhiteBtnText}>💲 Revenue & Earnings</Text>
            </TouchableOpacity>

            {/* Profile Avatar Quick-Access */}
            <TouchableOpacity
              style={styles.doctorAvatarBtn}
              onPress={() => navigation.navigate('DoctorProfile')}
              activeOpacity={0.85}
              accessibilityLabel="View Doctor Profile"
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.doctorAvatarImg} resizeMode="cover" />
              ) : (
                <View style={styles.doctorAvatarFallback}>
                  <Text style={styles.doctorAvatarInitial}>{doctorInitial}</Text>
                </View>
              )}
              <View style={styles.avatarEditPill}>
                <Text style={styles.avatarEditIcon}>⚙️</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* IMPORTANT MEDICAL DISCLAIMER BANNER */}
        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerHeader}>
            <Text style={styles.disclaimerIcon}>🛡️</Text>
            <Text style={styles.disclaimerTitle}>IMPORTANT MEDICAL DISCLAIMER</Text>
          </View>
          <Text style={styles.disclaimerText}>
            "AI-generated information is for general guidance and preliminary triage only. It is not a medical diagnosis and does not replace consultation with a qualified dermatologist."
          </Text>
        </View>

        {/* TAB CONTENT: CLINICAL QUEUE */}
        {activeTab === 'Clinical Queue' && (
          <>
            {/* 4 SUMMARY STAT CARDS */}
            <View style={[styles.statsRow, !isDesktop && styles.statsRowMobile]}>
              {/* Card 1: Urgent Red Cases */}
              <View style={[styles.statCard, styles.statCardRed, !isDesktop && styles.statCardHalf]}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.statCardLabel, { color: '#DC2626' }]}>URGENT RED CASES</Text>
                </View>
                <Text style={styles.statCardNumber}>{redCount}</Text>
                <Text style={styles.statCardSub}>Emergency Queue Bypass</Text>
              </View>

              {/* Card 2: High Priority Orange */}
              <View style={[styles.statCard, styles.statCardOrange, !isDesktop && styles.statCardHalf]}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statDot, { backgroundColor: '#F97316' }]} />
                  <Text style={[styles.statCardLabel, { color: '#EA580C' }]}>HIGH PRIORITY ORANGE</Text>
                </View>
                <Text style={styles.statCardNumber}>{orangeCount}</Text>
                <Text style={styles.statCardSub}>Live Video Queue</Text>
              </View>

              {/* Card 3: Normal Yellow Cases */}
              <View style={[styles.statCard, styles.statCardYellow, !isDesktop && styles.statCardHalf]}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statDot, { backgroundColor: '#EAB308' }]} />
                  <Text style={[styles.statCardLabel, { color: '#CA8A04' }]}>NORMAL YELLOW CASES</Text>
                </View>
                <Text style={styles.statCardNumber}>{yellowCount}</Text>
                <Text style={styles.statCardSub}>Scheduled / Async Review</Text>
              </View>

              {/* Card 4: Completed Consultations */}
              <View style={[styles.statCard, styles.statCardGreen, !isDesktop && styles.statCardHalf]}>
                <View style={styles.statCardTop}>
                  <Text style={[styles.statCardLabel, { color: '#0D9488' }]}>COMPLETED SESSIONS</Text>
                </View>
                <Text style={styles.statCardNumber}>{completedCount}</Text>
                <Text style={styles.statCardSub}>₹{totalRevenue} Total Revenue</Text>
              </View>
            </View>

            {/* CLINICAL PATIENT QUEUE SECTION */}
            <View style={styles.queueHeaderRow}>
              <Text style={styles.queueSectionTitle}>
                Clinical Patient Queue (Prioritized by Triage Score)
              </Text>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={fetchData}
                activeOpacity={0.8}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color="#0F967E" />
                ) : (
                  <Text style={styles.refreshBtnText}>🔄 Refresh Queue</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* ACTIVE QUEUE CARDS LIST */}
            <FlatList
              data={activeCases}
              keyExtractor={(item) => item.id}
              renderItem={renderQueueItem}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>🎉 Active Queue Clear</Text>
                  <Text style={styles.emptyText}>No pending patients in the active queue. All consultations are completed! Check the Consultation History tab to view past records.</Text>
                </View>
              )}
            />
          </>
        )}

        {/* TAB CONTENT: CONSULTATION HISTORY */}
        {activeTab === 'Consultation History' && (
          <>
            <View style={styles.queueHeaderRow}>
              <View>
                <Text style={styles.queueSectionTitle}>
                  Consultation History & Completed Records
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  Access past closed consultations, digital prescriptions, and clinical case files.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={fetchData}
                activeOpacity={0.8}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color="#0F967E" />
                ) : (
                  <Text style={styles.refreshBtnText}>🔄 Refresh History</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* COMPLETED QUEUE CARDS LIST */}
            <FlatList
              data={completedCases}
              keyExtractor={(item) => item.id}
              renderItem={renderHistoryItem}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>📋 No History Yet</Text>
                  <Text style={styles.emptyText}>Completed consultations and signed prescriptions will appear here.</Text>
                </View>
              )}
            />
          </>
        )}
      </View>

      {/* SCHEDULE SLOTS MODAL */}
      <Modal
        visible={showScheduleModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowScheduleModal(false);
          setActiveTab('Clinical Queue');
        }}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => {
            setShowScheduleModal(false);
            setActiveTab('Clinical Queue');
          }}
        >
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 Schedule & Working Hours</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowScheduleModal(false);
                  setActiveTab('Clinical Queue');
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBodyText}>
              Configured Clinical Hours for <Text style={{ fontWeight: '700' }}>{doctorName}</Text>:
            </Text>
            <View style={styles.modalSlotPill}>
              <Text style={styles.modalSlotTitle}>Morning Consultation Slot</Text>
              <Text style={styles.modalSlotTime}>09:00 AM – 01:00 PM (Live Video & Telehealth)</Text>
            </View>
            <View style={styles.modalSlotPill}>
              <Text style={styles.modalSlotTitle}>Evening Consultation Slot</Text>
              <Text style={styles.modalSlotTime}>04:00 PM – 08:00 PM (Scheduled Video & Digital Rx)</Text>
            </View>
            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => {
                setShowScheduleModal(false);
                navigation.navigate('DoctorProfile');
              }}
            >
              <Text style={styles.modalActionBtnText}>Edit Availability in Profile ➔</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* REVENUE & EARNINGS MODAL */}
      <Modal
        visible={showRevenueModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowRevenueModal(false);
          setActiveTab('Clinical Queue');
        }}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => {
            setShowRevenueModal(false);
            setActiveTab('Clinical Queue');
          }}
        >
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💲 Earnings & Revenue Analytics</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowRevenueModal(false);
                  setActiveTab('Clinical Queue');
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.revenueMetricRow}>
              <View style={styles.revenueMetricCol}>
                <Text style={styles.revenueMetricVal}>₹3,000</Text>
                <Text style={styles.revenueMetricLbl}>Today's Earnings</Text>
              </View>
              <View style={styles.revenueMetricCol}>
                <Text style={styles.revenueMetricVal}>5</Text>
                <Text style={styles.revenueMetricLbl}>Consultations Completed</Text>
              </View>
              <View style={styles.revenueMetricCol}>
                <Text style={styles.revenueMetricVal}>₹600</Text>
                <Text style={styles.revenueMetricLbl}>Average Consultation Fee</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 16 }}>
              Payouts are processed daily via direct bank deposit. TeleDerma charges 0% platform commission during promotional beta.
            </Text>
            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => {
                setShowRevenueModal(false);
                setActiveTab('Clinical Queue');
              }}
            >
              <Text style={styles.modalActionBtnText}>Close Overview</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Real-Time Patient Direct UPI Payment Notification Modal */}
      <Modal visible={!!pendingPaymentClaim} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 440, elevation: 10 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 28 }}>💰</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center' }}>
                Payment Received Verification
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                Patient marked consultation fee as paid directly to your UPI ID
              </Text>
            </View>

            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '500' }}>Patient</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>{pendingPaymentClaim?.patientName || 'Patient'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '500' }}>Amount Paid</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F766E' }}>₹{pendingPaymentClaim?.amount || '700'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '500' }}>Mode</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>Direct Peer-to-Peer UPI</Text>
              </View>
            </View>

            <Text style={{ fontSize: 12, color: '#475569', backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 8, padding: 10, lineHeight: 17, marginBottom: 18 }}>
              ℹ️ Please check your UPI app or bank balance to verify the money was received before unlocking the prescription.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}
                onPress={() => setPendingPaymentClaim(null)}
                disabled={isConfirmingPayment}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748B' }}>Check Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1.6, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F766E' }}
                onPress={handleConfirmDashboardPayment}
                disabled={isConfirmingPayment}
              >
                {isConfirmingPayment ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>✓ Confirm & Unlock Rx</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  scrollContent: {
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  wrapper: {
    maxWidth: 1220,
    width: '100%',
    alignSelf: 'center',
  },

  // TOP TABS
  topTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  topTabsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  topLogoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  topLogoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  topTabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  topTabBtnActive: {
    backgroundColor: '#D0F2EB',
  },
  topTabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  topTabBtnTextActive: {
    color: '#0D826C',
    fontWeight: '800',
  },

  // HERO BANNER
  heroBanner: {
    backgroundColor: '#0F967E',
    borderRadius: 18,
    padding: 24,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    shadowColor: '#0F967E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  heroLeft: {
    flex: 1,
    minWidth: 260,
  },
  heroPreTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  heroRegRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroRegText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '500',
  },
  verifiedBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F967E',
  },
  heroRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroWhiteBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  heroWhiteBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  doctorAvatarBtn: {
    position: 'relative',
    marginLeft: 4,
  },
  doctorAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0A6E5C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  avatarEditPill: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarEditIcon: {
    fontSize: 10,
  },

  // MEDICAL DISCLAIMER CARD
  disclaimerCard: {
    backgroundColor: '#FEF9ED',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  disclaimerIcon: {
    fontSize: 14,
  },
  disclaimerTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#B45309',
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#78350F',
    fontWeight: '500',
  },

  // 4 SUMMARY STAT CARDS
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  statsRowMobile: {
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardHalf: {
    width: '48%',
    flex: 'none',
  },
  statCardRed: {
    borderLeftColor: '#EF4444',
  },
  statCardOrange: {
    borderLeftColor: '#F97316',
  },
  statCardYellow: {
    borderLeftColor: '#EAB308',
  },
  statCardGreen: {
    borderLeftColor: '#10B981',
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statCardNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statCardSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // QUEUE HEADER
  queueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 10,
  },
  queueSectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  refreshBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },

  // QUEUE CARDS
  queueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 5,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  queueCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
  },
  triageBadgeBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triageBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  patientInfoCol: {
    flex: 1,
    minWidth: 240,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  queuePatientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  queuePatientMeta: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  queueCaseMeta: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  monoText: {
    fontFamily: 'monospace',
    color: '#334155',
    fontWeight: '600',
  },
  queueRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  queueTimeBox: {
    alignItems: 'flex-end',
  },
  queueWaitTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  queueDateTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  openCaseBtn: {
    backgroundColor: '#4338CA',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  openCaseBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 400,
  },

  // HISTORY CARD STYLING
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#10B981',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  historyCardContent: {
    padding: 16,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  completedBadgePill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  completedBadgeText: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 11,
  },
  historyCaseMeta: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  historyRxBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  rxHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  historyRxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F967E',
  },
  historyDiagnosisText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyMedsRow: {
    marginTop: 6,
    marginBottom: 4,
  },
  historyMedsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  medsTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  medTagPill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  medTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  historyNotesText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
    fontStyle: 'italic',
  },
  historyActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  viewHistoryRxBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  viewHistoryRxBtnText: {
    color: '#047857',
    fontWeight: '700',
    fontSize: 12,
  },
  openCaseHistoryBtn: {
    backgroundColor: '#0F967E',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  openCaseHistoryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // MODAL STYLING
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '700',
    paddingHorizontal: 6,
  },
  modalBodyText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 14,
    lineHeight: 20,
  },
  modalSlotPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  modalSlotTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F967E',
    marginBottom: 4,
  },
  modalSlotTime: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  revenueMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  revenueMetricCol: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
  },
  revenueMetricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#166534',
    marginBottom: 2,
  },
  revenueMetricLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
    textAlign: 'center',
  },
  modalActionBtn: {
    backgroundColor: '#0F967E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
