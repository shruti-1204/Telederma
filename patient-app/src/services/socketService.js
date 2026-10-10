import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_IP = '10.149.64.233';
const PORT = '5000';

const getHost = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {}
  return DEFAULT_IP;
};

class SocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Connect to backend WebSocket gateway
   */
  async connect() {
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
      return;
    }

    try {
      const host = getHost();
      const token = (await AsyncStorage.getItem('@telederma_auth_token')) || '';
      const url = `ws://${host}:${PORT}?token=${encodeURIComponent(token)}&role=PATIENT`;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[Socket] Connected to TeleDerma Gateway');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emitLocal('connection:open', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, payload } = data;
          this.emitLocal(type, payload);
        } catch (e) {
          console.warn('[Socket] Message parse error:', e.message);
        }
      };

      this.ws.onclose = () => {
        console.log('[Socket] Disconnected from TeleDerma Gateway');
        this.isConnected = false;
        this.emitLocal('connection:close', { connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[Socket Error]:', err.message || 'connection error');
      };
    } catch (e) {
      console.warn('[Socket] Connection failed:', e.message);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Listen to events from server
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emitLocal(event, payload) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`[Socket] Listener error on ${event}:`, e);
        }
      });
    }
  }

  /**
   * Send JSON message to backend WebSocket server
   */
  send(type, payload = {}) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  // --- WebRTC Helpers ---
  joinWebRtcRoom(roomId, name = 'Patient') {
    this.send('webrtc:join', { roomId, name, role: 'PATIENT' });
  }

  sendOffer(roomId, offer, toPeerId = null) {
    this.send('webrtc:offer', { roomId, offer, toPeerId });
  }

  sendAnswer(roomId, answer, toPeerId = null) {
    this.send('webrtc:answer', { roomId, answer, toPeerId });
  }

  sendIceCandidate(roomId, candidate, toPeerId = null) {
    this.send('webrtc:ice-candidate', { roomId, candidate, toPeerId });
  }

  leaveWebRtcRoom(roomId) {
    this.send('webrtc:leave', { roomId });
  }

  endCall(roomId) {
    this.send('webrtc:end-call', { roomId });
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const socketService = new SocketService();




