const { WebSocketServer, WebSocket } = require("ws");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

let wss = null;

// Track connected clients
// Map<WebSocket, { userId, role, doctorId, patientId, rooms: Set<string> }>
const clients = new Map();

/**
 * Initialize WebSocket Server attached to HTTP server
 * @param {import('http').Server} server
 */
const initWebSocket = (server) => {
  wss = new WebSocketServer({ server });

  console.log("[WebSocket] Gateway initialized on HTTP server");

  wss.on("connection", (ws, req) => {
    // Parse query params e.g. /?token=...&role=...
    const url = new URL(req.url, "http://localhost:5000");
    const token = url.searchParams.get("token");
    const roleParam = url.searchParams.get("role");
    const userIdParam = url.searchParams.get("userId");

    const clientInfo = {
      userId: userIdParam || null,
      role: roleParam || null,
      doctorId: null,
      patientId: null,
      rooms: new Set(),
    };

    // Authenticate if JWT token provided
    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
        clientInfo.userId = decoded.userId || decoded.id;
        clientInfo.role = decoded.role || clientInfo.role;
        clientInfo.patientId = decoded.patientId || null;
        clientInfo.doctorId = decoded.doctorId || null;
      } catch (err) {
        // Fallback for dev tokens e.g. dev_token_...
        if (token.startsWith("dev_token_") || token.startsWith("dev_test_")) {
          clientInfo.userId = clientInfo.userId || "dev_user";
        }
      }
    }

    clients.set(ws, clientInfo);

    // Auto-join personal user room & role room
    if (clientInfo.userId) {
      clientInfo.rooms.add(`user:${clientInfo.userId}`);
    }
    if (clientInfo.role) {
      clientInfo.rooms.add(`role:${clientInfo.role}`);
    }
    if (clientInfo.doctorId) {
      clientInfo.rooms.add(`doctor:${clientInfo.doctorId}`);
    }
    if (clientInfo.patientId) {
      clientInfo.rooms.add(`patient:${clientInfo.patientId}`);
    }

    console.log(
      `[WebSocket] Client connected: userId=${clientInfo.userId}, role=${clientInfo.role}`
    );

    // Welcome handshake
    sendToSocket(ws, {
      type: "connected",
      payload: {
        message: "Connected to TeleDerma Real-Time Gateway",
        userId: clientInfo.userId,
        role: clientInfo.role,
      },
    });

    // Handle incoming client messages (Signaling, Auth, Rooms)
    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        handleClientMessage(ws, data);
      } catch (e) {
        console.warn("[WebSocket] Failed to parse message:", e.message);
      }
    });

    ws.on("close", () => {
      const info = clients.get(ws);
      if (info) {
        // Notify any active WebRTC rooms that peer left
        info.rooms.forEach((room) => {
          if (room.startsWith("room:")) {
            emitToRoom(room.replace("room:", ""), "webrtc:peer-left", {
              peerId: info.userId,
              role: info.role,
            }, ws);
          }
        });
      }
      clients.delete(ws);
      console.log(`[WebSocket] Client disconnected: ${info?.userId || "anonymous"}`);
    });

    ws.on("error", (err) => {
      console.warn("[WebSocket Error]:", err.message);
    });
  });

  return wss;
};

/**
 * Handle incoming WebSocket messages from Doctor or Patient app
 */
