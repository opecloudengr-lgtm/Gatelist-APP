import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { checkInRateLimiter } from "../../middleware/rateLimit.js";
import * as checkinService from "./checkin.service.js";
import { scanCheckInSchema, manualCheckInSchema, syncScanSchema } from "./checkin.schemas.js";

export const checkinRouter = Router({ mergeParams: true });

checkinRouter.use(requireAuth);

checkinRouter.post(
  "/scan",
  checkInRateLimiter,
  validateBody(scanCheckInSchema),
  asyncHandler(async (req, res) => {
    const result = await checkinService.scanCheckIn(req.user!, req.params.eventId, req.body);
    res.json(result);
  }),
);

checkinRouter.post(
  "/manual",
  checkInRateLimiter,
  validateBody(manualCheckInSchema),
  asyncHandler(async (req, res) => {
    const result = await checkinService.manualCheckIn(req.user!, req.params.eventId, req.body);
    res.json(result);
  }),
);

checkinRouter.post(
  "/sync",
  validateBody(syncScanSchema),
  asyncHandler(async (req, res) => {
    const results = await checkinService.syncOfflineScans(req.user!, req.params.eventId, req.body.scans);
    res.json({ results });
  }),
);

checkinRouter.get(
  "/logs",
  asyncHandler(async (req, res) => {
    const logs = await checkinService.listCheckInLogs(req.user!, req.params.eventId);
    res.json({ logs });
  }),
);
