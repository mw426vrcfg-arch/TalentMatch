import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { T } from "@/components/i18n/t";

export default function LoginPage() {
  return (
    <AuthShell
      titleKey="auth.welcomeBack"
      subtitleKey="auth.loginSubtitle"
      footer={
        <>
          <T k="auth.noAccount" />{" "}
          <Link href="/register" className="ui-link">
            <T k="auth.register" />
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
