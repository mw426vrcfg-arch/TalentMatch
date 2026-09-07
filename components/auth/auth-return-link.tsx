"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ReactNode } from "react";
import { withReturnTo } from "@/lib/auth/return-to";

export function AuthReturnLink({
  href,
  className,
  children,
}: {
  href: "/login" | "/register";
  className?: string;
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("redirectTo") || searchParams.get("next") || "";
  return (
    <Link href={withReturnTo(href, returnTo)} className={className}>
      {children}
    </Link>
  );
}
