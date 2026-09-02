import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-cream">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(176,141,87,0.18),_transparent_42%),radial-gradient(circle_at_bottom_left,_rgba(201,169,163,0.22),_transparent_36%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-gold-deep">
          B2B Beauty Marktplatz
        </p>
        <h1 className="mt-4 max-w-2xl font-serif text-5xl leading-tight text-ink sm:text-6xl">
          TalentMatch
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
          Salons füllen freie Kapazitäten. Kunden bewerben sich auf starke Deals.
          Vertrauen entsteht durch Auswahl, Vorauszahlung und Reviews.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/offers"
            className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-gold-deep"
          >
            Angebote entdecken
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-ink/15 bg-paper px-6 py-3 text-sm font-medium text-ink transition hover:border-gold"
          >
            Jetzt registrieren
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-ink/15 bg-paper px-6 py-3 text-sm font-medium text-ink transition hover:border-gold"
          >
            Anmelden
          </Link>
        </div>
      </div>
    </main>
  );
}
