import { PullToRefresh } from "@/components/app/pull-to-refresh";
import { TodayAppointmentBanner } from "@/components/customer/today-appointment-banner";
import { HomeOfferSearch } from "@/components/offers/home-offer-search";
import { CustomerShell } from "@/components/customer/customer-shell";
import { StrikeAlert } from "@/components/customer/strike-alert";
import { requireCustomer } from "@/lib/auth/require-customer";
import { loadCustomerAppointments, splitAppointments } from "@/lib/bookings/overview";
import { loadFavoriteOfferIds } from "@/lib/favorites/store";
import { loadInspirationFeed } from "@/lib/inspiration/feed";
import { loadCustomerLoyalty } from "@/lib/loyalty/store";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CustomerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { user, profile, strikes } = await requireCustomer();
  const admin = tryCreateAdminClient();
  const loyalty = admin
    ? await loadCustomerLoyalty(admin, user.id).catch(() => ({
        points: 0,
        level: "Bronze" as const,
      }))
    : { points: 0, level: "Bronze" as const };
  const [tiles, favoriteIds] = await Promise.all([
    loadInspirationFeed(user.id).catch(() => []),
    loadFavoriteOfferIds(user.id).catch(() => [] as string[]),
  ]);
  const appointments = await loadCustomerAppointments(user.id).catch(() => []);
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Zurich" });
  const todayVisit = splitAppointments(appointments).upcoming.find((item) => {
    if (item.status !== "confirmed" && item.status !== "accepted") {
      return false;
    }
    return new Date(item.start_time).toLocaleDateString("en-CA", { timeZone: "Europe/Zurich" }) === todayKey;
  });

  const place = (() => {
    const loc = todayVisit?.event_location || todayVisit?.counterpart_address || "";
    const city = loc.split(",").pop()?.trim();
    if (!city) {
      return "";
    }
    return city.toLocaleLowerCase("de-CH").startsWith("region ") ? city : `Region ${city}`;
  })();

  return (
    <CustomerShell titleKey="nav.home" userName={profile.full_name} signedIn>
      <PullToRefresh />
      <div className="mb-6">
        <HomeOfferSearch
          tiles={tiles}
          initialQuery={q ?? ""}
          memberLevel={loyalty.level}
          favoriteIds={favoriteIds}
          showFavorite
        >
          {todayVisit ? (
            <TodayAppointmentBanner startTime={todayVisit.start_time} region={place} />
          ) : null}
          <StrikeAlert userId={user.id} initialCount={strikes} />
        </HomeOfferSearch>
      </div>
    </CustomerShell>
  );
}
