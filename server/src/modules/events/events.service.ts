import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../lib/errors.js";
import { sendEmail, staffInviteEmail } from "../../lib/email.js";
import { env } from "../../lib/env.js";
import { hashPassword } from "../../lib/password.js";
import { signAccessToken, signRefreshToken } from "../../lib/jwt.js";
import type { AuthUser } from "../../middleware/auth.js";
import { loadEventAccess, requireManage } from "../../lib/eventAccess.js";

const DEFAULT_CATEGORIES = [
  { name: "VIP", color: "#D4A017", sortOrder: 0, isDefault: true },
  { name: "Special Guest", color: "#7C3AED", sortOrder: 1, isDefault: true },
  { name: "Reserved", color: "#0EA5E9", sortOrder: 2, isDefault: true },
  { name: "General", color: "#64748B", sortOrder: 3, isDefault: true },
];

const STAFF_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createEvent(organizerId: string, input: { name: string; dateTime: Date; venue: string; description?: string | null; capacity?: number | null }) {
  return prisma.event.create({
    data: {
      organizerId,
      name: input.name,
      dateTime: input.dateTime,
      venue: input.venue,
      description: input.description ?? null,
      capacity: input.capacity ?? null,
      categories: { createMany: { data: DEFAULT_CATEGORIES } },
    },
    include: { categories: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function listEventsForUser(userId: string) {
  const [owned, staffedRows] = await Promise.all([
    prisma.event.findMany({ where: { organizerId: userId }, orderBy: { dateTime: "desc" } }),
    prisma.eventStaff.findMany({
      where: { userId },
      include: { event: true },
      orderBy: { event: { dateTime: "desc" } },
    }),
  ]);

  const staffed = staffedRows.map((row) => ({ ...row.event, staffRole: row.role }));
  const ownedTagged = owned.map((event) => ({ ...event, staffRole: "OWNER" as const }));
  const byId = new Map<string, (typeof ownedTagged)[number] | (typeof staffed)[number]>();
  for (const event of [...ownedTagged, ...staffed]) byId.set(event.id, event);
  return [...byId.values()].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
}

export async function getEventDetail(user: AuthUser, eventId: string) {
  const access = await loadEventAccess(user, eventId);
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: {
      categories: { orderBy: { sortOrder: "asc" } },
      staff: { include: { user: { select: { id: true, name: true, email: true } } } },
      organizer: { select: { id: true, name: true, email: true } },
      _count: { select: { guests: true, tickets: true } },
    },
  });
  return { event, access };
}

export async function updateEvent(user: AuthUser, eventId: string, input: Partial<{ name: string; dateTime: Date; venue: string; description: string | null; capacity: number | null }>) {
  const access = await loadEventAccess(user, eventId);
  requireManage(access);
  return prisma.event.update({ where: { id: eventId }, data: input });
}

export async function deleteEvent(user: AuthUser, eventId: string) {
  const access = await loadEventAccess(user, eventId);
  if (!access.isOwner) throw ApiError.forbidden("Only the event owner can delete this event");
  await prisma.event.delete({ where: { id: eventId } });
}

// --- Categories ---

export async function listCategories(user: AuthUser, eventId: string) {
  await loadEventAccess(user, eventId);
  return prisma.eventCategory.findMany({ where: { eventId }, orderBy: { sortOrder: "asc" } });
}

export async function createCategory(user: AuthUser, eventId: string, input: { name: string; color?: string; sortOrder?: number }) {
  const access = await loadEventAccess(user, eventId);
  requireManage(access);
  const count = await prisma.eventCategory.count({ where: { eventId } });
  return prisma.eventCategory.create({
    data: {
      eventId,
      name: input.name,
      color: input.color ?? "#6366F1",
      sortOrder: input.sortOrder ?? count,
    },
  });
}

export async function updateCategory(user: AuthUser, eventId: string, categoryId: string, input: Partial<{ name: string; color: string; sortOrder: number }>) {
  const access = await loadEventAccess(user, eventId);
  requireManage(access);
  const category = await prisma.eventCategory.findFirst({ where: { id: categoryId, eventId } });
  if (!category) throw ApiError.notFound("Category not found");
  return prisma.eventCategory.update({ where: { id: categoryId }, data: input });
}

export async function deleteCategory(user: AuthUser, eventId: string, categoryId: string) {
  const access = await loadEventAccess(user, eventId);
  requireManage(access);
  const category = await prisma.eventCategory.findFirst({ where: { id: categoryId, eventId } });
  if (!category) throw ApiError.notFound("Category not found");
  await prisma.guest.updateMany({ where: { categoryId }, data: { categoryId: null } });
  await prisma.eventCategory.delete({ where: { id: categoryId } });
}

// --- Staff ---

export async function listStaff(user: AuthUser, eventId: string) {
  await loadEventAccess(user, eventId);
  const [staff, pendingInvites] = await Promise.all([
    prisma.eventStaff.findMany({ where: { eventId }, include: { user: { select: { id: true, name: true, email: true } } } }),
    prisma.staffInvite.findMany({ where: { eventId, status: "PENDING" } }),
  ]);
  return { staff, pendingInvites };
}

export async function inviteStaff(
  user: AuthUser,
  eventId: string,
  input: { email: string; role: "CO_ORGANIZER" | "STAFF"; canScan: boolean; canEditGuestList: boolean },
) {
  const access = await loadEventAccess(user, eventId);
  requireManage(access);

  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });

  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    const alreadyStaff = await prisma.eventStaff.findUnique({
      where: { eventId_userId: { eventId, userId: existingUser.id } },
    });
    if (alreadyStaff) throw ApiError.conflict("This person is already on the event staff");
    const staffRow = await prisma.eventStaff.create({
      data: { eventId, userId: existingUser.id, role: input.role, canScan: input.canScan, canEditGuestList: input.canEditGuestList },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return { staffRow, invited: false };
  }

  const token = crypto.randomBytes(24).toString("hex");
  const invite = await prisma.staffInvite.create({
    data: {
      eventId,
      email: input.email,
      role: input.role,
      token,
      invitedById: user.id,
      expiresAt: new Date(Date.now() + STAFF_INVITE_TTL_MS),
    },
  });

  const acceptUrl = `${env.WEB_APP_URL}/staff-invite/${token}`;
  const emailContent = staffInviteEmail(event.name, user.email, acceptUrl);
  await sendEmail({ to: input.email, ...emailContent });

  return { invite, invited: true };
}

export async function removeStaff(user: AuthUser, eventId: string, staffId: string) {
  const access = await loadEventAccess(user, eventId);
  requireManage(access);
  const staffRow = await prisma.eventStaff.findFirst({ where: { id: staffId, eventId } });
  if (!staffRow) throw ApiError.notFound("Staff member not found");
  await prisma.eventStaff.delete({ where: { id: staffId } });
}

export async function updateStaffPermissions(
  user: AuthUser,
  eventId: string,
  staffId: string,
  input: Partial<{ role: "CO_ORGANIZER" | "STAFF"; canScan: boolean; canEditGuestList: boolean }>,
) {
  const access = await loadEventAccess(user, eventId);
  requireManage(access);
  const staffRow = await prisma.eventStaff.findFirst({ where: { id: staffId, eventId } });
  if (!staffRow) throw ApiError.notFound("Staff member not found");
  return prisma.eventStaff.update({ where: { id: staffId }, data: input });
}

export async function getInviteByToken(token: string) {
  const invite = await prisma.staffInvite.findUnique({
    where: { token },
    include: { event: { select: { name: true, venue: true, dateTime: true } }, invitedBy: { select: { name: true } } },
  });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    throw ApiError.badRequest("This invite link is invalid or has expired");
  }
  return invite;
}

export async function acceptStaffInvite(token: string, input: { name: string; password: string }) {
  const invite = await getInviteByToken(token);

  let user = await prisma.user.findUnique({ where: { email: invite.email } });

  if (!user) {
    const passwordHash = await hashPassword(input.password);
    user = await prisma.user.create({
      data: {
        name: input.name,
        email: invite.email,
        passwordHash,
        role: "STAFF",
        emailVerified: true, // invite link delivered via email already proves ownership
      },
    });
  }

  await prisma.$transaction([
    prisma.eventStaff.upsert({
      where: { eventId_userId: { eventId: invite.eventId, userId: user.id } },
      update: {},
      create: { eventId: invite.eventId, userId: user.id, role: invite.role },
    }),
    prisma.staffInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } }),
  ]);

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified },
    accessToken: signAccessToken({ sub: user.id, role: user.role, email: user.email }),
    refreshToken: signRefreshToken(user.id),
    eventId: invite.eventId,
  };
}
