"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HairProfileFields } from "@/components/hair/hair-profile-fields";
import { TreatmentPassFields } from "@/components/customer/treatment-pass-fields";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocalize, useLocale, useT } from "@/components/i18n/i18n-provider";
import { BusyLabel } from "@/components/ui/busy-label";
import { AppImage } from "@/components/ui/app-image";
import {
  updateCustomerProfileAction,
  type CustomerProfileFormState,
} from "@/app/dashboard/profile/actions";
import { type CustomerProfile } from "@/lib/customer/profile-store";
import { formText } from "@/lib/profile/form-text";
import { type GenderValue } from "@/lib/profile/gender";

const initialState: CustomerProfileFormState = {};

const GENDERS: { value: Exclude<GenderValue, "">; key: "settings.genderFemale" | "settings.genderMale" | "settings.genderDiverse" }[] = [
  { value: "female", key: "settings.genderFemale" },
  { value: "male", key: "settings.genderMale" },
  { value: "diverse", key: "settings.genderDiverse" },
];

type FormValues = {
  full_name: string;
  bio: string;
  phone: string;
  gender: GenderValue;
};

function toFormValues(profile: CustomerProfile | null): FormValues {
  return {
    full_name: formText(profile?.full_name),
    bio: formText(profile?.bio),
    phone: formText(profile?.phone),
    gender: profile?.gender ?? "",
  };
}

export function CustomerProfileForm({
  profile,
}: {
  profile: CustomerProfile | null;
}) {
  const t = useT();
  const locale = useLocale();
  const localize = useLocalize();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateCustomerProfileAction,
    initialState,
  );
  const [values, setValues] = useState<FormValues>(() => toFormValues(profile));

  useEffect(() => {
    setValues((current) => {
      const next = toFormValues(profile);
      return {
        full_name: next.full_name || current.full_name,
        bio: next.bio || current.bio,
        phone: next.phone || current.phone,
        gender: next.gender || current.gender,
      };
    });
  }, [profile]);

  useEffect(() => {
    if (state.saved) {
      router.refresh();
    }
  }, [state.saved, router]);

  function updateField(field: keyof FormValues) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.saved ? (
        <p className="ui-alert-ok">{t("profile.saved")}</p>
      ) : null}
      {state.error && !state.saved ? <p className="ui-alert-error">{localize(state.error)}</p> : null}

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-[0_8px_24px_rgba(15,15,20,0.05)] backdrop-blur-md">
          {profile?.avatar_url ? (
            <div className="relative h-full w-full">
              <AppImage src={profile.avatar_url} fill sizes="80px" className="object-cover" />
            </div>
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
          value={values.full_name}
          onChange={updateField("full_name")}
          className="ui-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{t("profile.phoneNumber")}</span>
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={updateField("phone")}
          placeholder={t("profile.phonePlaceholder")}
          className="ui-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{t("profile.bio")}</span>
        <textarea
          name="bio"
          rows={4}
          value={values.bio}
          onChange={updateField("bio")}
          placeholder={t("profile.bioPlaceholder")}
          className="ui-input resize-y"
        />
      </label>

      <div>
        <p className="mb-1.5 text-sm text-ink-soft">{t("settings.gender")}</p>
        <input type="hidden" name="gender" value={values.gender || ""} />
        <div className="flex flex-wrap gap-1.5">
          {GENDERS.map((option) => {
            const active = values.gender === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setValues((current) => ({ ...current, gender: option.value }))}
                className={active ? "ui-choice-active" : "ui-choice"}
              >
                {t(option.key)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm text-ink-soft">{t("settings.language")}</p>
        <input type="hidden" name="preferred_language" value={locale} />
        <div className="max-w-[220px]">
          <LanguageSwitcher compact />
        </div>
      </div>

      <HairProfileFields profile={profile?.hair} />

      <TreatmentPassFields pass={profile?.treatment_pass} />

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="ui-btn-primary relative z-50 w-full sm:w-auto"
      >
        {pending ? <BusyLabel>{t("actions.saving")}</BusyLabel> : t("actions.saveProfile")}
      </button>
    </form>
  );
}
