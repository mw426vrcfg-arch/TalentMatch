"use client";

import { useActionState, useEffect, useState } from "react";
import {
  loadMyBusinessProfileAction,
  updateBusinessProfileAction,
  type ProfileFormState,
} from "@/app/business/profile/actions";
import { type BusinessProfile } from "@/lib/business/profile-store";
import { resolveLogoUrl } from "@/lib/business/images";

const initialState: ProfileFormState = {};

type FormValues = {
  business_name: string;
  location: string;
  address: string;
  phone: string;
  description: string;
};

function toFormValues(profile: BusinessProfile | null): FormValues {
  return {
    business_name: profile?.business_name ?? "",
    location: profile?.location ?? "",
    address: profile?.address ?? "",
    phone: profile?.phone ?? "",
    description: profile?.description ?? "",
  };
}

export function BusinessProfileForm({
  userId,
  profile,
}: {
  userId: string;
  profile: BusinessProfile | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateBusinessProfileAction,
    initialState,
  );
  const [values, setValues] = useState<FormValues>(() => toFormValues(profile));
  const [logoUrl, setLogoUrl] = useState(() => resolveLogoUrl(profile?.logo_url));

  useEffect(() => {
    setValues(toFormValues(profile));
    setLogoUrl(resolveLogoUrl(profile?.logo_url));
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedProfile() {
      const loaded = await loadMyBusinessProfileAction();
      if (cancelled || !loaded) {
        return;
      }
      const next = toFormValues(loaded);
      setValues(next);
      setLogoUrl(resolveLogoUrl(loaded.logo_url));
    }

    void loadSavedProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function updateField(field: keyof FormValues) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="ui-alert-error">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-[0_8px_24px_rgba(15,15,20,0.05)] backdrop-blur-md">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Salon-Logo"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="ui-kicker">Logo</span>
          )}
        </div>
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-sm text-ink-soft">Logo / Profilbild</span>
          <input
            type="file"
            name="logo"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="ui-file"
          />
          <span className="mt-1 block text-xs text-ink-soft">JPG, PNG oder WebP, max. 2 MB</span>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Salon-Name</span>
        <input
          required
          name="business_name"
          value={values.business_name}
          onChange={updateField("business_name")}
          className="ui-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Ort / Stadt</span>
        <input
          required
          name="location"
          value={values.location}
          onChange={updateField("location")}
          placeholder="z. B. Zürich"
          className="ui-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Adresse</span>
        <input type="hidden" name="street" value={values.address} />
        <input
          name="address"
          value={values.address}
          onChange={updateField("address")}
          placeholder="Strasse und Hausnummer"
          className="ui-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Telefonnummer</span>
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={updateField("phone")}
          placeholder="+41 …"
          className="ui-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Kurzbeschreibung</span>
        <textarea
          name="description"
          rows={3}
          value={values.description}
          onChange={updateField("description")}
          className="ui-input resize-y"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="ui-btn-primary w-full sm:w-auto"
      >
        {pending ? "Wird gespeichert…" : "Profil speichern"}
      </button>
    </form>
  );
}
