import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplyForm } from "@/components/offers/apply-form";
import { CustomerShell } from "@/components/customer/customer-shell";
import { requireCustomer } from "@/lib/auth/require-customer";
import { formatChf, formatSlot } from "@/lib/offers/format";
import { VipWaitNotice } from "@/components/offers/vip-wait-notice";
import { loadOfferAccess } from "@/lib/loyalty/offer-access";
import { loadOfferSlot } from "@/lib/offers/load-active-offers";

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

  const [access, slot] = await Promise.all([
    loadOfferAccess(id, profile.id),
    loadOfferSlot(slotId, id),
  ]);
  const offer = access.offer;

  if (!offer || !slot) {
    notFound();
  }

  if (!access.visible) {
    return (
      <CustomerShell title="Apply" userName={profile.full_name} signedIn>
        <Link href={`/offers/${offer.id}`} className="ui-link">
          ← Zurück zum Angebot
        </Link>
        <section className="ui-card mt-8 max-w-xl p-5 sm:p-8">
          <h1 className="font-serif text-4xl text-ink">VIP Early Access</h1>
          <p className="mt-3 text-sm text-ink-soft">
            Dieses Angebot ist für Bronze noch gesperrt. Silber und Gold sehen es sofort.
          </p>
          <div className="mt-6">
            <VipWaitNotice unlockAt={access.unlockAt} />
          </div>
        </section>
      </CustomerShell>
    );
  }

  const booked =
    slot.is_booked || new Date(slot.start_time).getTime() < Date.now();

  if (booked) {
    return (
      <CustomerShell title="Apply" userName={profile.full_name} signedIn>
        <Link href={`/offers/${offer.id}`} className="ui-link">
          ← Zurück zum Angebot
        </Link>
        <section className="ui-card mt-8 max-w-xl p-5 sm:p-8">
          <p className="ui-kicker">Slot</p>
          <h1 className="mt-3 font-serif text-4xl text-ink">Ausgebucht</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {formatSlot(slot.start_time)} ist für andere Kunden nicht mehr verfügbar.
            Dieser Slot wurde angenommen oder bestätigt. Wähle eine andere Uhrzeit desselben
            Angebots.
          </p>
          <Link href={`/offers/${offer.id}`} className="ui-btn-primary mt-6">
            Andere Slots ansehen
          </Link>
        </section>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell title="Apply" userName={profile.full_name} signedIn>
      <Link href={`/offers/${offer.id}`} className="ui-link">
        ← Zurück zum Angebot
      </Link>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="ui-card p-5 sm:p-8">
          <p className="ui-kicker">Phase 3 · Apply</p>
          <h1 className="mt-3 font-serif text-4xl text-ink">Bewerbung</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Nicht buchen — bewerben. Der Salon entscheidet anhand deiner Bilder und Notizen.
          </p>

          <dl className="mt-8 space-y-4 text-sm">
            <div>
              <dt className="ui-kicker">Angebot</dt>
              <dd className="mt-1 font-medium text-ink">{offer.title}</dd>
            </div>
            <div>
              <dt className="ui-kicker">Partner</dt>
              <dd className="mt-1 text-ink">
                {offer.partner_name}
                {offer.region ? ` · ${offer.region}` : ""}
              </dd>
            </div>
            <div>
              <dt className="ui-kicker">Preis</dt>
              <dd className="mt-1 text-ink">
                {formatChf(offer.discount_price)}{" "}
                <span className="text-ink-soft line-through">{formatChf(offer.normal_price)}</span>
              </dd>
            </div>
            <div>
              <dt className="ui-kicker">Zeit</dt>
              <dd className="mt-1 text-ink">{formatSlot(slot.start_time)}</dd>
            </div>
            <div>
              <dt className="ui-kicker">Bedingungen</dt>
              <dd className="mt-1 whitespace-pre-wrap text-ink">
                {offer.requirements || offer.description || "Keine besonderen Bedingungen."}
              </dd>
            </div>
          </dl>
        </section>

        <section className="ui-card p-5 sm:p-8">
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