const handleClientMessage = (ws, message) => {
  const info = clients.get(ws);
  if (!info) return;

  const { type, payload } = message;

  switch (type) {
    // Client dynamic auth update
    case "auth": {
      if (payload?.token) {
        try {
          const decoded = jwt.verify(payload.token, env.JWT_ACCESS_SECRET);
          info.userId = decoded.userId || decoded.id;
          info.role = decoded.role || payload.role;
          info.patientId = decoded.patientId || null;
          info.doctorId = decoded.doctorId || null;
        } catch (e) {
          info.userId = payload.userId || info.userId;
          info.role = payload.role || info.role;
        }
      } else {
        info.userId = payload?.userId || info.userId;
        info.role = payload?.role || info.role;
      }

      if (info.userId) info.rooms.add(`user:${info.userId}`);
      if (info.role) info.rooms.add(`role:${info.role}`);
      if (payload?.doctorId) {
        info.doctorId = payload.doctorId;
        info.rooms.add(`doctor:${payload.doctorId}`);
      }
      if (payload?.patientId) {
        info.patientId = payload.patientId;
        info.rooms.add(`patient:${payload.patientId}`);
      }

      sendToSocket(ws, {
        type: "auth:success",
        payload: { userId: info.userId, role: info.role, doctorId: info.doctorId, patientId: info.patientId },
      });
      break;
    }

    // Join WebRTC / Consultation Room
    case "webrtc:join": {
      const roomId = payload?.roomId;
      if (!roomId) return;

      const roomKey = `room:${roomId}`;
      info.rooms.add(roomKey);

      // Notify others in room that a peer joined
      emitToRoom(
        roomId,
        "webrtc:peer-joined",
        {
          peerId: info.userId,
          role: info.role,
          name: payload?.name || (info.role === "DOCTOR" ? "Doctor" : "Patient"),
        },
        ws
      );

      // If the joining peer is a PATIENT, emit explicit consultation:patient-joined to room
      if (info.role === "PATIENT" || payload?.role === "PATIENT") {
        emitToRoom(
          roomId,
          "consultation:patient-joined",
          {
            roomId,
            patientId: info.patientId || info.userId,
            name: payload?.name || "Patient",
            joinedAt: Date.now(),
          },
          ws
        );
      }

      // Confirm join to caller
      sendToSocket(ws, {
        type: "webrtc:joined",
        payload: { roomId, userId: info.userId, role: info.role },
      });
      break;
    }

    // Explicit Consultation Patient Joined Relay
    case "consultation:patient-joined": {
      const roomId = payload?.roomId;
      if (roomId) {
        emitToRoom(
          roomId,
          "consultation:patient-joined",
          {
            roomId,
            patientId: payload?.patientId || info.patientId || info.userId,
            name: payload?.name || "Patient",
            joinedAt: Date.now(),
          },
          ws
        );
      }
      break;
    }

    // WebRTC Offer Relay
    case "webrtc:offer": {
      const { roomId, offer, toPeerId } = payload;
      if (!roomId || !offer) return;

      emitToRoom(
        roomId,
        "webrtc:offer",
        {
          roomId,
          offer,
          fromPeerId: info.userId,
          role: info.role,
        },
        ws,
        toPeerId
      );
      break;
    }

    // WebRTC Answer Relay
    case "webrtc:answer": {
      const { roomId, answer, toPeerId } = payload;
      if (!roomId || !answer) return;

      emitToRoom(
        roomId,
        "webrtc:answer",
        {
          roomId,
          answer,
          fromPeerId: info.userId,
          role: info.role,
        },
        ws,
        toPeerId
      );
      break;
    }

    // WebRTC ICE Candidate Relay
    case "webrtc:ice-candidate": {
      const { roomId, candidate, toPeerId } = payload;
      if (!roomId || !candidate) return;

      emitToRoom(
        roomId,
        "webrtc:ice-candidate",
        {
          roomId,
          candidate,
          fromPeerId: info.userId,
          role: info.role,
        },
        ws,
        toPeerId
      );
      break;
    }

    // WebRTC Call Leave
    case "webrtc:leave": {
      const roomId = payload?.roomId;
      if (roomId) {
        info.rooms.delete(`room:${roomId}`);
        emitToRoom(roomId, "webrtc:peer-left", {
          peerId: info.userId,
          role: info.role,
        }, ws);
      }
      break;
    }

    // WebRTC Official End Call (terminates call for all participants in room)
    case "webrtc:end-call": {
      const roomId = payload?.roomId;
      if (roomId) {
        emitToRoom(roomId, "consultation:ended", {
          roomId,
          endedBy: info.userId,
          role: info.role,
        });
      }
      break;
    }

    // Payment Claimed by Patient (Direct UPI)
    case "payment:claimed": {
      const { doctorId, roomId } = payload || {};
      if (doctorId) {
        emitToDoctor(doctorId, "payment:claimed", payload);
      }
      if (roomId) {
        emitToRoom(roomId, "payment:claimed", payload, ws);
      }
      break;
    }

    // Payment Confirmed by Doctor (Direct UPI Receipt & Rx Unlock)
    case "payment:confirmed": {
      const { patientId, roomId } = payload || {};
      if (patientId) {
        emitToPatient(patientId, "payment:confirmed", payload);
      }
      if (roomId) {
        emitToRoom(roomId, "payment:confirmed", payload, ws);
      }
      break;
    }

    // Heartbeat ping
    case "ping": {
      sendToSocket(ws, { type: "pong", payload: { time: Date.now() } });
      break;
    }

    default:
      console.log(`[WebSocket] Unhandled message type: ${type}`);
  }
};

