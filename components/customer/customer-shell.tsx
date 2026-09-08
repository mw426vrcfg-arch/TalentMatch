import { AppHeader } from "@/components/app/app-header";
import { CustomerTabBar } from "@/components/app/role-tabs";
import { CustomerAccountHost } from "@/components/customer/customer-account-host";
import { GuestAuthLinks } from "@/components/i18n/auth-buttons";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { T } from "@/components/i18n/t";
import { InAppPushHost } from "@/components/notifications/in-app-push-host";
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

export function CustomerShell({
  title,
  titleKey = "nav.discover",
  userName,
  signedIn = true,
  headerAction,
  children,
}: CustomerShellProps) {
  return (
    <main className={signedIn ? "min-h-screen pb-24" : "min-h-screen"}>
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
          <LanguageSwitcher compact />
          {signedIn ? <CustomerAccountHost fallbackName={userName} /> : <GuestAuthLinks />}
        </div>
      </AppHeader>
      <div className="app-screen ui-page mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
      {signedIn ? <CustomerTabBar /> : null}
    </main>
  );
}
