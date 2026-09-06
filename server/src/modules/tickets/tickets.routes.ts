import { Router } from "express";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import * as ticketsService from "./tickets.service.js";

const INK = "#0B1220";
const INK_LIGHT = "#1A2540";
const BRASS = "#D4A017";
const BRASS_LIGHT = "#F5E9C2";
const MIST = "#96A2BC";
const GOOD = "#1E8E5A";
const BAD = "#D33B3B";

const STATUS_LABEL: Record<string, string> = { ISSUED: "Active", CHECKED_IN: "Checked In", VOID: "Voided" };
const STATUS_COLOR: Record<string, string> = { ISSUED: GOOD, CHECKED_IN: BRASS, VOID: BAD };

function shortTicketCode(ticketId: string): string {
  return `GTL-${ticketId.replace(/-/g, "").slice(-8).toUpperCase()}`;
}

function formatEventDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

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

ticketsRouter.get(
  "/:ticketId/ticket.pdf",
  asyncHandler(async (req, res) => {
    const ticket = await ticketsService.getTicket(req.user!, req.params.eventId, req.params.ticketId);
    const { guest, event } = ticket;
    const category = guest.category;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${guest.fullName.replace(/\s+/g, "-").toLowerCase()}-ticket.pdf"`);

    const doc = new PDFDocument({ size: [560, 320], margin: 0 });
    doc.pipe(res);

    const dividerX = 372;

    // Card background + decorative brass glow in the corner.
    doc.rect(0, 0, 560, 320).fill(INK);
    doc.save();
    doc.fillOpacity(0.08).circle(540, 10, 150).fill(BRASS);
    doc.restore();

    // Wordmark.
    doc.circle(30, 27, 6).lineWidth(2).strokeColor(BRASS).stroke();
    doc.circle(30, 27, 1.6).fillColor(BRASS).fill();
    doc.font("Helvetica-Bold").fontSize(12).fillColor("white").text("GATELIST", 46, 21, { characterSpacing: 1.5 });

    // Status pill.
    const statusLabel = STATUS_LABEL[ticket.status] ?? ticket.status;
    const statusColor = STATUS_COLOR[ticket.status] ?? MIST;
    const pillWidth = doc.font("Helvetica-Bold").fontSize(9).widthOfString(statusLabel) + 24;
    const pillX = 532 - pillWidth;
    doc.roundedRect(pillX, 16, pillWidth, 20, 10).fillOpacity(0.15).fill(statusColor);
    doc.fillOpacity(1).fillColor(statusColor).fontSize(9).text(statusLabel, pillX, 22, { width: pillWidth, align: "center" });

    // Event name + date/venue.
    doc
      .font("Times-Bold")
      .fontSize(21)
      .fillColor("white")
      .text(event.name, 28, 56, { width: dividerX - 56 });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(MIST)
      .text(`${formatEventDateTime(event.dateTime)}  ·  ${event.venue}`, 28, doc.y + 6, { width: dividerX - 56 });

    // Ticket-stub divider with notches punched at the top/bottom edges.
    doc
      .moveTo(dividerX, 14)
      .lineTo(dividerX, 306)
      .dash(4, { space: 4 })
      .lineWidth(1)
      .strokeColor(INK_LIGHT)
      .stroke();
    doc.undash();
    doc.circle(dividerX, 0, 10).fill("white");
    doc.circle(dividerX, 320, 10).fill("white");

    // Attendee info grid.
    const fields: [string, string][] = [
      ["ATTENDEE", guest.fullName],
      ["CATEGORY", category?.name ?? "General"],
      ["TABLE / SEAT", guest.tableSeatLabel ?? "—"],
      ["STATUS", statusLabel],
    ];
    const colX = [28, 28 + (dividerX - 56) / 2 + 8];
    const rowY = [160, 220];
    fields.forEach(([label, value], i) => {
      const x = colX[i % 2];
      const y = rowY[Math.floor(i / 2)];
      doc.font("Helvetica-Bold").fontSize(8).fillColor(MIST).text(label, x, y, { characterSpacing: 0.5 });
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor("white")
        .text(value, x, y + 13, { width: (dividerX - 56) / 2 - 8 });
    });

    // QR panel.
    const qrBuffer = await QRCode.toBuffer(ticket.uniqueToken, { errorCorrectionLevel: "M", margin: 1, width: 300 });
    const qrSize = 128;
    const qrX = dividerX + (560 - dividerX - qrSize) / 2 - 14;
    const qrY = 90;
    doc.roundedRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 8).fill(BRASS_LIGHT);
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(MIST)
      .text(shortTicketCode(ticket.id), qrX - 10, qrY + qrSize + 20, { width: qrSize + 20, align: "center", characterSpacing: 1 });

    doc.font("Helvetica").fontSize(7).fillColor(INK_LIGHT).text("One secure ticket. Not required to have the app.", dividerX + 14, 296, { width: 560 - dividerX - 28, align: "center" });

    doc.end();
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
