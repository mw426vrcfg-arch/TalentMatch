import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Willkommen zurück"
      subtitle="Melde dich an, um Bewerbungen zu sehen oder deinen Salon zu führen."
      footer={
        <>
          Noch kein Konto?{" "}
          <Link href="/register" className="ui-link">
            Registrieren
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
