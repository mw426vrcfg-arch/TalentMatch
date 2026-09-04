import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplyForm } from "@/components/offers/apply-form";
import { CustomerShell } from "@/components/customer/customer-shell";
import { requireCustomer } from "@/lib/auth/require-customer";
import { formatChf, formatSlot } from "@/lib/offers/format";
import { VipWaitNotice } from "@/components/offers/vip-wait-notice";
import { T } from "@/components/i18n/t";
import { LocalizedText } from "@/components/i18n/localized-text";
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
      <CustomerShell titleKey="nav.apply" userName={profile.full_name} signedIn>
        <Link href={`/offers/${offer.id}`} className="ui-link">
          ← <T k="offer.backToOffer" />
        </Link>
        <section className="ui-card mt-8 max-w-xl p-5 sm:p-8">
          <h1 className="font-serif text-4xl text-ink">
            <T k="offer.vipTitle" />
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            <T k="offer.vipLockedBody" />
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
      <CustomerShell titleKey="nav.apply" userName={profile.full_name} signedIn>
        <Link href={`/offers/${offer.id}`} className="ui-link">
          ← <T k="offer.backToOffer" />
        </Link>
        <section className="ui-card mt-8 max-w-xl p-5 sm:p-8">
          <p className="ui-kicker">
            <T k="offer.slot" />
          </p>
          <h1 className="mt-3 font-serif text-4xl text-ink">
            <T k="offer.bookedTitle" />
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            <T k="offer.bookedBody" values={{ slot: formatSlot(slot.start_time) }} />
          </p>
          <Link href={`/offers/${offer.id}`} className="ui-btn-primary mt-6">
            <T k="offer.otherSlots" />
          </Link>
        </section>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell titleKey="nav.apply" userName={profile.full_name} signedIn>
      <Link href={`/offers/${offer.id}`} className="ui-link">
        ← <T k="offer.backToOffer" />
      </Link>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="ui-card p-5 sm:p-8">
          <p className="ui-kicker">
            <T k="applications.applyKicker" />
          </p>
          <h1 className="mt-3 font-serif text-4xl text-ink">
            <T k="applications.applyTitle" />
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            <T k="applications.applyIntro" />
          </p>

          <dl className="mt-8 space-y-4 text-sm">
            <div>
              <dt className="ui-kicker">
                <T k="offer.offer" />
              </dt>
              <dd className="mt-1 font-medium text-ink">{offer.title}</dd>
            </div>
            <div>
              <dt className="ui-kicker">
                <T k="offer.partner" />
              </dt>
              <dd className="mt-1 text-ink">
                {offer.partner_name}
                {offer.region ? (
                  <>
                    {" · "}
                    <LocalizedText text={offer.region} />
                  </>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="ui-kicker">
                <T k="offer.price" />
              </dt>
              <dd className="mt-1 text-ink">
                {formatChf(offer.discount_price)}{" "}
                <span className="text-ink-soft line-through">{formatChf(offer.normal_price)}</span>
              </dd>
            </div>
            <div>
              <dt className="ui-kicker">
                <T k="offer.time" />
              </dt>
              <dd className="mt-1 text-ink">{formatSlot(slot.start_time)}</dd>
            </div>
            <div>
              <dt className="ui-kicker">
                <T k="offer.conditions" />
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-ink">
                {offer.requirements || offer.description || <T k="offer.noConditions" />}
              </dd>
            </div>
          </dl>
        </section>

        <section className="ui-card p-5 sm:p-8">
          <h2 className="font-serif text-3xl text-ink">
            <T k="applications.hairNotes" />
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            <T k="applications.applyPending" />
          </p>
          <div className="mt-8">
            <ApplyForm offerId={offer.id} slotId={slot.id} />
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}
