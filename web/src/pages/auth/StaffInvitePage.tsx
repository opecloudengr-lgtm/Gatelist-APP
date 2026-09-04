import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { TextField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { acceptStaffInvite, getStaffInvite } from "../../api/auth";
import { useAuthStore } from "../../store/auth";
import { apiErrorMessage } from "../../lib/api";
import { format } from "date-fns";

export default function StaffInvitePage() {
  const { token = "" } = useParams();
  const [invite, setInvite] = useState<Awaited<ReturnType<typeof getStaffInvite>> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  useEffect(() => {
    getStaffInvite(token)
      .then(setInvite)
      .catch((err) => setLoadError(apiErrorMessage(err, "This invite link is invalid or has expired.")));
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setLoading(true);
    try {
      const result = await acceptStaffInvite(token, { name, password, confirmPassword });
      setSession(result);
      navigate(`/events/${result.eventId}/scan`, { replace: true });
    } catch (err) {
      setSubmitError(apiErrorMessage(err, "Could not accept this invite."));
    } finally {
      setLoading(false);
    }
  }

  if (loadError) {
    return (
      <AuthLayout title="Invite not available">
        <p className="text-sm text-bad">{loadError}</p>
      </AuthLayout>
    );
  }

  if (!invite) {
    return (
      <AuthLayout title="Loading invite…">
        <p className="text-sm text-mist-400">One moment.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={`Join ${invite.event.name}`} subtitle={`${invite.invitedBy.name} invited you as door staff — ${invite.event.venue}, ${format(new Date(invite.event.dateTime), "PPP p")}`}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField label="Email" value={invite.email} disabled />
        <TextField label="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Create a password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <TextField label="Confirm password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        {submitError && <div className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{submitError}</div>}
        <Button type="submit" size="lg" fullWidth loading={loading}>
          Accept invite &amp; sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
