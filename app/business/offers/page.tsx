import { CreateOfferWorkspace } from "@/components/business/create-offer-workspace";
import { SalonOfferList } from "@/components/business/salon-offer-list";
import { SalonShell } from "@/components/business/salon-shell";
import { T } from "@/components/i18n/t";
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
  const salonName = business?.business_name;
  const admin = createAdminClient();
  const liveOffers = business ? await loadSalonOffers(business.id) : [];

  const urgentQuota = business
    ? await loadUrgentMatchQuota(admin, business.id)
    : { reached: false, used: 0, limit: 3, remaining: 3 };

  return (
    <SalonShell
      salonName={salonName || ""}
      location={business?.location}
      logoUrl={resolveLogoUrl(business?.logo_url)}
    >
      <div className="mb-10 max-w-2xl">
        <p className="ui-kicker">
          <T k="salon.offersKicker" />
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
          <T k="salon.yourDeals" />
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          <T k="salon.dealsIntro" />
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          <T k="salon.editHint" />
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
        <p className="ui-alert-ok mb-8">
          <T k="salon.offerLive" />
        </p>
      ) : null}
      {updated === "1" ? (
        <p className="ui-alert-ok mb-8">
          <T k="salon.offerUpdated" />
        </p>
      ) : null}

      <h2 className="font-serif text-3xl text-ink">
        <T k="salon.liveOffers" />
      </h2>
      <div className="mt-6">
        <SalonOfferList
          offers={liveOffers}
          currentUserId={business?.id ?? ""}
          urgentLimitReached={urgentQuota.reached}
          urgentLimit={urgentQuota.limit}
          urgentUsed={urgentQuota.used}
          empty={<T k="salon.emptyOffersFirst" />}
        />
      </div>
    </SalonShell>
  );
}
