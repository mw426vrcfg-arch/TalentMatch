import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
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
      title="Konto erstellen"
      subtitle="Wähle, ob du als Kunde Deals suchst oder als Salon Kapazitäten anbietest."
      footer={
        <>
          Bereits registriert?{" "}
          <Link href="/login" className="ui-link">
            Anmelden
          </Link>
        </>
      }
    >
      <RegisterForm initialRole={initialRole} referredBy={referredBy} />
    </AuthShell>
  );
}
