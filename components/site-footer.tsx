"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/i18n-provider";
import { type MessageKey } from "@/lib/i18n/messages";

const LINKS: { href: string; key: MessageKey }[] = [
  { href: "/impressum", key: "settings.impressum" },
  { href: "/datenschutz", key: "settings.privacy" },
  { href: "/agb", key: "settings.terms" },
];

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="mt-auto border-t border-neutral-200/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="font-serif text-xl tracking-tight text-ink">TalentMatch</p>
          <p className="mt-1 text-xs tracking-[0.16em] text-ink-soft uppercase">
            {t("auth.marketplaceKicker")}
          </p>
        </div>
        <nav aria-label={t("settings.legal")} className="flex flex-wrap gap-x-8 gap-y-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-neutral-400 transition-colors duration-300 hover:text-neutral-600"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-neutral-200/60">
        <p className="mx-auto max-w-6xl px-6 py-4 text-xs text-ink-soft sm:px-8">
          © {new Date().getFullYear()} TalentMatch. {t("settings.copyright")}
        </p>
      </div>
    </footer>
  );
}
