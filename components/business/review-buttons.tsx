"use client";

import { useActionState } from "react";
import {
  reviewApplicationAction,
  type ReviewState,
} from "@/app/business/review-actions";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";

const initialState: ReviewState = {};

export function ReviewButtons({ applicationId }: { applicationId: string }) {
  const t = useT();
  const localize = useLocalize();
  const [state, formAction, pending] = useActionState(
    reviewApplicationAction,
    initialState,
  );

  return (
    <div className="space-y-3">
      {state.error && (
        <p className="ui-alert-error">
          {localize(state.error)}
        </p>
      )}
      <form action={formAction} className="flex flex-wrap gap-3">
        <input type="hidden" name="application_id" value={applicationId} />
        <button
          type="submit"
          name="decision"
          value="accepted"
          disabled={pending}
          className="ui-btn-primary"
        >
          {pending ? t("actions.saving") : t("actions.accept")}
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          disabled={pending}
          className="ui-btn-danger"
        >
          {t("actions.decline")}
        </button>
      </form>
    </div>
  );
}
