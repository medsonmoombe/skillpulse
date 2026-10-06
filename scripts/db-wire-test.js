// Temporary diagnostic: performs the Postgres wire protocol by hand to see
// whether the server answers the startup packet after the TLS handshake.
const net = require("net");
const tls = require("tls");

const u = new URL(process.env.DATABASE_URL);
const t = Date.now();
const log = (...a) => console.log(`${Date.now() - t}ms`, ...a);

const socket = net.connect({ host: u.hostname, port: Number(u.port) || 5432 }, () => {
  log("tcp connected, sending SSLRequest");
  // SSLRequest: length=8, code=80877103
  socket.write(Buffer.from([0, 0, 0, 8, 4, 210, 22, 47]));
});

socket.once("data", (d) => {
  log("ssl reply:", JSON.stringify(String.fromCharCode(d[0])));
  if (d[0] !== 83) process.exit(1);

  const secure = tls.connect({ socket, servername: u.hostname, rejectUnauthorized: false }, () => {
    log("tls handshake complete, sending StartupMessage");
    const nul = Buffer.from([0]);
    const user = Buffer.from(`user${String.fromCharCode(0)}${decodeURIComponent(u.username)}`);
    const db = Buffer.from(`database${String.fromCharCode(0)}${decodeURIComponent(u.pathname.slice(1))}`);
    const body = Buffer.concat([
      Buffer.from([0, 3, 0, 0]), // protocol 3.0
      user, nul,
      db, nul,
      nul,
    ]);
    const len = Buffer.alloc(4);
    len.writeInt32BE(body.length + 4);
    secure.write(Buffer.concat([len, body]));
    log("startup message sent, waiting for Authentication...");
  });

  secure.on("data", (d) => {
    log("server reply, type:", String.fromCharCode(d[0]), "bytes:", d.length, "hex:", d.slice(0, 16).toString("hex"));
    process.exit(0);
  });
  secure.on("error", (e) => log("tls error:", e.message));
});

socket.on("error", (e) => log("socket error:", e.message));
setTimeout(() => {
  log("NO REPLY to StartupMessage after 30s -> server accepts TLS but never authenticates");
  process.exit(2);
}, 30000);
