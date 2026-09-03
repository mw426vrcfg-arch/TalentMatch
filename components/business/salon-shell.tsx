import { signOutAction } from "@/app/auth/actions";
import { SalonTabBar } from "@/components/app/role-tabs";
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
      <header className="ui-nav">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="h-9 w-9 rounded-full object-cover ring-1 ring-zinc-200"
              />
            ) : null}
            <div className="min-w-0">
              <p className="font-serif text-xl text-ink">TalentMatch</p>
              <p className="ui-kicker mt-0.5 truncate">Salon</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            <div className="hidden text-right sm:block">
              <p className="max-w-36 truncate text-sm font-medium text-ink">{salonName}</p>
              {location ? <p className="text-xs text-ink-soft">{location}</p> : null}
            </div>
            <NotificationBellHost />
            <form action={signOutAction}>
              <button type="submit" className="ui-btn-secondary px-3 text-xs">
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="app-screen ui-page mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
      <SalonTabBar pendingCount={pending.length} />
    </main>
  );
}
