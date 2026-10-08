import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import StepperHeader from '../components/StepperHeader';
import MedicalDisclaimer from '../components/MedicalDisclaimer';
import { ConsultationContext } from '../context/ConsultationContext';
import { aiQualityPresets } from '../services/aiService';
import { imagePickerService } from '../services/imagePickerService';

const SYMPTOM_OPTIONS = [
  'Acne / Pustules',
  'Redness / Erythema',
  'Itching / Pruritus',
  'Dryness / Flaking',
  'Burning Sensation',
  'Swelling',
  'Pain / Tenderness',
  'Bleeding / Crusting',
];

const DURATION_OPTIONS = ['Today', 'Few days ago', 'Few weeks ago', 'More than a month'];
const SEVERITY_OPTIONS = ['Mild', 'Moderate', 'Severe'];
const BODY_AREAS = ['Face (Cheeks / T-zone)', 'Forehead / Scalp', 'Neck', 'Chest', 'Back', 'Arms / Hands', 'Legs'];

export default function ConsultationFlowScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const [showPickerModal, setShowPickerModal] = useState(false);

  const {
    currentStep,
    setCurrentStep,
    photoPreset,
    photoUri,
    photoFile,
    qualityStatus,
    isCheckingQuality,
    setUserUploadedPhoto,
    applyPreset,
    removePhoto,
    duration,
    setDuration,
    spreading,
    setSpreading,
    itching,
    setItching,
    pain,
    setPain,
    emergencySymptoms,
    setEmergencySymptoms,
    selectedSymptoms,
    setSelectedSymptoms,
    severity,
    setSeverity,
    affectedArea,
    setAffectedArea,
    previousTreatment,
    setPreviousTreatment,
    triageResult,
    isTriaging,
    computeTriage,
  } = useContext(ConsultationContext);

  useEffect(() => {
    if (route?.params?.initialStep) {
      setCurrentStep(route.params.initialStep);
    }
  }, [route?.params?.initialStep]);

  const toggleSymptom = (sym) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  const handleGalleryPick = async () => {
    setShowPickerModal(false);
    const result = await imagePickerService.pickFromGallery();
    if (result) {
      setUserUploadedPhoto(result);
    }
  };

  const handleCameraCapture = async () => {
    setShowPickerModal(false);
    const result = await imagePickerService.takePhotoWithCamera();
    if (result) {
      setUserUploadedPhoto(result);
    }
  };

  // STEP 1: PHOTO & QUALITY CHECK
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      {/* Main Content Card matching Reference Screenshot */}
      <View style={styles.uploadMainCard}>
        {/* Title & Subtitle */}
        <View style={styles.uploadHeaderSection}>
          <Text style={styles.uploadTitle}>Upload Skin Photo</Text>
          <Text style={styles.uploadSubtitle}>
            Upload a clear photo of the affected skin area for your dermatologist to review.
          </Text>
        </View>

        {/* Two-column Layout: Left Square Image/Upload, Right Quality Card */}
        <View style={[styles.twoColRow, !isWide && styles.twoColRowStacked]}>
          {/* LEFT: Square Skin Image / Upload Area */}
          <View style={[styles.squareContainer, isWide ? { width: 250, height: 250 } : { width: '100%', height: 260 }]}>
            {photoUri ? (
              <View style={styles.squareImageWrapper}>
                <Image
                  source={{ uri: photoUri }}
                  style={styles.squareSkinImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeBadgeBtn}
                  onPress={removePhoto}
                  activeOpacity={0.8}
                >
                  <Text style={styles.removeBadgeText}>🗑 Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.squareUploadPlaceholder}
                onPress={() => setShowPickerModal(true)}
                activeOpacity={0.8}
              >
                <View style={styles.placeholderCameraCircle}>
                  <Text style={styles.placeholderCameraEmoji}>📷</Text>
                </View>
                <Text style={styles.placeholderMainText}>Upload Skin Photo</Text>
                <Text style={styles.placeholderSubText}>
                  Choose from gallery{'\n'}or take a photo
                </Text>
                <View style={styles.selectBtnBadge}>
                  <Text style={styles.selectBtnBadgeText}>+ Select Photo</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* RIGHT: Photo Quality Info Box */}
          <View style={[styles.qualityRightCol, !isWide && { marginTop: 14 }]}>
            {isCheckingQuality ? (
              <View style={styles.qualityCheckingBox}>
                <ActivityIndicator size="large" color="#4338CA" />
                <Text style={styles.checkingText}>Running AI Quality & Resolution Check...</Text>
              </View>
            ) : photoUri && qualityStatus?.quality === 'GOOD' ? (
              <View style={styles.qualityPassBox}>
                <View style={styles.qualityStatusHeader}>
                  <View style={styles.greenCheckCircle}>
                    <Text style={styles.greenCheckIcon}>✔</Text>
                  </View>
                  <Text style={styles.qualityPassTitle}>Photo quality looks good.</Text>
                </View>
                <Text style={styles.qualityPassDetails}>
                  ✓ Sharpness: {qualityStatus?.sharpness || 'Clear'} • Lighting: {qualityStatus?.lighting || 'Balanced'} • OpenCV Score: {Math.round((qualityStatus?.score || 1) * 100)}%
                </Text>
                <View style={styles.findingWhiteCard}>
                  <Text style={styles.findingLabel}>
                    <Text style={{ fontWeight: '700', color: '#1E293B' }}>Visual Feature Finding:</Text>{' '}
                    <Text style={{ color: '#334155' }}>
                      {qualityStatus?.visualFinding || 'Pustular Acneiform Lesions'}
                    </Text>
                  </Text>
                </View>
              </View>
            ) : photoUri && qualityStatus?.quality === 'POOR' ? (
              <View style={styles.qualityFailBox}>
                <View style={styles.qualityStatusHeader}>
                  <View style={styles.redFailCircle}>
                    <Text style={styles.redFailIcon}>✖</Text>
                  </View>
                  <Text style={styles.qualityFailTitle}>Photo quality check failed.</Text>
                </View>
                <Text style={styles.qualityFailReason}>
                  {qualityStatus?.reason || 'Image is too blurry or underexposed.'}
                </Text>
                <View style={styles.hintBox}>
                  <Text style={styles.hintText}>💡 Tip: {qualityStatus?.fixHint || 'Retake photo in natural lighting.'}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.qualityGuideBox}>
                <Text style={styles.qualityGuideTitle}>📋 Photo Quality Guidelines</Text>
                <Text style={styles.qualityGuideItem}>• Good natural or balanced indoor lighting</Text>
                <Text style={styles.qualityGuideItem}>• Clear focus on the affected skin area</Text>
                <Text style={styles.qualityGuideItem}>• Avoid heavy blur, shadows, and flash glare</Text>
                <Text style={styles.qualityGuideItem}>• AI will automatically verify quality on upload</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Buttons Row */}
        <View style={styles.photoActionRow}>
          <TouchableOpacity
            style={[styles.changeImgBtn, !photoUri && styles.changeImgBtnDisabled]}
            onPress={() => setShowPickerModal(true)}
            disabled={!photoUri}
            activeOpacity={0.8}
          >
            <Text style={[styles.changeImgBtnText, !photoUri && styles.changeImgBtnTextDisabled]}>
              Change Image
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.continueBtn,
              (!photoUri || qualityStatus?.quality !== 'GOOD') && styles.continueBtnDisabled,
            ]}
            disabled={!photoUri || qualityStatus?.quality !== 'GOOD'}
            onPress={() => setCurrentStep(2)}
            activeOpacity={0.8}
          >
            <Text style={styles.continueBtnText}>Continue to Symptoms ➔</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Development/Testing Presets Helper */}
      <View style={styles.presetTestCard}>
        <Text style={styles.presetHeading}>⚡ 1-Click Quality Checker Test Presets (Dev Testing):</Text>
        <View style={styles.presetButtonsWrap}>
          <TouchableOpacity
            style={styles.presetPassBtn}
            onPress={() => applyPreset('clear')}
            activeOpacity={0.8}
          >
            <Text style={styles.presetBtnText}>✔ Test Clear Photo (PASS)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetFailBtn}
            onPress={() => applyPreset('blurry')}
            activeOpacity={0.8}
          >
            <Text style={styles.presetBtnText}>✖ Test Blurry Photo (FAIL)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetFailBtn}
            onPress={() => applyPreset('dark')}
            activeOpacity={0.8}
          >
            <Text style={styles.presetBtnText}>✖ Test Dark Photo (FAIL)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetFailBtn}
            onPress={() => applyPreset('bright')}
            activeOpacity={0.8}
          >
            <Text style={styles.presetBtnText}>✖ Test Bright Photo (FAIL)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetFailBtn}
            onPress={() => applyPreset('lowres')}
            activeOpacity={0.8}
          >
            <Text style={styles.presetBtnText}>✖ Test Low-Res Photo (FAIL)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Selection Modal / Action Sheet */}
      <Modal
        visible={showPickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPickerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPickerModal(false)}
        >
          <View style={styles.modalContentCard}>
            <Text style={styles.modalTitle}>Upload Skin Photo</Text>
            <Text style={styles.modalSub}>
              Select a method to upload your skin photo for quality analysis
            </Text>

            <TouchableOpacity
              style={styles.modalOptionBtn}
              onPress={handleGalleryPick}
              activeOpacity={0.7}
            >
              <View style={styles.modalOptionIconCircle}>
                <Text style={styles.modalOptionIcon}>🖼️</Text>
              </View>
              <View style={styles.modalOptionTextCol}>
                <Text style={styles.modalOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.modalOptionSub}>Select an image (JPG, PNG, WEBP) from your device</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOptionBtn}
              onPress={handleCameraCapture}
              activeOpacity={0.7}
            >
              <View style={styles.modalOptionIconCircle}>
                <Text style={styles.modalOptionIcon}>📷</Text>
              </View>
              <View style={styles.modalOptionTextCol}>
                <Text style={styles.modalOptionTitle}>Take Photo</Text>
                <Text style={styles.modalOptionSub}>Use device camera to capture a new photo</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowPickerModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  // STEP 2: SYMPTOMS QUESTIONNAIRE matching Image 1
  const renderStep2 = () => {
    const durationOptions = ['Today', 'Few days', '1–2 weeks', 'More than 2 weeks'];
    const spreadingOptions = ['No', 'Slowly', 'Rapidly'];
    const itchingOptions = ['None', 'Mild', 'Moderate', 'Severe'];
    const painOptions = ['None', 'Mild', 'Moderate', 'Severe'];

    const toggleEmergency = (key) => {
      setEmergencySymptoms((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    };

    return (
      <View style={styles.stepContainer}>
        {/* Main Heading */}
        <Text style={styles.questionnaireMainHeading}>Symptoms Questionnaire</Text>

        {/* Q1: How long have you had this skin problem? */}
        <View style={styles.qBlock}>
          <Text style={styles.qQuestionText}>How long have you had this skin problem?</Text>
          <View style={styles.pillRow}>
            {durationOptions.map((opt) => {
              const isSel = duration === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.qPill, isSel && styles.qPillSelected]}
                  onPress={() => setDuration(opt)}
                >
                  <Text style={[styles.qPillText, isSel && styles.qPillTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Q2: Is the condition spreading? */}
        <View style={styles.qBlock}>
          <Text style={styles.qQuestionText}>Is the condition spreading?</Text>
          <View style={styles.pillRow}>
            {spreadingOptions.map((opt) => {
              const isSel = spreading === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.qPill, isSel && styles.qPillSelected]}
                  onPress={() => setSpreading(opt)}
                >
                  <Text style={[styles.qPillText, isSel && styles.qPillTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Q3: How severe is the itching? */}
        <View style={styles.qBlock}>
          <Text style={styles.qQuestionText}>How severe is the itching?</Text>
          <View style={styles.pillRow}>
            {itchingOptions.map((opt) => {
              const isSel = itching === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.qPill, isSel && styles.qPillSelected]}
                  onPress={() => setItching(opt)}
                >
                  <Text style={[styles.qPillText, isSel && styles.qPillTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Q4: How severe is the pain? */}
        <View style={styles.qBlock}>
          <Text style={styles.qQuestionText}>How severe is the pain?</Text>
          <View style={styles.pillRow}>
            {painOptions.map((opt) => {
              const isSel = pain === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.qPill, isSel && styles.qPillSelected]}
                  onPress={() => setPain(opt)}
                >
                  <Text style={[styles.qPillText, isSel && styles.qPillTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Emergency Systemic Symptom Check */}
        <View style={styles.emergencyCard}>
          <Text style={styles.emergencyCardTitle}>Emergency Systemic Symptom Check:</Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => toggleEmergency('breathingDifficulty')}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, emergencySymptoms.breathingDifficulty && styles.checkboxBoxChecked]}>
              {emergencySymptoms.breathingDifficulty && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              Are you experiencing difficulty breathing or tightness in chest?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => toggleEmergency('swellingThroat')}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, emergencySymptoms.swellingThroat && styles.checkboxBoxChecked]}>
              {emergencySymptoms.swellingThroat && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              Do you have swelling of your face, lips, or throat?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => toggleEmergency('highFever')}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, emergencySymptoms.highFever && styles.checkboxBoxChecked]}>
              {emergencySymptoms.highFever && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              Do you currently have a high fever?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.bottomButtonsRow}>
          <TouchableOpacity
            style={styles.backImageUploadBtn}
            onPress={() => setCurrentStep(1)}
            activeOpacity={0.8}
          >
            <Text style={styles.backImageUploadBtnText}>Back to Image Upload</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.calculateTriageBtn}
            onPress={computeTriage}
            activeOpacity={0.8}
          >
            {isTriaging ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.calculateTriageBtnText}>
                Calculate Triage & View Result ⚡
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // STEP 3: AI TRIAGE RESULT
  const renderStep3 = () => {
    const level = triageResult?.triageLevel || 'YELLOW';
    const triageBadgeColor =
      level === 'RED'
        ? Colors.triageRed
        : level === 'YELLOW'
        ? Colors.triageYellow
        : Colors.triageGreen;
    const triageBgColor =
      level === 'RED'
        ? Colors.triageRedBg
        : level === 'YELLOW'
        ? Colors.triageYellowBg
        : Colors.triageGreenBg;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.titleCard}>
          <Text style={styles.stepTitle}>AI Triage Assessment</Text>
          <Text style={styles.stepSubtitle}>
            Preliminary assessment report prepared for clinical dermatologist review.
          </Text>
        </View>

        {/* Triage Level Card */}
        <View style={[styles.triageBannerCard, { borderColor: triageBadgeColor, backgroundColor: triageBgColor }]}>
          <View style={styles.triageBadgeHeader}>
            <View style={[styles.triagePill, { backgroundColor: triageBadgeColor }]}>
              <Text style={styles.triagePillText}>RISK LEVEL: {level}</Text>
            </View>
            <Text style={styles.confidenceText}>Confidence: 89%</Text>
          </View>

          <Text style={styles.triageObservationTitle}>AI-Assisted Observation</Text>
          <Text style={styles.triageObservationText}>
            {triageResult?.observation ||
              'Moderate erythematous acneiform papules and surface pustules identified.'}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.triageRecommendationTitle}>Recommendation</Text>
          <Text style={styles.triageRecommendationText}>
            {triageResult?.recommendation ||
              'Dermatologist evaluation recommended for tailored medical prescription.'}
          </Text>
        </View>

        {/* Clinical Data Summary Box */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryBoxTitle}>Clinical Case Summary</Text>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryKey}>Location:</Text>
            <Text style={styles.summaryVal}>{affectedArea}</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryKey}>Duration:</Text>
            <Text style={styles.summaryVal}>{duration}</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryKey}>Reported Symptoms:</Text>
            <Text style={styles.summaryVal}>{selectedSymptoms.join(', ') || 'None selected'}</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryKey}>Image Finding:</Text>
            <Text style={styles.summaryVal}>
              {qualityStatus?.visualFinding || 'Pustular Acneiform Lesions'}
            </Text>
          </View>
        </View>

        {/* Action button to select Doctor */}
        <TouchableOpacity
          style={styles.bookDoctorBtn}
          onPress={() => navigation.navigate('DoctorList')}
          activeOpacity={0.8}
        >
          <Text style={styles.bookDoctorBtnText}>Book Dermatologist Consultation ➔</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={() => setCurrentStep(1)}
          activeOpacity={0.8}
        >
          <Text style={styles.retakeBtnText}>Start New Assessment</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header navigation={navigation} />
      <StepperHeader currentStep={currentStep} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MedicalDisclaimer />

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

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
  stepContainer: {
    marginTop: 6,
  },
  uploadMainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  uploadHeaderSection: {
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  twoColRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
  },
  twoColRowStacked: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  squareContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  squareImageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  squareSkinImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  removeBadgeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  removeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  squareUploadPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  placeholderCameraCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeholderCameraEmoji: {
    fontSize: 26,
  },
  placeholderMainText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  placeholderSubText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  selectBtnBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  selectBtnBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
  },
  qualityRightCol: {
    flex: 1,
    justifyContent: 'center',
  },
  qualityCheckingBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: '100%',
    minHeight: 180,
  },
  checkingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#4338CA',
    fontWeight: '600',
    textAlign: 'center',
  },
  qualityPassBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 16,
    height: '100%',
    justifyContent: 'center',
  },
  qualityStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  greenCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  greenCheckIcon: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '900',
  },
  qualityPassTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803D',
  },
  qualityPassDetails: {
    fontSize: 12,
    color: '#166534',
    marginBottom: 12,
    fontWeight: '500',
    paddingLeft: 4,
  },
  findingWhiteCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 8,
    padding: 12,
  },
  findingLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  qualityFailBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 16,
    height: '100%',
    justifyContent: 'center',
  },
  redFailCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  redFailIcon: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '900',
  },
  qualityFailTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#B91C1C',
  },
  qualityFailReason: {
    fontSize: 13,
    color: '#991B1B',
    marginVertical: 8,
  },
  qualityGuideBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    height: '100%',
    justifyContent: 'center',
  },
  qualityGuideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  qualityGuideItem: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 2,
  },
  photoActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  changeImgBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeImgBtnDisabled: {
    opacity: 0.5,
  },
  changeImgBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  changeImgBtnTextDisabled: {
    color: '#94A3B8',
  },
  continueBtn: {
    backgroundColor: '#4338CA',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: '#C7D2FE',
  },
  continueBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 18,
    lineHeight: 18,
  },
  modalOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  modalOptionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalOptionIcon: {
    fontSize: 22,
  },
  modalOptionTextCol: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  modalOptionSub: {
    fontSize: 12,
    color: '#64748B',
  },
  modalCancelBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  presetTestCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: 14,
    marginBottom: 16,
  },
  presetHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3730A3',
    marginBottom: 10,
  },
  presetButtonsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetPassBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  presetFailBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  presetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  questionnaireMainHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 16,
    marginTop: 6,
  },
  qBlock: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  qQuestionText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  qPillSelected: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  qPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  qPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emergencyCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#FEB2B2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
  },
  emergencyCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9B2C2C',
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FEB2B2',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxBoxChecked: {
    backgroundColor: '#E53E3E',
    borderColor: '#E53E3E',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#742A2A',
    fontWeight: '500',
    flex: 1,
    lineHeight: 17,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  backImageUploadBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backImageUploadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
  },
  calculateTriageBtn: {
    flex: 1.5,
    backgroundColor: '#4338CA',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4338CA',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  calculateTriageBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  formGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioCard: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  radioCardSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  radioText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  radioTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  severityCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  severityEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  severityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textDark,
  },
  areaRow: {
    gap: 8,
    flexDirection: 'row',
  },
  areaChip: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  areaChipSelected: {
    backgroundColor: Colors.secondaryLight,
    borderColor: Colors.secondary,
  },
  areaChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  areaChipTextSelected: {
    color: Colors.secondary,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleBtnTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  treatmentInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: Colors.textDark,
    textAlignVertical: 'top',
  },
  triageBannerCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  triageBadgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  triagePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  triagePillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  triageObservationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  triageObservationText: {
    fontSize: 14,
    color: Colors.textDark,
    lineHeight: 20,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 12,
  },
  triageRecommendationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  triageRecommendationText: {
    fontSize: 13,
    color: Colors.textDark,
    lineHeight: 19,
  },
  summaryBox: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  summaryBoxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 10,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  summaryKey: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  summaryVal: {
    fontSize: 13,
    color: Colors.textDark,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  bookDoctorBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  bookDoctorBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  retakeBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  retakeBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
