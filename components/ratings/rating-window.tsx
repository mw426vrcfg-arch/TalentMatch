"use client";

import { useActionState, useState } from "react";
import {
  submitCustomerRatingAction,
  submitSalonRatingAction,
  type RatingFormState,
} from "@/app/ratings/actions";
import { type PendingRating } from "@/lib/ratings/store";
import { formatSlot } from "@/lib/offers/format";
import { useLocale, useLocalize, useT } from "@/components/i18n/i18n-provider";
import { intlLocale } from "@/lib/i18n/config";

const initialState: RatingFormState = {};

function StarPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={value || ""} />
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl leading-none transition-all duration-300 ease-out hover:scale-[1.015] active:scale-95 ${
            star <= value ? "text-neutral-900" : "text-neutral-200 hover:text-neutral-400"
          }`}
          aria-label={t("rating.starsAria", { n: star })}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function RatingCard({
  item,
  action,
  counterpartKey,
  allowPortfolio = false,
}: {
  item: PendingRating;
  action: typeof submitCustomerRatingAction;
  counterpartKey: "rating.rateCustomer" | "rating.rateSalon";
  allowPortfolio?: boolean;
}) {
  const t = useT();
  const localize = useLocalize();
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(action, initialState);
  const [ratingValue, setRatingValue] = useState(0);

  if (state.success) {
    return (
      <article className="ui-alert-ok p-5">
        {localize(state.success)}
      </article>
    );
  }

  return (
    <article className="ui-card p-5">
      <p className="ui-kicker">{item.offer_title}</p>
      <h3 className="mt-2 font-serif text-2xl text-ink">{item.counterpart_name}</h3>
      <p className="mt-1 text-sm text-ink-soft">{formatSlot(item.start_time, intlLocale(locale))}</p>
      <p className="mt-2 text-sm text-ink-soft">{t("rating.rateHint", { counterpart: t(counterpartKey) })}</p>

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="booking_id" value={item.application_id} />
        <input type="hidden" name="application_id" value={item.application_id} />
        <input type="hidden" name="booking_row_id" value={item.booking_row_id} />
        <input type="hidden" name="reviewee_id" value={item.reviewee_id} />
        {state.error ? <p className="ui-alert-error">{localize(state.error)}</p> : null}
        <div>
          <p className="mb-2 text-sm text-ink-soft">{t("rating.stars")}</p>
          <StarPicker name="rating" value={ratingValue} onChange={setRatingValue} />
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">{t("rating.shortText")}</span>
          <textarea
            required
            name="comment"
            rows={3}
            maxLength={500}
            placeholder={t("rating.placeholder")}
            className="ui-input resize-y"
          />
        </label>
        {allowPortfolio ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">{t("rating.beforePhoto")}</span>
              <input type="file" name="before_image" accept="image/jpeg,image/png,image/webp" className="ui-file" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">{t("rating.afterPhoto")}</span>
              <input type="file" name="after_image" accept="image/jpeg,image/png,image/webp" className="ui-file" />
            </label>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending || ratingValue < 1}
          className="ui-btn-primary"
        >
          {pending ? t("rating.sending") : t("rating.send")}
        </button>
      </form>
    </article>
  );
}

export function RatingWindow({
  items,
  role,
}: {
  items: PendingRating[];
  role: "customer" | "business";
}) {
  const t = useT();
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <div className="max-w-2xl">
        <p className="ui-kicker">
          {t("rating.kicker")}
        </p>
        <h2 className="mt-3 font-serif text-3xl text-ink">{t("rating.windowTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {t("rating.windowIntro")}
        </p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <RatingCard
            key={`${item.application_id}-${item.booking_row_id}`}
            item={item}
            action={role === "customer" ? submitCustomerRatingAction : submitSalonRatingAction}
            counterpartKey={role === "customer" ? "rating.rateSalon" : "rating.rateCustomer"}
            allowPortfolio={role === "business"}
          />
        ))}
      </div>
    </section>
  );
}
