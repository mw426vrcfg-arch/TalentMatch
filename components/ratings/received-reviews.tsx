import { type ReceivedReview } from "@/lib/ratings/store";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("de-CH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function ReceivedReviews({ reviews }: { reviews: ReceivedReview[] }) {
  return (
    <section className="mt-10">
      <p className="ui-kicker">Erhaltene Bewertungen</p>
      <h2 className="mt-2 font-serif text-3xl text-ink">Feedback</h2>
      {reviews.length === 0 ? (
        <div className="ui-empty mt-4">Noch keine Text-Bewertungen erhalten.</div>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="ui-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink">{review.from_name}</p>
                <p className="text-sm text-ink">⭐ {review.rating.toFixed(1)}</p>
              </div>
              <p className="mt-1 text-xs text-ink-soft">{formatWhen(review.created_at)}</p>
              {review.comment ? (
                <p className="mt-3 text-sm leading-relaxed text-ink">{review.comment}</p>
              ) : (
                <p className="mt-3 text-sm text-ink-soft">Keine Textbewertung hinterlegt.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
