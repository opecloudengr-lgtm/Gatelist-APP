import { useState } from "react";
import type { FormEvent } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { updateEvent, deleteEvent, createCategory, updateCategory, deleteCategory } from "../../api/events";
import { Card, CategoryBadge } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { TextField, TextAreaField } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Toast";
import { apiErrorMessage } from "../../lib/api";
import type { EventOutletContext } from "./EventDetailLayout";
import { format } from "date-fns";

const SWATCHES = ["#D4A017", "#7C3AED", "#0EA5E9", "#64748B", "#1E8E5A", "#D33B3B", "#EC4899", "#0891B2"];

export default function EventSettingsTab() {
  const { event, access } = useOutletContext<EventOutletContext>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: event.name,
    date: format(new Date(event.dateTime), "yyyy-MM-dd"),
    time: format(new Date(event.dateTime), "HH:mm"),
    venue: event.venue,
    description: event.description ?? "",
    capacity: event.capacity?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["event", event.id] });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateEvent(event.id, {
        name: form.name,
        dateTime: new Date(`${form.date}T${form.time}`).toISOString(),
        venue: form.venue,
        description: form.description || null,
        capacity: form.capacity ? Number(form.capacity) : null,
      });
      toast.push("Event updated.", "success");
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function onAddCategory(e: FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      const color = SWATCHES[event.categories.length % SWATCHES.length];
      await createCategory(event.id, { name: newCategory.trim(), color });
      setNewCategory("");
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    }
  }

  async function onRenameCategory(id: string, name: string) {
    try {
      await updateCategory(event.id, id, { name });
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    }
  }

  async function onDeleteCategory(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Guests keep their record but lose this tag.`)) return;
    try {
      await deleteCategory(event.id, id);
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    }
  }

  async function onDeleteEvent() {
    if (!confirm(`Permanently delete "${event.name}"? All guests and tickets will be removed. This can't be undone.`)) return;
    try {
      await deleteEvent(event.id);
      toast.push("Event deleted.", "success");
      navigate("/events");
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <h2 className="font-display text-lg text-ink-950">Event details</h2>
        <form onSubmit={onSave} className="mt-4 flex flex-col gap-4">
          <TextField label="Event name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!access.canManage} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} disabled={!access.canManage} />
            <TextField label="Time" type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} disabled={!access.canManage} />
          </div>
          <TextField label="Venue" required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} disabled={!access.canManage} />
          <TextField label="Expected capacity" type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} disabled={!access.canManage} />
          <TextAreaField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={!access.canManage} />
          {access.canManage && (
            <Button type="submit" loading={saving} className="self-start">
              Save changes
            </Button>
          )}
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink-950">Guest categories</h2>
        <p className="mt-1 text-sm text-mist-400">Classify guests by importance so you can plan seating ahead of time.</p>
        <div className="mt-4 flex flex-col gap-2">
          {event.categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <CategoryBadge name={c.name} color={c.color} />
              {access.canManage && (
                <>
                  <input
                    defaultValue={c.name}
                    onBlur={(e) => e.target.value !== c.name && e.target.value.trim() && onRenameCategory(c.id, e.target.value.trim())}
                    className="flex-1 rounded-lg border border-mist-200 px-2.5 py-1 text-sm"
                  />
                  <button onClick={() => onDeleteCategory(c.id, c.name)} className="text-xs font-semibold text-mist-400 hover:text-bad">
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        {access.canManage && (
          <form onSubmit={onAddCategory} className="mt-4 flex gap-2">
            <TextField placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1" />
            <Button type="submit" variant="secondary">
              Add
            </Button>
          </form>
        )}
      </Card>

      {access.isOwner && (
        <Card className="border-bad/30 p-5">
          <h2 className="font-display text-lg text-bad">Danger zone</h2>
          <p className="mt-1 text-sm text-mist-400">Deleting an event permanently removes all guests, tickets, and check-in history.</p>
          <Button variant="danger" className="mt-3" onClick={onDeleteEvent}>
            Delete event
          </Button>
        </Card>
      )}
    </div>
  );
}
