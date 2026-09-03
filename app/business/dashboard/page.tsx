import { PullToRefresh } from "@/components/app/pull-to-refresh";
import { MeineTermine } from "@/components/bookings/meine-termine";
import { SalonShell } from "@/components/business/salon-shell";
import { SalonAnalyticsBoard } from "@/components/business/analytics-board";
import { SalonOfferList } from "@/components/business/salon-offer-list";
import { RatingWindow } from "@/components/ratings/rating-window";
import { StarAverage } from "@/components/ratings/star-average";
import { requireBusiness } from "@/lib/auth/require-business";
import { SalonQuickActionsHub } from "@/components/business/quick-actions-hub";
import { loadSalonAnalytics } from "@/lib/business/analytics";
import { loadSalonQuickActions } from "@/lib/business/quick-actions";
import { resolveLogoUrl } from "@/lib/business/images";
import { loadSalonAppointments } from "@/lib/bookings/overview";
import { loadSalonOffers } from "@/lib/offers/salon-list";
import { loadUrgentMatchQuota } from "@/lib/offers/urgent-quota";
import { loadPendingRatingsForUser, loadSalonAverages } from "@/lib/ratings/store";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function BusinessDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ noshow?: string; completed?: string }>;
}) {
  const { noshow, completed } = await searchParams;
  const { user, business } = await requireBusiness();
  const salonName = business?.business_name || "Dein Salon";

  const [appointments, pendingRatings, averages, analytics, offers, urgentQuota] = await Promise.all([
    business ? loadSalonAppointments(business.id) : Promise.resolve([]),
    loadPendingRatingsForUser({ userId: user.id, role: "business" }),
    loadSalonAverages([user.id]),
    business
      ? loadSalonAnalytics(business.id, user.id)
      : Promise.resolve({
          matched_models: 0,
          revenue_chf: 0,
          utilization_percent: 0,
          booked_slots: 0,
          total_slots: 0,
        }),
    business ? loadSalonOffers(business.id) : Promise.resolve([]),
    business
      ? loadUrgentMatchQuota(createAdminClient(), business.id)
      : Promise.resolve({ reached: false, used: 0, limit: 3, remaining: 3 }),
  ]);

  const quickActions = business
    ? await loadSalonQuickActions({
        businessId: business.id,
        salonUserId: user.id,
        appointments,
      })
    : { todayCount: 0, unansweredChats: 0, urgentRemaining: 3, urgentLimit: 3 };

  const salonRating = averages.get(user.id) ?? { average: null, count: 0 };

  return (
    <SalonShell
      salonName={salonName}
      location={business?.location}
      logoUrl={resolveLogoUrl(business?.logo_url)}
    >
      <PullToRefresh />
      <div className="mb-8 max-w-2xl">
        <p className="ui-kicker">Dashboard</p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">{salonName}</h1>
        <StarAverage average={salonRating.average} count={salonRating.count} className="mt-2" />
      </div>

      {noshow ? (
        <p className="ui-alert-ok mb-8">
          No-Show gemeldet. Der Kunde hat jetzt {noshow} aktive Strike
          {noshow === "1" ? "" : "s"}
          {Number(noshow) >= 3 ? " und ist gesperrt." : "."}
        </p>
      ) : null}

      {completed === "1" ? (
        <p className="ui-alert-ok mb-8">Termin abgeschlossen. Bitte bewerte den Kunden.</p>
      ) : null}

      <SalonQuickActionsHub stats={quickActions} />
      <section className="mb-12">
        <h2 className="font-serif text-3xl text-ink">Deine Angebote</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Tippe auf den Stift, um Titel, Preise, Bild oder neue Slots zu ändern.
        </p>
        <div className="mt-6">
        <SalonOfferList
          offers={offers}
          currentUserId={business?.id ?? ""}
            urgentLimitReached={urgentQuota.reached}
            urgentLimit={urgentQuota.limit}
            urgentUsed={urgentQuota.used}
            empty="Noch kein Angebot. Unter Angebot kannst du den ersten Deal veröffentlichen."
          />
        </div>
      </section>
      <SalonAnalyticsBoard stats={analytics} />
      <RatingWindow items={pendingRatings} role="business" />
      <MeineTermine items={appointments} role="salon" currentUserId={user.id} />
    </SalonShell>
  );
}
