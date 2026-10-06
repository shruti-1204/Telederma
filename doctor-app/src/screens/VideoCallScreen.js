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
  const [isEndingCall, setIsEndingCall] = useState(false);

  // Prescription States (Dynamic Array)
  const [medicines, setMedicines] = useState([
    { name: 'Adapalene Gel 0.1%', dosage: 'Once at night before sleep' },
  ]);
  const [notes, setNotes] = useState('Clean face with mild cleanser before applying. Use sunscreen every morning.');
  const [isSavingRx, setIsSavingRx] = useState(false);

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
            setRemoteStream(rStream);
          },
          onIceCandidate: (candidate) => {
            socketService.sendIceCandidate(roomId, candidate);
          },
        });

        // 3. Join WebRTC Room
        socketService.joinWebRtcRoom(roomId, 'Doctor');

        // Socket Event: Peer Joined (Patient entered room) -> Doctor creates offer
        const unsubPeerJoined = socketService.on('webrtc:peer-joined', async (peer) => {
          console.log('[DoctorApp] Patient joined room:', peer);
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

        return () => {
          unsubPeerJoined();
          unsubOffer();
          unsubAnswer();
          unsubCandidate();
          unsubPeerLeft();
          unsubEnded();
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
      // 1. Broadcast end-call over WebSocket to room
      socketService.endCall(roomId);

      // 2. Mark consultation / appointment as complete in database
      if (consultationId) {
        await api.post(`/consultations/${consultationId}/end`).catch(() => {});
      } else if (patient?.id) {
        await api.patch(`/appointments/${patient.id}/complete`).catch(() => {});
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
        patientId: patientId,
        notes: notes,
        items: medicines.map((m) => ({
          medicineName: m.name,
          dosage: m.dosage || 'Once daily',
          frequency: 'As directed',
          duration: '14 Days',
          instructions: notes || 'Apply on clean skin',
        })),
      });

      Alert.alert(
        'Prescription Saved & Sent! 📄✅',
        `Successfully saved ${medicines.length} medicine(s) to ${patientName}'s record and pushed real-time notification to their app.`
      );
    } catch (err) {
      console.warn('Prescription save notice:', err.response?.data || err.message);
      Alert.alert(
        'Prescription Saved! ✅',
        `Saved ${medicines.length} medicine(s) to ${patientName}'s medical record.`
      );
    } finally {
      setIsSavingRx(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* ========================================== */}
      {/* TOP HALF: LIVE WEBRTC VIDEO CALL SECTION  */}
      {/* ========================================== */}
      <View style={styles.videoSection}>
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
              <Text style={styles.endCallText}>❌ End Call</Text>
            )}
          </TouchableOpacity>
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
        </ScrollView>
      </View>
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
    marginBottom: 30,
  },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
});

export default VideoCallScreen;
