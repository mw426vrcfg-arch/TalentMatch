"use client";

import { useActionState, useState } from "react";
import { HairProfileFields } from "@/components/hair/hair-profile-fields";
import { SmartPricingWidget } from "@/components/business/smart-pricing-widget";
import { createOfferAction, type OfferFormState } from "@/app/business/actions";
import { combineLocalDateTime } from "@/lib/offers/slot-schedule";

const initialState: OfferFormState = {};

type TimeRow = {
  id: string;
  value: string;
};

type DayGroup = {
  id: string;
  date: string;
  times: TimeRow[];
};

function newTime(value = ""): TimeRow {
  return { id: crypto.randomUUID(), value };
}

function newDay(): DayGroup {
  return { id: crypto.randomUUID(), date: "", times: [newTime(), newTime()] };
}

export function CreateOfferForm({
  onCancel,
  urgentLimitReached = false,
  urgentLimit = 3,
  urgentUsed = 0,
}: {
  onCancel?: () => void;
  urgentLimitReached?: boolean;
  urgentLimit?: number;
  urgentUsed?: number;
}) {
  const [days, setDays] = useState<DayGroup[]>([newDay()]);
  const [normalPrice, setNormalPrice] = useState("");
  const [dealPrice, setDealPrice] = useState("");
  const [state, formAction, pending] = useActionState(createOfferAction, initialState);

  function updateDay(dayId: string, date: string) {
    setDays((current) => current.map((day) => (day.id === dayId ? { ...day, date } : day)));
  }

  function updateTime(dayId: string, timeId: string, value: string) {
    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              times: day.times.map((time) => (time.id === timeId ? { ...time, value } : time)),
            }
          : day,
      ),
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <p className="ui-alert-error">{state.error}</p>}

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Service Title</span>
        <input
          required
          name="title"
          placeholder="Balayage Training Model"
          className="ui-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Description</span>
        <textarea
          required
          name="description"
          rows={4}
          placeholder="Balayage durch Junior Stylist unter Supervision."
          className="ui-input resize-y"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Angebotsbild</span>
        <input
          type="file"
          name="offer_image"
          accept="image/jpeg,image/png,image/webp"
          className="ui-file"
        />
        <span className="mt-1.5 block text-xs text-ink-soft">
          Optional. JPEG, PNG oder WebP, max. 2 MB — erscheint vollflächig auf der Kunden-Card.
        </span>
      </label>

      <div className="space-y-3">
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
            value={normalPrice}
            onChange={(event) => setNormalPrice(event.target.value)}
            className="ui-input"
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
            value={dealPrice}
            onChange={(event) => setDealPrice(event.target.value)}
            className="ui-input"
          />
        </label>
      </div>
      <SmartPricingWidget normalPrice={normalPrice} dealPrice={dealPrice} />
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
          className="ui-input"
        />
      </label>

      <HairProfileFields optional />

      <label
        className={`flex items-start gap-3 rounded-[22px] border border-white/30 bg-white/55 p-4 shadow-[0_10px_28px_rgba(15,15,20,0.04)] backdrop-blur-md ${
          urgentLimitReached ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        <input
          type="checkbox"
          name="is_urgent"
          value="true"
          disabled={urgentLimitReached}
          className="mt-1 h-4 w-4 accent-zinc-900 disabled:cursor-not-allowed"
        />
        <span>
          <span className="block text-sm font-medium text-ink">🚨 Last-Minute / Dringend</span>
          <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
            {urgentLimitReached
              ? `Monatliches Limit für Last-Minute-Deals (${urgentUsed}/${urgentLimit}) erreicht`
              : "Urgent Match: der Deal wird bei Kundinnen ganz oben angepinnt und besonders hervorgehoben."}
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-[22px] border border-white/30 bg-white/55 p-4 shadow-[0_10px_28px_rgba(15,15,20,0.04)] backdrop-blur-md">
        <input type="checkbox" name="vip_early_access" value="true" className="mt-1 h-4 w-4 accent-zinc-900" />
        <span>
          <span className="block text-sm font-medium text-ink">VIP Early Access</span>
          <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
            Silber- und Gold-Mitglieder sehen den Deal sofort. Bronze erst nach 30 Minuten — starker Anreiz, Punkte zu sammeln.
          </span>
        </span>
      </label>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm text-ink-soft">Available Slots</span>
          <button
            type="button"
            onClick={() => setDays((current) => [...current, newDay()])}
            className="ui-btn-secondary px-3 py-1 text-xs"
          >
            Weiteren Tag hinzufügen
          </button>
        </div>

        <div className="space-y-4">
          {days.map((day, dayIndex) => (
            <div key={day.id} className="rounded-2xl border border-neutral-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="block min-w-0 flex-1">
                  <span className="mb-1.5 block text-sm text-ink-soft">
                    Tag {dayIndex + 1}
                  </span>
                  <input
                    required
                    type="date"
                    value={day.date}
                    onChange={(event) => updateDay(day.id, event.target.value)}
                    className="ui-input"
                    aria-label={`Datum für Tag ${dayIndex + 1}`}
                  />
                </label>
                {days.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setDays((current) => current.filter((row) => row.id !== day.id))}
                    className="ui-btn-danger mt-6 px-3 text-xs"
                  >
                    Tag entfernen
                  </button>
                ) : null}
              </div>

              <div className="space-y-2">
                {day.times.map((time, timeIndex) => {
                  const iso = combineLocalDateTime(day.date, time.value);
                  return (
                    <div key={time.id} className="flex gap-2">
                      <input
                        required
                        type="time"
                        value={time.value}
                        onChange={(event) => updateTime(day.id, time.id, event.target.value)}
                        className="ui-input"
                        aria-label={`Uhrzeit ${timeIndex + 1} an Tag ${dayIndex + 1}`}
                      />
                      <input type="hidden" name="slots" value={iso} />
                      {day.times.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDays((current) =>
                              current.map((row) =>
                                row.id === day.id
                                  ? {
                                      ...row,
                                      times: row.times.filter((item) => item.id !== time.id),
                                    }
                                  : row,
                              ),
                            )
                          }
                          className="ui-btn-danger px-3 text-xs"
                        >
                          Entfernen
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  setDays((current) =>
                    current.map((row) =>
                      row.id === day.id ? { ...row, times: [...row.times, newTime()] } : row,
                    ),
                  )
                }
                className="ui-btn-secondary mt-3 px-3 py-1 text-xs"
              >
                Uhrzeit hinzufügen
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          An einem Tag mehrere Uhrzeiten setzen — jede Uhrzeit ist ein eigener Slot. Das Angebot
          bleibt für Modelle sichtbar, bis alle Slots vergeben sind. Erst dann wird es
          fully_booked und aus dem Browse genommen.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="ui-btn-secondary w-full sm:w-auto">
            Abbrechen
          </button>
        ) : null}
        <button type="submit" disabled={pending} className="ui-btn-primary w-full sm:w-auto">
          {pending ? "Wird gespeichert…" : onCancel ? "Speichern" : "Veröffentlichen"}
        </button>
      </div>
    </form>
  );
}
