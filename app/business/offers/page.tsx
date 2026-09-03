import { CreateOfferWorkspace } from "@/components/business/create-offer-workspace";
import { SalonOfferList } from "@/components/business/salon-offer-list";
import { SalonShell } from "@/components/business/salon-shell";
import { requireBusiness } from "@/lib/auth/require-business";
import { resolveLogoUrl } from "@/lib/business/images";
import { loadSalonOffers } from "@/lib/offers/salon-list";
import { loadUrgentMatchQuota } from "@/lib/offers/urgent-quota";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SalonOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const { created, updated } = await searchParams;
  const { business } = await requireBusiness();
  const salonName = business?.business_name || "Dein Salon";
  const admin = createAdminClient();
  const liveOffers = business ? await loadSalonOffers(business.id) : [];

  const urgentQuota = business
    ? await loadUrgentMatchQuota(admin, business.id)
    : { reached: false, used: 0, limit: 3, remaining: 3 };

  return (
    <SalonShell
      salonName={salonName}
      location={business?.location}
      logoUrl={resolveLogoUrl(business?.logo_url)}
    >
      <div className="mb-10 max-w-2xl">
        <p className="ui-kicker">Angebote</p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Deine Deals</h1>
        <p className="mt-3 text-sm text-ink-soft">
          Erstelle ein neues Angebot oder bearbeite bestehende Deals. Nur dein Salon kann deine
          Angebote ändern.
        </p>
        <div className="mt-8">
          <CreateOfferWorkspace
            location={business?.location}
            urgentLimitReached={urgentQuota.reached}
            urgentLimit={urgentQuota.limit}
            urgentUsed={urgentQuota.used}
          />
        </div>
      </div>

      {created === "1" ? (
        <p className="ui-alert-ok mb-8">Angebot ist live und in der Datenbank gespeichert.</p>
      ) : null}
      {updated === "1" ? (
        <p className="ui-alert-ok mb-8">Änderungen gespeichert. Der Deal ist aktualisiert.</p>
      ) : null}

      <h2 className="font-serif text-3xl text-ink">Live Angebote</h2>
      <div className="mt-6">
        <SalonOfferList
          offers={liveOffers}
          currentUserId={business?.id ?? ""}
          urgentLimitReached={urgentQuota.reached}
          urgentLimit={urgentQuota.limit}
          urgentUsed={urgentQuota.used}
          empty="Noch kein Angebot. Das erste Deal startet den Marktplatz."
        />
      </div>
    </SalonShell>
  );
}
