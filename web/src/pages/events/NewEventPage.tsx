import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { TextField, TextAreaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { createEvent } from "../../api/events";
import { apiErrorMessage } from "../../lib/api";

export default function NewEventPage() {
  const [form, setForm] = useState({ name: "", date: "", time: "", venue: "", description: "", capacity: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.date || !form.time) {
      setError("Please choose a date and time.");
      return;
    }
    setLoading(true);
    try {
      const dateTime = new Date(`${form.date}T${form.time}`).toISOString();
      const event = await createEvent({
        name: form.name,
        dateTime,
        venue: form.venue,
        description: form.description || undefined,
        capacity: form.capacity ? Number(form.capacity) : null,
      });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate(`/events/${event.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create this event"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl text-ink-950">New event</h1>
      <p className="mt-1 text-sm text-mist-400">Private by default — nothing about this event is discoverable or public.</p>
      <Card className="mt-6 p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <TextField label="Event name" required placeholder="Ada &amp; Ben's Wedding" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <TextField label="Time" type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <TextField label="Venue" required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          <TextField
            label="Expected capacity"
            type="number"
            min={1}
            hint="Optional — helps you track how full the room is getting."
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
          <TextAreaField label="Description" hint="Optional notes for co-organizers and staff." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {error && <div className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}
          <Button type="submit" size="lg" loading={loading}>
            Create event
          </Button>
        </form>
      </Card>
    </div>
  );
}
