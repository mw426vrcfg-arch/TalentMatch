import { type SalonAnalytics } from "@/lib/business/analytics";
import { formatChf } from "@/lib/offers/format";

function StatCard({
  kicker,
  value,
  hint,
}: {
  kicker: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="ui-card-hover ui-glass rounded-[28px] p-6 sm:p-7">
      <p className="ui-kicker">{kicker}</p>
      <p className="mt-4 font-serif text-4xl tracking-tight text-ink sm:text-5xl">{value}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{hint}</p>
    </article>
  );
}

export function SalonAnalyticsBoard({ stats }: { stats: SalonAnalytics }) {
  const modelsLabel =
    stats.matched_models === 1 ? "erfolgreich vermitteltes Modell" : "erfolgreich vermittelte Modelle";

  return (
    <section className="mb-12">
      <div className="max-w-2xl">
        <p className="ui-kicker">Kapitel 3.1 · Business Analytics</p>
        <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">Kennzahlen</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Vermittlung, Discount-Umsatz und Slot-Auslastung — live aus deinen Buchungen.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard
          kicker="Modelle"
          value={String(stats.matched_models)}
          hint={`${modelsLabel} mit bestätigter oder abgeschlossener Buchung.`}
        />
        <StatCard
          kicker="Umsatz"
          value={formatChf(stats.revenue_chf)}
          hint="Summe der Discount Prices aller bestätigten und abgeschlossenen Termine."
        />
        <StatCard
          kicker="Auslastung"
          value={`${stats.utilization_percent} %`}
          hint={
            stats.total_slots === 0
              ? "Noch keine Slots angelegt."
              : `${stats.booked_slots} von ${stats.total_slots} angebotenen Slots belegt.`
          }
        />
      </div>
    </section>
  );
}
