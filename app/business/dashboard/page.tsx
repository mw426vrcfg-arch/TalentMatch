import { PullToRefresh } from "@/components/app/pull-to-refresh";
import { SalonShell } from "@/components/business/salon-shell";
import { SalonAnalyticsBoard } from "@/components/business/analytics-board";
import { RatingWindow } from "@/components/ratings/rating-window";
import { requireBusiness } from "@/lib/auth/require-business";
import { SalonQuickActionsHub } from "@/components/business/quick-actions-hub";
import { HomeOfferSearch } from "@/components/offers/home-offer-search";
import { T } from "@/components/i18n/t";
import { loadSalonAnalytics } from "@/lib/business/analytics";
import { loadSalonQuickActions } from "@/lib/business/quick-actions";
import { resolveLogoUrl } from "@/lib/business/images";
import { loadSalonAppointments } from "@/lib/bookings/overview";
import { loadInspirationFeed } from "@/lib/inspiration/feed";
import { loadPendingRatingsForUser, loadSalonAverages } from "@/lib/ratings/store";
import { StarAverage } from "@/components/ratings/star-average";

export const dynamic = "force-dynamic";

export default async function BusinessDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ noshow?: string; completed?: string; q?: string }>;
}) {
  const { noshow, completed, q } = await searchParams;
  const { user, business } = await requireBusiness();
  const salonName = business?.business_name;

  const emptyAnalytics = {
    matched_models: 0,
    revenue_chf: 0,
    utilization_percent: 0,
    booked_slots: 0,
    total_slots: 0,
  };
  const [appointments, pendingRatings, averages, analytics, tiles] = await Promise.all([
    business ? loadSalonAppointments(business.id).catch(() => []) : Promise.resolve([]),
    loadPendingRatingsForUser({ userId: user.id, role: "business" }).catch(() => []),
    loadSalonAverages([user.id]).catch(() => new Map()),
    business
      ? loadSalonAnalytics(business.id, user.id).catch(() => emptyAnalytics)
      : Promise.resolve(emptyAnalytics),
    loadInspirationFeed(null).catch(() => []),
  ]);

  const quickActions = business
    ? await loadSalonQuickActions({
        businessId: business.id,
        salonUserId: user.id,
        appointments,
      }).catch(() => ({
        todayCount: 0,
        unansweredChats: 0,
        urgentRemaining: 3,
        urgentLimit: 3,
      }))
    : { todayCount: 0, unansweredChats: 0, urgentRemaining: 3, urgentLimit: 3 };

  const salonRating = averages.get(user.id) ?? { average: null, count: 0 };

  return (
    <SalonShell
      salonName={salonName || ""}
      location={business?.location}
      logoUrl={resolveLogoUrl(business?.logo_url)}
    >
      <PullToRefresh />
      <div className="mb-4 max-w-2xl">
        <p className="ui-kicker">
          <T k="browse.discover" />
        </p>
        <h1 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">
          <T k="nav.dashboard" />
        </h1>
        <StarAverage average={salonRating.average} count={salonRating.count} className="mt-2" />
      </div>

      {noshow ? (
        <p className="ui-alert-ok mb-8">
          <T
            k="salon.noshowReported"
            values={{
              count: noshow,
              suffix: noshow === "1" ? "" : "s",
              locked: Number(noshow) >= 3 ? "" : ".",
            }}
          />
          {Number(noshow) >= 3 ? <T k="salon.noshowLocked" /> : null}
        </p>
      ) : null}

      {completed === "1" ? (
        <p className="ui-alert-ok mb-8">
          <T k="salon.completedPleaseRate" />
        </p>
      ) : null}

      <div className="rounded-[22px] border border-white/20 bg-white/60 p-3 shadow-[0_12px_32px_rgba(15,15,20,0.05)] backdrop-blur-xl sm:p-3.5">
        <SalonQuickActionsHub stats={quickActions} compact />
        <SalonAnalyticsBoard stats={analytics} compact />
      </div>

      <div className="mt-4">
        <RatingWindow items={pendingRatings} role="business" />
      </div>

      <div className="mt-5">
        <HomeOfferSearch
          tiles={tiles}
          initialQuery={q ?? ""}
          memberLevel="Gold"
          showFavorite={false}
          canApply={false}
        />
      </div>
    </SalonShell>
  );
}
