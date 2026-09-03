import { ProfileLegalMenu } from "@/components/legal/profile-legal-menu";
import { InviteSalonCard } from "@/components/business/invite-salon-card";
import { BeforeAfterCarousel } from "@/components/portfolio/before-after-carousel";
import { BusinessProfileForm } from "@/components/business/profile-form";
import { SalonShell } from "@/components/business/salon-shell";
import { ReceivedReviews } from "@/components/ratings/received-reviews";
import { StarAverage } from "@/components/ratings/star-average";
import { requireBusiness } from "@/lib/auth/require-business";
import { resolveLogoUrl } from "@/lib/business/images";
import { loadSalonBeforeAfter } from "@/lib/portfolio/before-after";
import { loadReceivedReviews, loadSalonAverages } from "@/lib/ratings/store";
import { countReferralsInMonth, salonInvitePath } from "@/lib/referrals/store";
import { loadUrgentMatchQuota } from "@/lib/offers/urgent-quota";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function BusinessProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const { user, business } = await requireBusiness();
  const salonName = business?.business_name || "Dein Salon";
  const profile = business
    ? { ...business, logo_url: resolveLogoUrl(business.logo_url) }
    : null;
  const admin = createAdminClient();
  const headerList = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${headerList.get("x-forwarded-proto") ?? "http"}://${headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000"}`;
  const [averages, reviews, portfolio, referralsThisMonth, urgentQuota] = await Promise.all([
    loadSalonAverages([user.id]),
    loadReceivedReviews(user.id),
    loadSalonBeforeAfter(user.id),
    countReferralsInMonth(admin, user.id),
    business
      ? loadUrgentMatchQuota(admin, business.id)
      : Promise.resolve({ used: 0, limit: 3, remaining: 3, reached: false }),
  ]);
  const salonRating = averages.get(user.id) ?? { average: null, count: 0 };

  return (
    <SalonShell
      salonName={salonName}
      location={business?.location}
      logoUrl={profile?.logo_url}
      headerAction={<ProfileLegalMenu />}
    >
      <div className="mb-10 max-w-3xl">
        <p className="ui-kicker">
          Kapitel 4.1 · Business Profile
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Profil bearbeiten</h1>
        <StarAverage
          average={salonRating.average}
          count={salonRating.count}
          className="mt-3"
        />
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Name, Ort und Logo für dein Salon-Konto. Lade andere Salons ein, um in diesem Monat ein Extra-Urgent-Slot zu erhalten.
        </p>
      </div>

      {saved === "1" && (
        <p className="ui-alert-ok mb-8">
          Profil gespeichert. Die Kundenseite zeigt jetzt deine aktuellen Daten.
        </p>
      )}

      <section className="ui-card max-w-xl p-5 sm:p-8">
        <BusinessProfileForm userId={user.id} profile={profile} />
      </section>

      <section className="ui-card mb-12 max-w-xl p-5 sm:p-8">
        <p className="ui-kicker">Empfehlung</p>
        <h2 className="mt-3 font-serif text-3xl text-ink">Salon einladen</h2>
        <div className="mt-5">
          <InviteSalonCard
            inviteUrl={`${origin.replace(/\/$/, "")}${salonInvitePath(user.id)}`}
            referralsThisMonth={referralsThisMonth}
            urgentLimit={urgentQuota.limit}
          />
        </div>
      </section>

      <section className="mb-12">
        <p className="ui-kicker">Kapitel 4.9.1 · Ergebnisse</p>
        <h2 className="mt-3 font-serif text-3xl text-ink">Vorher / Nachher</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Wische seitlich durch die Galerie. Modelle sehen dieselben Ergebnisse auf der Angebotsseite.
        </p>
        <div className="mt-6">
          <BeforeAfterCarousel pairs={portfolio} />
        </div>
      </section>

      <ReceivedReviews reviews={reviews} />
    </SalonShell>
  );
}
