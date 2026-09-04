import { AppHeader } from "@/components/app/app-header";
import { SalonTabBar } from "@/components/app/role-tabs";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { T } from "@/components/i18n/t";
import { InAppPushHost } from "@/components/notifications/in-app-push-host";
import { NotificationBellHost } from "@/components/notifications/notification-bell-host";
import { loadSalonPendingApplications } from "@/lib/applications/queries";
import { requireBusiness } from "@/lib/auth/require-business";

type SalonShellProps = {
  salonName: string;
  location?: string | null;
  logoUrl?: string | null;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
};

export async function SalonShell({ salonName, location, logoUrl, headerAction, children }: SalonShellProps) {
  const { business } = await requireBusiness();
  const pending = business ? await loadSalonPendingApplications(business.id) : [];
  return (
    <main className="min-h-screen pb-24">
      <InAppPushHost />
      <AppHeader>
        <div className="flex min-w-0 items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="app-header-logo h-9 w-9 rounded-full object-cover ring-1 ring-zinc-200 transition-[width,height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            />
          ) : null}
          <div className="min-w-0">
            <p className="app-header-brand font-serif text-xl tracking-tight text-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
              TalentMatch
            </p>
            <p className="ui-kicker mt-0.5 truncate transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
              <T k="nav.salon" />
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerAction}
          <div className="hidden text-right sm:block">
            <p className="max-w-36 truncate text-sm font-medium text-ink">
              {salonName || <T k="common.yourSalon" />}
            </p>
            {location ? <p className="text-xs text-ink-soft">{location}</p> : null}
          </div>
          <NotificationBellHost />
          <LanguageSwitcher compact />
        </div>
      </AppHeader>
      <div className="app-screen ui-page mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
      <SalonTabBar pendingCount={pending.length} />
    </main>
  );
}
