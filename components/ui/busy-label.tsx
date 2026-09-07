export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`ui-spin ${className}`.trim()} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function BusyLabel({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <Spinner />
      <span>{children}</span>
    </span>
  );
}