/**
 * Send JSON payload to a single WebSocket client
 */
const sendToSocket = (ws, message) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
};

/**
 * Emit event to a specific Room (e.g. WebRTC consultation room)
 */
const emitToRoom = (roomId, type, payload, senderWs = null, toPeerId = null) => {
  const roomKey = `room:${roomId}`;
  const messageStr = JSON.stringify({ type, payload });

  clients.forEach((info, ws) => {
    if (ws !== senderWs && info.rooms.has(roomKey) && ws.readyState === WebSocket.OPEN) {
      if (!toPeerId || info.userId === toPeerId) {
        ws.send(messageStr);
      }
    }
  });
};

/**
 * Emit event to a specific user by userId
 */
const emitToUser = (userId, type, payload) => {
  if (!userId) return;
  const userRoom = `user:${userId}`;
  const messageStr = JSON.stringify({ type, payload });

  clients.forEach((info, ws) => {
    if (info.rooms.has(userRoom) && ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
};

/**
 * Emit event to a specific doctor by doctorId
 */
const emitToDoctor = (doctorId, type, payload) => {
  if (!doctorId) return;
  const docRoom = `doctor:${doctorId}`;
  const messageStr = JSON.stringify({ type, payload });

  clients.forEach((info, ws) => {
    if (
      (info.rooms.has(docRoom) || info.doctorId === doctorId || info.role === "DOCTOR") &&
      ws.readyState === WebSocket.OPEN
    ) {
      ws.send(messageStr);
    }
  });
};

/**
 * Emit event to a specific patient by patientId
 */
const emitToPatient = (patientId, type, payload) => {
  if (!patientId) return;
  const patRoom = `patient:${patientId}`;
  const messageStr = JSON.stringify({ type, payload });

  clients.forEach((info, ws) => {
    if (
      (info.rooms.has(patRoom) || info.patientId === patientId || info.role === "PATIENT") &&
      ws.readyState === WebSocket.OPEN
    ) {
      ws.send(messageStr);
    }
  });
};

/**
 * Broadcast event to all users with a specific role ('DOCTOR' or 'PATIENT')
 */
const emitToRole = (role, type, payload) => {
  const roleRoom = `role:${role}`;
  const messageStr = JSON.stringify({ type, payload });

  clients.forEach((info, ws) => {
    if (info.rooms.has(roleRoom) && ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
};

/**
 * Broadcast event to all connected clients
 */
const broadcast = (type, payload) => {
  const messageStr = JSON.stringify({ type, payload });
  clients.forEach((info, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
};

module.exports = {
  initWebSocket,
  emitToRoom,
  emitToUser,
  emitToDoctor,
  emitToPatient,
  emitToRole,
  broadcast,
};
