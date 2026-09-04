import { Router } from "express";
import { stringify } from "csv-stringify/sync";
import PDFDocument from "pdfkit";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { loadEventAccess } from "../../lib/eventAccess.js";
import * as dashboardService from "./dashboard.service.js";

export const dashboardRouter = Router({ mergeParams: true });

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const stats = await dashboardService.getDashboardStats(req.user!, req.params.eventId);
    res.json(stats);
  }),
);

dashboardRouter.get(
  "/export.csv",
  asyncHandler(async (req, res) => {
    const rows = await dashboardService.getAttendanceRows(req.user!, req.params.eventId);
    const csv = stringify(rows, {
      header: true,
      columns: [
        { key: "fullName", header: "Full Name" },
        { key: "relatedTo", header: "Plus-One Of" },
        { key: "contact", header: "Contact" },
        { key: "category", header: "Category" },
        { key: "tableSeat", header: "Table/Seat" },
        { key: "ticketStatus", header: "Ticket Status" },
        { key: "checkedInAt", header: "Checked In At" },
        { key: "source", header: "Check-In Source" },
        { key: "notes", header: "Notes" },
      ],
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="attendance-${req.params.eventId}.csv"`);
    res.send(csv);
  }),
);

dashboardRouter.get(
  "/export.pdf",
  asyncHandler(async (req, res) => {
    await loadEventAccess(req.user!, req.params.eventId);
    const event = await prisma.event.findUniqueOrThrow({ where: { id: req.params.eventId } });
    const rows = await dashboardService.getAttendanceRows(req.user!, req.params.eventId);
    const stats = await dashboardService.getDashboardStats(req.user!, req.params.eventId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="attendance-${req.params.eventId}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    doc.fontSize(20).text(event.name, { continued: false });
    doc.fontSize(11).fillColor("#555").text(`${event.venue} — ${event.dateTime.toLocaleString()}`);
    doc.moveDown();
    doc.fillColor("#000").fontSize(13).text(`Attendance Summary`);
    doc.fontSize(10).text(`Invited: ${stats.totals.invited}   Checked in: ${stats.totals.checkedIn}`);
    stats.categories.forEach((c) => {
      doc.text(`  ${c.name}: ${c.checkedIn} / ${c.invited}`);
    });
    doc.moveDown();

    doc.fontSize(13).text("Guest List", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(9);
    rows.forEach((r) => {
      const status = r.ticketStatus === "CHECKED_IN" ? "✓ Checked in" : r.ticketStatus === "VOID" ? "Voided" : "Not arrived";
      doc.text(`${r.fullName}${r.relatedTo ? ` (guest of ${r.relatedTo})` : ""} — ${r.category || "Uncategorized"} — ${r.tableSeat || "-"} — ${status}`);
    });

    doc.end();
  }),
);
