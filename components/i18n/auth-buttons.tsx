"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { withReturnTo } from "@/lib/auth/return-to";

export function SignOutButton() {
  const t = useT();
  return (
    <form action={signOutAction}>
      <button type="submit" className="ui-btn-secondary px-3 text-xs">
        {t("auth.signOut")}
      </button>
    </form>
  );
}

export function GuestAuthLinks() {
  const t = useT();
  const pathname = usePathname();
  const returnTo =
    pathname.startsWith("/login") || pathname.startsWith("/register") || pathname === "/"
      ? ""
      : pathname;

  return (
    <>
      <Link href={withReturnTo("/login", returnTo)} className="ui-btn-secondary px-4 text-sm">
        {t("auth.signIn")}
      </Link>
      <Link href={withReturnTo("/register", returnTo)} className="ui-btn-primary px-4 text-sm">
        {t("auth.register")}
      </Link>
    </>
  );
}
