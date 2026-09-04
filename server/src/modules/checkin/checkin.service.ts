import { prisma } from "../../lib/prisma.js";
import { verifyTicketToken } from "../../lib/ticketToken.js";
import { loadEventAccess, requireScan } from "../../lib/eventAccess.js";
import { emitToEvent } from "../../lib/realtime.js";
import type { AuthUser } from "../../middleware/auth.js";
import type { CheckInResult, CheckInSource } from "@prisma/client";

const guestSelect = {
  id: true,
  fullName: true,
  isPlusOne: true,
  tableSeatLabel: true,
  category: { select: { id: true, name: true, color: true } },
} as const;

export interface CheckInOutcome {
  outcome: "VALID" | "DUPLICATE" | "INVALID";
  reason?: string;
  guest?: { id: string; fullName: string; isPlusOne: boolean; tableSeatLabel: string | null; category: { id: string; name: string; color: string } | null };
  ticket?: { id: string; status: string; checkedInAt: string | null };
  previousCheckIn?: { at: string; by: string | null; source: CheckInSource | null } | null;
}

async function logAttempt(params: {
  eventId: string;
  ticketId: string | null;
  scannedById: string;
  result: CheckInResult;
  guestNameSnapshot: string | null;
  device?: string;
  clientScanId?: string;
}) {
  try {
    return await prisma.checkInLog.create({
      data: {
        eventId: params.eventId,
        ticketId: params.ticketId,
        scannedById: params.scannedById,
        result: params.result,
        guestNameSnapshot: params.guestNameSnapshot,
        device: params.device,
        clientScanId: params.clientScanId,
      },
    });
  } catch (err: unknown) {
    // Unique constraint on (ticketId, clientScanId) means this exact offline scan
    // was already synced — safe to swallow as an idempotent no-op.
    if ((err as { code?: string }).code === "P2002") return null;
    throw err;
  }
}

async function processTicketOutcome(params: {
  user: AuthUser;
  eventId: string;
  ticketId: string;
  source: CheckInSource;
  device?: string;
  clientScanId?: string;
}): Promise<CheckInOutcome> {
  const { user, eventId, ticketId, source, device, clientScanId } = params;

  // Idempotency: if this exact device scan (ticketId + clientScanId) was already
  // logged — e.g. a retried offline sync after a dropped response — replay the
  // stored outcome instead of re-evaluating or double-logging it.
  if (clientScanId) {
    const existing = await prisma.checkInLog.findUnique({
      where: { ticketId_clientScanId: { ticketId, clientScanId } },
    });
    if (existing) {
      const ticketNow = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { guest: { select: guestSelect } } });
      if (existing.result === "VALID" || existing.result === "MANUAL") {
        return {
          outcome: "VALID",
          guest: ticketNow?.guest,
          ticket: ticketNow ? { id: ticketNow.id, status: ticketNow.status, checkedInAt: ticketNow.checkedInAt?.toISOString() ?? null } : undefined,
        };
      }
      if (existing.result === "DUPLICATE") {
        return {
          outcome: "DUPLICATE",
          reason: "This ticket has already been checked in.",
          guest: ticketNow?.guest,
          previousCheckIn: ticketNow ? { at: ticketNow.checkedInAt?.toISOString() ?? "", by: ticketNow.checkedInById, source: ticketNow.source } : null,
        };
      }
      return { outcome: "INVALID", reason: "This ticket is not valid.", guest: ticketNow?.guest };
    }
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { guest: { select: guestSelect } },
  });

  if (!ticket || ticket.eventId !== eventId) {
    await logAttempt({ eventId, ticketId: null, scannedById: user.id, result: "INVALID", guestNameSnapshot: null, device, clientScanId });
    return { outcome: "INVALID", reason: "This ticket does not belong to this event." };
  }

  if (ticket.status === "VOID") {
    await logAttempt({ eventId, ticketId: ticket.id, scannedById: user.id, result: "INVALID", guestNameSnapshot: ticket.guest.fullName, device, clientScanId });
    return { outcome: "INVALID", reason: "This ticket has been voided.", guest: ticket.guest };
  }

  if (ticket.status === "CHECKED_IN") {
    await logAttempt({ eventId, ticketId: ticket.id, scannedById: user.id, result: "DUPLICATE", guestNameSnapshot: ticket.guest.fullName, device, clientScanId });
    return {
      outcome: "DUPLICATE",
      reason: "This ticket has already been checked in.",
      guest: ticket.guest,
      previousCheckIn: {
        at: ticket.checkedInAt?.toISOString() ?? "",
        by: ticket.checkedInById,
        source: ticket.source,
      },
    };
  }

  // ISSUED — attempt the atomic first-scan-wins transition.
  const update = await prisma.ticket.updateMany({
    where: { id: ticket.id, status: "ISSUED" },
    data: { status: "CHECKED_IN", checkedInAt: new Date(), checkedInById: user.id, source },
  });

  if (update.count === 0) {
    // Lost the race to a concurrent scan between our read and write — reload and report duplicate.
    const fresh = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    await logAttempt({ eventId, ticketId: ticket.id, scannedById: user.id, result: "DUPLICATE", guestNameSnapshot: ticket.guest.fullName, device, clientScanId });
    return {
      outcome: "DUPLICATE",
      reason: "This ticket has already been checked in.",
      guest: ticket.guest,
      previousCheckIn: { at: fresh.checkedInAt?.toISOString() ?? "", by: fresh.checkedInById, source: fresh.source },
    };
  }

  await logAttempt({ eventId, ticketId: ticket.id, scannedById: user.id, result: source === "MANUAL" ? "MANUAL" : "VALID", guestNameSnapshot: ticket.guest.fullName, device, clientScanId });

  const result: CheckInOutcome = {
    outcome: "VALID",
    guest: ticket.guest,
    ticket: { id: ticket.id, status: "CHECKED_IN", checkedInAt: new Date().toISOString() },
  };

  emitToEvent(eventId, "checkin", { guestId: ticket.guestId, ticketId: ticket.id, guestName: ticket.guest.fullName, category: ticket.guest.category, at: result.ticket!.checkedInAt });

  return result;
}

