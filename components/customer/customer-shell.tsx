import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { NotificationBellHost } from "@/components/notifications/notification-bell-host";

type CustomerShellProps = {
  title?: string;
  userName?: string | null;
  signedIn?: boolean;
  children: React.ReactNode;
};

export async function CustomerShell({
  title = "Browse",
  userName,
  signedIn = true,
  children,
}: CustomerShellProps) {
  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-ink/10 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <Link href="/" className="font-serif text-2xl text-ink">
              TalentMatch
            </Link>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-gold-deep">
              {title}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {signedIn ? (
              <>
                {userName ? (
                  <p className="hidden text-sm text-ink-soft sm:block">{userName}</p>
                ) : null}
                <NotificationBellHost />
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="rounded-full border border-ink/15 px-4 py-2 text-sm text-ink transition hover:border-gold"
                  >
                    Abmelden
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-ink/15 px-4 py-2 text-sm text-ink transition hover:border-gold"
                >
                  Anmelden
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-ink px-4 py-2 text-sm text-cream transition hover:bg-gold-deep"
                >
                  Registrieren
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </main>
  );
}
