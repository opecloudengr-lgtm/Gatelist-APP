import { useState } from "react";
import type { FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listStaff, inviteStaff, removeStaff, updateStaffPermissions } from "../../api/events";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { TextField, SelectField } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Toast";
import { apiErrorMessage } from "../../lib/api";
import type { EventOutletContext } from "./EventDetailLayout";

export default function EventStaffTab() {
  const { event, access } = useOutletContext<EventOutletContext>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data } = useQuery({ queryKey: ["staff", event.id], queryFn: () => listStaff(event.id) });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"STAFF" | "CO_ORGANIZER">("STAFF");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["staff", event.id] });
  }

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await inviteStaff(event.id, { email, role, canScan: true, canEditGuestList: role === "CO_ORGANIZER" });
      toast.push(`Invite sent to ${email}.`, "success");
      setEmail("");
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not send invite"));
    } finally {
      setLoading(false);
    }
  }

  async function onToggleScan(staffId: string, canScan: boolean) {
    try {
      await updateStaffPermissions(event.id, staffId, { canScan });
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    }
  }

  async function onRemove(staffId: string, name: string) {
    if (!confirm(`Remove ${name} from this event's staff?`)) return;
    try {
      await removeStaff(event.id, staffId);
      toast.push("Removed.", "success");
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {access.canManage && (
        <Card className="p-5">
          <h2 className="font-display text-lg text-ink-950">Invite staff</h2>
          <p className="mt-1 text-sm text-mist-400">They'll get an email link to accept and set up scanner access for this event.</p>
          <form onSubmit={onInvite} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
            <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="sm:w-48">
              <option value="STAFF">Door staff</option>
              <option value="CO_ORGANIZER">Co-organizer</option>
            </SelectField>
            <Button type="submit" loading={loading}>
              Send invite
            </Button>
          </form>
          {error && <div className="mt-3 rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink-950">Team</h2>
        <div className="mt-3 flex flex-col divide-y divide-mist-100">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-ink-950">{event.organizer.name}</p>
              <p className="text-xs text-mist-400">{event.organizer.email}</p>
            </div>
            <span className="rounded-full bg-brass-100 px-2.5 py-1 text-xs font-semibold text-brass-600">Organizer</span>
          </div>
          {data?.staff.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-semibold text-ink-950">{s.user.name}</p>
                <p className="text-xs text-mist-400">{s.user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-mist-100 px-2.5 py-1 text-xs font-semibold text-mist-400">
                  {s.role === "CO_ORGANIZER" ? "Co-organizer" : "Door staff"}
                </span>
                {access.canManage && s.role === "STAFF" && (
                  <label className="flex items-center gap-1.5 text-xs text-mist-400">
                    <input type="checkbox" checked={s.canScan} onChange={(e) => onToggleScan(s.id, e.target.checked)} />
                    Can scan
                  </label>
                )}
                {access.canManage && (
                  <Button size="sm" variant="ghost" onClick={() => onRemove(s.id, s.user.name)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        {data?.pendingInvites && data.pendingInvites.length > 0 && (
          <div className="mt-4 border-t border-mist-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-mist-400">Pending invites</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {data.pendingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-800">{inv.email}</span>
                  <span className="text-xs text-mist-400">Awaiting response</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
