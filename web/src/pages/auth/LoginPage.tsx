import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { TextField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { login, resendVerification } from "../../api/auth";
import { useAuthStore } from "../../store/auth";
import { apiErrorMessage } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setLoading(true);
    try {
      const session = await login(email, password);
      setSession(session);
      const from = (location.state as { from?: string })?.from ?? "/events";
      navigate(from, { replace: true });
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: { code?: string } } } };
      if (axiosErr.response?.data?.error?.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true);
      }
      setError(apiErrorMessage(err, "Incorrect email or password"));
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    try {
      await resendVerification(email);
      toast.push("Verification email sent — check your inbox.", "success");
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your events or check guests in."
      footer={
        <span>
          New to GateList?{" "}
          <Link to="/register" className="font-semibold text-brass-100 hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && (
          <div className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">
            {error}
            {needsVerification && (
              <button type="button" onClick={onResend} className="ml-1 font-semibold underline">
                Resend verification email
              </button>
            )}
          </div>
        )}
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-mist-400 hover:text-ink-950">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth loading={loading}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
