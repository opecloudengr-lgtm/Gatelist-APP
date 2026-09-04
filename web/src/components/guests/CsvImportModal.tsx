import { useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { importGuestsCsv } from "../../api/guests";
import type { CsvImportResult } from "../../api/guests";
import { apiErrorMessage } from "../../lib/api";

export function CsvImportModal({ eventId, onClose, onImported }: { eventId: string; onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await importGuestsCsv(eventId, file);
      setResult(res);
      onImported();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not import this file"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Import guests from CSV" onClose={onClose} wide>
      {!result ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-mist-400">
            Columns recognized: <code className="rounded bg-mist-100 px-1 py-0.5">name</code>,{" "}
            <code className="rounded bg-mist-100 px-1 py-0.5">contact</code> (or email/phone),{" "}
            <code className="rounded bg-mist-100 px-1 py-0.5">category</code>,{" "}
            <code className="rounded bg-mist-100 px-1 py-0.5">table_seat</code>,{" "}
            <code className="rounded bg-mist-100 px-1 py-0.5">plus_ones</code>,{" "}
            <code className="rounded bg-mist-100 px-1 py-0.5">notes</code>. Unrecognized category names are created automatically.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-xl border border-dashed border-mist-200 px-3.5 py-6 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-ink-950 file:px-3 file:py-1.5 file:text-white"
          />
          {error && <div className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}
          <Button onClick={onImport} loading={loading} disabled={!file} fullWidth>
            Import guests
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-good/10 px-4 py-3 text-sm font-medium text-good">
            Imported {result.created} guest{result.created === 1 ? "" : "s"} — tickets generated automatically.
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad">
              <p className="font-semibold">{result.skipped} row(s) skipped:</p>
              <ul className="mt-1.5 list-disc pl-5">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button onClick={onClose} fullWidth>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
