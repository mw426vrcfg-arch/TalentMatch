import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthReturnLink } from "@/components/auth/auth-return-link";
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
          <Suspense>
            <AuthReturnLink href="/register" className="ui-link">
              <T k="auth.register" />
            </AuthReturnLink>
          </Suspense>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
