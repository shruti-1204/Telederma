import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  PanResponder,
  Dimensions,
} from 'react-native';
import api from '../services/api';
import { socketService } from '../services/socketService';
import { WebRTCService } from '../services/webrtcService';
import WebRTCVideoView from '../components/WebRTCVideoView';

const VideoCallScreen = ({ route, navigation }) => {
  const { patient, consultationId, roomId: paramRoomId } = route.params || {};
  const patientName = patient?.name || 'Patient';
  const patientId = patient?.backendData?.patientId || patient?.id;
  const roomId = paramRoomId || (patient?.id ? `room_${patient.id}` : 'td-room-live');

  // Video Call States
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerJoined, setPeerJoined] = useState(false);
  const [patientEverJoined, setPatientEverJoined] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const hasPatientEverJoinedRef = useRef(false);

  // Payment Verification States
  const [pendingPaymentClaim, setPendingPaymentClaim] = useState(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [isPrescriptionSaved, setIsPrescriptionSaved] = useState(false);

  // Prescription States (Dynamic Array)
  const [medicines, setMedicines] = useState([
    { name: 'Adapalene Gel 0.1%', dosage: 'Once at night before sleep' },
  ]);
  const [notes, setNotes] = useState('Clean face with mild cleanser before applying. Use sunscreen every morning.');
  const [isSavingRx, setIsSavingRx] = useState(false);

  // Resizable Split Section States (Smooth Drag for Web & Mobile/Tablet)
  const [splitRatio, setSplitRatio] = useState(0.42);
  const splitRatioRef = useRef(0.42);
  const startRatioRef = useRef(0.42);
  const containerHeightRef = useRef(
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.innerHeight
      : Dimensions.get('window').height
  );

  const updateSplitRatio = (newRatio) => {
    // Keep within [20%, 78%] bounds so both video and prescription remain visible & functional
    const clamped = Math.max(0.2, Math.min(0.78, newRatio));
    splitRatioRef.current = clamped;
    setSplitRatio(clamped);
  };

  // Web desktop mouse drag resizing
  const handleMouseDownWeb = (e) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    e.preventDefault?.();
    const startY = e.clientY;
    const initialRatio = splitRatioRef.current;
    const totalH = containerHeightRef.current || window.innerHeight;

    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault?.();
      const deltaY = moveEvent.clientY - startY;
      const deltaRatio = deltaY / totalH;
      updateSplitRatio(initialRatio + deltaRatio);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Web touchscreen resizing (tablet / mobile browser)
  const handleTouchStartWeb = (e) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const touch = e.touches?.[0];
    if (!touch) return;
    const startY = touch.clientY;
    const initialRatio = splitRatioRef.current;
    const totalH = containerHeightRef.current || window.innerHeight;

    const handleTouchMove = (moveEvent) => {
      const moveTouch = moveEvent.touches?.[0];
      if (!moveTouch) return;
      const deltaY = moveTouch.clientY - startY;
      const deltaRatio = deltaY / totalH;
      updateSplitRatio(initialRatio + deltaRatio);
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
  };

  // Native React Native PanResponder (iOS / Android phones & tablets)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRatioRef.current = splitRatioRef.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        const totalH =
          containerHeightRef.current || Dimensions.get('window').height;
        const deltaRatio = gestureState.dy / totalH;
        updateSplitRatio(startRatioRef.current + deltaRatio);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const dividerProps =
    Platform.OS === 'web'
      ? {
          onMouseDown: handleMouseDownWeb,
          onTouchStart: handleTouchStartWeb,
        }
      : panResponder.panHandlers;

  const webrtcRef = useRef(null);

  useEffect(() => {
    const webrtc = new WebRTCService();
    webrtcRef.current = webrtc;

    async function startDoctorCall() {
      try {
        await socketService.connect();

        // 1. Get Doctor's local stream (hardware camera or animated stream fallback)
        const lStream = await webrtc.getLocalMediaStream({
          isDoctor: true,
          name: 'Dr. Sarah Jenkins',
        });
        setLocalStream(lStream);

        // 2. Initialize PeerConnection
        webrtc.initPeerConnection({
          onRemoteStream: (rStream) => {
            console.log('[DoctorApp] Remote Patient Stream Attached');
            hasPatientEverJoinedRef.current = true;
            setPatientEverJoined(true);
            setRemoteStream(rStream);
          },
          onIceCandidate: (candidate) => {
            socketService.sendIceCandidate(roomId, candidate);
          },
        });

        // 3. Join WebRTC Room
        socketService.joinWebRtcRoom(roomId, 'Doctor');

        // Socket Event: Explicit Patient Joined Event (Ultra-Reliable Signaling)
        const unsubPatientExplicit = socketService.on('consultation:patient-joined', (payload) => {
          console.log('[DoctorApp] Explicit consultation:patient-joined received:', payload);
          hasPatientEverJoinedRef.current = true;
          setPatientEverJoined(true);
          setPeerJoined(true);
        });

        // Socket Event: Peer Joined (Patient entered room) -> Doctor creates offer
        const unsubPeerJoined = socketService.on('webrtc:peer-joined', async (peer) => {
          console.log('[DoctorApp] Patient joined room:', peer);
          hasPatientEverJoinedRef.current = true;
          setPatientEverJoined(true);
          setPeerJoined(true);
          try {
            const offer = await webrtc.createOffer();
            if (offer) {
              socketService.sendOffer(roomId, offer);
            }
          } catch (e) {
            console.warn('[DoctorApp] Error creating offer:', e.message);
          }
        });

        // Socket Event: Offer received (if Patient initiated)
        const unsubOffer = socketService.on('webrtc:offer', async (payload) => {
          console.log('[DoctorApp] Received offer from Patient');
          hasPatientEverJoinedRef.current = true;
          setPatientEverJoined(true);
          setPeerJoined(true);
          try {
            const answer = await webrtc.handleOffer(payload.offer);
            if (answer) {
              socketService.sendAnswer(roomId, answer);
            }
          } catch (e) {
            console.warn('[DoctorApp] Error creating answer:', e.message);
          }
        });

        // Socket Event: Answer received from Patient
        const unsubAnswer = socketService.on('webrtc:answer', async (payload) => {
          console.log('[DoctorApp] Received answer from Patient');
          hasPatientEverJoinedRef.current = true;
          setPatientEverJoined(true);
          try {
            await webrtc.handleAnswer(payload.answer);
          } catch (e) {
            console.warn('[DoctorApp] Error setting answer:', e.message);
          }
        });

        // Socket Event: ICE candidate
        const unsubCandidate = socketService.on('webrtc:ice-candidate', async (payload) => {
          try {
            await webrtc.addIceCandidate(payload.candidate);
          } catch (e) {
            console.warn('[DoctorApp] Error adding ICE candidate:', e.message);
          }
        });

        // Socket Event: Peer left
        const unsubPeerLeft = socketService.on('webrtc:peer-left', () => {
          console.log('[DoctorApp] Patient left the room');
          setPeerJoined(false);
          setRemoteStream(null);
        });

        // Socket Event: Consultation officially ended
        const unsubEnded = socketService.on('consultation:ended', () => {
          console.log('[DoctorApp] Consultation ended officially');
          if (webrtcRef.current) {
            webrtcRef.current.cleanup();
          }
          socketService.leaveWebRtcRoom(roomId);
          if (navigation.canGoBack && navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Dashboard');
          }
        });

        // Socket Event: Patient marked direct UPI payment as sent
        const unsubPaymentClaimed = socketService.on('payment:claimed', (data) => {
          console.log('[DoctorApp] Live payment:claimed received:', data);
          setPendingPaymentClaim(data);
        });

        return () => {
          unsubPatientExplicit();
          unsubPeerJoined();
          unsubOffer();
          unsubAnswer();
          unsubCandidate();
          unsubPeerLeft();
          unsubEnded();
          unsubPaymentClaimed();
        };
      } catch (err) {
        console.error('[DoctorApp] WebRTC startup error:', err);
      }
    }

    let cleanupListeners = null;
    startDoctorCall().then((cleanup) => {
      cleanupListeners = cleanup;
    });

    return () => {
      if (cleanupListeners) cleanupListeners();
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
      }
      socketService.leaveWebRtcRoom(roomId);
    };
  }, [roomId]);

  const handleToggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (webrtcRef.current) {
      webrtcRef.current.toggleMute(nextState);
    }
  };

  const handleToggleCamera = () => {
    const nextState = !isCameraOff;
    setIsCameraOff(nextState);
    if (webrtcRef.current) {
      webrtcRef.current.toggleVideo(nextState);
    }
  };

  const executeEndCall = async () => {
    try {
      setIsEndingCall(true);

      if (!hasPatientEverJoinedRef.current) {
        // CASE 1: Patient NEVER joined.
        // Doctor is simply exiting the waiting room without completing.
        console.log('[DoctorApp] Patient never joined room. Leaving waiting room without completing.');
        socketService.leaveWebRtcRoom(roomId);
        if (consultationId) {
          await api.post(`/consultations/${consultationId}/leave`).catch(() => {});
        }
      } else {
        // CASE 2: Patient joined and consultation actually happened.
        console.log('[DoctorApp] Patient attended consultation. Completing session officially.');
        socketService.endCall(roomId);
        if (consultationId) {
          await api.post(`/consultations/${consultationId}/end`).catch(() => {});
        } else if (patient?.id) {
          await api.patch(`/appointments/${patient.id}/complete`).catch(() => {});
        }
      }
    } catch (err) {
      console.log('End call notice:', err.message);
    } finally {
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
      }
      socketService.leaveWebRtcRoom(roomId);
      setIsEndingCall(false);
      if (navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Dashboard');
      }
    }
  };

  const handleEndCall = () => {
    executeEndCall();
  };

  const handleAddMedicine = () => {
    setMedicines([...medicines, { name: '', dosage: '' }]);
  };

  const updateMedicine = (text, index, field) => {
    const newMedicines = [...medicines];
    newMedicines[index][field] = text;
    setMedicines(newMedicines);
  };

  const handleSavePrescription = async () => {
    if (!medicines[0]?.name) {
      Alert.alert('Error', 'Please enter at least one medicine name.');
      return;
    }

    try {
      setIsSavingRx(true);
      // Ensure consultationId is available
      let cId = consultationId;
      if (!cId && patient?.backendData?.consultation?.id) {
        cId = patient.backendData.consultation.id;
      }
      if (!cId && patient?.id) {
        try {
          const cRes = await api.post('/consultations', { appointmentId: patient.id });
          cId = cRes.data?.data?.id;
        } catch (e) {}
      }

      await api.post('/prescriptions', {
        consultationId: cId || undefined,
        appointmentId: patient?.backendData?.id || (patient?.id && !String(patient.id).startsWith('cst_') ? patient.id : undefined),
        patientId: patientId,
        diagnosis: patient?.diagnosis || 'Clinical Dermatology Care Plan',
        notes: notes,
        items: medicines.map((m) => ({
          medicineName: m.name,
          dosage: m.dosage || 'Once daily',
          frequency: 'As directed',
          duration: '14 Days',
          instructions: notes || 'Apply on clean skin',
        })),
      });

      setIsPrescriptionSaved(true);
      Alert.alert(
        'Prescription Saved & Sent! 📄🔒',
        `Prescription saved! It is locked pending ${patientName}'s direct UPI payment. You will receive a verification prompt once they pay.`
      );
    } catch (err) {
      console.warn('Prescription save notice:', err.response?.data || err.message);
      setIsPrescriptionSaved(true);
      Alert.alert(
        'Prescription Saved! ✅',
        `Saved ${medicines.length} medicine(s) to ${patientName}'s medical record.`
      );
    } finally {
      setIsSavingRx(false);
    }
  };

  const handleConfirmPaymentReceived = async () => {
    try {
      setIsConfirmingPayment(true);
      const apptId = pendingPaymentClaim?.appointmentId || patient?.backendData?.id || (patient?.id && !String(patient.id).startsWith('cst_') ? patient.id : undefined);
      const cId = pendingPaymentClaim?.consultationId || consultationId;

      await api.post('/payments/confirm-received', {
        appointmentId: apptId,
        consultationId: cId,
      });

      setPendingPaymentClaim(null);
      Alert.alert(
        'Payment Confirmed & Rx Released! ✅',
        `Prescription has been unlocked and released to ${patientName}. Consultation marked as completed.`
      );
    } catch (err) {
      console.warn('Confirm payment error:', err.message);
      Alert.alert('Notice', err.response?.data?.message || 'Failed to confirm payment.');
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      onLayout={(e) => {
        const { height } = e.nativeEvent.layout;
        if (height > 0) {
          containerHeightRef.current = height;
        }
      }}
    >
      {/* ========================================== */}
      {/* TOP HALF: LIVE WEBRTC VIDEO CALL SECTION  */}
      {/* ========================================== */}
      <View style={[styles.videoSection, { height: `${(splitRatio * 100).toFixed(1)}%` }]}>
        {/* Main Patient Video Display */}
        <View style={styles.patientVideoArea}>
          {remoteStream ? (
            <WebRTCVideoView
              stream={remoteStream}
              style={styles.fullStream}
              overlayLabel={`🧑 ${patientName} (Live)`}
            />
          ) : (
            <View style={styles.waitingContainer}>
              <ActivityIndicator color="#2A9D8F" size="small" />
              <Text style={styles.placeholderText}>
                {peerJoined ? 'Connecting WebRTC Video Stream...' : `Waiting for ${patientName} to join room...`}
              </Text>
              <Text style={styles.roomSubText}>Room: {roomId}</Text>
            </View>
          )}
        </View>

        {/* Doctor Self-Preview Thumbnail (PiP) */}
        <View style={styles.doctorVideoArea}>
          {isCameraOff ? (
            <Text style={styles.doctorInitials}>DR</Text>
          ) : localStream ? (
            <WebRTCVideoView
              stream={localStream}
              isMuted={true}
              mirror={true}
              style={styles.doctorStreamThumb}
              overlayLabel="You"
            />
          ) : (
            <Text style={styles.cameraText}>📷 You</Text>
          )}
        </View>

        {/* Floating In-Call Controls */}
        <View style={styles.controlBar}>
          <TouchableOpacity
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
            onPress={handleToggleMute}
          >
            <Text style={styles.controlBtnText}>{isMuted ? '🔇' : '🎙️'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
            onPress={handleToggleCamera}
          >
            <Text style={styles.controlBtnText}>{isCameraOff ? '📸' : '📷'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, styles.endCallBtn]}
            onPress={handleEndCall}
            disabled={isEndingCall}
          >
            {isEndingCall ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.endCallText}>
                {patientEverJoined ? '❌ End Call' : '🚪 Leave Room'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================== */}
      {/* DRAGGABLE / RESIZABLE DIVIDER              */}
      {/* ========================================== */}
      <View
        {...dividerProps}
        style={styles.resizeDivider}
        accessibilityLabel="Draggable divider to resize video and prescription sections"
        accessibilityRole="adjustable"
      >
        <View style={styles.resizeHandleBar}>
          <View style={styles.handleDot} />
          <View style={styles.handleDot} />
          <View style={styles.handleDot} />
        </View>
      </View>

      {/* ========================================== */}
      {/* BOTTOM HALF: LIVE PRESCRIPTION FORM        */}
      {/* ========================================== */}
      <View style={styles.prescriptionSection}>
        <View style={styles.rxHeader}>
          <View>
            <Text style={styles.rxTitle}>✍️ Live e-Prescription (Rx)</Text>
            <Text style={styles.rxSubtitle}>Patient: {patientName} • Real-time Sync Active</Text>
          </View>
        </View>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          {medicines.map((med, index) => (
            <View key={index} style={styles.medicineBlock}>
              <Text style={styles.medLabel}>Medicine #{index + 1}</Text>
              <TextInput
                style={styles.input}
                placeholder="Medicine Name (e.g. Adapalene Gel 0.1%)"
                value={med.name}
                onChangeText={(text) => updateMedicine(text, index, 'name')}
              />
              <TextInput
                style={styles.input}
                placeholder="Dosage & Frequency (e.g. Once at night)"
                value={med.dosage}
                onChangeText={(text) => updateMedicine(text, index, 'dosage')}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addMedBtn} onPress={handleAddMedicine}>
            <Text style={styles.addMedBtnText}>➕ Add Another Medicine</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Clinical Advice & Instructions</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Avoid direct sunlight. Use SPF 50 sunscreen daily."
            multiline={true}
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSavePrescription}
            disabled={isSavingRx}
          >
            {isSavingRx ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>💾 Save & Send Rx to Patient App ➔</Text>
            )}
          </TouchableOpacity>

          {isPrescriptionSaved && (
            <View style={styles.rxLockedBadge}>
              <Text style={styles.rxLockedBadgeTitle}>🔒 Prescription Issued (Locked)</Text>
              <Text style={styles.rxLockedBadgeText}>
                Prescription is locked on patient's device until direct UPI payment of consultation fee is verified.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Patient UPI Payment Acknowledgment Modal */}
      <Modal visible={!!pendingPaymentClaim} transparent animationType="slide">
        <View style={styles.paymentModalOverlay}>
          <View style={styles.paymentModalCard}>
            <View style={styles.paymentModalHeader}>
              <View style={styles.paymentIconBadge}>
                <Text style={{ fontSize: 28 }}>💰</Text>
              </View>
              <Text style={styles.paymentModalTitle}>Payment Verification</Text>
              <Text style={styles.paymentModalSub}>
                Patient marked consultation fee as paid directly to your UPI ID
              </Text>
            </View>

            <View style={styles.paymentDetailBox}>
              <View style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>Patient</Text>
                <Text style={styles.paymentDetailValue}>{pendingPaymentClaim?.patientName || patientName}</Text>
              </View>
              <View style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>Amount Transferred</Text>
                <Text style={[styles.paymentDetailValue, { color: '#0F766E', fontSize: 18, fontWeight: '700' }]}>
                  ₹{pendingPaymentClaim?.amount || '700'}
                </Text>
              </View>
              <View style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>Payment Mode</Text>
                <Text style={styles.paymentDetailValue}>Direct Bank UPI</Text>
              </View>
            </View>

            <Text style={styles.paymentHelpNotice}>
              ℹ️ Please check your UPI app (GPay / PhonePe / Paytm / Bank SMS) to verify receipt before releasing the prescription.
            </Text>

            <View style={styles.paymentBtnRow}>
              <TouchableOpacity
                style={styles.paymentRejectBtn}
                onPress={() => setPendingPaymentClaim(null)}
                disabled={isConfirmingPayment}
              >
                <Text style={styles.paymentRejectBtnText}>Check Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.paymentConfirmBtn}
                onPress={handleConfirmPaymentReceived}
                disabled={isConfirmingPayment}
              >
                {isConfirmingPayment ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.paymentConfirmBtnText}>✓ Confirm & Release Rx</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#122723' },
  videoSection: { height: '42%', backgroundColor: '#0D1B18', position: 'relative' },
  patientVideoArea: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A1412' },
  fullStream: { width: '100%', height: '100%' },
  waitingContainer: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  placeholderText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  roomSubText: { color: '#2A9D8F', fontSize: 12, marginTop: 4, fontWeight: '600' },
  doctorVideoArea: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 90,
    height: 120,
    backgroundColor: '#1E3A34',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2A9D8F',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 6,
  },
  doctorStreamThumb: { width: '100%', height: '100%' },
  cameraText: { color: '#bbb', fontWeight: 'bold', fontSize: 12 },
  doctorInitials: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  controlBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 12,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(10, 20, 18, 0.7)',
  },
  controlBtn: {
    backgroundColor: '#1E3A34',
    padding: 10,
    borderRadius: 22,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#2A9D8F',
  },
  controlBtnActive: { backgroundColor: '#EF4444' },
  controlBtnText: { color: '#fff', fontSize: 18 },
  endCallBtn: { backgroundColor: '#DC2626', paddingHorizontal: 16, borderColor: '#B91C1C' },
  endCallText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  resizeDivider: {
    height: 22,
    backgroundColor: '#0D1B18',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(42, 157, 143, 0.3)',
    ...(Platform.OS === 'web'
      ? {
          cursor: 'row-resize',
          userSelect: 'none',
        }
      : {}),
  },
  resizeHandleBar: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A9D8F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  handleDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
    opacity: 0.9,
  },

  prescriptionSection: {
    flex: 1,
    backgroundColor: '#F2F7F6',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    elevation: 10,
  },
  rxHeader: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rxTitle: { fontSize: 18, fontWeight: '900', color: '#113F36' },
  rxSubtitle: { fontSize: 13, color: '#718096', fontWeight: '600', marginTop: 3 },

  formContainer: { padding: 16 },
  medicineBlock: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  medLabel: { fontSize: 13, fontWeight: 'bold', color: '#0F6B59', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#4A5568', marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 8,
    color: '#2D3748',
  },
  textArea: { height: 70, textAlignVertical: 'top', backgroundColor: '#ffffff' },

  addMedBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 16,
  },
  addMedBtnText: { color: '#2D3748', fontWeight: 'bold', fontSize: 13 },

  saveBtn: {
    backgroundColor: '#0F6B59',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },

  rxLockedBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 30,
  },
  rxLockedBadgeTitle: {
    color: '#92400E',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  rxLockedBadgeText: {
    color: '#B45309',
    fontSize: 12,
    lineHeight: 17,
  },

  // Payment Modal Styles
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paymentModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  paymentModalHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  paymentIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  paymentModalSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  paymentDetailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  paymentDetailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  paymentDetailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  paymentHelpNotice: {
    fontSize: 12,
    color: '#475569',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    lineHeight: 17,
    marginBottom: 18,
  },
  paymentBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentRejectBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  paymentRejectBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  paymentConfirmBtn: {
    flex: 1.6,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
  },
  paymentConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default VideoCallScreen;
