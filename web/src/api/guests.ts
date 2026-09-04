import { api } from "../lib/api";
import type { Guest } from "../types";

export async function listGuests(eventId: string, params?: { search?: string; categoryId?: string; status?: "checked_in" | "not_arrived" }) {
  const { data } = await api.get<{ guests: Guest[] }>(`/events/${eventId}/guests`, { params });
  return data.guests;
}

export async function createGuest(
  eventId: string,
  input: { fullName: string; contact?: string; categoryId?: string | null; tableSeatLabel?: string; plusOnesAllowed?: number; notes?: string },
) {
  const { data } = await api.post<{ guest: Guest }>(`/events/${eventId}/guests`, input);
  return data.guest;
}

export async function updateGuest(
  eventId: string,
  guestId: string,
  input: Partial<{ fullName: string; contact: string | null; categoryId: string | null; tableSeatLabel: string | null; notes: string | null }>,
) {
  const { data } = await api.patch<{ guest: Guest }>(`/events/${eventId}/guests/${guestId}`, input);
  return data.guest;
}

export async function deleteGuest(eventId: string, guestId: string) {
  await api.delete(`/events/${eventId}/guests/${guestId}`);
}

export interface CsvImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export async function importGuestsCsv(eventId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<CsvImportResult>(`/events/${eventId}/guests/import`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
