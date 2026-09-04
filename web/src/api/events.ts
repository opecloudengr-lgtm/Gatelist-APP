import { api } from "../lib/api";
import type { EventAccess, EventCategory, EventDetail, EventSummary, PendingInvite, StaffRow } from "../types";

export async function listEvents() {
  const { data } = await api.get<{ events: EventSummary[] }>("/events");
  return data.events;
}

export async function createEvent(input: { name: string; dateTime: string; venue: string; description?: string; capacity?: number | null }) {
  const { data } = await api.post<{ event: EventDetail }>("/events", input);
  return data.event;
}

export async function getEvent(eventId: string) {
  const { data } = await api.get<{ event: EventDetail; access: EventAccess }>(`/events/${eventId}`);
  return data;
}

export async function updateEvent(eventId: string, input: Partial<{ name: string; dateTime: string; venue: string; description: string | null; capacity: number | null }>) {
  const { data } = await api.patch<{ event: EventDetail }>(`/events/${eventId}`, input);
  return data.event;
}

export async function deleteEvent(eventId: string) {
  await api.delete(`/events/${eventId}`);
}

export async function createCategory(eventId: string, input: { name: string; color?: string }) {
  const { data } = await api.post<{ category: EventCategory }>(`/events/${eventId}/categories`, input);
  return data.category;
}

export async function updateCategory(eventId: string, categoryId: string, input: Partial<{ name: string; color: string }>) {
  const { data } = await api.patch<{ category: EventCategory }>(`/events/${eventId}/categories/${categoryId}`, input);
  return data.category;
}

export async function deleteCategory(eventId: string, categoryId: string) {
  await api.delete(`/events/${eventId}/categories/${categoryId}`);
}

export async function listStaff(eventId: string) {
  const { data } = await api.get<{ staff: StaffRow[]; pendingInvites: PendingInvite[] }>(`/events/${eventId}/staff`);
  return data;
}

export async function inviteStaff(eventId: string, input: { email: string; role: "CO_ORGANIZER" | "STAFF"; canScan: boolean; canEditGuestList: boolean }) {
  const { data } = await api.post(`/events/${eventId}/staff/invite`, input);
  return data;
}

export async function updateStaffPermissions(eventId: string, staffId: string, input: Partial<{ role: "CO_ORGANIZER" | "STAFF"; canScan: boolean; canEditGuestList: boolean }>) {
  const { data } = await api.patch<{ staffRow: StaffRow }>(`/events/${eventId}/staff/${staffId}`, input);
  return data.staffRow;
}

export async function removeStaff(eventId: string, staffId: string) {
  await api.delete(`/events/${eventId}/staff/${staffId}`);
}
