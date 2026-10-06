/**
 * TeleDerma WebRTC Adapter for Web (Browser APIs - Doctor App)
 */
const RTCPeerConnection =
  typeof window !== 'undefined'
    ? window.RTCPeerConnection ||
      window.webkitRTCPeerConnection ||
      window.mozRTCPeerConnection
    : null;

const RTCSessionDescription =
  typeof window !== 'undefined' ? window.RTCSessionDescription : null;

const RTCIceCandidate =
  typeof window !== 'undefined' ? window.RTCIceCandidate : null;

const mediaDevices =
  typeof navigator !== 'undefined' && navigator.mediaDevices
    ? navigator.mediaDevices
    : null;

const RTCView = null;
const isNativeSupported = false;

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
  isNative: false,
};
