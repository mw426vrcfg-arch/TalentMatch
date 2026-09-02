import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { NotificationBellHost } from "@/components/notifications/notification-bell-host";

type SalonShellProps = {
  salonName: string;
  location?: string | null;
  logoUrl?: string | null;
  children: React.ReactNode;
};

export async function SalonShell({ salonName, location, logoUrl, children }: SalonShellProps) {
  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-ink/10 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : null}
            <div>
              <Link href="/" className="font-serif text-2xl text-ink">
                TalentMatch
              </Link>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-gold-deep">
                Salon Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/business/dashboard"
              className="hidden text-sm text-ink-soft transition hover:text-ink sm:inline"
            >
              Dashboard
            </Link>
            <Link
              href="/business/profile"
              className="rounded-full border border-ink/15 px-4 py-2 text-sm text-ink transition hover:border-gold"
            >
              Profil bearbeiten
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-ink">{salonName}</p>
              {location ? <p className="text-xs text-ink-soft">{location}</p> : null}
            </div>
            <NotificationBellHost />
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-full border border-ink/15 px-4 py-2 text-sm text-ink transition hover:border-gold"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </main>
  );
}
