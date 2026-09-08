"use client";

import { useActionState } from "react";
import {
  reviewApplicationAction,
  type ReviewState,
} from "@/app/business/review-actions";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";
import { BusyLabel } from "@/components/ui/busy-label";

const initialState: ReviewState = {};

export function ReviewButtons({
  applicationId,
  allowAccept = true,
}: {
  applicationId: string;
  allowAccept?: boolean;
}) {
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
        {allowAccept ? (
          <button
            type="submit"
            name="decision"
            value="accepted"
            disabled={pending}
            className="ui-btn-primary"
            aria-busy={pending}
          >
            {pending ? <BusyLabel>{t("common.sending")}</BusyLabel> : t("actions.accept")}
          </button>
        ) : null}
        <button
          type="submit"
          name="decision"
          value="rejected"
          disabled={pending}
          className="ui-btn-danger"
          aria-busy={pending}
        >
          {pending ? <BusyLabel>{t("common.sending")}</BusyLabel> : t("actions.decline")}
        </button>
      </form>
    </div>
  );
}
