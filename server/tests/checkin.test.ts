import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { app, request, resetDb, createVerifiedUser, createEventWithCategory, authed } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

async function makeGuestWithTicket(eventId: string, accessToken: string, categoryId: string) {
  const res = await request(app)
    .post(`/api/events/${eventId}/guests`)
    .set(authed(accessToken))
    .send({ fullName: "Chidi Okafor", categoryId, plusOnesAllowed: 0 });
  expect(res.status).toBe(201);
  return res.body.guest.tickets[0] as { id: string; uniqueToken: string };
}

describe("check-in / scan verify", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("valid scan checks a guest in; the same ticket scanned again is rejected as duplicate", async () => {
    const { user, accessToken } = await createVerifiedUser({ email: "organizer@example.com" });
    const { event, category } = await createEventWithCategory(user.id);
    const ticket = await makeGuestWithTicket(event.id, accessToken, category.id);

    const first = await request(app).post(`/api/events/${event.id}/checkin/scan`).set(authed(accessToken)).send({ token: ticket.uniqueToken, device: "gate-1" });
    expect(first.status).toBe(200);
    expect(first.body.outcome).toBe("VALID");

    const second = await request(app).post(`/api/events/${event.id}/checkin/scan`).set(authed(accessToken)).send({ token: ticket.uniqueToken, device: "gate-2" });
    expect(second.status).toBe(200);
    expect(second.body.outcome).toBe("DUPLICATE");
    expect(second.body.previousCheckIn.at).toBeTruthy();
  });

  it("rejects a tampered token and a token from a different event as invalid", async () => {
    const { user, accessToken } = await createVerifiedUser({ email: "organizer2@example.com" });
    const { event, category } = await createEventWithCategory(user.id);
    const otherEvent = await prisma.event.create({
      data: { organizerId: user.id, name: "Other Event", dateTime: new Date(), venue: "Elsewhere" },
    });
    const ticket = await makeGuestWithTicket(event.id, accessToken, category.id);

    const tampered = await request(app)
      .post(`/api/events/${event.id}/checkin/scan`)
      .set(authed(accessToken))
      .send({ token: ticket.uniqueToken.slice(0, -2) + "xx" });
    expect(tampered.body.outcome).toBe("INVALID");

    const wrongEvent = await request(app).post(`/api/events/${otherEvent.id}/checkin/scan`).set(authed(accessToken)).send({ token: ticket.uniqueToken });
    expect(wrongEvent.body.outcome).toBe("INVALID");
  });

  it("resolves simultaneous scans of the same ticket with exactly one winner (no duplicate check-ins slip through)", async () => {
    const { user, accessToken } = await createVerifiedUser({ email: "organizer3@example.com" });
    const { event, category } = await createEventWithCategory(user.id);
    const ticket = await makeGuestWithTicket(event.id, accessToken, category.id);

    const attempts = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post(`/api/events/${event.id}/checkin/scan`).set(authed(accessToken)).send({ token: ticket.uniqueToken })),
    );

    const outcomes = attempts.map((r) => r.body.outcome);
    expect(outcomes.filter((o) => o === "VALID")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "DUPLICATE")).toHaveLength(4);

    const finalTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(finalTicket.status).toBe("CHECKED_IN");
  });

  it("voiding a ticket invalidates it and reissuing creates a fresh, distinct ticket", async () => {
    const { user, accessToken } = await createVerifiedUser({ email: "organizer4@example.com" });
    const { event, category } = await createEventWithCategory(user.id);
    const ticket = await makeGuestWithTicket(event.id, accessToken, category.id);

    const voidRes = await request(app).post(`/api/events/${event.id}/tickets/${ticket.id}/void`).set(authed(accessToken));
    expect(voidRes.status).toBe(200);

    const scanVoided = await request(app).post(`/api/events/${event.id}/checkin/scan`).set(authed(accessToken)).send({ token: ticket.uniqueToken });
    expect(scanVoided.body.outcome).toBe("INVALID");

    const reissueRes = await request(app).post(`/api/events/${event.id}/tickets/${ticket.id}/reissue`).set(authed(accessToken));
    expect(reissueRes.status).toBe(201);
    const newTicket = reissueRes.body.ticket;
    expect(newTicket.id).not.toBe(ticket.id);

    const scanNew = await request(app).post(`/api/events/${event.id}/checkin/scan`).set(authed(accessToken)).send({ token: newTicket.uniqueToken });
    expect(scanNew.body.outcome).toBe("VALID");
  });

  it("blocks staff without scan permission, and blocks users with no access to the event", async () => {
    const { user: organizer, accessToken: organizerToken } = await createVerifiedUser({ email: "organizer5@example.com" });
    const { event, category } = await createEventWithCategory(organizer.id);
    const ticket = await makeGuestWithTicket(event.id, organizerToken, category.id);

    const { user: staffUser, accessToken: staffToken } = await createVerifiedUser({ email: "staff5@example.com", role: "STAFF" });
    await prisma.eventStaff.create({ data: { eventId: event.id, userId: staffUser.id, role: "STAFF", canScan: false } });

    const blocked = await request(app).post(`/api/events/${event.id}/checkin/scan`).set(authed(staffToken)).send({ token: ticket.uniqueToken });
    expect(blocked.status).toBe(403);

    const { accessToken: strangerToken } = await createVerifiedUser({ email: "stranger5@example.com" });
    const noAccess = await request(app).post(`/api/events/${event.id}/checkin/scan`).set(authed(strangerToken)).send({ token: ticket.uniqueToken });
    expect(noAccess.status).toBe(403);

    const unauthenticated = await request(app).post(`/api/events/${event.id}/checkin/scan`).send({ token: ticket.uniqueToken });
    expect(unauthenticated.status).toBe(401);
  });

  it("logs manual check-ins distinctly and records an audit trail entry per attempt", async () => {
    const { user, accessToken } = await createVerifiedUser({ email: "organizer6@example.com" });
    const { event, category } = await createEventWithCategory(user.id);
    const ticket = await makeGuestWithTicket(event.id, accessToken, category.id);

    const manual = await request(app).post(`/api/events/${event.id}/checkin/manual`).set(authed(accessToken)).send({ ticketId: ticket.id, device: "front-desk" });
    expect(manual.status).toBe(200);
    expect(manual.body.outcome).toBe("VALID");

    const logs = await prisma.checkInLog.findMany({ where: { eventId: event.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].result).toBe("MANUAL");
  });

  it("offline sync is idempotent: replaying the same clientScanId does not double check-in or double-log", async () => {
    const { user, accessToken } = await createVerifiedUser({ email: "organizer7@example.com" });
    const { event, category } = await createEventWithCategory(user.id);
    const ticket = await makeGuestWithTicket(event.id, accessToken, category.id);

    const scanPayload = { scans: [{ token: ticket.uniqueToken, clientScanId: "device-1-scan-1", device: "device-1" }] };

    const firstSync = await request(app).post(`/api/events/${event.id}/checkin/sync`).set(authed(accessToken)).send(scanPayload);
    expect(firstSync.body.results[0].outcome).toBe("VALID");

    const replaySync = await request(app).post(`/api/events/${event.id}/checkin/sync`).set(authed(accessToken)).send(scanPayload);
    expect(replaySync.body.results[0].outcome).toBe("VALID");

    const logs = await prisma.checkInLog.findMany({ where: { eventId: event.id, ticketId: ticket.id } });
    expect(logs).toHaveLength(1);
  });

  it("dashboard stats reflect invited vs checked-in counts per category", async () => {
    const { user, accessToken } = await createVerifiedUser({ email: "organizer8@example.com" });
    const { event, category } = await createEventWithCategory(user.id);
    const ticketA = await makeGuestWithTicket(event.id, accessToken, category.id);
    await makeGuestWithTicket(event.id, accessToken, category.id);

    await request(app).post(`/api/events/${event.id}/checkin/scan`).set(authed(accessToken)).send({ token: ticketA.uniqueToken });

    const stats = await request(app).get(`/api/events/${event.id}/dashboard/stats`).set(authed(accessToken));
    expect(stats.status).toBe(200);
    expect(stats.body.totals).toEqual({ invited: 2, checkedIn: 1 });
    const vip = stats.body.categories.find((c: { name: string }) => c.name === "VIP");
    expect(vip).toMatchObject({ invited: 2, checkedIn: 1 });
  });
});
