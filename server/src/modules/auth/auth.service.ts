import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { hashPassword, comparePassword } from "../../lib/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import { sendEmail, verificationEmail, passwordResetEmail } from "../../lib/email.js";
import { ApiError } from "../../lib/errors.js";
import { env } from "../../lib/env.js";
import type { GlobalRole } from "@prisma/client";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function publicUser(user: { id: string; name: string; email: string; role: GlobalRole; emailVerified: boolean }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified };
}

function issueTokenPair(user: { id: string; role: GlobalRole; email: string }) {
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role, email: user.email }),
    refreshToken: signRefreshToken(user.id),
  };
}

export async function register(input: { name: string; email: string; password: string; role: "ORGANIZER" | "STAFF" }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const verificationToken = newToken();

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      verificationToken,
      verificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });

  const verifyUrl = `${env.WEB_APP_URL}/verify-email?token=${verificationToken}`;
  const email = verificationEmail(user.name, verifyUrl);
  await sendEmail({ to: user.email, ...email });

  return { user: publicUser(user) };
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({ where: { verificationToken: token } });
  if (!user || !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
    throw ApiError.badRequest("Verification link is invalid or has expired");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null, verificationTokenExpiresAt: null },
  });

  return { user: publicUser(updated), ...issueTokenPair(updated) };
}

export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Do not reveal whether the account exists.
  if (!user || user.emailVerified) return;

  const verificationToken = newToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken, verificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS) },
  });

  const verifyUrl = `${env.WEB_APP_URL}/verify-email?token=${verificationToken}`;
  const emailContent = verificationEmail(user.name, verifyUrl);
  await sendEmail({ to: user.email, ...emailContent });
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized("Incorrect email or password");

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Incorrect email or password");

  if (!user.emailVerified) {
    throw new ApiError(403, "EMAIL_NOT_VERIFIED", "Please verify your email before logging in");
  }

  return { user: publicUser(user), ...issueTokenPair(user) };
}

export async function refresh(refreshToken: string) {
  let claims: { sub: string };
  try {
    claims = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Session expired, please log in again");
  }
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) throw ApiError.unauthorized();
  return { user: publicUser(user), ...issueTokenPair(user) };
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // do not reveal account existence

  const resetToken = newToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  const resetUrl = `${env.WEB_APP_URL}/reset-password?token=${resetToken}`;
  const emailContent = passwordResetEmail(user.name, resetUrl);
  await sendEmail({ to: user.email, ...emailContent });
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({ where: { resetToken: token } });
  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    throw ApiError.badRequest("Reset link is invalid or has expired");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
  });
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");
  return publicUser(user);
}
