import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiQualityPresets, aiService } from '../services/aiService';

export const ConsultationContext = createContext();

export const ConsultationProvider = ({ children }) => {
  // Step in the consultation: 1 = Photo, 2 = Questionnaire, 3 = Triage Result
  const [currentStep, setCurrentStep] = useState(1);

  // Photo & Quality check state - NULL by default (no hardcoded photo or fake results)
  const [photoPreset, setPhotoPreset] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [qualityStatus, setQualityStatus] = useState(null);
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);

  // Restore persisted photo if available
  useEffect(() => {
    AsyncStorage.getItem('@telederma_last_uploaded_photo').then((saved) => {
      if (saved && !photoUri) {
        setPhotoUri(saved);
      }
    }).catch(() => {});
  }, []);

  // Symptoms Questionnaire matching Image 1
  const [duration, setDuration] = useState('1–2 weeks');
  const [spreading, setSpreading] = useState('Slowly');
  const [itching, setItching] = useState('Moderate');
  const [pain, setPain] = useState('Mild');
  const [emergencySymptoms, setEmergencySymptoms] = useState({
    breathingDifficulty: false,
    swellingThroat: false,
    highFever: false,
  });

  // Backward compatibility
  const [selectedSymptoms, setSelectedSymptoms] = useState(['Acne / Pustules', 'Redness / Erythema']);
  const [severity, setSeverity] = useState('Moderate');
  const [affectedArea, setAffectedArea] = useState('Face (Cheeks / T-Zone)');
  const [previousTreatment, setPreviousTreatment] = useState('OTC Salicylic Acid cleanser with minimal relief.');

  // AI Triage Result
  const [triageResult, setTriageResult] = useState(null);
  const [isTriaging, setIsTriaging] = useState(false);

  // Doctor & Booking state
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Handle Real User Uploaded Photo
  const setUserUploadedPhoto = async (photoData) => {
    if (!photoData || !photoData.uri) return;
    setPhotoUri(photoData.uri);
    setPhotoFile(photoData);
    setPhotoPreset(null);
    AsyncStorage.setItem('@telederma_last_uploaded_photo', photoData.uri).catch(() => {});
    setIsCheckingQuality(true);
    const result = await aiService.analyzeUploadedPhoto(photoData);
    setQualityStatus(result);
    setIsCheckingQuality(false);
  };

  // Run image quality check with a specific preset (for testing)
  const applyPreset = async (presetKey) => {
    setIsCheckingQuality(true);
    const preset = aiQualityPresets[presetKey] || aiQualityPresets.clear;
    setPhotoPreset(preset);
    setPhotoUri(preset.sampleImageUri);
    setPhotoFile(null);
    AsyncStorage.setItem('@telederma_last_uploaded_photo', preset.sampleImageUri).catch(() => {});
    const result = await aiService.checkImageQuality(presetKey);
    setQualityStatus(result);
    setIsCheckingQuality(false);
  };

  const removePhoto = () => {
    setPhotoUri(null);
    setPhotoFile(null);
    setQualityStatus(null);
    setPhotoPreset(null);
    setIsCheckingQuality(false);
    AsyncStorage.removeItem('@telederma_last_uploaded_photo').catch(() => {});
  };

  // Run AI Triage
  const computeTriage = async () => {
    setIsTriaging(true);
    const hasEmergency =
      emergencySymptoms.breathingDifficulty ||
      emergencySymptoms.swellingThroat ||
      emergencySymptoms.highFever;

    const hasSevere = itching === 'Severe' || pain === 'Severe' || spreading === 'Rapidly';
    const hasModerate = itching === 'Moderate' || pain === 'Moderate' || spreading === 'Slowly';
    const hasMild = itching === 'Mild' || pain === 'Mild';
    const calculatedSeverity = hasSevere ? 'Severe' : hasModerate ? 'Moderate' : hasMild ? 'Mild' : 'None';

    const questionnaireSymptoms = [];
    if (itching && itching !== 'None') questionnaireSymptoms.push(`Itching: ${itching}`);
    if (pain && pain !== 'None') questionnaireSymptoms.push(`Pain: ${pain}`);
    if (spreading && spreading !== 'No') questionnaireSymptoms.push(`Spreading: ${spreading}`);

    let result = await aiService.performTriage({
      symptoms: questionnaireSymptoms,
      duration,
      severity: calculatedSeverity,
      spreading,
      itching,
      pain,
      affectedArea,
    });

    if (hasEmergency) {
      result = {
        ...result,
        triageLevel: 'RED',
        observation: 'Emergency Systemic Symptoms reported (breathing difficulty, facial swelling, or high fever). Immediate clinical attention required.',
        recommendation: 'Seek immediate emergency clinical care or urgent dermatologist evaluation.',
      };
    }

    setSelectedSymptoms(questionnaireSymptoms.length > 0 ? questionnaireSymptoms : ['None (Asymptomatic)']);
    setTriageResult(result);
    setIsTriaging(false);
    setCurrentStep(3);
  };

  const resetConsultation = () => {
    setCurrentStep(1);
    setPhotoPreset(null);
    setPhotoUri(null);
    setPhotoFile(null);
    setQualityStatus(null);
    setIsCheckingQuality(false);
    setTriageResult(null);
    setBookingConfirmed(false);
  };

  return (
    <ConsultationContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        photoPreset,
        photoUri,
        setPhotoUri,
        photoFile,
        setPhotoFile,
        setUserUploadedPhoto,
        qualityStatus,
        setQualityStatus,
        isCheckingQuality,
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
        selectedDoctor,
        setSelectedDoctor,
        selectedDate,
        setSelectedDate,
        selectedSlot,
        setSelectedSlot,
        bookingConfirmed,
        setBookingConfirmed,
        resetConsultation,
      }}
    >
      {children}
    </ConsultationContext.Provider>
  );
};
