import { api } from "../lib/api";
import type { User } from "../types";

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export async function register(input: { name: string; email: string; password: string; confirmPassword: string; role: "ORGANIZER" | "STAFF" }) {
  const { data } = await api.post<{ user: User }>("/auth/register", input);
  return data;
}

export async function verifyEmail(token: string) {
  const { data } = await api.post<Session>("/auth/verify-email", { token });
  return data;
}

export async function resendVerification(email: string) {
  await api.post("/auth/resend-verification", { email });
}

export async function login(email: string, password: string) {
  const { data } = await api.post<Session>("/auth/login", { email, password });
  return data;
}

export async function forgotPassword(email: string) {
  await api.post("/auth/forgot-password", { email });
}

export async function resetPassword(input: { token: string; password: string; confirmPassword: string }) {
  await api.post("/auth/reset-password", input);
}

export async function fetchMe() {
  const { data } = await api.get<{ user: User }>("/auth/me");
  return data.user;
}

export async function getStaffInvite(token: string) {
  const { data } = await api.get(`/staff-invites/${token}`);
  return data.invite as { email: string; role: string; event: { name: string; venue: string; dateTime: string }; invitedBy: { name: string } };
}

export async function acceptStaffInvite(token: string, input: { name: string; password: string; confirmPassword: string }) {
  const { data } = await api.post<Session & { eventId: string }>(`/staff-invites/${token}/accept`, input);
  return data;
}
