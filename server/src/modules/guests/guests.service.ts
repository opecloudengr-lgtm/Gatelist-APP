import { parse } from "csv-parse/sync";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../lib/errors.js";
import { loadEventAccess, requireManage } from "../../lib/eventAccess.js";
import { buildTicketCreateInput } from "../tickets/tickets.service.js";
import type { AuthUser } from "../../middleware/auth.js";
import type { Prisma } from "@prisma/client";

const guestInclude = {
  category: true,
  tickets: { orderBy: { createdAt: "desc" as const } },
  plusOnes: { include: { category: true, tickets: { orderBy: { createdAt: "desc" as const } } } },
} satisfies Prisma.GuestInclude;

function plusOneLabel(fullName: string, index: number) {
  return `${fullName} — Guest ${index + 1}`;
}

async function createGuestWithTickets(
  tx: Prisma.TransactionClient,
  eventId: string,
  input: { fullName: string; contact?: string | null; categoryId?: string | null; tableSeatLabel?: string | null; plusOnesAllowed: number; notes?: string | null },
) {
  const guest = await tx.guest.create({
    data: {
      eventId,
      fullName: input.fullName,
      contact: input.contact ?? null,
      categoryId: input.categoryId ?? null,
      tableSeatLabel: input.tableSeatLabel ?? null,
      plusOnesAllowed: input.plusOnesAllowed,
      notes: input.notes ?? null,
    },
  });

  const plusOneGuests = [];
  for (let i = 0; i < input.plusOnesAllowed; i++) {
    const plusOne = await tx.guest.create({
      data: {
        eventId,
        fullName: plusOneLabel(input.fullName, i),
        categoryId: input.categoryId ?? null,
        tableSeatLabel: input.tableSeatLabel ?? null,
        isPlusOne: true,
        primaryGuestId: guest.id,
      },
    });
    plusOneGuests.push(plusOne);
  }

  const ticketInputs = [guest, ...plusOneGuests].map((g) => buildTicketCreateInput(g.id, eventId));
  await tx.ticket.createMany({ data: ticketInputs });

  return guest.id;
}

