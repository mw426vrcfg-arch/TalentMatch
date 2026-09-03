import Link from "next/link";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-zinc-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_rgba(113,113,122,0.35),_transparent_38%),radial-gradient(circle_at_82%_78%,_rgba(63,63,70,0.4),_transparent_42%)]" />
        <Link href="/" className="relative font-serif text-3xl text-zinc-50">
          TalentMatch
        </Link>
        <div className="relative max-w-md">
          <p className="ui-kicker text-zinc-400">Beauty Marketplace</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight text-zinc-50">
            Freie Slots. Passende Talente. Verbindliche Termine.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-zinc-400">
            Kunden bewerben sich mit Fotos. Salons entscheiden. Reviews und Strikes halten die
            Qualität hoch.
          </p>
        </div>
        <p className="relative text-xs text-zinc-500">Zürich · Beauty · Matching</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="ui-page w-full max-w-md rounded-[28px] border border-white/20 bg-white/70 p-6 shadow-[0_18px_50px_rgba(15,15,20,0.06)] backdrop-blur-md sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
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
