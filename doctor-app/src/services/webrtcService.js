/**
 * TeleDerma WebRTC Service (Doctor App)
 * True cross-platform WebRTC service for native mobile (react-native-webrtc)
 * and web (browser WebRTC APIs). Uses WebSockets strictly for signaling.
 */
import { Platform } from 'react-native';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  isNativeSupported,
} from './webrtcAdapter';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.animationFrameId = null;
    this.audioContext = null;
    this.isRemoteDescriptionSet = false;
    this.pendingIceCandidates = [];
  }

  /**
   * Acquire local camera/microphone media stream.
   * On Native Mobile: Uses react-native-webrtc mediaDevices.getUserMedia.
   * On Web: Uses browser navigator.mediaDevices with animated canvas stream fallback.
   */
  async getLocalMediaStream({ isDoctor = true, name = 'Dr. Sarah Jenkins' } = {}) {
    // ----------------------------------------------------
    // 1. Native Mobile (Android / iOS via react-native-webrtc)
    // ----------------------------------------------------
    if (Platform.OS !== 'web') {
      if (mediaDevices && typeof mediaDevices.getUserMedia === 'function') {
        try {
          console.log('[Doctor WebRTC] Requesting native camera & microphone permissions...');
          const stream = await mediaDevices.getUserMedia({
            audio: true,
            video: {
              facingMode: 'user',
              frameRate: 30,
            },
          });
          console.log('[Doctor WebRTC] Native camera and microphone acquired successfully');
          this.localStream = stream;
          return stream;
        } catch (err) {
          console.log('[Doctor WebRTC] Native camera notice:', err.message);
          return null;
        }
      } else {
        console.log(
          '[Doctor WebRTC] Native mediaDevices.getUserMedia unavailable in Expo Go (Expo Dev Build required for physical camera hardware)'
        );
        return null;
      }
    }

    // ----------------------------------------------------
    // 2. Web (Browser WebRTC)
    // ----------------------------------------------------
    let realAudioTrack = null;
    if (mediaDevices && typeof mediaDevices.getUserMedia === 'function') {
      try {
        const stream = await mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        console.log('[Doctor WebRTC] Acquired browser camera and microphone');
        this.localStream = stream;
        return stream;
      } catch (err) {
        console.log('[Doctor WebRTC] Camera unavailable, attempting audio-only capture:', err.message);
        try {
          const aStream = await mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          realAudioTrack = aStream.getAudioTracks()[0];
          console.log('[Doctor WebRTC] Real microphone captured successfully for fallback stream');
        } catch (aErr) {
          console.log('[Doctor WebRTC] Real audio capture notice:', aErr.message);
        }
      }
    }

    // High-fidelity animated canvas stream fallback for Web when camera is unattached or permission denied
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');

        let tick = 0;
        const roleColor = isDoctor ? '#0F6B59' : '#2A9D8F';

        const drawFrame = () => {
          tick++;
          const bgGrad = ctx.createLinearGradient(0, 0, 640, 480);
          bgGrad.addColorStop(0, '#0F2622');
          bgGrad.addColorStop(1, '#081412');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, 640, 480);

          ctx.strokeStyle = 'rgba(15, 107, 89, 0.15)';
          ctx.lineWidth = 1;
          for (let x = 0; x < 640; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 480);
            ctx.stroke();
          }
          for (let y = 0; y < 480; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(640, y);
            ctx.stroke();
          }

          const pulse = Math.sin(tick * 0.05) * 8;
          ctx.beginPath();
          ctx.arc(320, 200, 78 + pulse, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(15, 107, 89, 0.35)';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(320, 200, 68, 0, Math.PI * 2);
          ctx.fillStyle = roleColor;
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 36px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const initials = name
            .replace('Dr. ', '')
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'DR';
          ctx.fillText(initials, 320, 200);

          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(name.startsWith('Dr.') ? name : `Dr. ${name}`, 320, 305);

          ctx.font = '14px sans-serif';
          ctx.fillStyle = '#A0AEC0';
          ctx.fillText('Board Certified Dermatologist • AIIMS / MCI Verified', 320, 332);

          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(210, 360, 220, 32, 16) : ctx.rect(210, 360, 220, 32);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(230, 376, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#10B981';
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`HD 720p • DOCTOR STREAM`, 245, 380);

          ctx.fillStyle = '#10B981';
          for (let i = 0; i < 20; i++) {
            const barHeight = Math.abs(Math.sin((tick + i * 4) * 0.12)) * 24 + 4;
            ctx.fillRect(230 + i * 9, 435 - barHeight, 6, barHeight);
          }

          this.animationFrameId = requestAnimationFrame(drawFrame);
        };

        drawFrame();

        const canvasStream = canvas.captureStream(30);

        if (realAudioTrack) {
          canvasStream.addTrack(realAudioTrack);
        } else {
          try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
              this.audioContext = new AudioCtx();
              const osc = this.audioContext.createOscillator();
              const gain = this.audioContext.createGain();
              const dest = this.audioContext.createMediaStreamDestination();
              gain.gain.value = 0.00001;
              osc.connect(gain);
              gain.connect(dest);
              osc.start();
              const audioTrack = dest.stream.getAudioTracks()[0];
              if (audioTrack) {
                canvasStream.addTrack(audioTrack);
              }
            }
          } catch (e) {
            console.warn('[Doctor WebRTC] Synthetic audio track error:', e.message);
          }
        }

        this.localStream = canvasStream;
        return canvasStream;
      } catch (e) {
        console.error('[Doctor WebRTC] Canvas stream generation error:', e);
      }
    }

    return null;
  }

  /**
   * Initialize RTCPeerConnection with STUN servers and event callbacks
   */
  initPeerConnection({ onRemoteStream, onIceCandidate }) {
    if (!RTCPeerConnection) {
      console.log('[Doctor WebRTC] RTCPeerConnection not supported in this runtime (Expo Dev Build required on mobile)');
      return null;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peerConnection = pc;
    this.isRemoteDescriptionSet = false;
    this.pendingIceCandidates = [];

    // Attach local stream tracks to PeerConnection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, this.localStream);
        } catch (e) {
          if (typeof pc.addStream === 'function') {
            pc.addStream(this.localStream);
          }
        }
      });
    }

    // Remote Track Handler
    pc.ontrack = (event) => {
      console.log('[Doctor WebRTC] Remote stream track received:', event.track?.kind);
      let streamToEmit = null;
      if (event.streams && event.streams[0]) {
        streamToEmit = event.streams[0];
      } else {
        if (!this.remoteStream) {
          const StreamCls = typeof window !== 'undefined' && window.MediaStream ? window.MediaStream : null;
          this.remoteStream = StreamCls ? new StreamCls() : null;
        }
        if (this.remoteStream && typeof this.remoteStream.addTrack === 'function') {
          const existing = this.remoteStream.getTracks ? this.remoteStream.getTracks().find((t) => t.id === event.track?.id) : null;
          if (!existing) {
            this.remoteStream.addTrack(event.track);
          }
        }
        streamToEmit = this.remoteStream;
      }

      this.remoteStream = streamToEmit;

      if (onRemoteStream && streamToEmit) {
        try {
          // Provide fresh MediaStream reference so React state triggers video re-render
          const StreamCls = typeof window !== 'undefined' && window.MediaStream ? window.MediaStream : null;
          const tracks = streamToEmit.getTracks ? streamToEmit.getTracks() : [];
          const refreshed = StreamCls ? new StreamCls(tracks) : streamToEmit;
          onRemoteStream(refreshed);
        } catch (e) {
          onRemoteStream(streamToEmit);
        }
      }
    };

    // Backwards compatibility for onaddstream
    pc.onaddstream = (event) => {
      console.log('[Doctor WebRTC] Remote stream received via onaddstream');
      if (event.stream) {
        this.remoteStream = event.stream;
        if (onRemoteStream) {
          try {
            const StreamCls = typeof window !== 'undefined' && window.MediaStream ? window.MediaStream : null;
            const tracks = event.stream.getTracks ? event.stream.getTracks() : [];
            const refreshed = StreamCls ? new StreamCls(tracks) : event.stream;
            onRemoteStream(refreshed);
          } catch (e) {
            onRemoteStream(event.stream);
          }
        }
      }
    };

    // ICE Candidate Handler - Normalize to plain object for socket relay
    pc.onicecandidate = (event) => {
      if (event.candidate && onIceCandidate) {
        onIceCandidate({
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[Doctor WebRTC] PeerConnection State:', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[Doctor WebRTC] ICE Connection State:', pc.iceConnectionState);
    };

    return pc;
  }

  /**
   * Create SDP Offer
   */
  async createOffer() {
    if (!this.peerConnection) return null;
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.peerConnection.setLocalDescription(offer);
    return {
      type: offer.type,
      sdp: offer.sdp,
    };
  }

  /**
   * Handle incoming SDP Offer and create Answer
   */
  async handleOffer(offer) {
    if (!this.peerConnection || !offer) return null;
    if (!RTCSessionDescription) return null;

    try {
      // Glare condition handling (if local offer was created simultaneously)
      if (this.peerConnection.signalingState === 'have-local-offer') {
        try {
          await this.peerConnection.setLocalDescription({ type: 'rollback' });
        } catch (e) {
          console.log('[Doctor WebRTC] Rollback notice:', e.message);
        }
      }

      const sessionDesc = new RTCSessionDescription({
        type: offer.type || 'offer',
        sdp: offer.sdp,
      });
      await this.peerConnection.setRemoteDescription(sessionDesc);
      this.isRemoteDescriptionSet = true;
      await this._flushPendingIceCandidates();

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return {
        type: answer.type,
        sdp: answer.sdp,
      };
    } catch (err) {
      console.log('[Doctor WebRTC] handleOffer notice:', err.message);
      return null;
    }
  }

  /**
   * Handle incoming SDP Answer
   */
  async handleAnswer(answer) {
    if (!this.peerConnection || !answer) return;
    if (!RTCSessionDescription) return;

    try {
      if (this.peerConnection.signalingState !== 'have-local-offer') {
        console.log('[Doctor WebRTC] Current state:', this.peerConnection.signalingState);
      }
      const sessionDesc = new RTCSessionDescription({
        type: answer.type || 'answer',
        sdp: answer.sdp,
      });
      await this.peerConnection.setRemoteDescription(sessionDesc);
      this.isRemoteDescriptionSet = true;
      await this._flushPendingIceCandidates();
    } catch (err) {
      console.log('[Doctor WebRTC] handleAnswer notice:', err.message);
    }
  }

  /**
   * Add ICE Candidate from remote peer.
   * Queues candidates if remote description is not yet set to prevent InvalidStateError.
   */
  async addIceCandidate(candidate) {
    if (!this.peerConnection || !candidate) return;
    if (!candidate.candidate) return;

    if (!this.isRemoteDescriptionSet) {
      this.pendingIceCandidates.push(candidate);
      return;
    }

    if (!RTCIceCandidate) return;

    try {
      const iceCandidate = new RTCIceCandidate({
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
      });
      await this.peerConnection.addIceCandidate(iceCandidate);
    } catch (e) {
      console.log('[Doctor WebRTC] addIceCandidate notice:', e.message);
    }
  }

  /**
   * Flush queued candidates once remote description is set
   */
  async _flushPendingIceCandidates() {
    if (!this.peerConnection || !RTCIceCandidate) return;
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      try {
        const iceCandidate = new RTCIceCandidate({
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        });
        await this.peerConnection.addIceCandidate(iceCandidate);
      } catch (e) {
        console.log('[Doctor WebRTC] flushIceCandidate notice:', e.message);
      }
    }
  }

  /**
   * Toggle local microphone mute
   */
  toggleMute(isMuted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = !isMuted;
      });
    }
  }

  /**
   * Toggle local camera visibility
   */
  toggleVideo(isVideoOff) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((t) => {
        t.enabled = !isVideoOff;
      });
    }
  }

  /**
   * Clean up WebRTC session, streams, and animations
   */
  cleanup() {
    this.isRemoteDescriptionSet = false;
    this.pendingIceCandidates = [];
    if (this.animationFrameId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      this.localStream = null;
    }
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {}
      this.peerConnection = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
