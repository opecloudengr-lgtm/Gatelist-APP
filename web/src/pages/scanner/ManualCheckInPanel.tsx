import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { TextField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { StatusBadge, CategoryBadge } from "../../components/ui/Card";
import { listGuests } from "../../api/guests";
import { manualCheckIn } from "../../api/checkin";
import { apiErrorMessage } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import type { Guest } from "../../types";

export function ManualCheckInPanel({
  eventId,
  onClose,
  onCheckedIn,
}: {
  eventId: string;
  onClose: () => void;
  onCheckedIn: (result: { outcome: "VALID" | "DUPLICATE" | "INVALID"; guestName?: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (query.trim().length < 2) {
      setGuests([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        setGuests(await listGuests(eventId, { search: query.trim() }));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, eventId]);

  async function checkIn(ticketId: string, name: string) {
    setBusyTicketId(ticketId);
    try {
      const result = await manualCheckIn(eventId, { ticketId });
      onCheckedIn({ outcome: result.outcome, guestName: name });
      toast.push(
        result.outcome === "VALID" ? `${name} checked in.` : result.outcome === "DUPLICATE" ? `${name} was already checked in.` : `${name}'s ticket is not valid.`,
        result.outcome === "VALID" ? "success" : "error",
      );
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    } finally {
      setBusyTicketId(null);
    }
  }

  return (
    <Modal title="Manual check-in" onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <TextField autoFocus placeholder="Search by guest name…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {loading && <p className="text-sm text-mist-400">Searching…</p>}
        <div className="flex flex-col gap-2">
          {guests.map((guest) => (
            <div key={guest.id} className="rounded-xl border border-mist-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink-950">{guest.fullName}</span>
                  {guest.category && <CategoryBadge name={guest.category.name} color={guest.category.color} />}
                </div>
                {guest.tickets[0] && (
                  <TicketRow ticket={guest.tickets[0]} busy={busyTicketId === guest.tickets[0].id} onCheckIn={() => checkIn(guest.tickets[0].id, guest.fullName)} />
                )}
              </div>
              {guest.plusOnes.map((po) =>
                po.tickets[0] ? (
                  <div key={po.id} className="mt-2 flex items-center justify-between border-t border-mist-100 pt-2 pl-4">
                    <span className="text-sm text-mist-400">{po.fullName}</span>
                    <TicketRow ticket={po.tickets[0]} busy={busyTicketId === po.tickets[0].id} onCheckIn={() => checkIn(po.tickets[0].id, po.fullName)} />
                  </div>
                ) : null,
              )}
            </div>
          ))}
          {!loading && query.trim().length >= 2 && guests.length === 0 && <p className="text-sm text-mist-400">No guests match "{query}".</p>}
        </div>
      </div>
    </Modal>
  );
}

function TicketRow({ ticket, busy, onCheckIn }: { ticket: Guest["tickets"][number]; busy: boolean; onCheckIn: () => void }) {
  if (ticket.status === "CHECKED_IN") return <StatusBadge status="CHECKED_IN" />;
  if (ticket.status === "VOID") return <StatusBadge status="VOID" />;
  return (
    <Button size="sm" onClick={onCheckIn} loading={busy}>
      Check in
    </Button>
  );
}
