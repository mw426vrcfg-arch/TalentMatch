export function StarAverage({
  average,
  count,
  className = "",
  hideEmpty = false,
}: {
  average: number | null;
  count: number;
  className?: string;
  hideEmpty?: boolean;
}) {
  if (!count || average == null) {
    if (hideEmpty) {
      return null;
    }
    return (
      <p className={`text-sm text-ink-soft ${className}`.trim()}>Noch keine Bewertungen</p>
    );
  }

  return (
    <p className={`text-sm font-medium text-ink ${className}`.trim()}>
      ⭐ {average.toFixed(1)}
      <span className="ml-1 font-normal text-ink-soft">
        ({count} {count === 1 ? "Bewertung" : "Bewertungen"})
      </span>
    </p>
  );
}
