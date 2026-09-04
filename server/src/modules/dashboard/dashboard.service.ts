import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { loadEventAccess } from "../../lib/eventAccess.js";
import type { AuthUser } from "../../middleware/auth.js";

interface CategoryBreakdownRow {
  category_id: string | null;
  category_name: string;
  category_color: string;
  invited: bigint;
  checked_in: bigint;
}

export async function getDashboardStats(user: AuthUser, eventId: string) {
  await loadEventAccess(user, eventId);

  const rows = await prisma.$queryRaw<CategoryBreakdownRow[]>(Prisma.sql`
    SELECT
      ec.id AS category_id,
      COALESCE(ec.name, 'Uncategorized') AS category_name,
      COALESCE(ec.color, '#94A3B8') AS category_color,
      COUNT(t.id) FILTER (WHERE t.status != 'VOID') AS invited,
      COUNT(t.id) FILTER (WHERE t.status = 'CHECKED_IN') AS checked_in
    FROM "EventCategory" ec
    LEFT JOIN "Guest" g ON g."categoryId" = ec.id
    LEFT JOIN "Ticket" t ON t."guestId" = g.id
    WHERE ec."eventId" = ${eventId}
    GROUP BY ec.id, ec.name, ec.color, ec."sortOrder"

    UNION ALL

    SELECT
      NULL AS category_id,
      'Uncategorized' AS category_name,
      '#94A3B8' AS category_color,
      COUNT(t.id) FILTER (WHERE t.status != 'VOID') AS invited,
      COUNT(t.id) FILTER (WHERE t.status = 'CHECKED_IN') AS checked_in
    FROM "Guest" g
    LEFT JOIN "Ticket" t ON t."guestId" = g.id
    WHERE g."eventId" = ${eventId} AND g."categoryId" IS NULL
  `);

  const categories = rows
    .map((r) => ({
      categoryId: r.category_id,
      name: r.category_name,
      color: r.category_color,
      invited: Number(r.invited),
      checkedIn: Number(r.checked_in),
    }))
    .filter((c) => c.invited > 0 || c.categoryId !== null);

  const totals = categories.reduce(
    (acc, c) => ({ invited: acc.invited + c.invited, checkedIn: acc.checkedIn + c.checkedIn }),
    { invited: 0, checkedIn: 0 },
  );

  const [voidedCount, manualCount] = await Promise.all([
    prisma.ticket.count({ where: { eventId, status: "VOID" } }),
    prisma.checkInLog.count({ where: { eventId, result: "MANUAL" } }),
  ]);

  return { totals, categories, voidedCount, manualCount };
}

export async function getAttendanceRows(user: AuthUser, eventId: string) {
  await loadEventAccess(user, eventId);
  const guests = await prisma.guest.findMany({
    where: { eventId },
    include: { category: true, tickets: true, primaryGuest: { select: { fullName: true } } },
    orderBy: [{ isPlusOne: "asc" }, { createdAt: "asc" }],
  });

  return guests.map((guest) => {
    const ticket = guest.tickets[0];
    return {
      fullName: guest.fullName,
      relatedTo: guest.primaryGuest?.fullName ?? "",
      contact: guest.contact ?? "",
      category: guest.category?.name ?? "",
      tableSeat: guest.tableSeatLabel ?? "",
      ticketStatus: ticket?.status ?? "N/A",
      checkedInAt: ticket?.checkedInAt ? ticket.checkedInAt.toISOString() : "",
      source: ticket?.source ?? "",
      notes: guest.notes ?? "",
    };
  });
}
