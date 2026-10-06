/**
 * TeleDerma WebRTC Adapter for Native Mobile (react-native-webrtc - Doctor App)
 * Supports Android and iOS with hardware-accelerated WebRTC.
 */
import { NativeModules } from 'react-native';

let RTCPeerConnection = null;
let RTCSessionDescription = null;
let RTCIceCandidate = null;
let mediaDevices = null;
let RTCView = null;
let isNativeSupported = false;

try {
  // Check if Native WebRTC module is linked (Expo Development Build / Bare RN)
  if (NativeModules && NativeModules.WebRTCModule) {
    const webrtc = require('react-native-webrtc');
    RTCPeerConnection = webrtc.RTCPeerConnection;
    RTCSessionDescription = webrtc.RTCSessionDescription;
    RTCIceCandidate = webrtc.RTCIceCandidate;
    mediaDevices = webrtc.mediaDevices;
    RTCView = webrtc.RTCView;
    isNativeSupported = true;
    console.log('[Doctor WebRTC Native] react-native-webrtc loaded successfully.');
  } else {
    console.log(
      '[Doctor WebRTC Native] Note: Native WebRTC video hardware requires an Expo Development Build (expo run:android / expo run:ios).'
    );
  }
} catch (err) {
  console.log('[Doctor WebRTC Native] react-native-webrtc status:', err.message);
}

export {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  RTCView,
  isNativeSupported,
};

export default {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  RTCView,
  isNativeSupported,
  isNative: true,
};
