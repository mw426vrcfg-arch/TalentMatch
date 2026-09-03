import { ProfileLegalMenu } from "@/components/legal/profile-legal-menu";
import { HairPortfolioEditor } from "@/components/customer/hair-portfolio";
import { CustomerProfileForm } from "@/components/customer/customer-profile-form";
import { CustomerShell } from "@/components/customer/customer-shell";
import { LoyaltyBadge } from "@/components/customer/loyalty-badge";
import { ReputationBoard } from "@/components/customer/reputation-board";
import { ReceivedReviews } from "@/components/ratings/received-reviews";
import { requireCustomer } from "@/lib/auth/require-customer";
import { resolveAvatarUrl } from "@/lib/customer/images";
import { loadHairPortfolio } from "@/lib/customer/portfolio";
import { loadCustomerProfile } from "@/lib/customer/profile-store";
import { EMPTY_TREATMENT_PASS } from "@/lib/customer/treatment-pass";
import { loadCustomerLoyalty } from "@/lib/loyalty/store";
import { loadRatingAverages, loadReceivedReviews } from "@/lib/ratings/store";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; portfolio?: string; missing?: string }>;
}) {
  const { saved, portfolio, missing } = await searchParams;
  const missingColumns = (missing ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const { user, profile, strikes } = await requireCustomer();
  const admin = createAdminClient();
  const loaded = await loadCustomerProfile(admin, user.id);
  const hairPortfolio = await loadHairPortfolio(
    admin,
    user.id,
    loaded.row ?? (loaded.profile ? { hair_portfolio: loaded.profile.hair_portfolio } : null),
  );
  const customerProfile = {
    id: loaded.profile?.id ?? null,
    user_id: user.id,
    full_name: loaded.profile?.full_name || profile.full_name,
    bio: loaded.profile?.bio ?? null,
    avatar_url: resolveAvatarUrl(loaded.profile?.avatar_url),
    hair_portfolio: hairPortfolio,
    hair: loaded.profile?.hair ?? { structure: null, length: null, chemical: null },
    treatment_pass: loaded.profile?.treatment_pass ?? EMPTY_TREATMENT_PASS,
    beauty_points: loaded.profile?.beauty_points ?? 0,
    member_level: loaded.profile?.member_level ?? "Bronze",
  };

  const loyalty = await loadCustomerLoyalty(admin, user.id);
  const [averages, reviews] = await Promise.all([
    loadRatingAverages([user.id]),
    loadReceivedReviews(user.id),
  ]);
  const rating = averages.get(user.id) ?? { average: null, count: 0 };

  return (
    <CustomerShell
      title="Profil"
      userName={customerProfile.full_name}
      signedIn
      headerAction={<ProfileLegalMenu />}
    >
      <div className="mb-10 max-w-2xl">
        <p className="ui-kicker">Kundenprofil</p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Dein Profil</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Name, Bio, Haarprofil und Foto. Dein Strike-Stand bleibt nur für dich und angenommene Termine sichtbar.
        </p>
      </div>

      {saved === "1" ? (
        <p className="ui-alert-ok mb-8">Profil gespeichert.</p>
      ) : null}
      {portfolio === "1" ? (
        <p className="ui-alert-ok mb-8">Haar-Portfolio aktualisiert.</p>
      ) : null}
      {missingColumns.length > 0 ? (
        <div className="ui-alert-error mb-8">
          <p className="font-medium">Diese Angaben wurden nicht gespeichert.</p>
          <p className="mt-1">
            In der Tabelle <code>customer_profiles</code> fehlen die Spalten{" "}
            {missingColumns.join(", ")}. Führe <code>customer_profile_columns.sql</code> im
            Supabase SQL-Editor aus, danach bleiben die Werte erhalten.
          </p>
        </div>
      ) : null}

      <div className="mb-10 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <LoyaltyBadge level={loyalty.level} points={loyalty.points} />
        <div className="min-w-0">
          <ReputationBoard
            userId={user.id}
            average={rating.average}
            count={rating.count}
            initialStrikes={strikes}
          />
        </div>
      </div>

      <section className="ui-card max-w-xl p-5 sm:p-8">
        <CustomerProfileForm profile={customerProfile} />
      </section>

      <HairPortfolioEditor
        key={customerProfile.hair_portfolio.join("|")}
        images={customerProfile.hair_portfolio}
      />

      <ReceivedReviews reviews={reviews} />
    </CustomerShell>
  );
}
