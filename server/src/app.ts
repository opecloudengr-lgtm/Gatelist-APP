import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { env } from "./lib/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { eventsRouter } from "./modules/events/events.routes.js";
import { staffInviteRouter } from "./modules/events/staffInvite.routes.js";
import { guestsRouter } from "./modules/guests/guests.routes.js";
import { ticketsRouter } from "./modules/tickets/tickets.routes.js";
import { checkinRouter } from "./modules/checkin/checkin.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/dist/app.js -> repo-root/web/dist. Only present when the web
// workspace has actually been built (e.g. a combined production deploy);
// harmless no-op locally, where the web app runs via its own Vite dev server.
const webDistPath = path.resolve(__dirname, "../../web/dist");
const webBuildExists = fs.existsSync(path.join(webDistPath, "index.html"));

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          // Ticket QR codes are rendered from blob: object URLs (see web/src/api/tickets.ts).
          "img-src": ["'self'", "data:", "blob:"],
        },
      },
    }),
  );
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
  }

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "gatelist-api", time: new Date().toISOString() }));

  app.use("/api/auth", authRouter);
  app.use("/api/staff-invites", staffInviteRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api/events/:eventId/guests", guestsRouter);
  app.use("/api/events/:eventId/tickets", ticketsRouter);
  app.use("/api/events/:eventId/checkin", checkinRouter);
  app.use("/api/events/:eventId/dashboard", dashboardRouter);

  if (webBuildExists) {
    app.use(express.static(webDistPath, { index: false }));
    // SPA fallback for client-side routes (e.g. a hard refresh on /events/:id) —
    // anything that isn't an API or socket.io path gets index.html.
    app.get(/^(?!\/api\/|\/socket\.io\/).*/, (_req, res) => {
      res.sendFile(path.join(webDistPath, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
