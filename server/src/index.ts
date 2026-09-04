import { createServer } from "node:http";
import { Server as IOServer } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { verifyAccessToken } from "./lib/jwt.js";
import { loadEventAccess } from "./lib/eventAccess.js";
import { setIO, eventRoom } from "./lib/realtime.js";

const app = createApp();
const httpServer = createServer(app);

const io = new IOServer(httpServer, {
  cors: { origin: env.CORS_ORIGIN, credentials: true },
});
setIO(io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing auth token"));
    const claims = verifyAccessToken(token);
    socket.data.user = { id: claims.sub, role: claims.role, email: claims.email };
    next();
  } catch {
    next(new Error("Invalid or expired session"));
  }
});

io.on("connection", (socket) => {
  socket.on("join-event", async (eventId: string, ack?: (ok: boolean) => void) => {
    try {
      await loadEventAccess(socket.data.user, eventId);
      socket.join(eventRoom(eventId));
      ack?.(true);
    } catch {
      ack?.(false);
    }
  });

  socket.on("leave-event", (eventId: string) => {
    socket.leave(eventRoom(eventId));
  });
});

httpServer.listen(env.PORT, () => {
  logger.info(`GateList API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

process.on("SIGTERM", () => httpServer.close());
