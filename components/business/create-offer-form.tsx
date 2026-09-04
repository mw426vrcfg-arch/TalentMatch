"use client";

import { useActionState, useState } from "react";
import { HairProfileFields } from "@/components/hair/hair-profile-fields";
import { SmartPricingWidget } from "@/components/business/smart-pricing-widget";
import { createOfferAction, updateOfferAction, type OfferFormState } from "@/app/business/actions";
import { CoverImage } from "@/components/ui/cover-image";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";
import { formatSlotClock, formatSlotDay, groupSlotsByDay } from "@/lib/offers/format";
import { combineLocalDateTime } from "@/lib/offers/slot-schedule";
import { type SalonOfferListItem } from "@/lib/offers/salon-list";
import { hapticTap } from "@/lib/ui/haptic";

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
  offer,
  urgentLimitReached = false,
  urgentLimit = 3,
  urgentUsed = 0,
}: {
  onCancel?: () => void;
  offer?: SalonOfferListItem;
  urgentLimitReached?: boolean;
  urgentLimit?: number;
  urgentUsed?: number;
}) {
  const t = useT();
  const localize = useLocalize();
  const isEdit = Boolean(offer?.id);
  const [days, setDays] = useState<DayGroup[]>([newDay()]);
  const [normalPrice, setNormalPrice] = useState(
    offer ? String(offer.normal_price ?? "") : "",
  );
  const [dealPrice, setDealPrice] = useState(offer ? String(offer.discount_price ?? "") : "");
  const [state, formAction, pending] = useActionState(
    isEdit ? updateOfferAction : createOfferAction,
    initialState,
  );
  const existingSlots = offer?.offer_slots ?? [];

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
      {state.error && <p className="ui-alert-error">{localize(state.error)}</p>}
      {offer?.id ? <input type="hidden" name="offer_id" value={offer.id} /> : null}

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{t("create.serviceTitle")}</span>
        <input
          required
          name="title"
          defaultValue={offer?.title ?? ""}
          placeholder={t("create.titlePlaceholder")}
          className="ui-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{t("create.description")}</span>
        <textarea
          required
          name="description"
          rows={4}
          defaultValue={offer?.description ?? ""}
          placeholder={t("create.descriptionPlaceholder")}
          className="ui-input resize-y"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{t("create.offerImage")}</span>
        {offer?.image_url ? (
          <CoverImage
            src={offer.image_url}
            className="mb-3 aspect-[4/3] w-full rounded-2xl object-cover"
          />
        ) : null}
        <input
          type="file"
          name="offer_image"
          accept="image/jpeg,image/png,image/webp"
          className="ui-file"
        />
        <span className="mt-1.5 block text-xs text-ink-soft">
          {offer?.image_url ? t("create.imageReplace") : t("create.imageHint")}
        </span>
      </label>

      <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">{t("create.normalPrice")}</span>
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
          <span className="mb-1.5 block text-sm text-ink-soft">{t("create.discountPrice")}</span>
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
        <span className="mb-1.5 block text-sm text-ink-soft">{t("create.duration")}</span>
        <input
          required
          name="duration_minutes"
          type="number"
          min="1"
          step="1"
          placeholder="240"
          defaultValue={offer ? String(offer.duration_minutes) : ""}
          className="ui-input"
        />
      </label>

      <HairProfileFields optional profile={offer?.hair} />

      <label
        className={`flex items-start gap-3 rounded-[22px] border border-white/30 bg-white/55 p-4 shadow-[0_10px_28px_rgba(15,15,20,0.04)] backdrop-blur-md ${
          urgentLimitReached && !offer?.is_urgent ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        <input
          type="checkbox"
          name="is_urgent"
          value="true"
          defaultChecked={Boolean(offer?.is_urgent)}
          disabled={urgentLimitReached && !offer?.is_urgent}
          className="mt-1 h-4 w-4 accent-zinc-900 disabled:cursor-not-allowed"
        />
        <span>
          <span className="block text-sm font-medium text-ink">{t("create.urgentToggle")}</span>
          <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
            {urgentLimitReached && !offer?.is_urgent
              ? t("create.urgentLimit", { used: urgentUsed, limit: urgentLimit })
              : t("create.urgentHint")}
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-[22px] border border-white/30 bg-white/55 p-4 shadow-[0_10px_28px_rgba(15,15,20,0.04)] backdrop-blur-md">
        <input
          type="checkbox"
          name="vip_early_access"
          value="true"
          defaultChecked={Boolean(offer?.vip_early_access)}
          className="mt-1 h-4 w-4 accent-zinc-900"
        />
        <span>
          <span className="block text-sm font-medium text-ink">{t("create.vipEarly")}</span>
          <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
            {t("create.vipEarlyHint")}
          </span>
        </span>
      </label>

      {isEdit && existingSlots.length > 0 ? (
        <div>
          <p className="mb-2 text-sm text-ink-soft">{t("create.existingSlots")}</p>
          <div className="space-y-3 rounded-2xl border border-neutral-200/60 bg-white/50 p-4 backdrop-blur-sm">
            {groupSlotsByDay(existingSlots).map((group) => (
              <div key={group.key}>
                <p className="ui-kicker">{formatSlotDay(group.slots[0].start_time)}</p>
                <ul className="mt-1.5 flex flex-wrap gap-2">
                  {group.slots.map((slot) => (
                    <li
                      key={slot.id}
                      className="rounded-full border border-neutral-200/70 bg-white/70 px-3 py-1 text-xs text-neutral-700"
                    >
                      {formatSlotClock(slot.start_time)}
                      {slot.is_booked ? ` · ${t("common.booked")}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm text-ink-soft">
            {isEdit ? t("create.addSlots") : t("create.slotsLabel")}
          </span>
          <button
            type="button"
            onClick={() => setDays((current) => [...current, newDay()])}
            className="ui-btn-secondary px-3 py-1 text-xs"
          >
            {t("create.addDay")}
          </button>
        </div>

        <div className="space-y-4">
          {days.map((day, dayIndex) => (
            <div key={day.id} className="rounded-2xl border border-neutral-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="block min-w-0 flex-1">
                  <span className="mb-1.5 block text-sm text-ink-soft">
                    {t("create.dayN", { n: dayIndex + 1 })}
                  </span>
                  <input
                    required={!isEdit}
                    type="date"
                    value={day.date}
                    onChange={(event) => updateDay(day.id, event.target.value)}
                    className="ui-input"
                    aria-label={t("create.dateForDay", { n: dayIndex + 1 })}
                  />
                </label>
                {days.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setDays((current) => current.filter((row) => row.id !== day.id))}
                    className="ui-btn-danger mt-6 px-3 text-xs"
                  >
                    {t("create.removeDay")}
                  </button>
                ) : null}
              </div>

              <div className="space-y-2">
                {day.times.map((time, timeIndex) => {
                  const iso = combineLocalDateTime(day.date, time.value);
                  return (
                    <div key={time.id} className="flex gap-2">
                      <input
                        required={!isEdit}
                        type="time"
                        value={time.value}
                        onChange={(event) => updateTime(day.id, time.id, event.target.value)}
                        className="ui-input"
                        aria-label={t("create.timeForDay", { n: timeIndex + 1, day: dayIndex + 1 })}
                      />
                      {iso ? <input type="hidden" name="slots" value={iso} /> : null}
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
                          {t("actions.remove")}
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
                {t("create.addTime")}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          {isEdit ? t("create.extraSlotsNote") : t("create.slotsHint")}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button
            type="button"
            onClick={() => {
              hapticTap("cancel");
              onCancel();
            }}
            className="ui-btn-secondary w-full sm:w-auto"
          >
            {t("common.cancel")}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          onClick={() => hapticTap(isEdit ? "success" : "light")}
          className="ui-btn-primary w-full sm:w-auto"
        >
          {pending
            ? t("create.saving")
            : isEdit
              ? t("create.saveChanges")
              : onCancel
                ? t("actions.save")
                : t("actions.publish")}
        </button>
      </div>
    </form>
  );
}
