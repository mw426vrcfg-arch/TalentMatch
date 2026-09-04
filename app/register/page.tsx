import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { T } from "@/components/i18n/t";
import { isReferralUserId } from "@/lib/referrals/store";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; ref?: string }>;
}) {
  const { role, ref } = await searchParams;
  const referredBy = isReferralUserId(ref) ? String(ref).trim() : "";
  const initialRole = role === "business" || referredBy ? "business" : "customer";

  return (
    <AuthShell
      titleKey="auth.createAccount"
      subtitleKey="auth.registerSubtitle"
      footer={
        <>
          <T k="auth.alreadyRegistered" />{" "}
          <Link href="/login" className="ui-link">
            <T k="auth.signIn" />
          </Link>
        </>
      }
    >
      <RegisterForm initialRole={initialRole} referredBy={referredBy} />
    </AuthShell>
  );
}
