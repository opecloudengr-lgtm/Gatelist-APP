import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { TextField, SelectField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { register } from "../../api/auth";
import { apiErrorMessage } from "../../lib/api";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "ORGANIZER" as "ORGANIZER" | "STAFF" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form);
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create your account"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a verification link to ${form.email}.`}>
        <p className="text-sm text-ink-800">
          Click the link in that email to verify your account, then come back and sign in.
        </p>
        <Button className="mt-6" fullWidth onClick={() => navigate("/login")}>
          Go to sign in
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up GateList to run access control for your next event."
      footer={
        <span>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brass-100 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextField label="Email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters, with a letter and a number."
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
        />
        <SelectField label="I am mainly here to..." value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "ORGANIZER" | "STAFF" })}>
          <option value="ORGANIZER">Organize events (create events, manage guest lists)</option>
          <option value="STAFF">Staff a door (I'll accept an invite from an organizer)</option>
        </SelectField>
        {error && <div className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}
        <Button type="submit" size="lg" fullWidth loading={loading}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
