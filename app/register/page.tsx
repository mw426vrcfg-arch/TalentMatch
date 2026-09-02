import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Konto erstellen"
      subtitle="Wähle, ob du als Kunde Deals suchst oder als Salon Kapazitäten anbietest."
      footer={
        <>
          Bereits registriert?{" "}
          <Link href="/login" className="font-medium text-gold-deep underline-offset-4 hover:underline">
            Anmelden
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
