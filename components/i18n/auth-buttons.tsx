"use client";

import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { useT } from "@/components/i18n/i18n-provider";

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
  return (
    <>
      <Link href="/login" className="ui-btn-secondary px-3 text-xs">
        {t("auth.signIn")}
      </Link>
      <Link href="/register" className="ui-btn-primary px-3 text-xs">
        {t("auth.register")}
      </Link>
    </>
  );
}
