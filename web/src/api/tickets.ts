import { api } from "../lib/api";
import type { Ticket } from "../types";

export async function voidTicket(eventId: string, ticketId: string) {
  const { data } = await api.post<{ ticket: Ticket }>(`/events/${eventId}/tickets/${ticketId}/void`);
  return data.ticket;
}

export async function reissueTicket(eventId: string, ticketId: string) {
  const { data } = await api.post<{ ticket: Ticket }>(`/events/${eventId}/tickets/${ticketId}/reissue`);
  return data.ticket;
}

export async function fetchTicketQrBlobUrl(eventId: string, ticketId: string) {
  const { data } = await api.get(`/events/${eventId}/tickets/${ticketId}/qr.png`, { responseType: "blob" });
  return URL.createObjectURL(data as Blob);
}
