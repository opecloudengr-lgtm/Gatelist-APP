import { api } from "../lib/api";
import type { DashboardStats } from "../types";

export async function getDashboardStats(eventId: string) {
  const { data } = await api.get<DashboardStats>(`/events/${eventId}/dashboard/stats`);
  return data;
}

export function exportCsvUrl(eventId: string) {
  return `/api/events/${eventId}/dashboard/export.csv`;
}

export function exportPdfUrl(eventId: string) {
  return `/api/events/${eventId}/dashboard/export.pdf`;
}

export async function downloadExport(eventId: string, format: "csv" | "pdf") {
  const { data, headers } = await api.get(`/events/${eventId}/dashboard/export.${format}`, { responseType: "blob" });
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement("a");
  a.href = url;
  const match = /filename="(.+)"/.exec(headers["content-disposition"] ?? "");
  a.download = match?.[1] ?? `attendance.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