export async function listGuests(
  user: AuthUser,
  eventId: string,
  query: { search?: string; categoryId?: string; status?: "checked_in" | "not_arrived" },
) {
  await loadEventAccess(user, eventId);

  const where: Prisma.GuestWhereInput = { eventId, isPlusOne: false };
  if (query.search) {
    where.OR = [
      { fullName: { contains: query.search, mode: "insensitive" } },
      { contact: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.categoryId) where.categoryId = query.categoryId;

  const guests = await prisma.guest.findMany({ where, include: guestInclude, orderBy: { createdAt: "asc" } });

  if (!query.status) return guests;

  return guests.filter((guest) => {
    const allTickets = [...guest.tickets, ...guest.plusOnes.flatMap((p) => p.tickets)];
    const anyCheckedIn = allTickets.some((t) => t.status === "CHECKED_IN");
    return query.status === "checked_in" ? anyCheckedIn : !anyCheckedIn;
  });
}

export async function getGuest(user: AuthUser, eventId: string, guestId: string) {
  await loadEventAccess(user, eventId);
  const guest = await prisma.guest.findFirst({ where: { id: guestId, eventId, isPlusOne: false }, include: guestInclude });
  if (!guest) throw ApiError.notFound("Guest not found");
  return guest;
}

export async function createGuest(
  user: AuthUser,
  eventId: string,
  input: { fullName: string; contact?: string | null; categoryId?: string | null; tableSeatLabel?: string | null; plusOnesAllowed: number; notes?: string | null },
) {
  const access = await loadEventAccess(user, eventId);
  requireManage(access);

  if (input.categoryId) {
    const category = await prisma.eventCategory.findFirst({ where: { id: input.categoryId, eventId } });
    if (!category) throw ApiError.badRequest("Selected category does not belong to this event");
  }

  const guestId = await prisma.$transaction((tx) => createGuestWithTickets(tx, eventId, input));
  return prisma.guest.findUniqueOrThrow({ where: { id: guestId }, include: guestInclude });
}

export async function updateGuest(
  user: AuthUser,
  eventId: string,
  guestId: string,
  input: Partial<{ fullName: string; contact: string | null; categoryId: string | null; tableSeatLabel: string | null; notes: string | null }>,
) {
  const access = await loadEventAccess(user, eventId);
  requireManage(access);

  const guest = await prisma.guest.findFirst({ where: { id: guestId, eventId } });
  if (!guest) throw ApiError.notFound("Guest not found");

  if (input.categoryId) {
    const category = await prisma.eventCategory.findFirst({ where: { id: input.categoryId, eventId } });
    if (!category) throw ApiError.badRequest("Selected category does not belong to this event");
  }

  await prisma.guest.update({ where: { id: guestId }, data: input });
  return prisma.guest.findUniqueOrThrow({ where: { id: guestId }, include: guestInclude });
}

export async function deleteGuest(user: AuthUser, eventId: string, guestId: string) {
  const access = await loadEventAccess(user, eventId);
  requireManage(access);
  const guest = await prisma.guest.findFirst({ where: { id: guestId, eventId, isPlusOne: false } });
  if (!guest) throw ApiError.notFound("Guest not found");
  await prisma.guest.delete({ where: { id: guestId } });
}

// --- CSV bulk import ---

const HEADER_ALIASES: Record<string, string[]> = {
  fullName: ["full_name", "fullname", "name", "guest name", "guest_name"],
  contact: ["contact", "email", "phone", "email/phone", "email_or_phone"],
  category: ["category", "type", "importance"],
  tableSeat: ["table_seat", "table/seat", "table", "seat", "table_seat_label"],
  plusOnes: ["plus_ones", "plusones", "plus_one", "plus-ones"],
  notes: ["notes", "note", "comment", "comments"],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function buildHeaderMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const match = headers.find((h) => aliases.includes(normalizeHeader(h)));
    if (match) map[field] = match;
  }
  return map;
}

export interface CsvImportRowError {
  row: number;
  message: string;
}

export async function bulkImportGuests(user: AuthUser, eventId: string, csvBuffer: Buffer) {
  const access = await loadEventAccess(user, eventId);
  requireManage(access);

  let records: Record<string, string>[];
  try {
    records = parse(csvBuffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (err) {
    throw ApiError.badRequest("Could not parse CSV file", { reason: (err as Error).message });
  }

  if (records.length === 0) {
    throw ApiError.badRequest("CSV file has no data rows");
  }
  if (records.length > 5000) {
    throw ApiError.badRequest("CSV import is limited to 5000 rows per file");
  }

  const headerMap = buildHeaderMap(Object.keys(records[0]));
  if (!headerMap.fullName) {
    throw ApiError.badRequest("CSV must include a name column (e.g. 'full_name' or 'name')");
  }

  const existingCategories = await prisma.eventCategory.findMany({ where: { eventId } });
  const categoryByName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c]));
  let categorySortCursor = existingCategories.length;

  const errors: CsvImportRowError[] = [];
  let created = 0;

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2; // account for header row, 1-indexed
      const record = records[i];
      const fullName = headerMap.fullName ? record[headerMap.fullName]?.trim() : "";

      if (!fullName) {
        errors.push({ row: rowNum, message: "Missing guest name" });
        continue;
      }

      let categoryId: string | null = null;
      const categoryName = headerMap.category ? record[headerMap.category]?.trim() : "";
      if (categoryName) {
        const key = categoryName.toLowerCase();
        let category = categoryByName.get(key);
        if (!category) {
          category = await tx.eventCategory.create({
            data: { eventId, name: categoryName, sortOrder: categorySortCursor++ },
          });
          categoryByName.set(key, category);
        }
        categoryId = category.id;
      }

      const plusOnesRaw = headerMap.plusOnes ? record[headerMap.plusOnes]?.trim() : "";
      const plusOnesAllowed = plusOnesRaw ? Number.parseInt(plusOnesRaw, 10) : 0;
      if (plusOnesRaw && (Number.isNaN(plusOnesAllowed) || plusOnesAllowed < 0 || plusOnesAllowed > 20)) {
        errors.push({ row: rowNum, message: `Invalid plus_ones value "${plusOnesRaw}" (must be 0-20)` });
        continue;
      }

      await createGuestWithTickets(tx, eventId, {
        fullName,
        contact: headerMap.contact ? record[headerMap.contact]?.trim() || null : null,
        categoryId,
        tableSeatLabel: headerMap.tableSeat ? record[headerMap.tableSeat]?.trim() || null : null,
        plusOnesAllowed: plusOnesAllowed || 0,
        notes: headerMap.notes ? record[headerMap.notes]?.trim() || null : null,
      });
      created++;
    }
  });

  return { created, skipped: errors.length, errors };
}
