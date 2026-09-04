"use client";

import { useActionState } from "react";
import { HairProfileFields } from "@/components/hair/hair-profile-fields";
import { TreatmentPassFields } from "@/components/customer/treatment-pass-fields";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";
import {
  updateCustomerProfileAction,
  type CustomerProfileFormState,
} from "@/app/dashboard/profile/actions";
import { type CustomerProfile } from "@/lib/customer/profile-store";

const initialState: CustomerProfileFormState = {};

export function CustomerProfileForm({
  profile,
}: {
  profile: CustomerProfile | null;
}) {
  const t = useT();
  const localize = useLocalize();
  const [state, formAction, pending] = useActionState(
    updateCustomerProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? <p className="ui-alert-error">{localize(state.error)}</p> : null}

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-[0_8px_24px_rgba(15,15,20,0.05)] backdrop-blur-md">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="ui-kicker">{t("profile.photo")}</span>
          )}
        </div>
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-sm text-ink-soft">{t("profile.avatar")}</span>
          <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp,image/gif" className="ui-file" />
          <span className="mt-1 block text-xs text-ink-soft">{t("profile.avatarHint")}</span>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{t("profile.fullName")}</span>
        <input
          required
          name="full_name"
          defaultValue={profile?.full_name ?? ""}
          className="ui-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{t("profile.bio")}</span>
        <textarea
          name="bio"
          rows={4}
          defaultValue={profile?.bio ?? ""}
          placeholder={t("profile.bioPlaceholder")}
          className="ui-input resize-y"
        />
      </label>

      {/* Die Felder sind unkontrolliert (defaultValue/defaultChecked). Der Key aus den
          geladenen Werten erzwingt nach dem Speichern ein Remount, sonst bliebe die
          alte Auswahl stehen. */}
      <HairProfileFields
        key={`hair-${profile?.hair.structure}-${profile?.hair.length}-${profile?.hair.chemical}`}
        profile={profile?.hair}
      />

      <TreatmentPassFields
        key={`pass-${profile?.treatment_pass.last_bleaching}-${profile?.treatment_pass.chemical_treatments}-${profile?.treatment_pass.hair_thickness}`}
        pass={profile?.treatment_pass}
      />

      <button type="submit" disabled={pending} className="ui-btn-primary w-full sm:w-auto">
        {pending ? t("actions.saving") : t("actions.saveProfile")}
      </button>
    </form>
  );
}
