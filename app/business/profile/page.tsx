import { BusinessProfileForm } from "@/components/business/profile-form";
import { SalonShell } from "@/components/business/salon-shell";
import { requireBusiness } from "@/lib/auth/require-business";
import { resolveLogoUrl } from "@/lib/business/images";

export const dynamic = "force-dynamic";

export default async function BusinessProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const { business } = await requireBusiness();
  const salonName = business?.business_name || "Dein Salon";
  const profile = business
    ? { ...business, logo_url: resolveLogoUrl(business.logo_url) }
    : null;

  return (
    <SalonShell
      salonName={salonName}
      location={business?.location}
      logoUrl={profile?.logo_url}
    >
      <div className="mb-10 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.24em] text-gold-deep">
          Kapitel 4.1 · Business Profile
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Profil bearbeiten</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Name, Ort und Logo erscheinen auf den Angebots-Cards der Kundenseite.
        </p>
      </div>

      {saved === "1" && (
        <p className="mb-8 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
          Profil gespeichert. Die Kundenseite zeigt jetzt deine aktuellen Daten.
        </p>
      )}

      <section className="max-w-xl rounded-[2rem] border border-ink/10 bg-paper p-6 shadow-[0_20px_60px_rgba(28,23,20,0.06)] sm:p-8">
        <BusinessProfileForm profile={profile} />
      </section>
    </SalonShell>
  );
}
