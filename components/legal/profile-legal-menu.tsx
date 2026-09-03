"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/agb", label: "AGB" },
  { href: "/datenschutz", label: "Datenschutz" },
];

export function ProfileLegalMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="ui-icon-btn"
        aria-expanded={open}
        aria-label="Einstellungen und Rechtstexte"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="3.2" />
          <path
            strokeLinecap="round"
            d="M12 4.5v1.2M12 18.3v1.2M4.5 12h1.2M18.3 12h1.2M6.4 6.4l.9.9M16.7 16.7l.9.9M6.4 17.6l.9-.9M16.7 7.3l.9-.9"
          />
        </svg>
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-56 overflow-hidden rounded-2xl border border-white/20 bg-white/80 p-2 shadow-xl backdrop-blur-md">
          <p className="px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">
            Rechtliches
          </p>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-xl px-3 py-2.5 text-sm text-neutral-800 transition-all duration-300 ease-out hover:bg-white/90 hover:scale-[1.015] active:scale-95"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
