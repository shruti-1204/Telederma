// AI Service Abstraction for DermAI / TeleDerma
// Simulates Image Quality Model, AI Triage Classification, and Educational Skin Assistant

export const aiQualityPresets = {
  clear: {
    id: 'clear',
    label: 'Test Clear Photo (PASS)',
    type: 'PASS',
    quality: 'GOOD',
    score: 0.94,
    resolution: 'High (1920x1080)',
    sharpness: 'Clear',
    lighting: 'Balanced',
    visualFinding: 'Pustular Acneiform Lesions',
    recommendedNext: 'Continue to Symptoms Questionnaire',
    sampleImageUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
  },
  blurry: {
    id: 'blurry',
    label: 'Test Blurry Photo (FAIL)',
    type: 'FAIL',
    quality: 'POOR',
    score: 0.32,
    reason: 'Image is too blurry. Camera focus was lost or motion blur was detected.',
    fixHint: 'Hold phone steady 10-15 cm away from the skin in natural light.',
    sampleImageUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=20',
  },
  dark: {
    id: 'dark',
    label: 'Test Dark Photo (FAIL)',
    type: 'FAIL',
    quality: 'POOR',
    score: 0.41,
    reason: 'Lighting is too dark. Underexposure obscures lesion borders.',
    fixHint: 'Turn on overhead lighting or stand facing a window.',
    sampleImageUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=30',
  },
  bright: {
    id: 'bright',
    label: 'Test Bright Photo (FAIL)',
    type: 'FAIL',
    quality: 'POOR',
    score: 0.38,
    reason: 'Severe glare and flash washout on the skin surface.',
    fixHint: 'Disable direct camera flash and use diffused ambient lighting.',
    sampleImageUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=50',
  },
  lowres: {
    id: 'lowres',
    label: 'Test Low-Res Photo (FAIL)',
    type: 'FAIL',
    quality: 'POOR',
    score: 0.28,
    reason: 'Resolution too low (< 720p). Fine epidermal texture cannot be resolved.',
    fixHint: 'Capture with high-definition camera mode without digital zoom.',
    sampleImageUri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=30',
  },
};

export const aiService = {
  // Assess Image Quality from Real User Upload
  analyzeUploadedPhoto: async (photoData) => {
    // Realistic analysis delay (600ms)
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      id: 'user-photo',
      type: 'PASS',
      quality: 'GOOD',
      score: 0.94,
      resolution: 'High',
      sharpness: 'Clear',
      lighting: 'Balanced',
      visualFinding: 'Pustular Acneiform Lesions',
      recommendedNext: 'Continue to Symptoms Questionnaire',
      fileName: photoData?.name || 'skin_photo.jpg',
      fileSize: photoData?.size || null,
      rawFile: photoData?.file || null,
    };
  },

  // Assess Image Quality with preset
  checkImageQuality: async (presetKey = 'clear') => {
    // Simulated network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    return aiQualityPresets[presetKey] || aiQualityPresets.clear;
  },

  // Perform AI Triage on combined payload
  performTriage: async ({ symptoms = [], duration = '', severity = 'Moderate', affectedArea = 'Face' }) => {
    await new Promise(resolve => setTimeout(resolve, 800));

    const isUrgent = symptoms.includes('Bleeding') || symptoms.includes('Severe Pain') || severity === 'Severe';
    const isModerate = symptoms.includes('Itching') || symptoms.includes('Burning') || symptoms.includes('Pustules') || severity === 'Moderate';

    let triageLevel = 'GREEN';
    let observation = 'Mild localized inflammatory reaction. Epidermal barrier irritation.';
    let recommendation = 'Dermatologist consultation recommended for standard topical care.';

    if (isUrgent) {
      triageLevel = 'RED';
      observation = 'Prominent inflammatory signs detected with reported pain/bleeding indicators.';
      recommendation = 'Prompt dermatologist evaluation recommended within 24-48 hours.';
    } else if (isModerate) {
      triageLevel = 'YELLOW';
      observation = 'Moderate erythematous acneiform papules and surface pustules identified.';
      recommendation = 'Dermatologist evaluation recommended for tailored medical prescription.';
    }

    return {
      triageLevel,
      observation,
      recommendation,
      confidenceScore: 0.89,
      analyzedDate: new Date().toISOString(),
      affectedArea,
      detectedFeatures: [
        'Circumscribed erythema',
        'Follicular prominence',
        'Sebaceous dysregulation',
      ],
      disclaimer: 'AI-generated information is for general guidance and preliminary triage only. It is not a medical diagnosis and does not replace consultation with a qualified dermatologist.',
    };
  },

  // Educational Chat Assistant (Skin Assistant)
  askAssistant: async (question = '') => {
    await new Promise(resolve => setTimeout(resolve, 700));
    const lower = question.toLowerCase();

    if (lower.includes('dry') || lower.includes('flak')) {
      return {
        reply: 'Dryness is often caused by an impaired epidermal moisture barrier. Key general tips:\n• Use a gentle hydrating cleanser with ceramides or hyaluronic acid.\n• Apply moisturizer immediately on damp skin after cleansing.\n• Avoid harsh physical scrubs and hot water.\n\nWould you like to start a consultation with a dermatologist for a targeted prescription?',
        suggestions: ['How to repair skin barrier?', 'Best ingredients for dry skin', 'Book Dermatologist'],
      };
    }

    if (lower.includes('acne') || lower.includes('pimple') || lower.includes('breakout')) {
      return {
        reply: 'Acne develops when hair follicles become plugged with sebum and dead cells. Dermatologists commonly assess whether it is comedonal (blackheads/whiteheads) or inflammatory (papules/pustules).\n• Avoid popping or squeezing.\n• Look for ingredients like Salicylic Acid or Adapalene.\n• Always wear non-comedogenic sunscreen.\n\nWe recommend uploading a clear photo in "Start Consultation" to check quality and get tailored dermatologist review.',
        suggestions: ['Adapalene vs Benzoyl Peroxide', 'Start Consultation', 'Sunscreen tips'],
      };
    }

    if (lower.includes('rash') || lower.includes('itch') || lower.includes('red')) {
      return {
        reply: 'Itching and redness can stem from contact dermatitis, eczema flare-ups, or mild fungal irritation. Avoid applying heavily fragranced lotions. If the area feels hot, swollen, or spreads rapidly, medical evaluation is recommended.',
        suggestions: ['Start Consultation', 'Find Dermatologist', 'Mild soothing tips'],
      };
    }

    return {
      reply: 'Thank you for your question. As your AI Skin Assistant, I provide educational guidance on skincare ingredients and general dermatological concepts.\n\nFor any persistent irritation or lesions, our dermatologists can review your photos and issue digital prescriptions.',
      suggestions: ['Check Image Quality', 'Start Consultation', 'Browse Doctors'],
    };
  },
};
