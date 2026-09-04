import { Router } from "express";
import QRCode from "qrcode";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import * as ticketsService from "./tickets.service.js";

export const ticketsRouter = Router({ mergeParams: true });

ticketsRouter.use(requireAuth);

ticketsRouter.get(
  "/:ticketId",
  asyncHandler(async (req, res) => {
    const ticket = await ticketsService.getTicket(req.user!, req.params.eventId, req.params.ticketId);
    res.json({ ticket });
  }),
);

ticketsRouter.get(
  "/:ticketId/qr.png",
  asyncHandler(async (req, res) => {
    const ticket = await ticketsService.getTicket(req.user!, req.params.eventId, req.params.ticketId);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "private, max-age=60");
    const buffer = await QRCode.toBuffer(ticket.uniqueToken, { errorCorrectionLevel: "M", margin: 2, width: 512 });
    res.send(buffer);
  }),
);

ticketsRouter.post(
  "/:ticketId/void",
  asyncHandler(async (req, res) => {
    const ticket = await ticketsService.voidTicket(req.user!, req.params.eventId, req.params.ticketId);
    res.json({ ticket });
  }),
);

ticketsRouter.post(
  "/:ticketId/reissue",
  asyncHandler(async (req, res) => {
    const ticket = await ticketsService.reissueTicket(req.user!, req.params.eventId, req.params.ticketId);
    res.status(201).json({ ticket });
  }),
);
