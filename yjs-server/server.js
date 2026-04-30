const { WebSocketServer } = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const wss = new WebSocketServer({ port: process.env.PORT || 1234 });

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req);
});

console.log(`Yjs WebSocket server running on port ${process.env.PORT || 1234}`);