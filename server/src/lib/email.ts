import { logger } from "./logger.js";
import { env } from "./env.js";

/**
 * Dev transport logs the email to stdout so verification/reset flows are testable
 * without a real provider. Swap this module for SendGrid/SES in production by
 * implementing the same sendEmail() signature.
 */
export async function sendEmail(opts: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  if (env.EMAIL_TRANSPORT === "console") {
    logger.info({ to: opts.to, subject: opts.subject }, "email:send (console transport)");
    // eslint-disable-next-line no-console
    console.log(`\n--- EMAIL to ${opts.to} ---\nSubject: ${opts.subject}\n\n${opts.text}\n--- END EMAIL ---\n`);
    return;
  }
  throw new Error(`Unsupported EMAIL_TRANSPORT: ${env.EMAIL_TRANSPORT}`);
}

export function verificationEmail(name: string, verifyUrl: string) {
  return {
    subject: "Verify your GateList account",
    text: `Hi ${name},\n\nWelcome to GateList. Verify your email to activate your account:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n— GateList`,
  };
}

export function passwordResetEmail(name: string, resetUrl: string) {
  return {
    subject: "Reset your GateList password",
    text: `Hi ${name},\n\nWe received a request to reset your GateList password. Reset it here:\n${resetUrl}\n\nIf you didn't request this, you can ignore this email. This link expires in 1 hour.\n\n— GateList`,
  };
}

export function staffInviteEmail(eventName: string, inviterName: string, acceptUrl: string) {
  return {
    subject: `You're invited to help staff "${eventName}" on GateList`,
    text: `Hi,\n\n${inviterName} has invited you to join the door staff for "${eventName}" on GateList. Accept the invite to create your account and get scanner access:\n${acceptUrl}\n\nThis invite expires in 7 days.\n\n— GateList`,
  };
}
