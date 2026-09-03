import { PullToRefresh } from "@/components/app/pull-to-refresh";
import { TodayAppointmentBanner } from "@/components/customer/today-appointment-banner";
import { InspirationFeed } from "@/components/inspiration/inspiration-feed";
import { CustomerShell } from "@/components/customer/customer-shell";
import { StrikeAlert } from "@/components/customer/strike-alert";
import { requireCustomer } from "@/lib/auth/require-customer";
import { loadCustomerAppointments, splitAppointments } from "@/lib/bookings/overview";
import { loadFavoriteOfferIds } from "@/lib/favorites/store";
import { loadInspirationFeed } from "@/lib/inspiration/feed";
import { loadCustomerLoyalty } from "@/lib/loyalty/store";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CustomerHomePage() {
  const { user, profile, strikes } = await requireCustomer();
  const loyalty = await loadCustomerLoyalty(createAdminClient(), user.id);
  const [tiles, favoriteIds] = await Promise.all([
    loadInspirationFeed(user.id),
    loadFavoriteOfferIds(user.id).catch(() => [] as string[]),
  ]);
  const appointments = await loadCustomerAppointments(user.id);
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
      return "deinem Salon";
    }
    return city.toLocaleLowerCase("de-CH").startsWith("region ") ? city : `Region ${city}`;
  })();

  return (
    <CustomerShell title="Home" userName={profile.full_name} signedIn>
      <PullToRefresh />
      {todayVisit ? (
        <TodayAppointmentBanner startTime={todayVisit.start_time} region={place} />
      ) : null}
      <StrikeAlert userId={user.id} initialCount={strikes} />
      <div className="mb-8 max-w-2xl">
        <h1 className="font-serif text-4xl text-ink sm:text-5xl">Dashboard</h1>
      </div>
      <InspirationFeed tiles={tiles} memberLevel={loyalty.level} favoriteIds={favoriteIds} showFavorite />
    </CustomerShell>
  );
}
