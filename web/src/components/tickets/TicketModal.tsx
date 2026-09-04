import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { StatusBadge, CategoryBadge } from "../ui/Card";
import { fetchTicketQrBlobUrl, voidTicket, reissueTicket } from "../../api/tickets";
import { apiErrorMessage } from "../../lib/api";
import { useToast } from "../ui/Toast";
import type { Ticket, EventCategory } from "../../types";
import { format } from "date-fns";

export function TicketModal({
  eventId,
  guestName,
  category,
  ticket,
  onClose,
  onChanged,
}: {
  eventId: string;
  guestName: string;
  category: EventCategory | null;
  ticket: Ticket;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let revoked = "";
    if (ticket.status !== "VOID") {
      fetchTicketQrBlobUrl(eventId, ticket.id).then((url) => {
        revoked = url;
        setQrUrl(url);
      });
    }
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [eventId, ticket.id, ticket.status]);

  async function onVoid() {
    setBusy(true);
    try {
      await voidTicket(eventId, ticket.id);
      toast.push("Ticket voided.", "success");
      onChanged();
      onClose();
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function onReissue() {
    setBusy(true);
    try {
      await reissueTicket(eventId, ticket.id);
      toast.push("New ticket issued — the old QR code no longer works.", "success");
      onChanged();
      onClose();
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  function onDownload() {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${guestName.replace(/\s+/g, "-").toLowerCase()}-ticket.png`;
    a.click();
  }

  return (
    <Modal title={guestName} onClose={onClose}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          {category && <CategoryBadge name={category.name} color={category.color} />}
          <StatusBadge status={ticket.status} />
        </div>

        {ticket.status === "VOID" ? (
          <div className="flex h-56 w-56 items-center justify-center rounded-xl2 border-2 border-dashed border-mist-200 text-center text-sm text-mist-400">
            This ticket has been voided and can no longer be used.
          </div>
        ) : qrUrl ? (
          <img src={qrUrl} alt={`QR ticket for ${guestName}`} className="h-56 w-56 rounded-xl2 border border-mist-200 p-2" />
        ) : (
          <div className="h-56 w-56 animate-pulse rounded-xl2 bg-mist-100" />
        )}

        {ticket.status === "CHECKED_IN" && ticket.checkedInAt && (
          <p className="text-sm text-mist-400">Checked in {format(new Date(ticket.checkedInAt), "PPP · p")}</p>
        )}

        <div className="flex w-full flex-col gap-2">
          {ticket.status !== "VOID" && qrUrl && (
            <Button variant="secondary" onClick={onDownload} fullWidth>
              Download QR image
            </Button>
          )}
          {ticket.status === "ISSUED" && (
            <Button variant="danger" onClick={onVoid} loading={busy} fullWidth>
              Void ticket
            </Button>
          )}
          {ticket.status === "VOID" && (
            <Button onClick={onReissue} loading={busy} fullWidth>
              Reissue new ticket
            </Button>
          )}
          {ticket.status === "CHECKED_IN" && (
            <p className="text-center text-xs text-mist-400">Checked-in tickets can't be voided. Contact support if this was a mistake.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
