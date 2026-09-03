import { CreateOfferWorkspace } from "@/components/business/create-offer-workspace";
import { SalonShell } from "@/components/business/salon-shell";
import { requireBusiness } from "@/lib/auth/require-business";
import { resolveLogoUrl } from "@/lib/business/images";
import { formatChf, formatSlotTime, groupSlotsByDay } from "@/lib/offers/format";
import { offerStatusLabel } from "@/lib/offers/availability";
import { loadUrgentMatchQuota } from "@/lib/offers/urgent-quota";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type OfferRow = {
  id: string;
  title: string;
  description: string | null;
  normal_price: number | string;
  discount_price: number | string;
  duration_minutes: number;
  status: string;
  available_slots?: number | null;
  is_urgent?: boolean;
  offer_slots: { id: string; start_time: string; is_booked: boolean }[];
};

export default async function SalonOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { created } = await searchParams;
  const { business } = await requireBusiness();
  const salonName = business?.business_name || "Dein Salon";
  const admin = createAdminClient();
  const { data: offers } = business
    ? await admin
        .from("offers")
        .select("*, offer_slots(id, start_time, is_booked)")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
    : { data: [] as OfferRow[] };

  const urgentQuota = business
    ? await loadUrgentMatchQuota(admin, business.id)
    : { reached: false, used: 0, limit: 3, remaining: 3 };

  const liveOffers = (offers ?? []) as OfferRow[];

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
          Erstelle ein neues Angebot, wenn Kapazität frei wird. Der Deal erscheint sofort für Modelle.
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

      <h2 className="font-serif text-3xl text-ink">Live Angebote</h2>
      <div className="mt-6 space-y-4">
        {liveOffers.length === 0 ? (
          <div className="ui-empty">Noch kein Angebot. Das erste Deal startet den Marktplatz.</div>
        ) : (
          liveOffers.map((offer) => (
            <article key={offer.id} className="ui-card p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-2xl text-ink">{offer.title}</h3>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {offer.is_urgent ? (
                    <span className="ui-badge bg-zinc-900 text-white">Last-Minute</span>
                  ) : null}
                  <span className="ui-badge">{offerStatusLabel(offer.status)}</span>
                </div>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{offer.description}</p>
              <p className="mt-4 text-sm text-ink">
                <span className="text-ink-soft line-through">{formatChf(offer.normal_price)}</span>{" "}
                <span className="font-medium">{formatChf(offer.discount_price)}</span>
                <span className="text-ink-soft"> · {offer.duration_minutes} Min.</span>
                {typeof offer.available_slots === "number" ? (
                  <span className="text-ink-soft"> · {offer.available_slots} frei</span>
                ) : null}
              </p>
              <div className="mt-3 space-y-3">
                {groupSlotsByDay(offer.offer_slots ?? []).map((group) => (
                  <div key={group.key}>
                    <p className="ui-kicker">{group.label}</p>
                    <ul className="mt-1 space-y-1 text-sm text-ink-soft">
                      {group.slots.map((slot) => (
                        <li key={slot.id}>
                          {formatSlotTime(slot.start_time)}
                          {slot.is_booked ? " · ausgebucht" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </SalonShell>
  );
}
