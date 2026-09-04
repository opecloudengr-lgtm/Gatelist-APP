import crypto from "node:crypto";
import { env } from "./env.js";

/**
 * GateList tickets are QR-encoded, HMAC-signed reference tokens — never the raw
 * guest record. The signature stops a scanned/forwarded QR from being edited to
 * point at a different event or guest; the database row (looked up by the token)
 * remains the single source of truth for check-in status.
 */

export interface TicketTokenPayload {
  ticketId: string;
  eventId: string;
  guestId: string;
  nonce: string;
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function sign(payload: string): string {
  return base64url(crypto.createHmac("sha256", env.TICKET_SIGNING_SECRET).update(payload).digest());
}

export function generateTicketToken(payload: Omit<TicketTokenPayload, "nonce">): string {
  const full: TicketTokenPayload = { ...payload, nonce: crypto.randomBytes(6).toString("hex") };
  const body = base64url(Buffer.from(JSON.stringify(full), "utf8"));
  const signature = sign(body);
  return `GLT1.${body}.${signature}`;
}

export function verifyTicketToken(token: string): TicketTokenPayload | null {
  if (typeof token !== "string") return null;
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "GLT1") return null;
  const [, body, signature] = parts;
  const expected = sign(body);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(fromBase64url(body).toString("utf8"));
    if (
      typeof parsed.ticketId === "string" &&
      typeof parsed.eventId === "string" &&
      typeof parsed.guestId === "string"
    ) {
      return parsed as TicketTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}
