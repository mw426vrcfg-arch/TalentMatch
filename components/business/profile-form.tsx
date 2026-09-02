"use client";

import { useActionState } from "react";
import {
  updateBusinessProfileAction,
  type ProfileFormState,
} from "@/app/business/profile/actions";
import { type BusinessProfile } from "@/lib/business/profile-store";
import { resolveLogoUrl } from "@/lib/business/images";

const initialState: ProfileFormState = {};

export function BusinessProfileForm({
  profile,
}: {
  profile: BusinessProfile | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateBusinessProfileAction,
    initialState,
  );
  const logoUrl = resolveLogoUrl(profile?.logo_url);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-ink">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-ink/10 bg-cream">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Salon-Logo"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs uppercase tracking-wide text-ink-soft">Logo</span>
          )}
        </div>
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-sm text-ink-soft">Logo / Profilbild</span>
          <input
            type="file"
            name="logo"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="w-full text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:text-cream"
          />
          <span className="mt-1 block text-xs text-ink-soft">JPG, PNG oder WebP, max. 2 MB</span>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Salon-Name</span>
        <input
          required
          name="business_name"
          defaultValue={profile?.business_name ?? ""}
          className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Ort / Stadt</span>
        <input
          required
          name="location"
          defaultValue={profile?.location ?? ""}
          placeholder="z. B. Zürich"
          className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Adresse</span>
        <input
          name="address"
          defaultValue={profile?.address ?? ""}
          placeholder="Strasse und Hausnummer"
          className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Telefonnummer</span>
        <input
          name="phone"
          type="tel"
          defaultValue={profile?.phone ?? ""}
          placeholder="+41 …"
          className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Kurzbeschreibung</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={profile?.description ?? ""}
          className="w-full resize-y rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-cream transition hover:bg-gold-deep disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Wird gespeichert…" : "Profil speichern"}
      </button>
    </form>
  );
}
