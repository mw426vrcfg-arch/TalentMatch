"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/auth/actions";
import { AppImage } from "@/components/ui/app-image";
import { useT } from "@/components/i18n/i18n-provider";
import { hapticTap } from "@/lib/ui/haptic";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    const letter = parts[0].replace(/[^A-Za-zÀ-ÿ]/g, "").charAt(0);
    return (letter || parts[0].charAt(0)).toUpperCase();
  }
  const first = parts[0].replace(/[^A-Za-zÀ-ÿ]/g, "").charAt(0);
  const last = parts[parts.length - 1].replace(/[^A-Za-zÀ-ÿ]/g, "").charAt(0);
  return `${first || parts[0].charAt(0)}${last || parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function ProfileAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const fallback = (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold tracking-wide text-white">
      {initials(name)}
    </span>
  );

  if (!avatarUrl) {
    return fallback;
  }

  return (
    <span className="relative h-8 w-8 overflow-hidden rounded-full bg-neutral-200">
      <AppImage
        src={avatarUrl}
        alt=""
        width={32}
        height={32}
        sizes="32px"
        className="h-8 w-8 object-cover"
        fallback={fallback}
      />
    </span>
  );
}

export function CustomerAccountMenu({
  name,
  points,
  avatarUrl,
}: {
  name: string;
  points: number;
  avatarUrl: string | null;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const displayName = name.trim() || t("nav.profile");

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function toggleOpen() {
    setOpen((current) => !current);
    hapticTap("light");
  }

  const links = [
    { href: "/dashboard/profile", label: t("nav.profile") },
    { href: "/dashboard/applications", label: t("nav.applications") },
    { href: "/dashboard/favorites", label: t("nav.favorites") },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="ui-btn-secondary gap-2 px-2.5 py-0 sm:px-3"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("nav.accountMenu")}
      >
        <ProfileAvatar name={displayName} avatarUrl={avatarUrl} />
        <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">{displayName}</span>
        <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
          {t("loyalty.pointsBadge", { points })}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-3 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-white/25 bg-white/78 shadow-[0_24px_80px_rgba(15,15,20,0.14)] backdrop-blur-2xl ui-sheet"
        >
          <div className="border-b border-white/25 px-4 py-3">
            <p className="truncate text-sm font-medium text-ink">{displayName}</p>
            <p className="mt-1 text-xs text-ink-soft">{t("loyalty.pointsTotal", { points })}</p>
          </div>
          <ul>
            {links.map((link) => (
              <li key={link.href} className="border-b border-white/20">
                <Link
                  href={link.href}
                  role="menuitem"
                  onClick={() => {
                    hapticTap("light");
                    setOpen(false);
                  }}
                  className="block px-4 py-3 text-sm text-ink transition duration-300 ease-out hover:bg-white/70"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <form action={signOutAction}>
                <button
                  type="submit"
                  role="menuitem"
                  className="block w-full px-4 py-3 text-left text-sm text-ink transition duration-300 ease-out hover:bg-white/70"
                >
                  {t("auth.signOut")}
                </button>
              </form>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
