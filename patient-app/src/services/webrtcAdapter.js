/**
 * TeleDerma WebRTC Adapter (Platform Resolver)
 */
import { Platform } from 'react-native';

let adapter;
if (Platform.OS === 'web') {
  adapter = require('./webrtcAdapter.web');
} else {
  adapter = require('./webrtcAdapter.native');
}

export const {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  RTCView,
  isNativeSupported,
} = adapter;

export default adapter.default || adapter;
