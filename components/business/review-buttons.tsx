"use client";

import { useActionState } from "react";
import {
  reviewApplicationAction,
  type ReviewState,
} from "@/app/business/review-actions";

const initialState: ReviewState = {};

export function ReviewButtons({ applicationId }: { applicationId: string }) {
  const [state, formAction, pending] = useActionState(
    reviewApplicationAction,
    initialState,
  );

  return (
    <div className="space-y-3">
      {state.error && (
        <p className="rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-ink">
          {state.error}
        </p>
      )}
      <form action={formAction} className="flex flex-wrap gap-3">
        <input type="hidden" name="application_id" value={applicationId} />
        <button
          type="submit"
          name="decision"
          value="accepted"
          disabled={pending}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-gold-deep disabled:opacity-60"
        >
          {pending ? "Wird gespeichert…" : "Akzeptieren"}
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          disabled={pending}
          className="rounded-full border border-ink/15 px-5 py-2.5 text-sm text-ink transition hover:border-rose disabled:opacity-60"
        >
          Ablehnen
        </button>
      </form>
    </div>
  );
}
