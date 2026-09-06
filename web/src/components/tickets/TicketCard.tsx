import clsx from "clsx";
import { format } from "date-fns";
import type { TicketStatus } from "../../types";

const STATUS_LABEL: Record<TicketStatus, string> = { ISSUED: "Active", CHECKED_IN: "Checked In", VOID: "Voided" };
const STATUS_CLASSES: Record<TicketStatus, string> = {
  ISSUED: "bg-good/15 text-good",
  CHECKED_IN: "bg-brass-400/20 text-brass-100",
  VOID: "bg-bad/15 text-bad",
};

export function shortTicketCode(ticketId: string): string {
  return `GTL-${ticketId.replace(/-/g, "").slice(-8).toUpperCase()}`;
}

interface TicketCardProps {
  eventName: string;
  eventDateTime: string;
  eventVenue: string;
  guestName: string;
  categoryName: string;
  tableSeatLabel: string | null;
  status: TicketStatus;
  ticketId: string;
  qrUrl: string | null;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-mist-400/80">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}

export function TicketCard({ eventName, eventDateTime, eventVenue, guestName, categoryName, tableSeatLabel, status, ticketId, qrUrl }: TicketCardProps) {
  return (
    <div className="relative isolate overflow-hidden rounded-xl2 bg-ink-950 shadow-lifted">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brass-400 opacity-[0.08] blur-2xl" />

      <div className="flex flex-col sm:flex-row">
        <div className="relative flex-1 p-5 sm:pr-8">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] text-brass-300">
              <span className="grid h-4 w-4 place-items-center rounded-full border-[1.5px] border-brass-400">
                <span className="h-1 w-1 rounded-full bg-brass-400" />
              </span>
              GATELIST
            </span>
            <span className={clsx("rounded-full px-3 py-1 text-xs font-bold", STATUS_CLASSES[status])}>{STATUS_LABEL[status]}</span>
          </div>

          <h3 className="font-display mt-3 text-xl leading-snug text-white">{eventName}</h3>
          <p className="mt-1 text-xs text-mist-400">
            {format(new Date(eventDateTime), "EEE, MMM d, yyyy · p")} · {eventVenue}
          </p>

          {/* Mobile divider: horizontal, torn-ticket notches on the card's left/right edges */}
          <div className="relative my-4 sm:hidden">
            <div className="border-t border-dashed border-white/15" />
            <span className="absolute -left-5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-mist-50" />
            <span className="absolute -right-5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-mist-50" />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Field label="Attendee" value={guestName} />
            <Field label="Category" value={categoryName} />
            <Field label="Table / seat" value={tableSeatLabel ?? "—"} />
            <Field label="Status" value={STATUS_LABEL[status]} />
          </div>
        </div>

        {/* Desktop divider: vertical dashed line, notches punched at top/bottom edges */}
        <div className="relative mx-1 hidden w-px shrink-0 sm:block">
          <div className="absolute inset-y-3 border-l border-dashed border-white/15" />
          <span className="absolute -top-1 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-mist-50" />
          <span className="absolute -bottom-1 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-mist-50" />
        </div>

        <div className="flex flex-col items-center justify-center gap-2 p-5 sm:w-48">
          {status === "VOID" ? (
            <div className="flex h-32 w-32 items-center justify-center rounded-xl border-2 border-dashed border-white/15 text-center text-xs text-mist-400">
              Voided — no longer scannable
            </div>
          ) : qrUrl ? (
            <img src={qrUrl} alt="Ticket QR code" className="h-32 w-32 rounded-xl bg-brass-50 p-2" />
          ) : (
            <div className="h-32 w-32 animate-pulse rounded-xl bg-white/5" />
          )}
          <p className="text-[11px] font-semibold tracking-widest text-mist-400">{shortTicketCode(ticketId)}</p>
        </div>
      </div>
    </div>
  );
}
