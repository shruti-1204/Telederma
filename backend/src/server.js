const http = require("http");
const app = require("./app");
const { initWebSocket } = require("./services/websocket.service");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Attach Real-Time WebSocket & WebRTC Signaling Gateway
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`TeleDerma Backend & Real-Time Gateway running on port ${PORT}`);
});