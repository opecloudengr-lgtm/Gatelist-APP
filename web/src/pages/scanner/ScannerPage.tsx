import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import QrScanner from "qr-scanner";
import { getEvent } from "../../api/events";
import { scanCheckIn } from "../../api/checkin";
import { queueScan, newClientScanId } from "../../lib/offlineQueue";
import { useOfflineSync } from "./useOfflineSync";
import { ManualCheckInPanel } from "./ManualCheckInPanel";
import { apiErrorMessage } from "../../lib/api";
import type { CheckInOutcome } from "../../types";

type ResultBanner = { outcome: CheckInOutcome["outcome"] | "QUEUED"; guestName?: string; category?: { name: string; color: string } | null; detail?: string };

const BANNER_STYLES: Record<ResultBanner["outcome"], string> = {
  VALID: "bg-good",
  DUPLICATE: "bg-bad",
  INVALID: "bg-bad",
  QUEUED: "bg-brass-500",
};

const BANNER_TITLES: Record<ResultBanner["outcome"], string> = {
  VALID: "Welcome",
  DUPLICATE: "Already checked in",
  INVALID: "Invalid ticket",
  QUEUED: "Queued — offline",
};

export default function ScannerPage() {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const lockRef = useRef(false);

  const [banner, setBanner] = useState<ResultBanner | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [recent, setRecent] = useState<ResultBanner[]>([]);

  const { data } = useQuery({ queryKey: ["event", eventId], queryFn: () => getEvent(eventId), enabled: !!eventId });
  const { queuedCount, syncing, flush } = useOfflineSync(eventId, () => {});

  const handleDecode = useCallback(
    async (token: string) => {
      if (lockRef.current) return;
      lockRef.current = true;
      scannerRef.current?.pause();

      const device = navigator.userAgent.slice(0, 60);
      const clientScanId = newClientScanId();

      const resolveAndDisplay = (b: ResultBanner) => {
        setBanner(b);
        setRecent((prev) => [b, ...prev].slice(0, 8));
        window.setTimeout(() => {
          setBanner(null);
          lockRef.current = false;
          scannerRef.current?.start().catch(() => {});
        }, 1600);
      };

      if (!navigator.onLine) {
        await queueScan({ clientScanId, eventId, token, device, scannedAt: new Date().toISOString() });
        resolveAndDisplay({ outcome: "QUEUED", detail: "Will verify once you're back online." });
        return;
      }

      try {
        const result = await scanCheckIn(eventId, { token, device, clientScanId });
        resolveAndDisplay({
          outcome: result.outcome,
          guestName: result.guest?.fullName,
          category: result.guest?.category ?? null,
          detail: result.reason ?? (result.previousCheckIn ? `First checked in ${new Date(result.previousCheckIn.at).toLocaleTimeString()}` : undefined),
        });
      } catch (err) {
        // Network hiccup mid-scan: fall back to the offline queue rather than losing the scan.
        await queueScan({ clientScanId, eventId, token, device, scannedAt: new Date().toISOString() });
        resolveAndDisplay({ outcome: "QUEUED", detail: apiErrorMessage(err, "Connection issue — queued for sync.") });
      }
    },
    [eventId],
  );

  useEffect(() => {
    if (!videoRef.current) return;
    const scanner = new QrScanner(videoRef.current, (result) => handleDecode(result.data), {
      highlightScanRegion: true,
      highlightCodeOutline: true,
      maxScansPerSecond: 5,
    });
    scannerRef.current = scanner;
    scanner.start().catch((err: unknown) => setCameraError((err as Error)?.message ?? "Could not access the camera."));
    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [handleDecode]);

  if (!data) return null;
  const { event, access } = data;
  if (!access.canScan) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink-950 px-6 text-center text-white">
        <div>
          <p className="font-display text-xl">You don't have scanner access for this event.</p>
          <button onClick={() => navigate("/events")} className="mt-4 underline">
            Back to events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-ink-950 text-white">
      <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden bg-black sm:aspect-video sm:max-w-none sm:h-[52vh]">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {cameraError && (
          <div className="absolute inset-0 grid place-items-center bg-ink-950 px-6 text-center text-sm">
            <p>{cameraError}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 safe-top">
        <button onClick={() => navigate(access.canManage ? `/events/${eventId}` : "/events")} className="text-sm font-medium text-mist-400 hover:text-white">
          ← Exit scanner
        </button>
        <div className="text-right">
          <p className="text-sm font-semibold">{event.name}</p>
          <p className="text-xs text-mist-400">{event.venue}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${navigator.onLine ? "bg-good/20 text-good" : "bg-brass-500/20 text-brass-300"}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {navigator.onLine ? "Online" : "Offline"}
        </span>
        {queuedCount > 0 && (
          <button
            onClick={() => flush()}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-full bg-brass-500/20 px-3 py-1 text-xs font-semibold text-brass-300"
          >
            {syncing ? "Syncing…" : `${queuedCount} queued — tap to sync`}
          </button>
        )}
        <button onClick={() => setManualOpen(true)} className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20">
          Manual search
        </button>
      </div>

      <div className="mt-4 flex-1 px-4 pb-8 safe-bottom">
        <p className="text-xs font-semibold uppercase tracking-wide text-mist-400">Recent scans</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {recent.length === 0 && <p className="text-sm text-mist-400">Point the camera at a guest's ticket to check them in.</p>}
          {recent.map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
              <span>{r.guestName ?? "Unrecognized ticket"}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  r.outcome === "VALID" ? "bg-good/20 text-good" : r.outcome === "QUEUED" ? "bg-brass-500/20 text-brass-300" : "bg-bad/20 text-bad"
                }`}
              >
                {BANNER_TITLES[r.outcome]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {banner && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 px-6 text-center text-white ${BANNER_STYLES[banner.outcome]}`}>
          <span className="text-6xl">{banner.outcome === "VALID" ? "✓" : banner.outcome === "QUEUED" ? "⏳" : "✕"}</span>
          <h2 className="font-display text-3xl">{BANNER_TITLES[banner.outcome]}</h2>
          {banner.guestName && <p className="text-xl font-semibold">{banner.guestName}</p>}
          {banner.category && <p className="text-sm uppercase tracking-wide opacity-90">{banner.category.name}</p>}
          {banner.detail && <p className="text-sm opacity-90">{banner.detail}</p>}
        </div>
      )}

      {manualOpen && <ManualCheckInPanel eventId={eventId} onClose={() => setManualOpen(false)} onCheckedIn={(b) => setRecent((prev) => [b, ...prev].slice(0, 8))} />}
    </div>
  );
}
