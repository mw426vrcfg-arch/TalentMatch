import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { T } from "@/components/i18n/t";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      titleKey="auth.resetPageTitle"
      subtitleKey="auth.resetPageSubtitle"
      footer={
        <>
          <T k="auth.alreadyRegistered" />{" "}
          <Link href="/login" className="ui-link">
            <T k="auth.signIn" />
          </Link>
        </>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
