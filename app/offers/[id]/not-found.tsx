export default function OfferNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-gold-deep">TalentMatch</p>
        <h1 className="mt-3 font-serif text-4xl text-ink">Angebot nicht gefunden</h1>
        <p className="mt-3 text-sm text-ink-soft">
          Das Angebot ist nicht mehr aktiv oder der Slot ist bereits vergeben.
        </p>
        <a href="/dashboard" className="mt-8 inline-block text-sm text-gold-deep hover:underline">
          Zurück zur Übersicht
        </a>
      </div>
    </main>
  );
}
