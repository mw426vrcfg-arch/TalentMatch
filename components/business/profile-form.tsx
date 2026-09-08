"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateBusinessProfileAction,
  type ProfileFormState,
} from "@/app/business/profile/actions";
import { type BusinessProfile } from "@/lib/business/profile-store";
import { resolveLogoUrl } from "@/lib/business/images";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocalize, useLocale, useT } from "@/components/i18n/i18n-provider";
import { formText } from "@/lib/profile/form-text";
import { type GenderValue } from "@/lib/profile/gender";
import { BusyLabel } from "@/components/ui/busy-label";
import { AppImage } from "@/components/ui/app-image";

const initialState: ProfileFormState = {};

const GENDERS: { value: Exclude<GenderValue, "">; key: "settings.genderFemale" | "settings.genderMale" | "settings.genderDiverse" }[] = [
  { value: "female", key: "settings.genderFemale" },
  { value: "male", key: "settings.genderMale" },
  { value: "diverse", key: "settings.genderDiverse" },
];

type FormValues = {
  business_name: string;
  location: string;
  address: string;
  phone: string;
  description: string;
  gender: GenderValue;
};

function toFormValues(profile: BusinessProfile | null): FormValues {
  return {
    business_name: formText(profile?.business_name),
    location: formText(profile?.location),
    address: formText(profile?.address),
    phone: formText(profile?.phone),
    description: formText(profile?.description),
    gender: profile?.contact_gender ?? "",
  };
}

export function BusinessProfileForm({
  profile,
}: {
  userId?: string;
  profile: BusinessProfile | null;
}) {
  const t = useT();
  const locale = useLocale();
  const localize = useLocalize();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateBusinessProfileAction,
    initialState,
  );
  const [values, setValues] = useState<FormValues>(() => toFormValues(profile));
  const [logoUrl, setLogoUrl] = useState(() => resolveLogoUrl(profile?.logo_url));

  useEffect(() => {
    setValues((current) => {
      const next = toFormValues(profile);
      return {
        business_name: next.business_name || current.business_name,
        location: next.location || current.location,
        address: next.address || current.address,
        phone: next.phone || current.phone,
        description: next.description || current.description,
        gender: next.gender || current.gender,
      };
    });
    if (profile?.logo_url) {
      setLogoUrl(resolveLogoUrl(profile.logo_url));
    }
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
      {state.saved ? <p className="ui-alert-ok">{t("profile.saved")}</p> : null}
      {state.error && !state.saved ? (
        <p className="ui-alert-error">
          {localize(state.error)}
        </p>
      ) : null}

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-[0_8px_24px_rgba(15,15,20,0.05)] backdrop-blur-md">
          {logoUrl ? (
            <div className="relative h-full w-full">
              <AppImage
                src={logoUrl}
                alt={t("profile.logoAlt")}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
          ) : (
            <span className="ui-kicker">{t("profile.logo")}</span>
          )}
        </div>
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-sm text-ink-soft">{t("profile.logo")}</span>
          <input
            type="file"
            name="logo"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="ui-file"
          />
          <span className="mt-1 block text-xs text-ink-soft">{t("profile.avatarHint")}</span>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{t("profile.salonName")}</span>
        <input
          required
          name="business_name"
          value={values.business_name}
          onChange={updateField("business_name")}
          className="ui-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{t("profile.city")}</span>
        <input
          required
          name="location"
          value={values.location}
          onChange={updateField("location")}
          placeholder={t("profile.cityPlaceholder")}
          className="ui-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{t("profile.address")}</span>
        <input type="hidden" name="street" value={values.address} />
        <input
          name="address"
          value={values.address}
          onChange={updateField("address")}
          placeholder={t("profile.addressPlaceholder")}
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
        <span className="mb-1.5 block text-sm text-ink-soft">{t("profile.shortDescription")}</span>
        <textarea
          name="description"
          rows={3}
          value={values.description}
          onChange={updateField("description")}
          className="ui-input resize-y"
        />
      </label>

      <div>
        <p className="mb-1.5 text-sm text-ink-soft">{t("settings.salonGender")}</p>
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
