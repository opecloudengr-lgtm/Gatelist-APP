import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { Button } from "../../components/ui/Button";
import { verifyEmail } from "../../api/auth";
import { useAuthStore } from "../../store/auth";
import { apiErrorMessage } from "../../lib/api";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState("");
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing verification token.");
      return;
    }
    verifyEmail(token)
      .then((session) => {
        setSession(session);
        setStatus("done");
      })
      .catch((err) => {
        setStatus("error");
        setError(apiErrorMessage(err, "This verification link is invalid or has expired."));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === "loading") {
    return (
      <AuthLayout title="Verifying your email…">
        <p className="text-sm text-mist-400">One moment.</p>
      </AuthLayout>
    );
  }

  if (status === "error") {
    return (
      <AuthLayout title="Verification failed">
        <p className="text-sm text-bad">{error}</p>
        <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-ink-950 underline">
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="You're verified" subtitle="Your account is ready to go.">
      <Button fullWidth onClick={() => navigate("/events")}>
        Continue to GateList
      </Button>
    </AuthLayout>
  );
}
