import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  Alert,
} from 'react-native';
import api from '../services/api';

export default function PatientDetailScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

  // Extract patient passed from Dashboard or fallback
  const { patient } = route.params || {};

  const [isStartingCall, setIsStartingCall] = useState(false);

  const isOrange = patient?.triage === 'ORANGE';
  const isRed = patient?.triage === 'RED';
  const isYellow = patient?.triage === 'YELLOW';

  let stripeColor = '#F97316';
  let triageBadgeBg = '#FFEDD5';
  let triageBadgeText = '#C2410C';
  let triagePillBg = '#EA580C';

  if (isYellow) {
    stripeColor = '#EAB308';
    triageBadgeBg = '#FEF9C3';
    triageBadgeText = '#A16207';
    triagePillBg = '#CA8A04';
  } else if (isRed) {
    stripeColor = '#EF4444';
    triageBadgeBg = '#FEE2E2';
    triageBadgeText = '#B91C1C';
    triagePillBg = '#DC2626';
  }

  const patientName = patient?.name || 'Patient';
  const patientAge = patient?.age || '—';
  const patientGender = patient?.gender || 'Not specified';
  const caseId = patient?.id || 'Case File';
  const triageLevel = patient?.triage || 'NORMAL';

  const allergies = patient?.allergies || 'None reported';
  const meds = patient?.currentMeds || 'None';
  const mainConcern = patient?.mainConcern || 'Skin Consultation';
  const symptoms = patient?.symptoms || 'Consultation request';
  const duration = patient?.duration || '—';
  const progression = patient?.progression || '—';
  const aiVision = patient?.aiVision || 'Clinical Evaluation';
  const aiReason = patient?.aiReason || 'Scheduled clinical session';

  const skinType = patient?.skinType || 'Not specified';
  const skinTone = patient?.skinTone || 'Not specified';
  const medicalHistory = patient?.medicalHistory || 'None provided';
  const skinPhoto = patient?.skinPhoto || null;

  const questionnaire = patient?.questionnaire || {
    'Main Concern': 'Rash',
    'Problem Duration': '1–2 weeks',
    'Spreading': 'Slowly',
    'Worsening': 'Yes',
    'Itching Severity': 'Severe',
    'Pain Severity': 'Severe',
    'Swelling / Bleeding / Pus': 'No / No / No',
    'Fever': 'No',
  };

  const handleStartConsultation = async () => {
    try {
      setIsStartingCall(true);
      let consultation = patient?.backendData?.consultation;
      if (!consultation || !consultation.id) {
        try {
          const res = await api.post('/consultations', { appointmentId: patient?.id });
          consultation = res.data?.data;
        } catch (e) {}
      }

      let sessionData = null;
      if (consultation?.id) {
        try {
          const joinRes = await api.post(`/consultations/${consultation.id}/join`);
          sessionData = joinRes.data?.data;
        } catch (e) {}
      }

      navigation.navigate('VideoCall', {
        patient,
        consultationId: consultation?.id,
        roomId: `room_${patient?.id || 'session'}`,
        sessionData,
      });
    } catch (err) {
      console.warn('Start consultation notice:', err.message);
      navigation.navigate('VideoCall', {
        patient,
        roomId: `room_${patient?.id || 'session'}`,
      });
    } finally {
      setIsStartingCall(false);
    }
  };

  const isCompleted =
    patient?.status === 'COMPLETED' ||
    patient?.backendData?.status === 'COMPLETED' ||
    patient?.backendData?.consultation?.status === 'COMPLETED';

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.scrollContent}>
      <View style={styles.wrapper}>
        {/* Back navigation link */}
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back to Dashboard</Text>
        </TouchableOpacity>

        {/* 1. TOP CASE FILE HEADER CARD */}
        <View style={[styles.headerCard, { borderLeftColor: isCompleted ? '#10B981' : stripeColor }]}>
          <View style={styles.headerLeftCol}>
            <View style={styles.titleBadgeRow}>
              <Text style={styles.caseTitle}>Case File: {patientName}</Text>
              {isCompleted ? (
                <View style={[styles.triageTag, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1 }]}>
                  <Text style={[styles.triageTagText, { color: '#059669' }]}>
                    ✓ COMPLETED
                  </Text>
                </View>
              ) : (
                <View style={[styles.triageTag, { backgroundColor: triageBadgeBg }]}>
                  <Text style={[styles.triageTagText, { color: triageBadgeText }]}>
                    {triageLevel} TRIAGE
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.caseSubText}>
              Case ID: <Text style={styles.monoText}>{caseId}</Text> • Age: {patientAge} • Gender: {patientGender}
            </Text>
          </View>

          <View style={styles.headerActionsCol}>
            <TouchableOpacity
              style={[styles.startVideoBtn, isCompleted && { backgroundColor: '#64748B' }]}
              onPress={handleStartConsultation}
              disabled={isStartingCall}
              activeOpacity={0.85}
            >
              {isStartingCall ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.startVideoBtnText}>{isCompleted ? '📹 Video Call Session' : '📹 Start Video Call'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createRxBtn}
              onPress={() => navigation.navigate('Prescription', { patient })}
              activeOpacity={0.85}
            >
              <Text style={styles.createRxBtnText}>{isCompleted ? '📄 View / Edit Rx' : '📄 Create Prescription'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. IMPORTANT MEDICAL DISCLAIMER BANNER */}
        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerHeader}>
            <Text style={styles.disclaimerIcon}>🛡️</Text>
            <Text style={styles.disclaimerTitle}>IMPORTANT MEDICAL DISCLAIMER</Text>
          </View>
          <Text style={styles.disclaimerText}>
            "AI-generated information is for general guidance and preliminary triage only. It is not a medical diagnosis and does not replace consultation with a qualified dermatologist."
          </Text>
        </View>

        {/* 3. PRE-CONSULTATION SUMMARY CARD */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCardHeader}>
            <View style={styles.summaryCardTitleRow}>
              <Text style={styles.summaryDocIcon}>📄</Text>
              <Text style={styles.summaryCardTitle}>PRE-CONSULTATION SUMMARY</Text>
            </View>
            <View style={[styles.summaryTriagePill, { backgroundColor: triagePillBg }]}>
              <Text style={styles.summaryTriagePillText}>TRIAGE: {triageLevel}</Text>
            </View>
          </View>

          <View style={[styles.summaryColsRow, !isDesktop && styles.summaryColsRowMobile]}>
            {/* Column 1: Patient Info */}
            <View style={[styles.summaryColBox, !isDesktop && styles.summaryColBoxMobile]}>
              <Text style={styles.colSectionHeader}>Patient Info</Text>
              <Text style={styles.colRowText}>
                <Text style={styles.boldLabel}>Name:</Text> {patientName}
              </Text>
              <Text style={styles.colRowText}>
                <Text style={styles.boldLabel}>Age / Gender:</Text> {patientAge} / {patientGender}
              </Text>
              <Text style={styles.colRowText}>
                <Text style={styles.boldLabel}>Allergies:</Text> {allergies}
              </Text>
              <Text style={styles.colRowText}>
                <Text style={styles.boldLabel}>Meds:</Text> {meds}
              </Text>
            </View>

            {/* Column 2: Reported Symptoms */}
            <View style={[styles.summaryColBox, !isDesktop && styles.summaryColBoxMobile]}>
              <Text style={styles.colSectionHeader}>Reported Symptoms</Text>
              <Text style={styles.colRowText}>
                <Text style={styles.boldLabel}>Main Concern:</Text> {mainConcern}
              </Text>
              <Text style={styles.colRowText}>
                <Text style={styles.boldLabel}>Symptoms:</Text> {symptoms}
              </Text>
              <Text style={styles.colRowText}>
                <Text style={styles.boldLabel}>Duration:</Text> {duration}
              </Text>
              <Text style={styles.colRowText}>
                <Text style={styles.boldLabel}>Progression:</Text> {progression}
              </Text>
            </View>

            {/* Column 3: AI Assessment & Triage */}
            <View style={[styles.summaryColBox, !isDesktop && styles.summaryColBoxMobile]}>
              <Text style={styles.colSectionHeader}>AI Assessment & Triage</Text>
              <Text style={styles.colRowText}>
                <Text style={styles.boldLabel}>AI Vision:</Text> {aiVision}
              </Text>
              <Text style={styles.colRowText}>
                <Text style={styles.boldLabel}>Triage Level:</Text> {triageLevel}
              </Text>
              <Text style={styles.colRowText}>
                <Text style={styles.boldLabel}>Reason:</Text> {aiReason}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. TWO-COLUMN SPLIT: CLINICAL PROFILE & TRIAGE ON LEFT, SKIN PHOTO & AI ON RIGHT */}
        <View style={[styles.splitGrid, !isDesktop && styles.splitGridMobile]}>
          {/* LEFT COLUMN */}
          <View style={[styles.gridLeftCol, !isDesktop && styles.gridFullWidth]}>
            {/* Card: Patient Skin & Medical Profile */}
            <View style={styles.contentCard}>
              <View style={styles.cardHeaderWithIcon}>
                <Text style={styles.cardSectionIcon}>👤</Text>
                <Text style={styles.cardSectionTitle}>Patient Skin & Medical Profile</Text>
              </View>

              <View style={styles.profileRowsContainer}>
                <View style={styles.profileTwoColRow}>
                  <Text style={styles.profileItemText}>
                    <Text style={styles.boldLabel}>Skin Type:</Text> {skinType}
                  </Text>
                  <Text style={styles.profileItemText}>
                    <Text style={styles.boldLabel}>Skin Tone:</Text> {skinTone}
                  </Text>
                </View>

                <View style={styles.profileTwoColRow}>
                  <Text style={styles.profileItemText}>
                    <Text style={styles.boldLabel}>Known Allergies:</Text> {allergies}
                  </Text>
                  <Text style={styles.profileItemText}>
                    <Text style={styles.boldLabel}>Current Meds:</Text> {meds}
                  </Text>
                </View>

                <View style={styles.cardDivider} />

                <Text style={styles.subHeadingLabel}>Previous Medical History:</Text>
                <Text style={styles.italicHistoryText}>"{medicalHistory}"</Text>
              </View>
            </View>

            {/* Card: Triage Questionnaire Responses */}
            <View style={styles.contentCard}>
              <View style={styles.cardHeaderWithIcon}>
                <Text style={styles.cardSectionIcon}>📄</Text>
                <Text style={styles.cardSectionTitle}>Triage Questionnaire Responses</Text>
              </View>

              <View style={styles.questionnaireTable}>
                {Object.entries(questionnaire).map(([question, answer], index) => (
                  <View
                    key={index}
                    style={[
                      styles.tableRow,
                      index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                    ]}
                  >
                    <Text style={styles.questionText}>{question}:</Text>
                    <Text style={styles.answerText}>{answer}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* RIGHT COLUMN */}
          <View style={[styles.gridRightCol, !isDesktop && styles.gridFullWidth]}>
            {/* Card: Uploaded Skin Photo */}
            <View style={styles.contentCard}>
              <Text style={[styles.cardSectionTitle, { marginBottom: 14 }]}>Uploaded Skin Photo</Text>
              <View style={styles.skinPhotoWrapper}>
                <Image
                  source={{ uri: skinPhoto }}
                  style={styles.skinPhotoImage}
                  resizeMode="cover"
                />
              </View>

              {/* Preliminary AI Vision Findings Box */}
              <View style={styles.aiFindingsBox}>
                <View style={styles.aiFindingsHeader}>
                  <Text style={styles.aiFindingsSparkle}>✨</Text>
                  <Text style={styles.aiFindingsTitle}>Preliminary AI Vision Findings</Text>
                </View>
                <Text style={styles.aiFindingsSummary}>
                  <Text style={styles.boldLabel}>Summary:</Text> {aiVision}
                </Text>
                <Text style={styles.aiFindingsModel}>
                  <Text style={styles.boldLabel}>Model Version:</Text> EfficientNet-B0-Teledermatology-v1.2
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </View>
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

  // Back Link
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 6,
  },
  backArrow: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F967E',
  },
  backText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F967E',
  },

  // 1. TOP CASE FILE HEADER CARD
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerLeftCol: {
    flex: 1,
    minWidth: 260,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  caseTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  triageTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  triageTagText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  caseSubText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  monoText: {
    fontFamily: 'monospace',
    color: '#334155',
    fontWeight: '600',
  },
  headerActionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  startVideoBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  startVideoBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  createRxBtn: {
    backgroundColor: '#0F967E',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    shadowColor: '#0F967E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  createRxBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // 2. DISCLAIMER BANNER
  disclaimerCard: {
    backgroundColor: '#FEF9ED',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
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

  // 3. PRE-CONSULTATION SUMMARY CARD
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryDocIcon: {
    fontSize: 16,
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  summaryTriagePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  summaryTriagePillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  summaryColsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryColsRowMobile: {
    flexDirection: 'column',
  },
  summaryColBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryColBoxMobile: {
    width: '100%',
  },
  colSectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6,
  },
  colRowText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 4,
  },
  boldLabel: {
    fontWeight: '700',
    color: '#0F172A',
  },

  // 4. TWO-COLUMN SPLIT GRID
  splitGrid: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  splitGridMobile: {
    flexDirection: 'column',
  },
  gridLeftCol: {
    flex: 1.15,
  },
  gridRightCol: {
    flex: 0.85,
  },
  gridFullWidth: {
    width: '100%',
    flex: 'none',
  },

  // Common Content Card
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardSectionIcon: {
    fontSize: 16,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },

  // Skin & Medical Profile
  profileRowsContainer: {
    gap: 8,
  },
  profileTwoColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  profileItemText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    minWidth: 180,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  subHeadingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  italicHistoryText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#B45309',
  },

  // Triage Questionnaire Table
  questionnaireTable: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: '#F8FAFC',
  },
  questionText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  answerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Uploaded Skin Photo
  skinPhotoWrapper: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
  },
  skinPhotoImage: {
    width: '100%',
    height: '100%',
  },

  // AI Findings Box
  aiFindingsBox: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    borderRadius: 10,
    padding: 14,
  },
  aiFindingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiFindingsSparkle: {
    fontSize: 14,
  },
  aiFindingsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4338CA',
  },
  aiFindingsSummary: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 4,
  },
  aiFindingsModel: {
    fontSize: 12,
    color: '#4338CA',
  },
});
