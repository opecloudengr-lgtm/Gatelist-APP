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

export async function downloadTicketPdf(eventId: string, ticketId: string, guestName: string) {
  const { data } = await api.get(`/events/${eventId}/tickets/${ticketId}/ticket.pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${guestName.replace(/\s+/g, "-").toLowerCase()}-ticket.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
