import { AppHeader } from "@/components/app/app-header";
import { CustomerTabBar } from "@/components/app/role-tabs";
import { GuestAuthLinks } from "@/components/i18n/auth-buttons";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { T } from "@/components/i18n/t";
import { InAppPushHost } from "@/components/notifications/in-app-push-host";
import { NotificationBellHost } from "@/components/notifications/notification-bell-host";
import { type MessageKey } from "@/lib/i18n/messages";
import { type ReactNode } from "react";

type CustomerShellProps = {
  title?: string;
  titleKey?: MessageKey;
  userName?: string | null;
  signedIn?: boolean;
  headerAction?: ReactNode;
  children: ReactNode;
};

export async function CustomerShell({
  title,
  titleKey = "nav.discover",
  userName,
  signedIn = true,
  headerAction,
  children,
}: CustomerShellProps) {
  return (
    <main className="min-h-screen pb-24">
      {signedIn ? <InAppPushHost /> : null}
      <AppHeader>
        <div className="min-w-0">
          <p className="app-header-brand font-serif text-xl tracking-tight text-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
            TalentMatch
          </p>
          <p className="ui-kicker mt-0.5 truncate transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
            {title ?? <T k={titleKey} />}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerAction}
          {signedIn ? (
            <>
              {userName ? (
                <p className="hidden max-w-32 truncate text-sm text-ink-soft sm:block">{userName}</p>
              ) : null}
              <LanguageSwitcher compact />
              <NotificationBellHost />
            </>
          ) : (
            <>
              <LanguageSwitcher compact />
              <GuestAuthLinks />
            </>
          )}
        </div>
      </AppHeader>
      <div className="app-screen ui-page mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
      {signedIn ? <CustomerTabBar /> : null}
    </main>
  );
}
