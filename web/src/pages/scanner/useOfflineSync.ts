import { useCallback, useEffect, useRef, useState } from "react";
import { syncOfflineScans } from "../../api/checkin";
import { listQueuedForEvent, removeQueued } from "../../lib/offlineQueue";
import { useToast } from "../../components/ui/Toast";

export function useOfflineSync(eventId: string, onSynced: () => void) {
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const toast = useToast();
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    const queued = await listQueuedForEvent(eventId);
    setQueuedCount(queued.length);
    return queued;
  }, [eventId]);

  const flush = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    const queued = await refreshCount();
    if (queued.length === 0) return;

    syncingRef.current = true;
    setSyncing(true);
    try {
      const results = await syncOfflineScans(
        eventId,
        queued.map((q) => ({ token: q.token, device: q.device, clientScanId: q.clientScanId, scannedAt: q.scannedAt })),
      );
      for (const r of results) {
        await removeQueued(r.clientScanId);
      }
      await refreshCount();
      onSynced();
      const valid = results.filter((r) => r.outcome === "VALID").length;
      const duplicate = results.filter((r) => r.outcome === "DUPLICATE").length;
      const invalid = results.filter((r) => r.outcome === "INVALID").length;
      toast.push(
        `Synced ${results.length} queued scan${results.length === 1 ? "" : "s"}: ${valid} valid, ${duplicate} duplicate, ${invalid} invalid.`,
        "info",
      );
    } catch {
      toast.push("Couldn't sync queued scans yet — will retry.", "error");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, refreshCount, onSynced]);

  useEffect(() => {
    refreshCount();
    const onOnline = () => flush();
    window.addEventListener("online", onOnline);
    const interval = setInterval(flush, 20000);
    flush();
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return { queuedCount, syncing, flush, refreshCount };
}
