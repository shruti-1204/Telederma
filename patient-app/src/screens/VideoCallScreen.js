import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Linking,
  ScrollView,
  Modal,
} from 'react-native';
import { Colors } from '../theme/colors';
import { socketService } from '../services/socketService';
import { WebRTCService } from '../services/webrtcService';
import WebRTCVideoView from '../components/WebRTCVideoView';
import api from '../services/api';

export default function VideoCallScreen({ navigation, route }) {
  const appointment = route?.params?.appointment;
  const doctorName = appointment?.doctorName || 'Dr. Sarah Jenkins';
  const doctorSpec = appointment?.doctorSpecialization || 'Clinical Dermatology';
  const roomId = appointment?.id ? `room_${appointment.id}` : 'td-room-live';
  const consultationId = appointment?.consultationId || appointment?.id;

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callEnded, setCallEnded] = useState(false);

  // Direct UPI Payment & Prescription Unlock States
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loadingPaymentDetails, setLoadingPaymentDetails] = useState(false);
  const [isPaymentClaimed, setIsPaymentClaimed] = useState(false);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [isRxUnlocked, setIsRxUnlocked] = useState(false);
  const [unlockedRx, setUnlockedRx] = useState(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // WebRTC Streams
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnectingPeer, setIsConnectingPeer] = useState(true);
  const [peerJoined, setPeerJoined] = useState(false);
  const [doctorEverJoined, setDoctorEverJoined] = useState(false);
  const hasDoctorEverJoinedRef = useRef(false);

  const webrtcRef = useRef(null);

  useEffect(() => {
    // 1. Duration Counter
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // 2. Initialize WebRTC
    const webrtc = new WebRTCService();
    webrtcRef.current = webrtc;

    async function startCall() {
      try {
        // Connect to WebSocket gateway
        await socketService.connect();

        // Get local audio & video stream
        const lStream = await webrtc.getLocalMediaStream({
          isDoctor: false,
          name: 'Patient (You)',
        });
        setLocalStream(lStream);

        // Initialize PeerConnection
        webrtc.initPeerConnection({
          onRemoteStream: (rStream) => {
            console.log('[PatientApp] Remote Doctor Stream Attached');
            hasDoctorEverJoinedRef.current = true;
            setDoctorEverJoined(true);
            setRemoteStream(rStream);
            setIsConnectingPeer(false);
          },
          onIceCandidate: (candidate) => {
            socketService.sendIceCandidate(roomId, candidate);
          },
        });

        // Join WebRTC consultation room
        socketService.joinWebRtcRoom(roomId, 'Patient');

        // Explicit Patient-Joined Notification (Direct Server & Doctor Signaling)
        socketService.send('consultation:patient-joined', {
          roomId,
          consultationId,
        });

        // Socket Event: Peer Joined (Doctor joined room)
        const unsubPeerJoined = socketService.on('webrtc:peer-joined', async (peer) => {
          console.log('[PatientApp] Peer joined room:', peer);
          hasDoctorEverJoinedRef.current = true;
          setDoctorEverJoined(true);
          setPeerJoined(true);
          try {
            const offer = await webrtc.createOffer();
            if (offer) {
              socketService.sendOffer(roomId, offer);
            }
          } catch (e) {
            console.warn('[PatientApp] Error creating offer:', e.message);
          }
        });

        // Socket Event: Offer received from Doctor
        const unsubOffer = socketService.on('webrtc:offer', async (payload) => {
          console.log('[PatientApp] Received WebRTC offer from doctor');
          hasDoctorEverJoinedRef.current = true;
          setDoctorEverJoined(true);
          setPeerJoined(true);
          try {
            const answer = await webrtc.handleOffer(payload.offer);
            if (answer) {
              socketService.sendAnswer(roomId, answer);
            }
          } catch (e) {
            console.warn('[PatientApp] Error handling offer:', e.message);
          }
        });

        // Socket Event: Answer received
        const unsubAnswer = socketService.on('webrtc:answer', async (payload) => {
          console.log('[PatientApp] Received WebRTC answer');
          hasDoctorEverJoinedRef.current = true;
          setDoctorEverJoined(true);
          try {
            await webrtc.handleAnswer(payload.answer);
          } catch (e) {
            console.warn('[PatientApp] Error handling answer:', e.message);
          }
        });

        // Socket Event: ICE candidate received
        const unsubCandidate = socketService.on('webrtc:ice-candidate', async (payload) => {
          try {
            await webrtc.addIceCandidate(payload.candidate);
          } catch (e) {
            console.warn('[PatientApp] Error adding candidate:', e.message);
          }
        });

        // Socket Event: Peer left call
        const unsubPeerLeft = socketService.on('webrtc:peer-left', () => {
          console.log('[PatientApp] Doctor left the consultation room');
          setPeerJoined(false);
          setRemoteStream(null);
        });

        // Socket Event: Consultation officially ended by Doctor
        const unsubEnded = socketService.on('consultation:ended', () => {
          console.log('[PatientApp] Consultation officially ended by Doctor');
          setCallEnded(true);
        });

        // Socket Event: Prescription locked awaiting payment
        const unsubRxLocked = socketService.on('prescription:locked', (rx) => {
          console.log('[PatientApp] Live prescription:locked received:', rx);
          setCallEnded(true);
        });

        // Socket Event: Doctor confirmed payment
        const unsubPaymentConfirmed = socketService.on('payment:confirmed', (data) => {
          console.log('[PatientApp] Live payment:confirmed received:', data);
          setIsRxUnlocked(true);
          setIsPaymentClaimed(false);
        });

        // Socket Event: Prescription officially unlocked
        const unsubRxUnlocked = socketService.on('prescription:unlocked', (rx) => {
          console.log('[PatientApp] Live prescription:unlocked received:', rx);
          setIsRxUnlocked(true);
          setUnlockedRx(rx);
          setIsPaymentClaimed(false);
        });

        return () => {
          unsubPeerJoined();
          unsubOffer();
          unsubAnswer();
          unsubCandidate();
          unsubPeerLeft();
          unsubEnded();
          unsubRxLocked();
          unsubPaymentConfirmed();
          unsubRxUnlocked();
        };
      } catch (err) {
        console.error('[PatientApp] WebRTC startup error:', err);
      }
    }

    let cleanupListeners = null;
    startCall().then((cleanup) => {
      cleanupListeners = cleanup;
    });

    return () => {
      clearInterval(timer);
      if (cleanupListeners) cleanupListeners();
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
      }
      socketService.leaveWebRtcRoom(roomId);
    };
  }, [roomId]);

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const handleToggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (webrtcRef.current) {
      webrtcRef.current.toggleMute(nextState);
    }
  };

  const handleToggleVideo = () => {
    const nextState = !isVideoOff;
    setIsVideoOff(nextState);
    if (webrtcRef.current) {
      webrtcRef.current.toggleVideo(nextState);
    }
  };

  const executeEndCall = async () => {
    try {
      if (!hasDoctorEverJoinedRef.current) {
        // Patient is leaving waiting room without doctor having joined
        console.log('[PatientApp] Doctor never joined room. Leaving waiting room without completing.');
        socketService.leaveWebRtcRoom(roomId);
        if (consultationId) {
          await api.post(`/consultations/${consultationId}/leave`).catch(() => {});
        }
        if (webrtcRef.current) {
          webrtcRef.current.cleanup();
        }
        if (navigation.canGoBack && navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Dashboard');
        }
        return;
      }

      // Doctor was present: complete consultation officially
      socketService.endCall(roomId);
      if (consultationId) {
        await api.post(`/consultations/${consultationId}/end`).catch(() => {});
      }
    } catch (e) {
      console.log('Patient end call notice:', e.message);
    } finally {
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
      }
      socketService.leaveWebRtcRoom(roomId);
      setCallEnded(true);
    }
  };

  const handleEndCall = () => {
    executeEndCall();
  };

  useEffect(() => {
    if (callEnded) {
      fetchPaymentDetails();
    }
  }, [callEnded]);

  const fetchPaymentDetails = async () => {
    try {
      setLoadingPaymentDetails(true);
      const targetId = appointment?.id || consultationId;
      if (!targetId) return;
      const res = await api.get(`/payments/doctor-upi/${targetId}`);
      if (res.data?.data) {
        setPaymentDetails(res.data.data);
        if (res.data.data.isUnlocked) {
          setIsRxUnlocked(true);
        }
      }
    } catch (err) {
      console.warn('Failed to load doctor payment details:', err.message);
    } finally {
      setLoadingPaymentDetails(false);
    }
  };

  const handleCopyUpi = () => {
    const upi = paymentDetails?.upiId || 'dr.kundan@upi';
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(upi);
    }
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleOpenUpiApp = async () => {
    const upiUrl = paymentDetails?.upiPayString;
    if (!upiUrl) return;
    try {
      await Linking.openURL(upiUrl);
    } catch (err) {
      Alert.alert(
        'Open UPI App',
        `Please open Google Pay, PhonePe, or Paytm and transfer ₹${paymentDetails?.consultationFee || 700} to ${paymentDetails?.upiId || 'doctor@upi'}.`
      );
    }
  };

  const handleClaimPayment = async () => {
    try {
      setIsSubmittingClaim(true);
      const apptId = appointment?.id || paymentDetails?.appointmentId;
      const cId = consultationId || paymentDetails?.consultationId;

      await api.post('/payments/claim-paid', {
        appointmentId: apptId,
        consultationId: cId,
        amount: paymentDetails?.consultationFee || 700,
      });

      setIsPaymentClaimed(true);
      Alert.alert(
        'Payment Notification Sent! 🔔',
        `Dr. ${paymentDetails?.doctorName || doctorName} has been notified in real time. Once they verify receipt, your prescription will unlock automatically.`
      );
    } catch (err) {
      Alert.alert('Notice', err.response?.data?.message || 'Failed to notify doctor.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  if (callEnded) {
    const docName = paymentDetails?.doctorName || doctorName;
    const fee = paymentDetails?.consultationFee ?? (appointment?.consultationFee || 700);
    const upi = paymentDetails?.upiId || 'dr.kundan@upi';
    const upiString = paymentDetails?.upiPayString || `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(docName)}&am=${fee.toFixed(2)}&cu=INR&tn=TeleDerma%20Consultation%20Fee`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;

    return (
      <SafeAreaView style={styles.safeEnded}>
        <ScrollView contentContainerStyle={styles.endedScrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Banner */}
          <View style={styles.endedIconBox}>
            <Text style={{ fontSize: 36 }}>🩺</Text>
          </View>
          <Text style={styles.endedTitle}>Consultation Concluded</Text>
          <Text style={styles.endedSub}>
            Your video call with {docName} has completed. Call duration: {formatDuration(callDuration)}.
          </Text>

          {loadingPaymentDetails ? (
            <View style={styles.loadingPaymentBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingPaymentText}>Loading secure doctor payment information...</Text>
            </View>
          ) : isRxUnlocked ? (
            /* =================================== */
            /* UNLOCKED PRESCRIPTION CELEBRATION   */
            /* =================================== */
            <View style={styles.unlockedBox}>
              <View style={styles.unlockedBadge}>
                <Text style={{ fontSize: 36 }}>🎉</Text>
              </View>
              <Text style={styles.unlockedTitle}>Payment Confirmed & Prescription Unlocked!</Text>
              <Text style={styles.unlockedSub}>
                {docName} has verified your direct UPI payment of ₹{fee}. Your digital prescription has been released and permanently saved to your Medical Records.
              </Text>

              <TouchableOpacity
                style={styles.viewRxBtnLarge}
                onPress={() =>
                  navigation.navigate('Prescription', {
                    appointment,
                    prescription: unlockedRx || appointment?.consultation?.prescription || appointment?.prescription,
                    isPaid: true,
                  })
                }
              >
                <Text style={styles.viewRxBtnLargeText}>📄 View Full Digital Prescription ➔</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backHomeBtn}
                onPress={() => {
                  if (navigation.canGoBack && navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('Dashboard');
                  }
                }}
              >
                <Text style={styles.backHomeBtnText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* =================================== */
            /* DIRECT PEER-TO-PEER UPI PAYMENT TAB */
            /* =================================== */
            <View style={styles.paymentCard}>
              <View style={styles.paymentCardHeader}>
                <View style={styles.securityTag}>
                  <Text style={styles.securityTagText}>🔒 Direct UPI • 0% Middleman Fee</Text>
                </View>
                <Text style={styles.paymentCardTitle}>Doctor Consultation Payment</Text>
                <Text style={styles.paymentCardSub}>
                  Pay doctor directly via UPI to unlock and download your e-Prescription.
                </Text>
              </View>

              {/* Doctor Name & Consultation Fee */}
              <View style={styles.paymentMetaBox}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>👨‍⚕️ Doctor Name</Text>
                  <Text style={styles.metaValue}>{docName}</Text>
                </View>
                <View style={[styles.metaRow, styles.metaRowFee]}>
                  <Text style={styles.metaLabel}>💵 Consultation Fee</Text>
                  <Text style={styles.feeHighlight}>₹{fee}</Text>
                </View>
              </View>

              {/* Doctor's UPI ID with Copy Button */}
              <View style={styles.upiIdCard}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.upiLabel}>🆔 Doctor's UPI ID (Encrypted in DB)</Text>
                  <Text style={styles.upiValue}>{upi}</Text>
                </View>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyUpi} activeOpacity={0.7}>
                  <Text style={styles.copyBtnText}>{copiedUpi ? '✓ Copied!' : '📋 Copy'}</Text>
                </TouchableOpacity>
              </View>

              {/* Auto-Generated UPI QR Code */}
              <View style={styles.qrContainer}>
                <Text style={styles.qrHeaderTitle}>📲 Auto-Generated UPI QR Code</Text>
                <Text style={styles.qrHeaderSub}>Scan with any UPI app (GPay, PhonePe, Paytm, BHIM)</Text>
                <View style={styles.qrImageFrame}>
                  <Image
                    source={{ uri: qrUrl }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.qrAmountNote}>Pre-configured for ₹{fee} directly to {docName}</Text>
              </View>

              {/* Action 1: Open GPay / PhonePe UPI Intent Button */}
              <TouchableOpacity
                style={styles.openUpiBtn}
                onPress={handleOpenUpiApp}
                activeOpacity={0.8}
              >
                <Text style={styles.openUpiBtnText}>🚀 Open GPay / PhonePe / UPI App</Text>
              </TouchableOpacity>

              {/* Action 2: I Have Paid Button or Live Waiting Status */}
              {isPaymentClaimed ? (
                <View style={styles.waitingClaimBox}>
                  <ActivityIndicator size="small" color="#0F766E" style={{ marginBottom: 6 }} />
                  <Text style={styles.waitingClaimTitle}>Payment Marked as Sent! ⏳</Text>
                  <Text style={styles.waitingClaimText}>
                    {docName} has been prompted to verify receipt in real time. Your e-prescription will unlock automatically once confirmed.
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.claimPaidBtn}
                  onPress={handleClaimPayment}
                  disabled={isSubmittingClaim}
                  activeOpacity={0.8}
                >
                  {isSubmittingClaim ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.claimPaidBtnText}>✅ I Have Completed Payment (₹{fee})</Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Back to Dashboard Link */}
              <TouchableOpacity
                style={styles.secondaryBackBtn}
                onPress={() => {
                  if (navigation.canGoBack && navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('Dashboard');
                  }
                }}
              >
                <Text style={styles.secondaryBackBtnText}>Pay Later & Return to Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (navigation.canGoBack && navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Dashboard');
            }
          }}
        >
          <Text style={styles.backBtnText}>✕ Exit Room</Text>
        </TouchableOpacity>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE • {formatDuration(callDuration)}</Text>
        </View>
        <View style={styles.roomTag}>
          <Text style={styles.roomTagText}>🔒 WebRTC Encrypted</Text>
        </View>
      </View>

      {/* Main Remote Video Stream (Doctor) */}
      <View style={styles.mainVideoArea}>
        {remoteStream ? (
          <WebRTCVideoView
            stream={remoteStream}
            style={styles.fullVideo}
            overlayLabel={`👨‍⚕️ ${doctorName} (Live)`}
          />
        ) : (
          <View style={styles.doctorVideoFrame}>
            <View style={styles.doctorAvatarCircle}>
              <Text style={styles.doctorAvatarInitials}>
                {doctorName.replace('Dr. ', '').split(' ').map((w) => w[0]).join('')}
              </Text>
            </View>
            <Text style={styles.doctorStreamName}>{doctorName}</Text>
            <Text style={styles.doctorStreamSpec}>{doctorSpec}</Text>
            <View style={styles.audioWaveBox}>
              <ActivityIndicator size="small" color="#2A9D8F" style={{ marginRight: 6 }} />
              <Text style={styles.audioWaveText}>
                {peerJoined ? 'Connecting WebRTC Video Stream...' : 'Waiting for Doctor to join room...'}
              </Text>
            </View>
          </View>
        )}

        {/* Patient Picture-in-Picture (PiP) Local Stream */}
        <View style={styles.pipContainer}>
          {isVideoOff ? (
            <View style={styles.pipVideoOff}>
              <Text style={styles.pipVideoOffText}>Camera Off</Text>
            </View>
          ) : localStream ? (
            <WebRTCVideoView
              stream={localStream}
              isMuted={true}
              mirror={true}
              style={styles.pipVideoOn}
              overlayLabel="You"
            />
          ) : (
            <View style={styles.pipVideoOn}>
              <Text style={styles.pipAvatarText}>You</Text>
              <Text style={styles.pipSubText}>Connecting...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bottom Floating Control Bar */}
      <View style={styles.controlsBar}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={handleToggleMute}
        >
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
          <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]}
          onPress={handleToggleVideo}
        >
          <Text style={styles.controlIcon}>{isVideoOff ? '🚫' : '📷'}</Text>
          <Text style={styles.controlLabel}>{isVideoOff ? 'Start Video' : 'Stop Video'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, !isSpeakerOn && styles.controlBtnActive]}
          onPress={() => setIsSpeakerOn(!isSpeakerOn)}
        >
          <Text style={styles.controlIcon}>{isSpeakerOn ? '🔊' : '🔈'}</Text>
          <Text style={styles.controlLabel}>{isSpeakerOn ? 'Speaker' : 'Earpiece'}</Text>
        </TouchableOpacity>

        {/* End Call Button */}
        <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
          <Text style={styles.endCallIcon}>{doctorEverJoined ? '📞' : '🚪'}</Text>
          <Text style={styles.endCallText}>{doctorEverJoined ? 'End' : 'Leave'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A1412',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(10, 20, 18, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#1A2E2B',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1A2E2B',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#122723',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  roomTag: {
    backgroundColor: '#1A2E2B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roomTagText: {
    color: '#2A9D8F',
    fontSize: 11,
    fontWeight: '700',
  },
  mainVideoArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0D1B18',
  },
  fullVideo: {
    width: '100%',
    height: '100%',
  },
  doctorVideoFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  doctorAvatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#0B6E69',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#2A9D8F',
  },
  doctorAvatarInitials: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  doctorStreamName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  doctorStreamSpec: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  audioWaveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 157, 143, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(42, 157, 143, 0.3)',
  },
  audioWaveText: {
    fontSize: 13,
    color: '#2A9D8F',
    fontWeight: '600',
  },
  pipContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2A9D8F',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  pipVideoOn: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E3A34',
  },
  pipVideoOff: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2D3748',
  },
  pipVideoOffText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  pipAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pipSubText: {
    color: '#2A9D8F',
    fontSize: 10,
    marginTop: 2,
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: '#0F2622',
    borderTopWidth: 1,
    borderTopColor: '#1A3832',
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  controlBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  controlIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  controlLabel: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  endCallBtn: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  endCallIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  endCallText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  safeEnded: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  endedScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 50,
    alignItems: 'center',
  },
  endedIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F4F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  endedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  endedSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  loadingPaymentBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingPaymentText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },

  // Direct UPI Payment Card
  paymentCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  paymentCardHeader: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  securityTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 8,
  },
  securityTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  paymentCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  paymentCardSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  paymentMetaBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metaRowFee: {
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    marginTop: 6,
    paddingTop: 8,
  },
  metaLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  feeHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F766E',
  },
  upiIdCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  upiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F766E',
    marginBottom: 2,
  },
  upiValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#134E4A',
  },
  copyBtn: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  qrHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  qrHeaderSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
  },
  qrImageFrame: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 8,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrAmountNote: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
    marginTop: 4,
  },
  openUpiBtn: {
    width: '100%',
    backgroundColor: '#0F766E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  openUpiBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  waitingClaimBox: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  waitingClaimTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 4,
  },
  waitingClaimText: {
    fontSize: 12,
    color: '#3B82F6',
    textAlign: 'center',
    lineHeight: 16,
  },
  claimPaidBtn: {
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  claimPaidBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBackBtn: {
    paddingVertical: 10,
  },
  secondaryBackBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  // Unlocked celebration
  unlockedBox: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  unlockedBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  unlockedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#166534',
    textAlign: 'center',
    marginBottom: 8,
  },
  unlockedSub: {
    fontSize: 13,
    color: '#15803D',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  viewRxBtnLarge: {
    width: '100%',
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  viewRxBtnLargeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  backHomeBtn: {
    backgroundColor: '#0F766E',
    paddingVertical: 14,
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
  },
  backHomeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
