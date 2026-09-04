import { api } from "../lib/api";
import type { CheckInLogRow, CheckInOutcome } from "../types";

export async function scanCheckIn(eventId: string, input: { token: string; device?: string; clientScanId?: string }) {
  const { data } = await api.post<CheckInOutcome>(`/events/${eventId}/checkin/scan`, input);
  return data;
}

export async function manualCheckIn(eventId: string, input: { ticketId: string; device?: string }) {
  const { data } = await api.post<CheckInOutcome>(`/events/${eventId}/checkin/manual`, input);
  return data;
}

export interface QueuedScan {
  token: string;
  device?: string;
  clientScanId: string;
  scannedAt: string;
}

export async function syncOfflineScans(eventId: string, scans: QueuedScan[]) {
  const { data } = await api.post<{ results: (CheckInOutcome & { clientScanId: string })[] }>(`/events/${eventId}/checkin/sync`, { scans });
  return data.results;
}

export async function listCheckInLogs(eventId: string) {
  const { data } = await api.get<{ logs: CheckInLogRow[] }>(`/events/${eventId}/checkin/logs`);
  return data.logs;
}
