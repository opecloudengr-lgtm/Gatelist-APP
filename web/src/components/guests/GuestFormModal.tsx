import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, TextAreaField } from "../ui/Field";
import { Button } from "../ui/Button";
import { createGuest, updateGuest } from "../../api/guests";
import { apiErrorMessage } from "../../lib/api";
import type { EventCategory, Guest } from "../../types";

export function GuestFormModal({
  eventId,
  categories,
  guest,
  onClose,
  onSaved,
}: {
  eventId: string;
  categories: EventCategory[];
  guest?: Guest;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!guest;
  const [form, setForm] = useState({
    fullName: guest?.fullName ?? "",
    contact: guest?.contact ?? "",
    categoryId: guest?.categoryId ?? categories[0]?.id ?? "",
    tableSeatLabel: guest?.tableSeatLabel ?? "",
    plusOnesAllowed: guest?.plusOnesAllowed ?? 0,
    notes: guest?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isEdit) {
        await updateGuest(eventId, guest.id, {
          fullName: form.fullName,
          contact: form.contact || null,
          categoryId: form.categoryId || null,
          tableSeatLabel: form.tableSeatLabel || null,
          notes: form.notes || null,
        });
      } else {
        await createGuest(eventId, {
          fullName: form.fullName,
          contact: form.contact || undefined,
          categoryId: form.categoryId || null,
          tableSeatLabel: form.tableSeatLabel || undefined,
          plusOnesAllowed: form.plusOnesAllowed,
          notes: form.notes || undefined,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save this guest"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit guest" : "Add guest"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField label="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <TextField label="Contact (email or phone)" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        <SelectField label="Category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Table / seat" placeholder="e.g. Table 5" value={form.tableSeatLabel} onChange={(e) => setForm({ ...form, tableSeatLabel: e.target.value })} />
        {!isEdit && (
          <TextField
            label="Plus-ones allowed"
            type="number"
            min={0}
            max={20}
            hint="Each plus-one gets their own ticket."
            value={form.plusOnesAllowed}
            onChange={(e) => setForm({ ...form, plusOnesAllowed: Number(e.target.value) })}
          />
        )}
        <TextAreaField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        {error && <div className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}
        <Button type="submit" loading={loading} fullWidth>
          {isEdit ? "Save changes" : "Add guest"}
        </Button>
      </form>
    </Modal>
  );
}
