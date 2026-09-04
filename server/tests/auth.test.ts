import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { app, request, resetDb } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

describe("auth", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("registers, blocks login before verification, then allows login after verifying", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Ada Organizer",
      email: "ada@example.com",
      password: "pass1234",
      confirmPassword: "pass1234",
      role: "ORGANIZER",
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.user.emailVerified).toBe(false);

    const loginBeforeVerify = await request(app).post("/api/auth/login").send({ email: "ada@example.com", password: "pass1234" });
    expect(loginBeforeVerify.status).toBe(403);
    expect(loginBeforeVerify.body.error.code).toBe("EMAIL_NOT_VERIFIED");

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "ada@example.com" } });
    const verifyRes = await request(app).post("/api/auth/verify-email").send({ token: user.verificationToken });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.accessToken).toBeTruthy();

    const loginAfterVerify = await request(app).post("/api/auth/login").send({ email: "ada@example.com", password: "pass1234" });
    expect(loginAfterVerify.status).toBe(200);
    expect(loginAfterVerify.body.user.emailVerified).toBe(true);
  });

  it("rejects weak passwords and mismatched confirmation", async () => {
    const weak = await request(app).post("/api/auth/register").send({
      name: "Weak Pw",
      email: "weak@example.com",
      password: "short",
      confirmPassword: "short",
    });
    expect(weak.status).toBe(400);

    const mismatch = await request(app).post("/api/auth/register").send({
      name: "Mismatch",
      email: "mismatch@example.com",
      password: "pass1234",
      confirmPassword: "different1",
    });
    expect(mismatch.status).toBe(400);
  });

  it("never reveals whether an email exists on forgot-password", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({ email: "nobody@example.com" });
    expect(res.status).toBe(200);
  });

  it("rejects duplicate registration for an existing email", async () => {
    await request(app).post("/api/auth/register").send({
      name: "First",
      email: "dup@example.com",
      password: "pass1234",
      confirmPassword: "pass1234",
    });
    const second = await request(app).post("/api/auth/register").send({
      name: "Second",
      email: "dup@example.com",
      password: "pass1234",
      confirmPassword: "pass1234",
    });
    expect(second.status).toBe(409);
  });
});
