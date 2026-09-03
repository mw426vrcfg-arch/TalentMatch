import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer/customer-shell";
import { FavoriteHeart } from "@/components/offers/favorite-heart";
import { FollowSalonButton } from "@/components/offers/follow-salon-button";
import { BeforeAfterCarousel } from "@/components/portfolio/before-after-carousel";
import { getOptionalProfile } from "@/lib/auth/require-customer";
import { loadCustomerProfile } from "@/lib/customer/profile-store";
import { loadFavoriteOfferIds, loadFollowedSalonIds } from "@/lib/favorites/store";
import { isPerfectHairMatch } from "@/lib/hair/criteria";
import { formatChf } from "@/lib/offers/format";
import { VipWaitNotice } from "@/components/offers/vip-wait-notice";
import { loadOfferAccess } from "@/lib/loyalty/offer-access";
import { earliestUnbookedSlot } from "@/lib/offers/load-active-offers";
import { loadSalonBeforeAfter } from "@/lib/portfolio/before-after";
import { createAdminClient } from "@/lib/supabase/admin";
import { StarAverage } from "@/components/ratings/star-average";
import { UrgentBadge } from "@/components/offers/offer-card";
import { UrgentCountdown } from "@/components/offers/urgent-countdown";
import { SlotChoices } from "@/components/offers/slot-choices";

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getOptionalProfile();
  const access = await loadOfferAccess(id, profile?.role === "customer" ? profile.id : null);
  const offer = access.offer;

  if (!offer) {
    notFound();
  }

  if (profile?.role === "business" || profile?.role === "admin") {
    redirect("/business/dashboard");
  }

  const signedIn = profile?.role === "customer";
  let favoriteIds: string[] = [];
  let followedIds: string[] = [];
  let perfectMatch = false;
  const gallery = offer.salon_user_id ? await loadSalonBeforeAfter(offer.salon_user_id) : [];
  if (signedIn) {
    try {
      [favoriteIds, followedIds] = await Promise.all([
        loadFavoriteOfferIds(profile.id),
        loadFollowedSalonIds(profile.id),
      ]);
      const loaded = await loadCustomerProfile(createAdminClient(), profile.id);
      if (loaded.profile?.hair) {
        perfectMatch = isPerfectHairMatch(loaded.profile.hair, offer.hair);
      }
    } catch (error) {
      console.error("Favorites load failed:", error);
    }
  }

  return (
    <CustomerShell
      title="Angebot"
      userName={signedIn ? profile?.full_name : null}
      signedIn={signedIn}
    >
      <Link href={signedIn ? "/dashboard" : "/offers"} className="ui-link">
        ← Zurück
      </Link>

      <article className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className={`${offer.is_urgent ? "ui-card-urgent" : "ui-card"} p-5 sm:p-8`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/70 font-serif text-2xl text-zinc-600 backdrop-blur-md">
                #
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="ui-kicker">{offer.region}</p>
                  {offer.is_urgent ? <UrgentBadge /> : null}
                  {offer.is_urgent && earliestUnbookedSlot(offer) ? (
                    <UrgentCountdown iso={earliestUnbookedSlot(offer)!.start_time} />
                  ) : null}
                </div>
                <h1 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">{offer.title}</h1>
                {perfectMatch ? (
                  <p className="mt-3 inline-flex rounded-full border border-white/30 bg-white/80 px-3 py-1 text-[11px] font-medium tracking-wide text-ink">
                    ✨ Perfektes Match für dein Haar
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-ink-soft">{offer.partner_name}</p>
                <StarAverage
                  average={offer.salon_rating_average}
                  count={offer.salon_rating_count}
                  className="mt-1"
                />
              </div>
            </div>
            {signedIn ? (
              <FavoriteHeart offerId={offer.id} initialSaved={favoriteIds.includes(offer.id)} />
            ) : null}
          </div>
          {offer.image_url ? (
            <img
              src={offer.image_url}
              alt=""
              className="mt-6 aspect-[4/3] w-full rounded-[22px] object-cover"
            />
          ) : null}
          <p className="mt-6 text-sm leading-relaxed text-ink">
            {offer.description || "Keine Beschreibung hinterlegt."}
          </p>
          {signedIn && offer.business_id ? (
            <div className="mt-6">
              <FollowSalonButton
                salonId={offer.business_id}
                initialFollowing={followedIds.includes(offer.business_id)}
              />
              <p className="mt-2 text-xs text-ink-soft">
                Du bleibst anonym. Bei neuen Deals kommt eine Mitteilung.
              </p>
            </div>
          ) : null}

          {gallery.length > 0 ? (
            <div className="mt-8">
              <p className="ui-kicker">Kapitel 4.9.1 · Ergebnisse</p>
              <h2 className="mt-2 font-serif text-2xl text-ink">Vorher / Nachher</h2>
              <div className="mt-4">
                <BeforeAfterCarousel pairs={gallery} />
              </div>
            </div>
          ) : null}

          <div className="mt-8">
            <p className="ui-kicker">Bedingungen / Anforderungen</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {offer.requirements || "Keine besonderen Anforderungen angegeben."}
            </p>
          </div>
        </section>

        <aside className={`${offer.is_urgent ? "ui-card-urgent" : "ui-card"} p-5 sm:p-8`}>
          <p className="ui-kicker">Preis</p>
          <p className="mt-2 font-serif text-4xl text-ink">{formatChf(offer.discount_price)}</p>
          <p className="text-sm text-ink-soft line-through">{formatChf(offer.normal_price)}</p>
          <p className="mt-3 text-sm text-ink-soft">{offer.duration_minutes} Minuten</p>
          {!access.visible ? (
            <div className="mt-6">
              <VipWaitNotice unlockAt={access.unlockAt} />
            </div>
          ) : null}

          <p className="mt-8 ui-kicker">Slots</p>
          <p className="mt-2 text-sm text-ink-soft">
            {access.visible
              ? "Wähle eine freie Uhrzeit, um dich zu bewerben."
              : "Slots öffnen für Bronze, sobald der VIP-Timer abgelaufen ist."}
          </p>
          {access.visible ? <SlotChoices offerId={offer.id} slots={offer.slots} /> : null}
        </aside>
      </article>
    </CustomerShell>
  );
}
