export function ConfirmedBadge({ label }: { label: string }) {
  return (
    <span className="ui-badge inline-flex shrink-0 items-center gap-1 bg-emerald-100 text-emerald-800">
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5 9.2 17 19 7" />
      </svg>
      {label}
    </span>
  );
}
