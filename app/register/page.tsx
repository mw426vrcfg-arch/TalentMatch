import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthReturnLink } from "@/components/auth/auth-return-link";
import { RegisterForm } from "@/components/auth/register-form";
import { T } from "@/components/i18n/t";
import { isReferralUserId } from "@/lib/referrals/store";
import { readReturnTo } from "@/lib/auth/return-to";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; ref?: string; redirectTo?: string; next?: string }>;
}) {
  const params = await searchParams;
  const referredBy = isReferralUserId(params.ref) ? String(params.ref).trim() : "";
  const initialRole = params.role === "business" || referredBy ? "business" : "customer";
  const returnTo = readReturnTo({
    get: (key) => (key === "redirectTo" ? params.redirectTo ?? null : params.next ?? null),
  });

  return (
    <AuthShell
      titleKey="auth.createAccount"
      subtitleKey="auth.registerSubtitle"
      footer={
        <>
          <T k="auth.alreadyRegistered" />{" "}
          <Suspense>
            <AuthReturnLink href="/login" className="ui-link">
              <T k="auth.signIn" />
            </AuthReturnLink>
          </Suspense>
        </>
      }
    >
      <RegisterForm initialRole={initialRole} referredBy={referredBy} returnTo={returnTo} />
    </AuthShell>
  );
}
