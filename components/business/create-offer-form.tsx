"use client";

import { useActionState, useState } from "react";
import { createOfferAction, type OfferFormState } from "@/app/business/actions";

const initialState: OfferFormState = {};

type SlotRow = {
  id: string;
  value: string;
};

function newSlot(): SlotRow {
  return { id: crypto.randomUUID(), value: "" };
}

export function CreateOfferForm() {
  const [slots, setSlots] = useState<SlotRow[]>([newSlot()]);
  const [state, formAction, pending] = useActionState(createOfferAction, initialState);

  function updateSlot(id: string, value: string) {
    setSlots((current) =>
      current.map((slot) => (slot.id === id ? { ...slot, value } : slot)),
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-ink">
          {state.error}
        </p>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Service Title</span>
        <input
          required
          name="title"
          placeholder="Balayage Training Model"
          className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Description</span>
        <textarea
          required
          name="description"
          rows={4}
          placeholder="Balayage durch Junior Stylist unter Supervision."
          className="w-full resize-y rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">Normal Price (CHF)</span>
          <input
            required
            name="normal_price"
            type="number"
            min="0"
            step="0.01"
            placeholder="250"
            className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">Discount Price (CHF)</span>
          <input
            required
            name="discount_price"
            type="number"
            min="0"
            step="0.01"
            placeholder="50"
            className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Duration (Minuten)</span>
        <input
          required
          name="duration_minutes"
          type="number"
          min="1"
          step="1"
          placeholder="240"
          className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm text-ink-soft">Available Slots</span>
          <button
            type="button"
            onClick={() => setSlots((current) => [...current, newSlot()])}
            className="text-sm font-medium text-gold-deep hover:underline"
          >
            Slot hinzufügen
          </button>
        </div>
        <div className="space-y-3">
          {slots.map((slot, index) => (
            <div key={slot.id} className="flex gap-2">
              <input
                required
                type="datetime-local"
                value={slot.value}
                onChange={(event) => updateSlot(slot.id, event.target.value)}
                className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
                aria-label={`Slot ${index + 1}`}
              />
              <input
                type="hidden"
                name="slots"
                value={slot.value ? new Date(slot.value).toISOString() : ""}
              />
              {slots.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setSlots((current) => current.filter((row) => row.id !== slot.id))
                  }
                  className="rounded-2xl border border-ink/10 px-3 text-sm text-ink-soft hover:border-rose hover:text-ink"
                >
                  Entfernen
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Datum und Uhrzeit wählen. Die Endzeit ergibt sich automatisch aus der Duration.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-cream transition hover:bg-gold-deep disabled:opacity-60"
      >
        {pending ? "Wird veröffentlicht…" : "Submit"}
      </button>
    </form>
  );
}
