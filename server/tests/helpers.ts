import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { signAccessToken } from "../src/lib/jwt.js";
import type { GlobalRole } from "@prisma/client";

export const app = createApp();

export async function resetDb() {
  await prisma.checkInLog.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.eventCategory.deleteMany();
  await prisma.staffInvite.deleteMany();
  await prisma.eventStaff.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
}

export async function createVerifiedUser(opts: { email: string; name?: string; role?: GlobalRole; password?: string }) {
  const passwordHash = await hashPassword(opts.password ?? "pass1234");
  const user = await prisma.user.create({
    data: {
      name: opts.name ?? "Test User",
      email: opts.email,
      passwordHash,
      role: opts.role ?? "ORGANIZER",
      emailVerified: true,
    },
  });
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  return { user, accessToken };
}

export async function createEventWithCategory(organizerId: string) {
  const event = await prisma.event.create({
    data: {
      organizerId,
      name: "Test Gala",
      dateTime: new Date("2026-12-01T18:00:00.000Z"),
      venue: "Test Venue",
      categories: { createMany: { data: [{ name: "VIP", color: "#D4A017", sortOrder: 0, isDefault: true }] } },
    },
    include: { categories: true },
  });
  return { event, category: event.categories[0] };
}

export function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export { request };
