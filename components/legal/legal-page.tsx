"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { useT } from "@/components/i18n/i18n-provider";

export function LegalPage({
  kicker,
  title,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <>
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-8 sm:py-24">
      <Link href="/" className="ui-link">
        ← {t("settings.back")}
      </Link>
      <p className="ui-kicker mt-10">{kicker}</p>
      <h1 className="mt-4 font-serif text-4xl tracking-tight text-ink sm:text-5xl">{title}</h1>
      {updated ? <p className="mt-3 text-sm text-ink-soft">{updated}</p> : null}
      <div className="mt-12 space-y-10 text-sm leading-relaxed text-ink">{children}</div>
    </main>
    <SiteFooter />
    </>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-ink-soft">{children}</div>
    </section>
  );
}
