import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../lib/prisma.js";
import { generateTicketToken } from "../../lib/ticketToken.js";
import { ApiError } from "../../lib/errors.js";
import { loadEventAccess, requireManage } from "../../lib/eventAccess.js";
import type { AuthUser } from "../../middleware/auth.js";
import type { Prisma } from "@prisma/client";

/**
 * Builds the create-input for a guest's ticket. The ticket id is minted up front so
 * it can be embedded in the signed token, then both are persisted together.
 */
export function buildTicketCreateInput(guestId: string, eventId: string): Prisma.TicketCreateManyInput {
  const ticketId = uuidv4();
  const uniqueToken = generateTicketToken({ ticketId, eventId, guestId });
  return { id: ticketId, guestId, eventId, uniqueToken };
}

export async function getTicket(user: AuthUser, eventId: string, ticketId: string) {
  await loadEventAccess(user, eventId);
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, eventId },
    include: { guest: { include: { category: true } }, event: true },
  });
  if (!ticket) throw ApiError.notFound("Ticket not found");
  return ticket;
}

export async function voidTicket(user: AuthUser, eventId: string, ticketId: string) {
  const access = await loadEventAccess(user, eventId);
  requireManage(access);
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, eventId } });
  if (!ticket) throw ApiError.notFound("Ticket not found");
  if (ticket.status === "VOID") throw ApiError.conflict("Ticket is already void");
  return prisma.ticket.update({ where: { id: ticketId }, data: { status: "VOID", voidedAt: new Date() } });
}

export async function reissueTicket(user: AuthUser, eventId: string, ticketId: string) {
  const access = await loadEventAccess(user, eventId);
  requireManage(access);
  const oldTicket = await prisma.ticket.findFirst({ where: { id: ticketId, eventId } });
  if (!oldTicket) throw ApiError.notFound("Ticket not found");

  return prisma.$transaction(async (tx) => {
    await tx.ticket.update({ where: { id: ticketId }, data: { status: "VOID", voidedAt: new Date() } });
    const createInput = buildTicketCreateInput(oldTicket.guestId, eventId);
    return tx.ticket.create({ data: createInput });
  });
}

export async function listTicketsForGuest(user: AuthUser, eventId: string, guestId: string) {
  await loadEventAccess(user, eventId);
  return prisma.ticket.findMany({ where: { eventId, guestId }, orderBy: { createdAt: "desc" } });
}
