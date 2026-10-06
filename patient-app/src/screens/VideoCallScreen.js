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

  // WebRTC Streams
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnectingPeer, setIsConnectingPeer] = useState(true);
  const [peerJoined, setPeerJoined] = useState(false);

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
            setRemoteStream(rStream);
            setIsConnectingPeer(false);
          },
          onIceCandidate: (candidate) => {
            socketService.sendIceCandidate(roomId, candidate);
          },
        });

        // Join WebRTC consultation room
        socketService.joinWebRtcRoom(roomId, 'Patient');

        // Socket Event: Peer Joined (Doctor joined room)
        const unsubPeerJoined = socketService.on('webrtc:peer-joined', async (peer) => {
          console.log('[PatientApp] Peer joined room:', peer);
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

        return () => {
          unsubPeerJoined();
          unsubOffer();
          unsubAnswer();
          unsubCandidate();
          unsubPeerLeft();
          unsubEnded();
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

  if (callEnded) {
    return (
      <SafeAreaView style={styles.safeEnded}>
        <View style={styles.endedCard}>
          <View style={styles.endedIconBox}>
            <Text style={{ fontSize: 36 }}>🩺</Text>
          </View>
          <Text style={styles.endedTitle}>Consultation Completed</Text>
          <Text style={styles.endedSub}>
            Your consultation with {doctorName} has concluded. Call duration:{' '}
            {formatDuration(callDuration)}.
          </Text>

          <View style={styles.endedRxCard}>
            <Text style={styles.endedRxTitle}>Digital Prescription Issued</Text>
            <Text style={styles.endedRxSub}>
              {doctorName} has finalized your treatment plan and e-Prescription.
            </Text>
            <TouchableOpacity
              style={styles.viewRxBtn}
              onPress={() => navigation.navigate('Prescription', { appointment })}
            >
              <Text style={styles.viewRxBtnText}>View Digital Prescription ➔</Text>
            </TouchableOpacity>
          </View>

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
          <Text style={styles.endCallIcon}>📞</Text>
          <Text style={styles.endCallText}>End</Text>
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
    backgroundColor: Colors.background,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  endedCard: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  endedIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  endedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 8,
  },
  endedSub: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  endedRxCard: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  endedRxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 4,
  },
  endedRxSub: {
    fontSize: 12,
    color: '#15803D',
    lineHeight: 18,
    marginBottom: 12,
  },
  viewRxBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewRxBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  backHomeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
  },
  backHomeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
