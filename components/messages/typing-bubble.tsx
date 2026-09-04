export function TypingBubble({ label }: { label: string }) {
  return (
    <div className="flex justify-start px-4 pb-1.5 pt-1">
      <div
        role="status"
        aria-live="polite"
        aria-label={label}
        className="ui-typing-bubble inline-flex items-center gap-[5px] rounded-[18px] px-[11px] py-[9px]"
      >
        <span className="ui-typing-dot" />
        <span className="ui-typing-dot" />
        <span className="ui-typing-dot" />
      </div>
    </div>
  );
}
