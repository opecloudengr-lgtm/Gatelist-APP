import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listGuests, deleteGuest } from "../../api/guests";
import { Card, CategoryBadge, StatusBadge } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { TextField, SelectField } from "../../components/ui/Field";
import { GuestFormModal } from "../../components/guests/GuestFormModal";
import { CsvImportModal } from "../../components/guests/CsvImportModal";
import { TicketModal } from "../../components/tickets/TicketModal";
import { useToast } from "../../components/ui/Toast";
import { apiErrorMessage } from "../../lib/api";
import type { EventOutletContext } from "./EventDetailLayout";
import type { Guest, Ticket } from "../../types";

export default function EventGuestsTab() {
  const { event } = useOutletContext<EventOutletContext>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"" | "checked_in" | "not_arrived">("");
  const [showAdd, setShowAdd] = useState(false);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [ticketView, setTicketView] = useState<{ guest: Guest; ticket: Ticket } | null>(null);

  const queryKey = ["guests", event.id, { search, categoryId, status }];
  const { data: guests, isLoading } = useQuery({
    queryKey,
    queryFn: () => listGuests(event.id, { search: search || undefined, categoryId: categoryId || undefined, status: status || undefined }),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["guests", event.id] });
    queryClient.invalidateQueries({ queryKey: ["event", event.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", event.id] });
  }

  async function onDelete(guest: Guest) {
    if (!confirm(`Remove ${guest.fullName} and their ticket${guest.plusOnesAllowed ? "s" : ""}? This can't be undone.`)) return;
    try {
      await deleteGuest(event.id, guest.id);
      toast.push("Guest removed.", "success");
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <TextField placeholder="Search guests…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-56" />
        <SelectField value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-auto">
          <option value="">All categories</option>
          {event.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <SelectField value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-auto">
          <option value="">All guests</option>
          <option value="checked_in">Checked in</option>
          <option value="not_arrived">Not arrived</option>
        </SelectField>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            Import CSV
          </Button>
          <Button onClick={() => setShowAdd(true)}>Add guest</Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-mist-400">Loading guests…</p>}

      {!isLoading && guests?.length === 0 && (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <p className="font-display text-lg text-ink-950">No guests match yet</p>
          <p className="text-sm text-mist-400">Add guests one at a time or import a CSV list to generate tickets instantly.</p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {guests?.map((guest) => {
          const ticket = guest.tickets[0];
          return (
            <Card key={guest.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink-950">{guest.fullName}</span>
                  {guest.category && <CategoryBadge name={guest.category.name} color={guest.category.color} />}
                  {ticket && <StatusBadge status={ticket.status} />}
                </div>
                <div className="flex flex-wrap gap-x-3 text-xs text-mist-400">
                  {guest.contact && <span>{guest.contact}</span>}
                  {guest.tableSeatLabel && <span>Table/seat: {guest.tableSeatLabel}</span>}
                  {guest.plusOnesAllowed > 0 && <span>+{guest.plusOnesAllowed} plus-one{guest.plusOnesAllowed > 1 ? "s" : ""}</span>}
                </div>
                {guest.plusOnes.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {guest.plusOnes.map((po) => (
                      <button
                        key={po.id}
                        onClick={() => po.tickets[0] && setTicketView({ guest: po as unknown as Guest, ticket: po.tickets[0] })}
                        className="rounded-full bg-mist-100 px-2.5 py-1 text-xs font-medium text-mist-400 hover:bg-mist-200"
                      >
                        {po.fullName.split("—").pop()?.trim()} · {po.tickets[0]?.status === "CHECKED_IN" ? "in" : "ticket"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {ticket && (
                  <Button size="sm" variant="secondary" onClick={() => setTicketView({ guest, ticket })}>
                    View ticket
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setEditGuest(guest)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(guest)}>
                  Remove
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {showAdd && <GuestFormModal eventId={event.id} categories={event.categories} onClose={() => setShowAdd(false)} onSaved={refresh} />}
      {editGuest && (
        <GuestFormModal eventId={event.id} categories={event.categories} guest={editGuest} onClose={() => setEditGuest(null)} onSaved={refresh} />
      )}
      {showImport && <CsvImportModal eventId={event.id} onClose={() => setShowImport(false)} onImported={refresh} />}
      {ticketView && (
        <TicketModal
          eventId={event.id}
          guestName={ticketView.guest.fullName}
          category={ticketView.guest.category}
          ticket={ticketView.ticket}
          onClose={() => setTicketView(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
