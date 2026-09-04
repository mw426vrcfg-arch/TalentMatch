import { T } from "@/components/i18n/t";

export default function OfferNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="max-w-md text-center">
        <p className="ui-kicker">TalentMatch</p>
        <h1 className="mt-3 font-serif text-4xl text-ink">
          <T k="offer.notFoundTitle" />
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          <T k="offer.notFoundBody" />
        </p>
        <a href="/dashboard" className="ui-link mt-8 inline-block">
          <T k="offer.backToBrowse" />
        </a>
      </div>
    </main>
  );
}
