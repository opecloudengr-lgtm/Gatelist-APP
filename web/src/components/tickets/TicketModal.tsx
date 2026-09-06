import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { TicketCard } from "./TicketCard";
import { fetchTicketQrBlobUrl, downloadTicketPdf, voidTicket, reissueTicket } from "../../api/tickets";
import { apiErrorMessage } from "../../lib/api";
import { useToast } from "../ui/Toast";
import type { Ticket, EventCategory } from "../../types";
import { format } from "date-fns";

export function TicketModal({
  eventId,
  eventName,
  eventDateTime,
  eventVenue,
  guestName,
  category,
  tableSeatLabel,
  ticket,
  onClose,
  onChanged,
}: {
  eventId: string;
  eventName: string;
  eventDateTime: string;
  eventVenue: string;
  guestName: string;
  category: EventCategory | null;
  tableSeatLabel: string | null;
  ticket: Ticket;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
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

  async function onDownloadPdf() {
    setDownloading(true);
    try {
      await downloadTicketPdf(eventId, ticket.id, guestName);
    } catch (err) {
      toast.push(apiErrorMessage(err, "Could not download the ticket"), "error");
    } finally {
      setDownloading(false);
    }
  }

  function onDownloadQr() {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${guestName.replace(/\s+/g, "-").toLowerCase()}-ticket.png`;
    a.click();
  }

  return (
    <Modal title="Ticket" onClose={onClose} wide>
      <div className="flex flex-col items-center gap-4">
        <TicketCard
          eventName={eventName}
          eventDateTime={eventDateTime}
          eventVenue={eventVenue}
          guestName={guestName}
          categoryName={category?.name ?? "General"}
          tableSeatLabel={tableSeatLabel}
          status={ticket.status}
          ticketId={ticket.id}
          qrUrl={qrUrl}
        />

        {ticket.status === "CHECKED_IN" && ticket.checkedInAt && (
          <p className="text-sm text-mist-400">Checked in {format(new Date(ticket.checkedInAt), "PPP · p")}</p>
        )}

        <div className="flex w-full flex-col gap-2">
          {ticket.status !== "VOID" && (
            <Button onClick={onDownloadPdf} loading={downloading} fullWidth>
              Download PDF ticket
            </Button>
          )}
          {ticket.status !== "VOID" && qrUrl && (
            <Button variant="secondary" onClick={onDownloadQr} fullWidth>
              Download QR image only
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
