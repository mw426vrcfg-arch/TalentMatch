import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplyForm } from "@/components/offers/apply-form";
import { CustomerShell } from "@/components/customer/customer-shell";
import { requireCustomer } from "@/lib/auth/require-customer";
import { formatChf, formatSlot } from "@/lib/offers/format";
import { loadAvailableSlot, loadOfferById } from "@/lib/offers/load-active-offers";

export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ slot?: string }>;
}) {
  const { id } = await params;
  const { slot: slotId } = await searchParams;
  const { profile } = await requireCustomer();

  if (!slotId) {
    notFound();
  }

  const [offer, slot] = await Promise.all([
    loadOfferById(id),
    loadAvailableSlot(slotId, id),
  ]);

  if (!offer || !slot) {
    notFound();
  }

  return (
    <CustomerShell title="Apply" userName={profile.full_name} signedIn>
      <Link href={`/offers/${offer.id}`} className="text-sm text-gold-deep hover:underline">
        ← Zurück zum Angebot
      </Link>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-[2rem] border border-ink/10 bg-paper p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-gold-deep">Phase 3 · Apply</p>
          <h1 className="mt-3 font-serif text-4xl text-ink">Bewerbung</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Nicht buchen — bewerben. Der Salon entscheidet anhand deiner Bilder und Notizen.
          </p>

          <dl className="mt-8 space-y-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-soft">Angebot</dt>
              <dd className="mt-1 font-medium text-ink">{offer.title}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-soft">Salon</dt>
              <dd className="mt-1 text-ink">
                {offer.salon_name}
                {offer.location ? ` · ${offer.location}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-soft">Preis</dt>
              <dd className="mt-1 text-ink">
                {formatChf(offer.discount_price)}{" "}
                <span className="text-ink-soft line-through">{formatChf(offer.normal_price)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-soft">Zeit</dt>
              <dd className="mt-1 text-ink">{formatSlot(slot.start_time)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-soft">Bedingungen</dt>
              <dd className="mt-1 whitespace-pre-wrap text-ink">
                {offer.requirements || offer.description || "Keine besonderen Bedingungen."}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[2rem] border border-ink/10 bg-paper p-8">
          <h2 className="font-serif text-3xl text-ink">Hair Images & Notes</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Nach Submit ist deine Bewerbung <strong className="text-ink">pending</strong>.
          </p>
          <div className="mt-8">
            <ApplyForm offerId={offer.id} slotId={slot.id} />
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}
