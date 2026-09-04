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

export function createApp() {
  const app = express();

  app.use(helmet());
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
