import Link from "next/link";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-cream lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(176,141,87,0.35),_transparent_34%),radial-gradient(circle_at_80%_80%,_rgba(201,169,163,0.28),_transparent_40%)]" />
        <Link href="/" className="relative font-serif text-3xl text-cream">
          TalentMatch
        </Link>
        <div className="relative max-w-md">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Beauty Marketplace</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight text-cream">
            Freie Slots. Passende Talente. Verbindliche Termine.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-cream/70">
            Kunden bewerben sich mit Fotos. Salons entscheiden. Zahlung vor dem Termin —
            damit No-Shows das Angebot nicht zerstören.
          </p>
        </div>
        <p className="relative text-xs text-cream/40">Zürich · Beauty · Matching</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 block font-serif text-3xl text-ink lg:hidden">
            TalentMatch
          </Link>
          <h1 className="font-serif text-4xl text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-sm text-ink-soft">{footer}</p>
        </div>
      </section>
    </main>
  );
}
