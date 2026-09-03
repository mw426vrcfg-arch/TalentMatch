import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { CustomerTabBar } from "@/components/app/role-tabs";
import { InAppPushHost } from "@/components/notifications/in-app-push-host";
import { NotificationBellHost } from "@/components/notifications/notification-bell-host";

type CustomerShellProps = {
  title?: string;
  userName?: string | null;
  signedIn?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
};

export async function CustomerShell({
  title = "Entdecken",
  userName,
  signedIn = true,
  headerAction,
  children,
}: CustomerShellProps) {
  return (
    <main className="min-h-screen pb-24">
      {signedIn ? <InAppPushHost /> : null}
      <header className="ui-nav">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="font-serif text-xl text-ink">TalentMatch</p>
            <p className="ui-kicker mt-0.5 truncate">{title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            {signedIn ? (
              <>
                {userName ? (
                  <p className="hidden max-w-32 truncate text-sm text-ink-soft sm:block">{userName}</p>
                ) : null}
                <NotificationBellHost />
                <form action={signOutAction}>
                  <button type="submit" className="ui-btn-secondary px-3 text-xs">
                    Abmelden
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="ui-btn-secondary px-3 text-xs">
                  Anmelden
                </Link>
                <Link href="/register" className="ui-btn-primary px-3 text-xs">
                  Registrieren
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="app-screen ui-page mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
      {signedIn ? <CustomerTabBar /> : null}
    </main>
  );
}
