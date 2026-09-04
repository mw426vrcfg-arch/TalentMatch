import { InviteSalonCard } from "@/components/business/invite-salon-card";
import { BeforeAfterCarousel } from "@/components/portfolio/before-after-carousel";
import { BusinessProfileForm } from "@/components/business/profile-form";
import { SalonShell } from "@/components/business/salon-shell";
import { SettingsHub } from "@/components/customer/settings-hub";
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
import { PageIntro, T } from "@/components/i18n/t";

export const dynamic = "force-dynamic";

export default async function BusinessProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const { user, business } = await requireBusiness();
  const salonName = business?.business_name;
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
      salonName={salonName || ""}
      location={business?.location}
      logoUrl={profile?.logo_url}
    >
      <PageIntro kicker="profile.salonKicker" title="profile.salonTitle" description="profile.salonIntro" className="mb-10 max-w-3xl" />
      <StarAverage
        average={salonRating.average}
        count={salonRating.count}
        className="-mt-6 mb-10"
      />

      {saved === "1" && (
        <p className="ui-alert-ok mb-8">
          <T k="profile.salonSaved" />
        </p>
      )}

      <section className="ui-card max-w-xl p-5 sm:p-8">
        <BusinessProfileForm userId={user.id} profile={profile} />
      </section>

      <div className="flex max-w-xl flex-col gap-10">
        <SettingsHub
          variant="salon"
          gender={business?.contact_gender ?? ""}
          pushEnabled={business?.in_app_push ?? true}
        />
        <section className="ui-card mb-4 p-5 sm:p-8">
        <p className="ui-kicker">
          <T k="salon.recommendation" />
        </p>
        <h2 className="mt-3 font-serif text-3xl text-ink">
          <T k="salon.inviteTitle" />
        </h2>
        <div className="mt-5">
          <InviteSalonCard
            inviteUrl={`${origin.replace(/\/$/, "")}${salonInvitePath(user.id)}`}
            referralsThisMonth={referralsThisMonth}
            urgentLimit={urgentQuota.limit}
          />
        </div>
      </section>
      </div>

      <section className="mb-12">
        <p className="ui-kicker">
          <T k="offer.resultsKicker" />
        </p>
        <h2 className="mt-3 font-serif text-3xl text-ink">
          <T k="offer.beforeAfter" />
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          <T k="rating.galleryIntro" />
        </p>
        <div className="mt-6">
          <BeforeAfterCarousel pairs={portfolio} />
        </div>
      </section>

      <ReceivedReviews reviews={reviews} />
    </SalonShell>
  );
}
