import { prisma } from "./prisma.js";
import { ApiError } from "./errors.js";
import type { AuthUser } from "../middleware/auth.js";

export interface EventAccess {
  eventId: string;
  isOwner: boolean;
  isCoOrganizer: boolean;
  isStaff: boolean;
  canManage: boolean; // create/edit event, guests, tickets, staff
  canScan: boolean;
}

/**
 * Resolves what the current user may do on a given event. Organizers who own the
 * event and co-organizers can fully manage it; plain staff can only scan/check-in
 * unless explicitly granted guest-list edit rights.
 */
export async function loadEventAccess(user: AuthUser, eventId: string): Promise<EventAccess> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      organizerId: true,
      staff: { where: { userId: user.id }, select: { role: true, canScan: true, canEditGuestList: true } },
    },
  });
  if (!event) throw ApiError.notFound("Event not found");

  const isOwner = event.organizerId === user.id;
  const staffRow = event.staff[0];
  const isCoOrganizer = staffRow?.role === "CO_ORGANIZER";
  const isStaff = !!staffRow && !isCoOrganizer;

  if (!isOwner && !staffRow) {
    throw ApiError.forbidden("You do not have access to this event");
  }

  return {
    eventId,
    isOwner,
    isCoOrganizer,
    isStaff,
    canManage: isOwner || isCoOrganizer || !!staffRow?.canEditGuestList,
    canScan: isOwner || isCoOrganizer || !!staffRow?.canScan,
  };
}

export function requireManage(access: EventAccess) {
  if (!access.canManage) throw ApiError.forbidden("Only organizers can perform this action");
}

export function requireScan(access: EventAccess) {
  if (!access.canScan) throw ApiError.forbidden("You do not have scanning access for this event");
}
