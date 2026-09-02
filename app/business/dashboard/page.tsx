import { IncomingApplications } from "@/components/business/incoming-applications";
import { ConfirmedBookings } from "@/components/business/confirmed-bookings";
import { CreateOfferForm } from "@/components/business/create-offer-form";
import { SalonShell } from "@/components/business/salon-shell";
import { loadSalonPendingApplications } from "@/lib/applications/queries";
import { requireBusiness } from "@/lib/auth/require-business";
import { loadSalonConfirmedBookings } from "@/lib/bookings/salon-confirmed";
import { resolveLogoUrl } from "@/lib/business/images";
import { formatChf, formatSlot } from "@/lib/offers/format";
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
  created_at: string;
  offer_slots: { id: string; start_time: string; is_booked: boolean }[];
};

export default async function BusinessDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; noshow?: string }>;
}) {
  const { created, noshow } = await searchParams;
  const { business } = await requireBusiness();
  const salonName = business?.business_name || "Dein Salon";

  const admin = createAdminClient();
  const [{ data: offers }, applications, confirmedBookings] = await Promise.all([
    business
      ? admin
          .from("offers")
          .select(
            "id, title, description, normal_price, discount_price, duration_minutes, status, created_at, offer_slots(id, start_time, is_booked)",
          )
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as OfferRow[] }),
    business ? loadSalonPendingApplications(business.id) : Promise.resolve([]),
    business ? loadSalonConfirmedBookings(business.id) : Promise.resolve([]),
  ]);

  const liveOffers = (offers ?? []) as OfferRow[];

  return (
    <SalonShell
      salonName={salonName}
      location={business?.location}
      logoUrl={resolveLogoUrl(business?.logo_url)}
    >
      <div className="mb-10 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.24em] text-gold-deep">Phase 1 · Offer Creation</p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">{salonName}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Erstelle strukturierte Deals für freie Kapazitäten. Nach Submit ist das Angebot live.
        </p>
      </div>

      {created === "1" && (
        <p className="mb-8 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
          Angebot ist live und in der Datenbank gespeichert.
        </p>
      )}

      {noshow && (
        <p className="mb-8 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
          No-Show gemeldet. Der Kunde hat jetzt {noshow} aktive Strike
          {noshow === "1" ? "" : "s"}
          {Number(noshow) >= 3 ? " und ist gesperrt." : "."}
        </p>
      )}

      <IncomingApplications applications={applications} />

      <ConfirmedBookings bookings={confirmedBookings} />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-[2rem] border border-ink/10 bg-paper p-6 shadow-[0_20px_60px_rgba(28,23,20,0.06)] sm:p-8">
          <h2 className="font-serif text-3xl text-ink">Neues Angebot erstellen</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Pflichtfelder gemäss Kapitel 4.2. Location kommt von deinem Salonprofil
            {business?.location ? ` (${business.location})` : ""}.
          </p>
          <div className="mt-8">
            <CreateOfferForm />
          </div>
        </section>

        <section>
          <h2 className="font-serif text-3xl text-ink">Live Angebote</h2>
          <p className="mt-2 text-sm text-ink-soft">Deine veröffentlichten Deals und Slots.</p>
          <div className="mt-6 space-y-4">
            {liveOffers.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-ink/15 bg-paper/60 px-6 py-10 text-sm text-ink-soft">
                Noch kein Angebot. Das erste Deal startet den Marktplatz.
              </div>
            ) : (
              liveOffers.map((offer) => (
                <article
                  key={offer.id}
                  className="rounded-[1.75rem] border border-ink/10 bg-paper p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-2xl text-ink">{offer.title}</h3>
                    <span className="rounded-full bg-gold/15 px-3 py-1 text-xs uppercase tracking-wide text-gold-deep">
                      {offer.status}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{offer.description}</p>
                  <p className="mt-4 text-sm text-ink">
                    <span className="text-ink-soft line-through">
                      {formatChf(offer.normal_price)}
                    </span>{" "}
                    <span className="font-medium">{formatChf(offer.discount_price)}</span>
                    <span className="text-ink-soft"> · {offer.duration_minutes} Min.</span>
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                    {offer.offer_slots
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
                      )
                      .map((slot) => (
                        <li key={slot.id}>
                          {formatSlot(slot.start_time)}
                          {slot.is_booked ? " · gebucht" : ""}
                        </li>
                      ))}
                  </ul>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </SalonShell>
  );
}
