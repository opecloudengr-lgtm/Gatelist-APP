import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { TextField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { resetPassword } from "../../api/auth";
import { apiErrorMessage } from "../../lib/api";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword({ token, password, confirmPassword });
      navigate("/login", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "This reset link is invalid or has expired."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Set a new password">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField label="New password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <TextField label="Confirm new password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        {error && <div className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}
        <Button type="submit" size="lg" fullWidth loading={loading}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