export async function scanCheckIn(
  user: AuthUser,
  eventId: string,
  input: { token: string; device?: string; clientScanId?: string },
): Promise<CheckInOutcome> {
  const access = await loadEventAccess(user, eventId);
  requireScan(access);

  const payload = verifyTicketToken(input.token);
  if (!payload || payload.eventId !== eventId) {
    await logAttempt({ eventId, ticketId: null, scannedById: user.id, result: "INVALID", guestNameSnapshot: null, device: input.device, clientScanId: input.clientScanId });
    return { outcome: "INVALID", reason: "Unrecognized ticket. This QR code is not valid for this event." };
  }

  return processTicketOutcome({ user, eventId, ticketId: payload.ticketId, source: "SCAN", device: input.device, clientScanId: input.clientScanId });
}

export async function manualCheckIn(user: AuthUser, eventId: string, input: { ticketId: string; device?: string }): Promise<CheckInOutcome> {
  const access = await loadEventAccess(user, eventId);
  requireScan(access);
  return processTicketOutcome({ user, eventId, ticketId: input.ticketId, source: "MANUAL", device: input.device });
}

export async function syncOfflineScans(
  user: AuthUser,
  eventId: string,
  scans: { token: string; device?: string; clientScanId: string; scannedAt?: Date }[],
) {
  const access = await loadEventAccess(user, eventId);
  requireScan(access);

  // Process strictly in the order the device queued them so that, when a device was
  // offline, its own scans still reconcile in original order; across devices the
  // arrival order at the server is the tiebreaker (first to sync wins).
  const ordered = [...scans].sort((a, b) => (a.scannedAt?.getTime() ?? 0) - (b.scannedAt?.getTime() ?? 0));

  const results: (CheckInOutcome & { clientScanId: string })[] = [];
  for (const scan of ordered) {
    const payload = verifyTicketToken(scan.token);
    let outcome: CheckInOutcome;
    if (!payload || payload.eventId !== eventId) {
      await logAttempt({ eventId, ticketId: null, scannedById: user.id, result: "INVALID", guestNameSnapshot: null, device: scan.device, clientScanId: scan.clientScanId });
      outcome = { outcome: "INVALID", reason: "Unrecognized ticket. This QR code is not valid for this event." };
    } else {
      outcome = await processTicketOutcome({ user, eventId, ticketId: payload.ticketId, source: "SCAN", device: scan.device, clientScanId: scan.clientScanId });
    }
    results.push({ ...outcome, clientScanId: scan.clientScanId });
  }
  return results;
}

export async function listCheckInLogs(user: AuthUser, eventId: string) {
  await loadEventAccess(user, eventId);
  return prisma.checkInLog.findMany({
    where: { eventId },
    include: { scannedBy: { select: { id: true, name: true } }, ticket: { select: { id: true, guestId: true } } },
    orderBy: { timestamp: "desc" },
    take: 500,
  });
}
