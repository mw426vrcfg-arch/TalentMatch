import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerShell } from "@/components/customer/customer-shell";
import { getOptionalProfile } from "@/lib/auth/require-customer";
import { formatChf, formatSlot } from "@/lib/offers/format";
import { loadOfferById } from "@/lib/offers/load-active-offers";

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [offer, profile] = await Promise.all([loadOfferById(id), getOptionalProfile()]);

  if (!offer) {
    notFound();
  }

  const signedIn = profile?.role === "customer" || profile?.role === "admin";

  return (
    <CustomerShell
      title="Angebot"
      userName={signedIn ? profile?.full_name : null}
      signedIn={signedIn}
    >
      <Link href={signedIn ? "/dashboard" : "/offers"} className="text-sm text-gold-deep hover:underline">
        ← Zurück zur Übersicht
      </Link>

      <article className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-[2rem] border border-ink/10 bg-paper p-8">
          <div className="flex items-start gap-4">
            {offer.salon_logo ? (
              <img
                src={offer.salon_logo}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/20 font-serif text-2xl text-gold-deep">
                {offer.salon_name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-gold-deep">{offer.location}</p>
              <h1 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">{offer.title}</h1>
              <p className="mt-2 text-sm text-ink-soft">{offer.salon_name}</p>
              {offer.salon_address ? (
                <p className="mt-1 text-sm text-ink-soft">{offer.salon_address}</p>
              ) : null}
              {offer.salon_phone ? (
                <p className="mt-1 text-sm text-ink-soft">{offer.salon_phone}</p>
              ) : null}
            </div>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-ink">
            {offer.description || "Keine Beschreibung hinterlegt."}
          </p>

          <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Bedingungen / Anforderungen</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {offer.requirements || "Keine besonderen Anforderungen angegeben."}
            </p>
          </div>
        </section>

        <aside className="rounded-[2rem] border border-ink/10 bg-paper p-8">
          <p className="text-xs uppercase tracking-wide text-gold-deep">Preis</p>
          <p className="mt-2 font-serif text-4xl text-ink">{formatChf(offer.discount_price)}</p>
          <p className="text-sm text-ink-soft line-through">{formatChf(offer.normal_price)}</p>
          <p className="mt-3 text-sm text-ink-soft">{offer.duration_minutes} Minuten</p>

          <p className="mt-8 text-xs uppercase tracking-[0.18em] text-ink-soft">Verfügbare Slots</p>
          <p className="mt-2 text-sm text-ink-soft">Wähle einen Termin, um dich zu bewerben.</p>
          {offer.slots.length === 0 ? (
            <p className="mt-4 text-sm text-ink">Aktuell keine freien Termine</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {offer.slots.map((slot) => (
                <li key={slot.id}>
                  <Link
                    href={`/offers/${offer.id}/apply?slot=${slot.id}`}
                    className="block rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm text-ink transition hover:border-gold"
                  >
                    {formatSlot(slot.start_time)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </article>
    </CustomerShell>
  );
}
